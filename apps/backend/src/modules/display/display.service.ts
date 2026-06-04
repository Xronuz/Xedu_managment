import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { DayOfWeek } from '@eduplatform/types';
import { getCurrentWeekType } from '@/common/utils/week-type.util';

@Injectable()
export class DisplayService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public: maktab slug bo'yicha bugungi dars jadvalini qaytaradi (auth talab qilinmaydi) */
  async getTodaySchedule(schoolSlug: string, branchId?: string) {
    const school = await this.prisma.school.findUnique({
      where: { slug: schoolSlug },
      select: { id: true, name: true, slug: true, phone: true, logoUrl: true },
    });

    if (!school) throw new NotFoundException(`Maktab topilmadi: ${schoolSlug}`);

    // Display moduli yoqilganmi tekshirish
    const displayModule = await this.prisma.schoolModule.findFirst({
      where: { schoolId: school.id, moduleName: 'display' as any },
      select: { isEnabled: true },
    });
    if (displayModule && !displayModule.isEnabled) {
      throw new NotFoundException('Display moduli bu maktab uchun yoqilmagan');
    }

    // Filial ma'lumotlari
    let branch: { id: string; name: string; code: string | null } | null = null;
    if (branchId) {
      branch = await this.prisma.branch.findFirst({
        where: { id: branchId, schoolId: school.id },
        select: { id: true, name: true, code: true },
      });
    }

    // Bugungi kun
    const jsDay = new Date().getDay();
    const dayMap: DayOfWeek[] = [
      DayOfWeek.SUNDAY, DayOfWeek.MONDAY, DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY,
    ];
    const today = dayMap[jsDay];
    const currentWeekType = getCurrentWeekType();

    const where: any = {
      schoolId: school.id,
      dayOfWeek: today,
      status: 'published',
      weekType: { in: ['all' as any, currentWeekType] },
    };
    if (branchId) where.branchId = branchId;

    const schedule = await this.prisma.schedule.findMany({
      where,
      include: {
        subject: {
          select: {
            id: true, name: true,
            teacher: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        class:  { select: { id: true, name: true, gradeLevel: true } },
        room:   { select: { id: true, name: true, capacity: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: [{ timeSlot: 'asc' }, { class: { gradeLevel: 'asc' } }],
    });

    // Branches ro'yxati (sidebar filtrlar uchun)
    const branches = await this.prisma.branch.findMany({
      where: { schoolId: school.id, isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });

    return {
      school: { id: school.id, name: school.name, slug: school.slug, phone: school.phone, logoUrl: school.logoUrl },
      branch,
      branches,
      day: today,
      date: new Date().toISOString(),
      schedule,
    };
  }
}
