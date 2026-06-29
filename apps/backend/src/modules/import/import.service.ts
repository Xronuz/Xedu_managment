import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole, WeekType, ScheduleStatus } from '@eduplatform/types';
import { UsersService } from '@/modules/users/users.service';
import { ConflictDetectorService, toWeeklyUtcMin } from '@/common/utils/conflict-detector';

// ─── Natija tipi ───────────────────────────────────────────────────────────────

export interface ImportRow {
  row: number;
  data: Record<string, any>;
  errors: string[];
  valid: boolean;
}

export interface ImportResult {
  total: number;
  valid: number;
  invalid: number;
  rows: ImportRow[];
}

export interface CommitResult {
  created: number;
  skippedDuplicates: number;
  failedRows: Array<{ row: number; reason: string }>;
  totalProcessed: number;
  skipped: number;
  errors: string[];
}

// ─── Servis ───────────────────────────────────────────────────────────────────

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly conflictDetector: ConflictDetectorService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // STUDENTS IMPORT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Excel ustunlari (namuna):
   * A: firstName | B: lastName | C: email | D: phone | E: password (ixtiyoriy) | F: classId (ixtiyoriy)
   */
  // Expected students template header columns (A-G)
  private static readonly STUDENTS_HEADERS = ['Ism', 'Familiya', 'Email', 'Telefon', 'Parol (ixtiyoriy)', 'Sinf ID (ixtiyoriy)', 'Filial ID (ixtiyoriy)'];

  async parseStudents(buffer: Buffer): Promise<ImportResult> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Yuklangan fayl bo\'sh');
    }
    let workbook: ExcelJS.Workbook;
    try {
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
    } catch (err: any) {
      throw new BadRequestException(`Excel fayl o'qilmadi: ${err?.message ?? 'noto\'g\'ri format'}`);
    }
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Excel faylda varaq topilmadi');
    if (sheet.rowCount < 2) throw new BadRequestException('Fayl bo\'sh — kamida bitta ma\'lumot qatori bo\'lishi kerak');

    // Header row validation: first 3 required columns must match template
    const headerRow = sheet.getRow(1);
    const hCells = headerRow.values as any[];
    const REQUIRED_HEADERS = ImportService.STUDENTS_HEADERS.slice(0, 3);
    for (let i = 0; i < REQUIRED_HEADERS.length; i++) {
      const actual = String(hCells[i + 1] ?? '').trim();
      if (actual !== REQUIRED_HEADERS[i]) {
        throw new BadRequestException(
          `Ustun ${i + 1} noto\'g\'ri: "${actual}". Kutilgan: "${REQUIRED_HEADERS[i]}". Namuna fayldan foydalaning.`,
        );
      }
    }

    const rows: ImportRow[] = [];

    sheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
      if (rowIndex === 1) return; // header
      try {
        const cells = row.values as any[];
        const firstName  = String(cells[1] ?? '').trim();
        const lastName   = String(cells[2] ?? '').trim();
        const email      = String(cells[3] ?? '').trim().toLowerCase();
        const phone      = String(cells[4] ?? '').trim() || undefined;
        const password   = String(cells[5] ?? '').trim() || undefined;
        const classId    = String(cells[6] ?? '').trim() || undefined;
        const branchId   = String(cells[7] ?? '').trim() || undefined;

        const errors: string[] = [];
        if (!firstName) errors.push('Ism kiritilmagan');
        if (!lastName)  errors.push('Familiya kiritilmagan');
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email noto\'g\'ri');

        rows.push({
          row: rowIndex,
          data: { firstName, lastName, email, phone, password, classId, branchId },
          errors,
          valid: errors.length === 0,
        });
      } catch {
        rows.push({ row: rowIndex, data: {}, errors: [`Qator ${rowIndex}: o'qib bo'lmadi`], valid: false });
      }
    });

    if (rows.length === 0) throw new BadRequestException('Faylda ma\'lumot qatorlari topilmadi');

    return {
      total: rows.length,
      valid: rows.filter(r => r.valid).length,
      invalid: rows.filter(r => !r.valid).length,
      rows,
    };
  }

  async commitStudents(rows: ImportRow[], currentUser: JwtPayload, branchIdOverride?: string | null): Promise<CommitResult> {
    const schoolId = currentUser.schoolId!;
    const branchId = branchIdOverride ?? currentUser.branchId ?? null;
    const validRows = rows.filter(r => r.valid);
    let created = 0;
    let skippedDuplicates = 0;
    const failedRows: Array<{ row: number; reason: string }> = [];

    // Pre-batch dedup: fetch all emails in one query to reduce race window
    const emails = validRows.map(r => r.data.email as string).filter(Boolean);
    const existingEmails = new Set(
      (await this.prisma.user.findMany({
        where: { email: { in: emails }, schoolId },
        select: { email: true },
      })).map(u => u.email),
    );

    // Filter out known duplicates before entering any transaction
    const toCreate = validRows.filter(r => {
      if (existingEmails.has(r.data.email)) { skippedDuplicates++; return false; }
      return true;
    });

    // CHUNK=10: stays within typical Prisma pool limit (default 10 connections)
    const CHUNK = 10;
    for (let i = 0; i < toCreate.length; i += CHUNK) {
      const chunk = toCreate.slice(i, i + CHUNK);

      // Pre-compute bcrypt hashes in parallel OUTSIDE transactions (CPU-bound, ~100ms each)
      const hashes = await Promise.all(
        chunk.map(row => bcrypt.hash(row.data.password ?? 'Student@123', 10)),
      );

      // Run transactions sequentially within each chunk to avoid P2002 race on same-chunk duplicates
      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j];
        const passwordHash = hashes[j];
        try {
          await this.prisma.$transaction(async (tx) => {
            // Re-check inside transaction in case another process created the user
            const existing = await tx.user.findFirst({ where: { email: row.data.email, schoolId }, select: { id: true } });
            if (existing) { skippedDuplicates++; return; }

            const rowBranchId = row.data.branchId ?? branchId ?? null;
            const student = await tx.user.create({
              data: {
                schoolId,
                branchId: rowBranchId,
                role: UserRole.STUDENT,
                firstName: row.data.firstName,
                lastName:  row.data.lastName,
                email:     row.data.email,
                phone:     row.data.phone,
                passwordHash,
              },
            });

            if (row.data.classId) {
              const cls = await tx.class.findFirst({ where: { id: row.data.classId, schoolId }, select: { id: true } });
              if (cls) {
                await tx.classStudent.upsert({
                  where: { classId_studentId: { classId: cls.id, studentId: student.id } },
                  create: { classId: cls.id, studentId: student.id },
                  update: {},
                });
              }
            }
            created++;
          });
        } catch (e: any) {
          const isDuplicate = e?.code === 'P2002' || (e?.message ?? '').includes('Unique constraint');
          if (isDuplicate) {
            skippedDuplicates++;
          } else {
            failedRows.push({ row: row.row, reason: e?.message ?? 'Noma\'lum xato' });
          }
        }
      }
    }

    return {
      created,
      skippedDuplicates,
      failedRows,
      totalProcessed: validRows.length,
      skipped: skippedDuplicates,
      errors: failedRows.map(f => `Qator ${f.row}: ${f.reason}`),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // USERS IMPORT (umumiy xodimlar)
  // ─────────────────────────────────────────────────────────────────────────────
  // A: firstName | B: lastName | C: email | D: phone | E: role | F: password

  private static readonly USERS_HEADERS = ['Ism', 'Familiya', 'Email', 'Telefon', 'Rol (teacher/accountant/...)', 'Parol', 'Filial ID (ixtiyoriy)'];

  async parseUsers(buffer: Buffer): Promise<ImportResult> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Yuklangan fayl bo\'sh');
    }
    let workbook: ExcelJS.Workbook;
    try {
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
    } catch (err: any) {
      throw new BadRequestException(`Excel fayl o'qilmadi: ${err?.message ?? 'noto\'g\'ri format'}`);
    }
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Excel faylda varaq topilmadi');
    if (sheet.rowCount < 2) throw new BadRequestException('Fayl bo\'sh — kamida bitta ma\'lumot qatori bo\'lishi kerak');

    // Validate first 3 required header columns
    const headerRow = sheet.getRow(1);
    const hCells = headerRow.values as any[];
    const REQUIRED_HEADERS = ImportService.USERS_HEADERS.slice(0, 3);
    for (let i = 0; i < REQUIRED_HEADERS.length; i++) {
      const actual = String(hCells[i + 1] ?? '').trim();
      if (actual !== REQUIRED_HEADERS[i]) {
        throw new BadRequestException(
          `Ustun ${i + 1} noto\'g\'ri: "${actual}". Kutilgan: "${REQUIRED_HEADERS[i]}". Namuna fayldan foydalaning.`,
        );
      }
    }

    const VALID_ROLES = ['teacher', 'class_teacher', 'accountant', 'librarian', 'vice_principal'];
    const rows: ImportRow[] = [];

    sheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
      if (rowIndex === 1) return;
      try {
        const cells = row.values as any[];
        const firstName = String(cells[1] ?? '').trim();
        const lastName  = String(cells[2] ?? '').trim();
        const email     = String(cells[3] ?? '').trim().toLowerCase();
        const phone     = String(cells[4] ?? '').trim() || undefined;
        const role      = String(cells[5] ?? '').trim().toLowerCase();
        const password  = String(cells[6] ?? '').trim() || undefined;

        const errors: string[] = [];
        if (!firstName) errors.push('Ism kiritilmagan');
        if (!lastName)  errors.push('Familiya kiritilmagan');
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email noto\'g\'ri');
        if (!VALID_ROLES.includes(role)) errors.push(`Rol noto\'g\'ri: "${role}". To\'g\'ri: ${VALID_ROLES.join(', ')}`);

        rows.push({
          row: rowIndex,
          data: { firstName, lastName, email, phone, role, password },
          errors,
          valid: errors.length === 0,
        });
      } catch {
        rows.push({ row: rowIndex, data: {}, errors: [`Qator ${rowIndex}: o'qib bo'lmadi`], valid: false });
      }
    });

    if (rows.length === 0) throw new BadRequestException('Faylda ma\'lumot qatorlari topilmadi');

    return {
      total: rows.length,
      valid: rows.filter(r => r.valid).length,
      invalid: rows.filter(r => !r.valid).length,
      rows,
    };
  }

  async commitUsers(rows: ImportRow[], currentUser: JwtPayload, branchIdOverride?: string | null): Promise<CommitResult> {
    const schoolId = currentUser.schoolId!;
    const validRows = rows.filter(r => r.valid);
    let created = 0;
    let skippedDuplicates = 0;
    const failedRows: Array<{ row: number; reason: string }> = [];

    // Pre-batch dedup
    const emails = validRows.map(r => r.data.email as string).filter(Boolean);
    const existingEmails = new Set(
      (await this.prisma.user.findMany({
        where: { email: { in: emails }, schoolId },
        select: { email: true },
      })).map(u => u.email),
    );

    const toCreate = validRows.filter(r => {
      if (existingEmails.has(r.data.email)) { skippedDuplicates++; return false; }
      return true;
    });

    // Sequential processing — UsersService.create does its own internal work,
    // parallelizing it risks connection pool exhaustion
    for (const row of toCreate) {
      try {
        await this.usersService.create(
          {
            firstName: row.data.firstName,
            lastName:  row.data.lastName,
            email:     row.data.email,
            phone:     row.data.phone,
            password:  row.data.password ?? 'Staff@123',
            role:      row.data.role as UserRole,
            branchId: branchIdOverride ?? currentUser.branchId!,
          },
          currentUser,
        );
        created++;
      } catch (e: any) {
        const isDuplicate = e?.code === 'P2002'
          || (e?.message ?? '').includes('Unique constraint')
          || e?.status === 409;
        if (isDuplicate) {
          skippedDuplicates++;
        } else {
          failedRows.push({ row: row.row, reason: e?.message ?? 'Noma\'lum xato' });
        }
      }
    }

    return {
      created,
      skippedDuplicates,
      failedRows,
      totalProcessed: validRows.length,
      skipped: skippedDuplicates,
      errors: failedRows.map(f => `Qator ${f.row}: ${f.reason}`),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCHEDULE IMPORT
  // ─────────────────────────────────────────────────────────────────────────────
  // OLD format (backward compatible):
  //   A: classId | B: subjectId | C: teacherId | D: dayOfWeek | E: timeSlot
  //   F: startTime (HH:MM) | G: endTime (HH:MM) | H: roomNumber (ixtiyoriy)
  // NEW format (preferred):
  //   A: classId | B: subjectId | C: teacherId | D: dayOfWeek | E: timeSlot
  //   F: roomId (ixtiyoriy) | G: roomName (ixtiyoriy) | H: startTime (ixtiyoriy) | I: endTime (ixtiyoriy)

  private async getSchoolTimezone(schoolId: string): Promise<string> {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { timezone: true },
    });
    return school?.timezone ?? 'Asia/Tashkent';
  }

  async parseSchedule(
    buffer: Buffer,
    currentUser: JwtPayload,
    branchIdOverride?: string | null,
  ): Promise<ImportResult> {
    const WEEK_TYPES = ['all', 'numerator', 'denominator'];
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Excel faylda varaq topilmadi');

    const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const schoolId = currentUser.schoolId!;
    const effectiveBranchId = branchIdOverride ?? currentUser.branchId ?? null;

    // ── 1. Raw parse ───────────────────────────────────────────────────────────
    interface RawRow {
      rowIndex: number;
      classId: string;
      subjectId: string;
      teacherId: string;
      dayOfWeek: string;
      timeSlot: number;
      startTime?: string;
      endTime?: string;
      roomId?: string;
      roomNumber?: string;
      weekType?: string;
    }

    const rawRows: RawRow[] = [];

    sheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
      if (rowIndex === 1) return;
      const cells = row.values as any[];
      const classId   = String(cells[1] ?? '').trim();
      const subjectId = String(cells[2] ?? '').trim();
      const teacherId = String(cells[3] ?? '').trim();
      const dayOfWeek = String(cells[4] ?? '').trim().toLowerCase();
      const timeSlot  = Number(cells[5]);

      // Format detection: if col6 is HH:MM → old format
      const cell6 = String(cells[6] ?? '').trim();
      const isOldFormat = /^\d{2}:\d{2}$/.test(cell6);

      let startTime: string | undefined;
      let endTime: string | undefined;
      let roomId: string | undefined;
      let roomNumber: string | undefined;
      let weekType: string | undefined;

      if (isOldFormat) {
        startTime = cell6;
        endTime   = String(cells[7] ?? '').trim() || undefined;
        roomNumber = String(cells[8] ?? '').trim() || undefined;
        weekType   = String(cells[9] ?? '').trim().toLowerCase() || 'all';
      } else {
        roomId     = cell6 || undefined;
        roomNumber = String(cells[7] ?? '').trim() || undefined;
        startTime  = String(cells[8] ?? '').trim() || undefined;
        endTime    = String(cells[9] ?? '').trim() || undefined;
        weekType   = String(cells[10] ?? '').trim().toLowerCase() || 'all';
      }

      const errors: string[] = [];
      if (!classId)   errors.push("classId yo'q");
      if (!subjectId) errors.push("subjectId yo'q");
      if (!teacherId) errors.push("teacherId yo'q");
      if (!DAYS.includes(dayOfWeek)) errors.push(`Kun noto'g'ri: ${dayOfWeek}`);
      if (isNaN(timeSlot) || timeSlot < 1 || timeSlot > 20) errors.push("timeSlot 1-20 oraligida bolishi kerak");
      if (startTime && !/^\d{2}:\d{2}$/.test(startTime)) errors.push("startTime HH:MM formatida bolishi kerak");
      if (endTime && !/^\d{2}:\d{2}$/.test(endTime))     errors.push("endTime HH:MM formatida bolishi kerak");
      if (!WEEK_TYPES.includes(weekType)) errors.push(`Hafta turi noto'g'ri: ${weekType}`);

      rawRows.push({
        rowIndex, classId, subjectId, teacherId, dayOfWeek, timeSlot,
        startTime, endTime, roomId, roomNumber,
      });
    });

    // ── 2. Bulk DB lookups ─────────────────────────────────────────────────────
    const classIds   = [...new Set(rawRows.map(r => r.classId).filter(Boolean))];
    const roomIds    = [...new Set(rawRows.map(r => r.roomId).filter(Boolean))];
    const roomNames  = [...new Set(rawRows.map(r => r.roomNumber).filter(Boolean))];
    const subjectIds = [...new Set(rawRows.map(r => r.subjectId).filter(Boolean))];
    const teacherIds = [...new Set(rawRows.map(r => r.teacherId).filter(Boolean))];

    const [
      classes,
      subjects,
      periods,
      rooms,
      existingSchedules,
    ] = await Promise.all([
      this.prisma.class.findMany({
        where: { id: { in: classIds }, schoolId },
        select: { id: true, branchId: true },
      }),
      this.prisma.subject.findMany({
        where: { id: { in: subjectIds }, schoolId },
        select: { id: true, teacherId: true, name: true, branchId: true },
      }),
      this.prisma.period.findMany({
        where: { schoolId, isActive: true },
        select: { branchId: true, periodNumber: true, startTime: true, endTime: true },
      }),
      this.prisma.room.findMany({
        where: { schoolId },
        select: { id: true, name: true, branchId: true },
      }),
      this.prisma.schedule.findMany({
        where: { schoolId },
        select: {
          teacherId: true, classId: true, roomId: true, roomNumber: true,
          dayOfWeek: true, timeSlot: true,
        },
      }),
    ]);

    const classMap   = new Map(classes.map(c => [c.id, c]));
    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    const periodMap  = new Map(periods.map(p => [`${p.branchId}:${p.periodNumber}`, p]));
    const roomById   = new Map(rooms.map(r => [r.id, r]));
    const roomByName = new Map(rooms.map(r => [r.name, r]));

    // ── 3. Row-level validation ────────────────────────────────────────────────
    const rows: ImportRow[] = [];

    for (const raw of rawRows) {
      const errors: string[] = [];
      const cls = classMap.get(raw.classId);
      const sub = subjectMap.get(raw.subjectId);

      // Class exists & school match
      if (!cls) {
        errors.push('Sinf topilmadi');
      } else if (cls.branchId !== schoolId && !classMap.has(raw.classId)) {
        // already handled above
      }

      // Branch Admin scope
      if (currentUser.role === UserRole.BRANCH_ADMIN && cls && cls.branchId !== currentUser.branchId) {
        errors.push('Sinf boshqa filialga tegishli');
      }

      // Subject exists & teacher match
      if (!sub) {
        errors.push('Fan topilmadi');
      } else if (sub.teacherId !== raw.teacherId) {
        errors.push(`O'qituvchi "${sub.name}" faniga biriktirilmagan`);
      }

      // Period config
      const branchId = cls?.branchId ?? effectiveBranchId;
      const periodKey = `${branchId}:${raw.timeSlot}`;
      const period = periodMap.get(periodKey);
      if (!period) {
        errors.push(`${raw.timeSlot}-dars soati uchun sozlangan vaqt topilmadi`);
      } else {
        const expectedStart = raw.startTime ?? period.startTime;
        const expectedEnd   = raw.endTime   ?? period.endTime;
        if (raw.startTime && raw.startTime !== period.startTime) {
          errors.push(`Boshlanish vaqti (${raw.startTime}) sozlangan period (${period.startTime}) bilan mos emas`);
        }
        if (raw.endTime && raw.endTime !== period.endTime) {
          errors.push(`Tugash vaqti (${raw.endTime}) sozlangan period (${period.endTime}) bilan mos emas`);
        }
        // Fill in missing times from period config
        if (!raw.startTime) raw.startTime = period.startTime;
        if (!raw.endTime)   raw.endTime   = period.endTime;
      }

      // Room validation
      let resolvedRoomId = raw.roomId;
      if (resolvedRoomId) {
        const room = roomById.get(resolvedRoomId);
        if (!room) {
          errors.push('Xona topilmadi');
        } else if (room.branchId !== branchId) {
          errors.push('Xona boshqa filialga tegishli');
        }
      } else if (raw.roomNumber) {
        const room = roomByName.get(raw.roomNumber);
        if (room) {
          if (room.branchId !== branchId) {
            errors.push('Xona boshqa filialga tegishli');
          } else {
            resolvedRoomId = room.id;
          }
        }
        // If room not found by name, allow roomNumber as free text (legacy)
      }

      // Existing DB conflicts
      const teacherConflict = existingSchedules.find(
        s => s.teacherId === raw.teacherId && s.dayOfWeek === raw.dayOfWeek && s.timeSlot === raw.timeSlot,
      );
      if (teacherConflict) {
        errors.push("O'qituvchi bu vaqtda band");
      }

      const classConflict = existingSchedules.find(
        s => s.classId === raw.classId && s.dayOfWeek === raw.dayOfWeek && s.timeSlot === raw.timeSlot,
      );
      if (classConflict) {
        errors.push('Sinf bu vaqtda boshqa darsga band');
      }

      if (resolvedRoomId) {
        const roomConflict = existingSchedules.find(
          s => s.roomId === resolvedRoomId && s.dayOfWeek === raw.dayOfWeek && s.timeSlot === raw.timeSlot,
        );
        if (roomConflict) {
          errors.push('Xona bu vaqtda band');
        }
      } else if (raw.roomNumber) {
        const roomConflict = existingSchedules.find(
          s => s.roomNumber === raw.roomNumber && s.dayOfWeek === raw.dayOfWeek && s.timeSlot === raw.timeSlot,
        );
        if (roomConflict) {
          errors.push('Xona bu vaqtda band');
        }
      }

      rows.push({
        row: raw.rowIndex,
        data: {
          classId: raw.classId,
          subjectId: raw.subjectId,
          teacherId: raw.teacherId,
          dayOfWeek: raw.dayOfWeek,
          timeSlot: raw.timeSlot,
          startTime: raw.startTime,
          endTime: raw.endTime,
          roomNumber: raw.roomNumber,
          roomId: resolvedRoomId,
          weekType: raw.weekType,
          schoolId,
        },
        errors,
        valid: errors.length === 0,
      });
    }

    // ── 4. Intra-file conflict detection ───────────────────────────────────────
    const teacherSlotCounts = new Map<string, number>();
    const classSlotCounts   = new Map<string, number>();
    const roomSlotCounts    = new Map<string, number>();

    for (const row of rows) {
      if (!row.valid) continue;
      const tKey = `${row.data.teacherId}:${row.data.dayOfWeek}:${row.data.timeSlot}`;
      const cKey = `${row.data.classId}:${row.data.dayOfWeek}:${row.data.timeSlot}`;
      const rKey = `${row.data.roomId ?? row.data.roomNumber}:${row.data.dayOfWeek}:${row.data.timeSlot}`;
      teacherSlotCounts.set(tKey, (teacherSlotCounts.get(tKey) ?? 0) + 1);
      classSlotCounts.set(cKey, (classSlotCounts.get(cKey) ?? 0) + 1);
      roomSlotCounts.set(rKey, (roomSlotCounts.get(rKey) ?? 0) + 1);
    }

    for (const row of rows) {
      if (!row.valid) continue;
      const tKey = `${row.data.teacherId}:${row.data.dayOfWeek}:${row.data.timeSlot}`;
      const cKey = `${row.data.classId}:${row.data.dayOfWeek}:${row.data.timeSlot}`;
      const rKey = `${row.data.roomId ?? row.data.roomNumber}:${row.data.dayOfWeek}:${row.data.timeSlot}`;
      if ((teacherSlotCounts.get(tKey) ?? 0) > 1) {
        row.errors.push("Faylda o'qituvchi ikki marta bir vaqtda belgilangan");
        row.valid = false;
      }
      if ((classSlotCounts.get(cKey) ?? 0) > 1) {
        row.errors.push('Faylda sinf ikki marta bir vaqtda belgilangan');
        row.valid = false;
      }
      if ((roomSlotCounts.get(rKey) ?? 0) > 1) {
        row.errors.push('Faylda xona ikki marta bir vaqtda belgilangan');
        row.valid = false;
      }
    }

    return {
      total: rows.length,
      valid: rows.filter(r => r.valid).length,
      invalid: rows.filter(r => !r.valid).length,
      rows,
    };
  }

  async commitSchedule(
    rows: ImportRow[],
    currentUser: JwtPayload,
    branchIdOverride?: string | null,
    overwriteExisting?: boolean,
    publishAfterImport?: boolean,
  ): Promise<CommitResult> {
    const schoolId = currentUser.schoolId!;
    const validRows = rows.filter(r => r.valid);
    let created = 0; let skipped = 0; const errors: string[] = [];

    // Branch Admin scope check
    if (currentUser.role === UserRole.BRANCH_ADMIN && branchIdOverride && branchIdOverride !== currentUser.branchId) {
      throw new ForbiddenException('Filial admin faqat o\'z filialiga import qilishi mumkin');
    }

    const timezone = await this.getSchoolTimezone(schoolId);

    for (const row of validRows) {
      try {
        // Resolve branchId
        let branchId = branchIdOverride;
        if (!branchId) {
          const cls = await this.prisma.class.findUnique({
            where: { id: row.data.classId },
            select: { branchId: true, schoolId: true },
          });
          if (!cls || cls.schoolId !== schoolId) {
            errors.push(`Qator ${row.row}: Sinf boshqa maktabga tegishli`);
            skipped++;
            continue;
          }
          branchId = cls.branchId;
        }

        // Period validation
        const period = await this.prisma.period.findFirst({
          where: { schoolId, branchId, periodNumber: row.data.timeSlot, isActive: true },
        });
        if (!period) {
          errors.push(`Qator ${row.row}: ${row.data.timeSlot}-dars soati uchun sozlangan vaqt topilmadi`);
          skipped++;
          continue;
        }

        const startTime = row.data.startTime ?? period.startTime;
        const endTime   = row.data.endTime   ?? period.endTime;

        // Resolve roomId
        let roomId: string | undefined = row.data.roomId;
        if (!roomId && row.data.roomNumber) {
          const room = await this.prisma.room.findFirst({
            where: { schoolId, branchId, name: row.data.roomNumber },
          });
          if (room) roomId = room.id;
        }

        // Room branch validation
        if (roomId) {
          const room = await this.prisma.room.findFirst({
            where: { id: roomId, schoolId, branchId },
          });
          if (!room) {
            errors.push(`Qator ${row.row}: Xona topilmadi yoki bu filialga tegishli emas`);
            skipped++;
            continue;
          }
        }

        // Teacher-subject validation
        const subject = await this.prisma.subject.findFirst({
          where: { id: row.data.subjectId, schoolId },
          select: { teacherId: true, name: true },
        });
        if (!subject) {
          errors.push(`Qator ${row.row}: Fan topilmadi`);
          skipped++;
          continue;
        }
        if (subject.teacherId !== row.data.teacherId) {
          errors.push(`Qator ${row.row}: O'qituvchi "${subject.name}" faniga biriktirilmagan`);
          skipped++;
          continue;
        }

        const weekType = row.data.weekType ?? WeekType.ALL;

        // Existing slot check
        const existing = await this.prisma.schedule.findFirst({
          where: {
            schoolId,
            classId: row.data.classId,
            dayOfWeek: row.data.dayOfWeek as any,
            timeSlot: row.data.timeSlot,
            weekType: { in: [WeekType.ALL, weekType] },
          },
        });
        if (existing && !overwriteExisting) {
          errors.push(`Qator ${row.row}: Bu vaqtda sinf uchun jadval allaqachon mavjud`);
          skipped++;
          continue;
        }

        // ConflictDetectorService (same as manual create)
        const conflicts = await this.conflictDetector.checkClash({
          schoolId,
          branchId,
          teacherId: row.data.teacherId,
          roomId: roomId || undefined,
          classId: row.data.classId,
          dayOfWeek: row.data.dayOfWeek,
          startTime,
          endTime,
          timezone,
          weekType,
          status: [ScheduleStatus.PUBLISHED, ScheduleStatus.VALIDATED],
        });
        if (conflicts.length > 0) {
          errors.push(`Qator ${row.row}: ${conflicts.map(c => c.message).join('; ')}`);
          skipped++;
          continue;
        }

        // UTC minutes
        const startDayMinUtc = toWeeklyUtcMin(row.data.dayOfWeek, startTime, timezone);
        const endDayMinUtc   = toWeeklyUtcMin(row.data.dayOfWeek, endTime, timezone);

        if (existing && overwriteExisting) {
          await this.prisma.schedule.delete({ where: { id: existing.id } });
        }

        const slotData: any = {
          schoolId,
          branchId,
          classId:    row.data.classId,
          subjectId:  row.data.subjectId,
          teacherId:  row.data.teacherId,
          roomId:     roomId || null,
          roomNumber: row.data.roomNumber || null,
          dayOfWeek:  row.data.dayOfWeek as any,
          timeSlot:   row.data.timeSlot,
          startTime,
          endTime,
          startDayMinUtc,
          endDayMinUtc,
          status:     ScheduleStatus.DRAFT,
          weekType,
        };

        if (publishAfterImport) {
          if (currentUser.role === UserRole.BRANCH_ADMIN) {
            throw new ForbiddenException('Filial admin importdan so\'ng darhol nashr qilishi mumkin emas');
          }
          slotData.status = ScheduleStatus.PUBLISHED;
          slotData.publishedAt = new Date();
          slotData.publishedBy = currentUser.sub;
        }

        await this.prisma.schedule.create({ data: slotData });
        created++;
      } catch (e: any) {
        errors.push(`Qator ${row.row}: ${e.message}`);
        skipped++;
      }
    }

    // Parse row number from error messages like "Qator 5: ..."
    const failedRowsSchedule = errors.map(e => {
      const m = e.match(/^Qator (\d+):/);
      return { row: m ? Number(m[1]) : 0, reason: e.replace(/^Qator \d+: /, '') };
    });
    return { created, skippedDuplicates: skipped, failedRows: failedRowsSchedule, totalProcessed: created + skipped + errors.length, skipped, errors };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GRADES IMPORT
  // ─────────────────────────────────────────────────────────────────────────────
  // A: studentId | B: subjectId | C: classId | D: type | E: score | F: maxScore | G: date | H: comment

  async parseGrades(buffer: Buffer): Promise<ImportResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Excel faylda varaq topilmadi');

    const VALID_TYPES = ['homework','classwork','test','exam','quarterly','final'];
    const rows: ImportRow[] = [];

    sheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
      if (rowIndex === 1) return;
      const cells = row.values as any[];
      const studentId = String(cells[1] ?? '').trim();
      const subjectId = String(cells[2] ?? '').trim();
      const classId   = String(cells[3] ?? '').trim();
      const type      = String(cells[4] ?? '').trim().toLowerCase();
      const score     = Number(cells[5]);
      const maxScore  = cells[6] ? Number(cells[6]) : 100;
      const date      = String(cells[7] ?? '').trim();
      const comment   = String(cells[8] ?? '').trim() || undefined;

      const errors: string[] = [];
      if (!studentId) errors.push("studentId yo'q");
      if (!subjectId) errors.push("subjectId yo'q");
      if (!classId)   errors.push("classId yo'q");
      if (!VALID_TYPES.includes(type)) errors.push(`Tur noto'g'ri: ${type}`);
      if (isNaN(score) || score < 0)  errors.push("Baho notoGri");
      if (isNaN(Date.parse(date)))    errors.push("Sana notoGri (YYYY-MM-DD kerak)");

      rows.push({
        row: rowIndex,
        data: { studentId, subjectId, classId, type, score, maxScore, date, comment },
        errors,
        valid: errors.length === 0,
      });
    });

    return {
      total: rows.length,
      valid: rows.filter(r => r.valid).length,
      invalid: rows.filter(r => !r.valid).length,
      rows,
    };
  }

  async commitGrades(rows: ImportRow[], currentUser: JwtPayload, branchIdOverride?: string | null): Promise<CommitResult> {
    const schoolId = currentUser.schoolId!;
    const validRows = rows.filter(r => r.valid);
    let created = 0; const errors: string[] = [];

    // Transaction ichida batch insert
    const failedRows: Array<{ row: number; reason: string }> = [];

    // Process grades row-by-row to capture individual row numbers on failure
    for (const row of validRows) {
      try {
        await this.prisma.$transaction(async (tx) => {
          let branchId: string | undefined = branchIdOverride ?? undefined;
          if (!branchId) {
            const cls = await tx.class.findUnique({ where: { id: row.data.classId }, select: { branchId: true } });
            branchId = cls?.branchId ?? undefined;
          }
          await tx.grade.create({
            data: {
              schoolId,
              branchId: branchId!,
              studentId: row.data.studentId,
              subjectId: row.data.subjectId,
              classId:   row.data.classId,
              type:      row.data.type as any,
              score:     row.data.score,
              maxScore:  row.data.maxScore,
              date:      new Date(row.data.date),
              comment:   row.data.comment,
            },
          });
          created++;
        });
      } catch (e: any) {
        failedRows.push({ row: row.row, reason: e?.message ?? 'Noma\'lum xato' });
        errors.push(`Qator ${row.row}: ${e?.message ?? 'Noma\'lum xato'}`);
      }
    }

    return { created, skippedDuplicates: 0, skipped: 0, failedRows, totalProcessed: validRows.length, errors };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTENDANCE IMPORT
  // ─────────────────────────────────────────────────────────────────────────────
  // A: studentId | B: date (YYYY-MM-DD) | C: status (present/absent/late/excused) | D: note (ixtiyoriy)

  async parseAttendance(buffer: Buffer): Promise<ImportResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Excel faylda varaq topilmadi');

    const VALID_STATUSES = ['present', 'absent', 'late', 'excused'];
    const rows: ImportRow[] = [];

    sheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
      if (rowIndex === 1) return; // header
      const cells = row.values as any[];
      const studentId = String(cells[1] ?? '').trim();
      const date      = String(cells[2] ?? '').trim();
      const status    = String(cells[3] ?? '').trim().toLowerCase();
      const note      = String(cells[4] ?? '').trim() || undefined;

      const errors: string[] = [];
      if (!studentId)                   errors.push("studentId yo'q");
      if (isNaN(Date.parse(date)))      errors.push("Sana notoGri (YYYY-MM-DD kerak)");
      if (!VALID_STATUSES.includes(status)) errors.push(`Status noto'g'ri: ${status}. Mumkin: ${VALID_STATUSES.join(', ')}`);

      rows.push({
        row: rowIndex,
        data: { studentId, date, status, note },
        errors,
        valid: errors.length === 0,
      });
    });

    return {
      total: rows.length,
      valid: rows.filter(r => r.valid).length,
      invalid: rows.filter(r => !r.valid).length,
      rows,
    };
  }

  async commitAttendance(rows: ImportRow[], currentUser: JwtPayload, branchIdOverride?: string | null): Promise<CommitResult> {
    const schoolId = currentUser.schoolId!;
    const validRows = rows.filter(r => r.valid);
    let created = 0; let skipped = 0; const errors: string[] = [];

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const row of validRows) {
          const dateObj = new Date(row.data.date + 'T00:00:00');
          // Upsert: bir xil (studentId + date) bo'lsa, yangilash
          const existing = await tx.attendance.findFirst({
            where: { studentId: row.data.studentId, date: dateObj, schoolId },
          });
          if (existing) {
            await tx.attendance.update({
              where: { id: existing.id },
              data: { status: row.data.status as any, note: row.data.note },
            });
            skipped++;
          } else {
            const enrollment = await tx.classStudent.findFirst({
              where: { studentId: row.data.studentId },
              include: { class: { select: { branchId: true } } },
            });
            const branchId = branchIdOverride ?? enrollment!.class!.branchId;
            await tx.attendance.create({
              data: {
                schoolId,
                branchId,
                classId: enrollment!.classId,
                studentId: row.data.studentId,
                date: dateObj,
                status: row.data.status as any,
                note: row.data.note,
              },
            });
            created++;
          }
        }
      });
    } catch (e: any) {
      errors.push(e.message);
    }

    const failedRowsAttendance = errors.map(e => {
      const m = e.match(/^Qator (\d+):/);
      return { row: m ? Number(m[1]) : 0, reason: e.replace(/^Qator \d+: /, '') };
    });
    return { created, skippedDuplicates: skipped, failedRows: failedRowsAttendance, totalProcessed: created + skipped + errors.length, skipped, errors };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEMPLATE GENERATION — namuna Excel fayllar
  // ─────────────────────────────────────────────────────────────────────────────

  async generateTemplate(type: 'students' | 'users' | 'schedule' | 'grades' | 'attendance'): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Ma'lumotlar");

    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } },
      alignment: { horizontal: 'center' },
    };

    const addHeaders = (headers: string[]) => {
      const row = sheet.addRow(headers);
      row.eachCell(cell => { Object.assign(cell, headerStyle); });
      sheet.columns = headers.map((h, i) => ({ width: 20, key: String(i + 1) }));
    };

    if (type === 'students') {
      addHeaders(['Ism', 'Familiya', 'Email', 'Telefon', 'Parol (ixtiyoriy)', 'Sinf ID (ixtiyoriy)', 'Filial ID (ixtiyoriy)']);
      sheet.addRow(['Ali', 'Valiyev', 'ali@example.com', '+998901234567', 'Student@123', '', '']);
      sheet.addRow(['Nodira', 'Karimova', 'nodira@example.com', '+998901234568', '', '', '']);
    } else if (type === 'users') {
      addHeaders(['Ism', 'Familiya', 'Email', 'Telefon', 'Rol (teacher/accountant/...)', 'Parol', 'Filial ID (ixtiyoriy)']);
      sheet.addRow(['Jasur', 'Toshmatov', 'jasur@example.com', '+998901234567', 'teacher', 'Staff@123', '']);
    } else if (type === 'schedule') {
      addHeaders(['Sinf ID', 'Fan ID', "O'qituvchi ID", 'Kun (monday-sunday)', 'Slot (1-12)', 'Xona ID (ixtiyoriy)', 'Xona nomi (ixtiyoriy)', 'Boshlanish (ixtiyoriy)', 'Tugash (ixtiyoriy)', 'Hafta turi (all/numerator/denominator)']);
      sheet.addRow(['class-uuid', 'subject-uuid', 'teacher-uuid', 'monday', '1', 'room-uuid', '', '', '', 'all']);
    } else if (type === 'grades') {
      addHeaders(["O'quvchi ID", 'Fan ID', 'Sinf ID', 'Tur (homework/test/exam/...)', 'Baho', 'Maks baho', 'Sana (YYYY-MM-DD)', 'Izoh']);
      sheet.addRow(['student-uuid', 'subject-uuid', 'class-uuid', 'test', '85', '100', '2026-03-15', '']);
    } else if (type === 'attendance') {
      addHeaders(["O'quvchi ID", 'Sana (YYYY-MM-DD)', 'Holat (present/absent/late/excused)', 'Izoh (ixtiyoriy)']);
      sheet.addRow(['student-uuid', '2026-04-06', 'present', '']);
      sheet.addRow(['student-uuid-2', '2026-04-06', 'absent', 'Kasal']);
      sheet.addRow(['student-uuid-3', '2026-04-06', 'late', '5 daqiqa kechikdi']);
    }

    // Excel buffer sifatida qaytarish
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}
