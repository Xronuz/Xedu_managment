import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/create-subject.dto';

function normalizeSubjectName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(currentUser: JwtPayload, classId?: string, branchId?: string) {
    const where: any = { schoolId: currentUser.schoolId! };
    if (classId) where.classId = classId;
    if (branchId) where.branchId = branchId;

    // ── Teacher/class_teacher: only see subjects they are assigned to ──────────
    if (currentUser.role === UserRole.TEACHER || currentUser.role === UserRole.CLASS_TEACHER) {
      where.teacherId = currentUser.sub;
    }

    return this.prisma.subject.findMany({
      where,
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        class: { select: { id: true, name: true } },
      },
    });
  }

  /** Fanlarni normalized nom bo'yicha guruhlab, takrorlanishlarni oldini oladi */
  async catalog(currentUser: JwtPayload, branchId?: string) {
    const where: any = { schoolId: currentUser.schoolId! };
    if (branchId) where.branchId = branchId;

    // ── Teacher/class_teacher: only see subjects they are assigned to ──────────
    if (currentUser.role === UserRole.TEACHER || currentUser.role === UserRole.CLASS_TEACHER) {
      where.teacherId = currentUser.sub;
    }

    const subjects = await this.prisma.subject.findMany({
      where,
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        class: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const map = new Map<string, {
      name: string;
      normalizedName: string;
      count: number;
      classes: { id: string; name: string }[];
      teachers: { id: string; firstName: string; lastName: string }[];
      subjectIds: string[];
      totalHoursPerWeek: number;
    }>();

    for (const s of subjects) {
      const key = normalizeSubjectName(s.name);
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        existing.subjectIds.push(s.id);
        existing.totalHoursPerWeek += s.hoursPerWeek ?? 2;
        if (s.class && !existing.classes.find((c) => c.id === s.class.id)) {
          existing.classes.push({ id: s.class.id, name: s.class.name });
        }
        if (s.teacher && !existing.teachers.find((t) => t.id === s.teacher.id)) {
          existing.teachers.push({ id: s.teacher.id, firstName: s.teacher.firstName, lastName: s.teacher.lastName });
        }
      } else {
        map.set(key, {
          name: s.name,
          normalizedName: key,
          count: 1,
          classes: s.class ? [{ id: s.class.id, name: s.class.name }] : [],
          teachers: s.teacher ? [{ id: s.teacher.id, firstName: s.teacher.firstName, lastName: s.teacher.lastName }] : [],
          subjectIds: [s.id],
          totalHoursPerWeek: s.hoursPerWeek ?? 2,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Teacher yoki class_teacher faqat o'ziga biriktirilgan fanlarni oladi */
  async findMine(currentUser: JwtPayload) {
    return this.prisma.subject.findMany({
      where: { schoolId: currentUser.schoolId!, teacherId: currentUser.sub },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        class: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateSubjectDto, currentUser: JwtPayload) {
    const classIds = dto.classIds?.length ? dto.classIds : dto.classId ? [dto.classId] : [];
    if (classIds.length === 0) {
      throw new BadRequestException('Kamida 1 ta sinf tanlanishi kerak');
    }

    const results: any[] = [];
    for (const classId of classIds) {
      // Upsert: bir xil nom+sinf+maktab bo'lsa o'qituvchini yangilaydi, aks holda yaratadi
      const existing = await this.prisma.subject.findFirst({
        where: {
          name: dto.name,
          classId,
          schoolId: currentUser.schoolId!,
        },
      });
      let subject: any;
      if (existing) {
        subject = await this.prisma.subject.update({
          where: { id: existing.id },
          data: { teacherId: dto.teacherId, hoursPerWeek: dto.hoursPerWeek ?? existing.hoursPerWeek },
          include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
        });
      } else {
        subject = await this.prisma.subject.create({
          data: {
            name: dto.name,
            classId,
            teacherId: dto.teacherId,
            schoolId: currentUser.schoolId!,
            branchId: currentUser.branchId!,
            hoursPerWeek: dto.hoursPerWeek ?? 2,
          },
          include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
        });
      }
      results.push(subject);
    }
    return results.length === 1 ? results[0] : results;
  }

  async update(id: string, dto: UpdateSubjectDto, currentUser: JwtPayload) {
    const subject = await this.prisma.subject.findFirst({ where: { id, schoolId: currentUser.schoolId! } });
    if (!subject) throw new NotFoundException('Fan topilmadi');
    return this.prisma.subject.update({ where: { id }, data: dto });
  }

  async remove(id: string, currentUser: JwtPayload) {
    const subject = await this.prisma.subject.findFirst({ where: { id, schoolId: currentUser.schoolId! } });
    if (!subject) throw new NotFoundException('Fan topilmadi');
    await this.prisma.subject.delete({ where: { id } });
    return { message: 'Fan o‘chirildi' };
  }
}
