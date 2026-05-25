import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';
import { JwtPayload, WeekType, ScheduleStatus } from '@eduplatform/types';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ScheduleExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportExcel(
    currentUser: JwtPayload,
    params: {
      classId?: string;
      weekType?: WeekType;
      includeDrafts?: boolean;
      includeArchived?: boolean;
    },
  ): Promise<Buffer> {
    const schoolId = currentUser.schoolId!;
    const statuses: ScheduleStatus[] = [ScheduleStatus.PUBLISHED];
    if (params.includeDrafts) statuses.push(ScheduleStatus.DRAFT, ScheduleStatus.VALIDATED);
    if (params.includeArchived) statuses.push(ScheduleStatus.ARCHIVED);

    const where: any = { ...buildTenantWhere(currentUser), status: { in: statuses } };
    if (params.classId) where.classId = params.classId;
    if (params.weekType) {
      where.weekType = { in: [WeekType.ALL, params.weekType] };
    }

    const schedules = await this.prisma.schedule.findMany({
      where,
      include: {
        subject: { select: { name: true } },
        class:   { select: { name: true } },
        teacher: { select: { firstName: true, lastName: true } },
        room:    { select: { name: true } },
        branch:  { select: { name: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: 'asc' }],
    });

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Jadval');

    ws.columns = [
      { header: 'Sinf', key: 'class', width: 20 },
      { header: 'Fan', key: 'subject', width: 20 },
      { header: "O'qituvchi", key: 'teacher', width: 24 },
      { header: 'Kun', key: 'day', width: 14 },
      { header: 'Slot', key: 'slot', width: 8 },
      { header: 'Boshlanish', key: 'start', width: 12 },
      { header: 'Tugash', key: 'end', width: 12 },
      { header: 'Xona', key: 'room', width: 14 },
      { header: "Hafta turi", key: 'weekType', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Filial', key: 'branch', width: 18 },
    ];

    for (const s of schedules) {
      ws.addRow({
        class: s.class?.name ?? '',
        subject: s.subject?.name ?? '',
        teacher: s.teacher ? `${s.teacher.firstName} ${s.teacher.lastName}` : '',
        day: s.dayOfWeek,
        slot: s.timeSlot,
        start: s.startTime,
        end: s.endTime,
        room: s.room?.name ?? s.roomNumber ?? '',
        weekType: s.weekType,
        status: s.status,
        branch: s.branch?.name ?? '',
      });
    }

    ws.getRow(1).font = { bold: true };

    const buf = await workbook.xlsx.writeBuffer();
    return buf as unknown as Buffer;
  }
}
