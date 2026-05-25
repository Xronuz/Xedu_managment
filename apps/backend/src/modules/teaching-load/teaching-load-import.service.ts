import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole, TeachingLoadStatus, GroupType, Semester } from '@eduplatform/types';
import { ImportPreviewResultDto, ImportPreviewRowDto, ImportCommitResultDto } from './dto/import-teaching-load.dto';

const SEMESTER_MAP: Record<string, Semester> = {
  '1': Semester.FIRST, 'first': Semester.FIRST, 'birinchi': Semester.FIRST,
  '2': Semester.SECOND, 'second': Semester.SECOND, 'ikkinchi': Semester.SECOND,
  'full': Semester.FULL_YEAR, 'full_year': Semester.FULL_YEAR, 'yillik': Semester.FULL_YEAR,
};

const GROUP_TYPE_MAP: Record<string, GroupType> = {
  'class': GroupType.CLASS, 'sinf': GroupType.CLASS,
  'group': GroupType.GROUP, 'guruh': GroupType.GROUP,
  'elective': GroupType.ELECTIVE, 'tanlov': GroupType.ELECTIVE,
  'club': GroupType.CLUB, 'togarak': GroupType.CLUB,
};

@Injectable()
export class TeachingLoadImportService {
  constructor(private readonly prisma: PrismaService) {}

  async parsePreview(buffer: Buffer, currentUser: JwtPayload): Promise<ImportPreviewResultDto> {
    const schoolId = currentUser.schoolId!;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Excel faylda varaq topilmadi');

    const rawRows: Array<{ rowIndex: number; cells: any[] }> = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
      if (rowIndex === 1) return;
      rawRows.push({ rowIndex, cells: row.values as any[] });
    });

    // Bulk lookups
    const teacherEmails = new Set<string>();
    const teacherIds = new Set<string>();
    const subjectIds = new Set<string>();
    const subjectNames = new Set<string>();
    const classIds = new Set<string>();
    const classNames = new Set<string>();

    for (const r of rawRows) {
      const c = r.cells;
      const t = String(c[1] ?? '').trim();
      const s = String(c[3] ?? '').trim();
      const cl = String(c[5] ?? '').trim();
      if (t.includes('@')) teacherEmails.add(t.toLowerCase());
      else if (t) teacherIds.add(t);
      if (s) {
        if (s.startsWith('subj-') || s.length === 36) subjectIds.add(s);
        else subjectNames.add(s);
      }
      if (cl) {
        if (cl.startsWith('class-') || cl.length === 36) classIds.add(cl);
        else classNames.add(cl);
      }
    }

    const [teachersByEmail, teachersById, subjectsById, subjectsByName, classesById, classesByName] = await Promise.all([
      this.prisma.user.findMany({
        where: { schoolId, role: { in: [UserRole.TEACHER, UserRole.CLASS_TEACHER] }, email: { in: [...teacherEmails] } },
        select: { id: true, email: true, firstName: true, lastName: true, branchId: true },
      }),
      this.prisma.user.findMany({
        where: { schoolId, role: { in: [UserRole.TEACHER, UserRole.CLASS_TEACHER] }, id: { in: [...teacherIds] } },
        select: { id: true, email: true, firstName: true, lastName: true, branchId: true },
      }),
      this.prisma.subject.findMany({
        where: { schoolId, id: { in: [...subjectIds] } },
        select: { id: true, name: true, branchId: true, classId: true, teacherId: true },
      }),
      this.prisma.subject.findMany({
        where: { schoolId, name: { in: [...subjectNames] } },
        select: { id: true, name: true, branchId: true, classId: true, teacherId: true },
      }),
      this.prisma.class.findMany({
        where: { schoolId, id: { in: [...classIds] } },
        select: { id: true, name: true, branchId: true },
      }),
      this.prisma.class.findMany({
        where: { schoolId, name: { in: [...classNames] } },
        select: { id: true, name: true, branchId: true },
      }),
    ]);

    const teacherEmailMap = new Map(teachersByEmail.map(t => [t.email!.toLowerCase(), t]));
    const teacherIdMap = new Map([...teachersById, ...teachersByEmail].map(t => [t.id, t]));
    const subjectIdMap = new Map([...subjectsById, ...subjectsByName].map(s => [s.id, s]));
    const subjectNameMap = new Map([...subjectsById, ...subjectsByName].map(s => [s.name, s]));
    const classIdMap = new Map([...classesById, ...classesByName].map(c => [c.id, c]));
    const classNameMap = new Map([...classesById, ...classesByName].map(c => [c.name, c]));

    // Existing loads for duplicate detection
    const existingLoads = await this.prisma.teachingLoad.findMany({
      where: { schoolId, status: { in: [TeachingLoadStatus.DRAFT, TeachingLoadStatus.APPROVED] } },
      select: { teacherId: true, subjectId: true, classId: true, semester: true },
    });
    const existingKeySet = new Set(existingLoads.map(l =>
      `${l.teacherId}:${l.subjectId}:${l.classId}:${l.semester}`
    ));

    const rows: ImportPreviewRowDto[] = [];

    for (const raw of rawRows) {
      const c = raw.cells;
      const teacherRef = String(c[1] ?? '').trim();
      const subjectRef = String(c[3] ?? '').trim();
      const classRef = String(c[5] ?? '').trim();
      const hoursRaw = c[7];
      const semesterRaw = String(c[8] ?? '').trim().toLowerCase();
      const groupTypeRaw = String(c[9] ?? '').trim().toLowerCase();
      const isSplitRaw = String(c[10] ?? '').trim().toLowerCase();
      const coeffRaw = c[11];
      const notes = String(c[12] ?? '').trim() || undefined;

      const errors: string[] = [];

      // Resolve teacher
      let teacher = teacherRef.includes('@')
        ? teacherEmailMap.get(teacherRef.toLowerCase())
        : teacherIdMap.get(teacherRef);
      if (!teacher) errors.push('O\'qituvchi topilmadi');

      // Resolve subject
      let subject = subjectIdMap.get(subjectRef) || subjectNameMap.get(subjectRef);
      if (!subject) errors.push('Fan topilmadi');

      // Resolve class
      let cls = classIdMap.get(classRef) || classNameMap.get(classRef);
      if (!cls) errors.push('Sinf topilmadi');

      // Branch Admin scope
      if (currentUser.role === UserRole.BRANCH_ADMIN) {
        const refBranchId = subject?.branchId || cls?.branchId;
        if (refBranchId && refBranchId !== currentUser.branchId) {
          errors.push('Boshqa filialga tegishli');
        }
      }

      // Teacher-subject-class consistency
      if (teacher && subject && subject.teacherId !== teacher.id) {
        errors.push('O\'qituvchi ushbu fanga biriktirilmagan');
      }
      if (subject && cls && subject.classId !== cls.id) {
        errors.push('Fan ushbu sinfga tegishli emas');
      }

      // Hours
      const hoursPerWeek = typeof hoursRaw === 'number' ? hoursRaw : parseInt(String(hoursRaw), 10);
      if (isNaN(hoursPerWeek) || hoursPerWeek < 1 || hoursPerWeek > 40) {
        errors.push('Haftalik soat 1-40 oralig\'ida bo\'lishi kerak');
      }

      // Semester
      const semester = semesterRaw ? (SEMESTER_MAP[semesterRaw] ?? null) : Semester.FULL_YEAR;
      if (semesterRaw && !SEMESTER_MAP[semesterRaw]) {
        errors.push('Semestr noto\'g\'ri');
      }

      // Group type
      const groupType = groupTypeRaw ? (GROUP_TYPE_MAP[groupTypeRaw] ?? null) : GroupType.CLASS;
      if (groupTypeRaw && !GROUP_TYPE_MAP[groupTypeRaw]) {
        errors.push('Guruh turi noto\'g\'ri');
      }

      // Split class
      const isSplitClass = ['yes', 'true', 'ha', '1'].includes(isSplitRaw);

      // Coefficient
      const coefficient = typeof coeffRaw === 'number' ? coeffRaw : parseFloat(String(coeffRaw || '1'));
      if (isNaN(coefficient) || coefficient < 0.1) {
        errors.push('Koeffitsient noto\'g\'ri');
      }

      // Duplicate check
      const dupKey = `${teacher?.id}:${subject?.id}:${cls?.id}:${semester}`;
      if (teacher && subject && cls && existingKeySet.has(dupKey)) {
        errors.push('Bu yuklama allaqachon mavjud');
      }

      rows.push({
        row: raw.rowIndex,
        teacherId: teacher?.id,
        teacherEmail: teacher?.email,
        subjectId: subject?.id,
        subjectName: subject?.name,
        classId: cls?.id,
        className: cls?.name,
        hoursPerWeek,
        semester,
        groupType,
        isSplitClass,
        coefficient,
        notes,
        errors,
        valid: errors.length === 0,
      });
    }

    return {
      total: rows.length,
      valid: rows.filter(r => r.valid).length,
      invalid: rows.filter(r => !r.valid).length,
      rows,
    };
  }

  async commit(rows: ImportPreviewRowDto[], currentUser: JwtPayload): Promise<ImportCommitResultDto> {
    const schoolId = currentUser.schoolId!;
    const validRows = rows.filter(r => r.valid);
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of validRows) {
      try {
        if (!row.teacherId || !row.subjectId || !row.classId) {
          skipped++;
          continue;
        }

        // Re-check duplicate (race condition protection)
        const existing = await this.prisma.teachingLoad.findFirst({
          where: {
            teacherId: row.teacherId,
            subjectId: row.subjectId,
            classId: row.classId,
            semester: row.semester as Semester,
            status: { in: [TeachingLoadStatus.DRAFT, TeachingLoadStatus.APPROVED] },
          },
        });
        if (existing) { skipped++; continue; }

        // Resolve branch from subject or class
        const subject = await this.prisma.subject.findUnique({
          where: { id: row.subjectId },
          select: { branchId: true },
        });
        const branchId = subject?.branchId ?? currentUser.branchId!;

        await this.prisma.teachingLoad.create({
          data: {
            schoolId,
            branchId,
            teacherId: row.teacherId,
            subjectId: row.subjectId,
            classId: row.classId,
            hoursPerWeek: row.hoursPerWeek ?? 2,
            semester: (row.semester as Semester) ?? Semester.FULL_YEAR,
            groupType: (row.groupType as GroupType) ?? GroupType.CLASS,
            isSplitClass: row.isSplitClass ?? false,
            coefficient: row.coefficient ?? 1.0,
            notes: row.notes,
            status: TeachingLoadStatus.DRAFT,
          },
        });
        created++;
      } catch (e: any) {
        errors.push(`Qator ${row.row}: ${e.message}`);
      }
    }

    return { created, skipped, errors };
  }
}
