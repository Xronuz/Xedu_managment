import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditAction } from '@prisma/client';

export interface CreateAuditLogPayload {
  schoolId?: string;
  branchId?: string;
  userId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateAuditLogPayload): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        schoolId: payload.schoolId,
        branchId: payload.branchId,
        userId: payload.userId,
        action: payload.action,
        entity: payload.entity,
        entityId: payload.entityId,
        oldData: payload.oldData as any,
        newData: payload.newData as any,
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
      },
    });
  }

  async findBySchool(
    schoolId: string,
    options?: {
      entity?: string;
      userId?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const { entity, userId, limit = 50, offset = 0 } = options ?? {};
    return this.prisma.auditLog.findMany({
      where: { schoolId, entity, userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });
  }
}
