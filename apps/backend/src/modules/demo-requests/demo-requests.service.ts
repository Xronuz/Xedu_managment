import { Injectable, NotFoundException } from '@nestjs/common';
import { IsString, IsEmail, MinLength, MaxLength, IsOptional } from 'class-validator';
import { PrismaService } from '@/common/prisma/prisma.service';
import { DemoRequestStatus } from '@prisma/client';

export class CreateDemoRequestDto {
  @IsString() @MinLength(1) @MaxLength(80)  firstName: string;
  @IsString() @MinLength(1) @MaxLength(80)  lastName: string;
  @IsString() @MinLength(2) @MaxLength(200) institution: string;
  @IsEmail()                                email: string;
  @IsString() @MinLength(7) @MaxLength(20)  phone: string;
}

export class UpdateDemoRequestDto {
  @IsString() @IsOptional() status?: DemoRequestStatus;
  @IsString() @IsOptional() notes?: string;
}

@Injectable()
export class DemoRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDemoRequestDto) {
    const request = await this.prisma.demoRequest.create({ data: dto });
    return { success: true, data: request };
  }

  async findAll(params: { page?: number; limit?: number; status?: DemoRequestStatus }) {
    const page  = Math.max(1, params.page  ?? 1);
    const limit = Math.min(50, params.limit ?? 20);
    const skip  = (page - 1) * limit;

    const where = params.status ? { status: params.status } : {};

    const [items, total] = await Promise.all([
      this.prisma.demoRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.demoRequest.count({ where }),
    ]);

    return {
      success: true,
      data: items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.demoRequest.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Demo so\'rov topilmadi');
    return { success: true, data: item };
  }

  async update(id: string, dto: UpdateDemoRequestDto) {
    await this.findOne(id);
    const updated = await this.prisma.demoRequest.update({ where: { id }, data: dto });
    return { success: true, data: updated };
  }

  async getStats() {
    const counts = await this.prisma.demoRequest.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const result: Record<string, number> = {};
    for (const c of counts) result[c.status] = c._count._all;
    return { success: true, data: result };
  }
}
