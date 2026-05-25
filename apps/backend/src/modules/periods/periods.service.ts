import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import {
  IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export class CreatePeriodDto {
  @ApiProperty({ example: 1, description: 'Dars tartib raqami' })
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  periodNumber: number;

  @ApiProperty({ example: '08:00', description: 'Boshlanish vaqti (HH:MM)' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: '08:45', description: 'Tugash vaqti (HH:MM)' })
  @IsString()
  @IsNotEmpty()
  endTime: string;

  @ApiPropertyOptional({ example: 'standard', description: 'Kun turi (standard, short, exam)' })
  @IsOptional()
  @IsString()
  dayType?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class UpdatePeriodDto {
  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ example: '08:45' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dayType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

// ─── Service ─────────────────────────────────────────────────────────────────

const SCHOOL_WIDE_ROLES = new Set([UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL]);

@Injectable()
export class PeriodsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private assertCanManage(currentUser: JwtPayload, branchId: string) {
    if (currentUser.role === UserRole.BRANCH_ADMIN && branchId !== currentUser.branchId) {
      throw new ForbiddenException('Filial admin faqat o\'z filialidagi dars soatlarini boshqarishi mumkin');
    }
  }

  private assertCanRead(currentUser: JwtPayload, branchId?: string) {
    if (currentUser.role === UserRole.BRANCH_ADMIN && branchId && branchId !== currentUser.branchId) {
      throw new ForbiddenException('Bu filialning dars soatlariga kirish taqiqlangan');
    }
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  async findAll(currentUser: JwtPayload, branchId?: string) {
    const schoolId = currentUser.schoolId!;
    const where: any = { schoolId };

    if (branchId) {
      this.assertCanRead(currentUser, branchId);
      where.branchId = branchId;
    } else if (!SCHOOL_WIDE_ROLES.has(currentUser.role) && currentUser.branchId) {
      where.branchId = currentUser.branchId;
    }

    return this.prisma.period.findMany({
      where,
      orderBy: [{ branchId: 'asc' }, { periodNumber: 'asc' }],
    });
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const period = await this.prisma.period.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!period) throw new NotFoundException('Dars soati topilmadi');

    this.assertCanRead(currentUser, period.branchId);
    return period;
  }

  async findByBranch(branchId: string, currentUser: JwtPayload) {
    this.assertCanRead(currentUser, branchId);
    return this.prisma.period.findMany({
      where: { schoolId: currentUser.schoolId!, branchId },
      orderBy: { periodNumber: 'asc' },
    });
  }

  /** Resolve period times for a given branch + periodNumber */
  async resolvePeriod(
    schoolId: string,
    branchId: string,
    periodNumber: number,
  ): Promise<{ startTime: string; endTime: string } | null> {
    const period = await this.prisma.period.findFirst({
      where: { schoolId, branchId, periodNumber, isActive: true },
    });
    if (!period) return null;
    return { startTime: period.startTime, endTime: period.endTime };
  }

  // ── Create ──────────────────────────────────────────────────────────────────

  async create(dto: CreatePeriodDto, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;
    const branchId = currentUser.branchId!;

    this.assertCanManage(currentUser, branchId);

    // Yagona periodNumber tekshirish
    const existing = await this.prisma.period.findFirst({
      where: { schoolId, branchId, periodNumber: dto.periodNumber },
    });
    if (existing) {
      throw new ConflictException(`Bu filialda ${dto.periodNumber}-dars soati allaqachon mavjud`);
    }

    return this.prisma.period.create({
      data: {
        schoolId,
        branchId,
        periodNumber: dto.periodNumber,
        startTime:    dto.startTime,
        endTime:      dto.endTime,
        dayType:      dto.dayType,
        isActive:     dto.isActive ?? true,
      },
    });
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdatePeriodDto, currentUser: JwtPayload) {
    const period = await this.prisma.period.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!period) throw new NotFoundException('Dars soati topilmadi');

    this.assertCanManage(currentUser, period.branchId);

    const data: any = {};
    if (dto.startTime !== undefined) data.startTime = dto.startTime;
    if (dto.endTime   !== undefined) data.endTime   = dto.endTime;
    if (dto.dayType   !== undefined) data.dayType   = dto.dayType;
    if (dto.isActive  !== undefined) data.isActive  = dto.isActive;

    return this.prisma.period.update({ where: { id }, data });
  }

  // ── Remove ──────────────────────────────────────────────────────────────────

  async remove(id: string, currentUser: JwtPayload) {
    const period = await this.prisma.period.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!period) throw new NotFoundException('Dars soati topilmadi');

    this.assertCanManage(currentUser, period.branchId);

    await this.prisma.period.delete({ where: { id } });
    return { message: 'Dars soati o\'chirildi' };
  }
}
