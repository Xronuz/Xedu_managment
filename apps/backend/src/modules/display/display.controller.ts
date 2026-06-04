import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '@/common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { DisplayService } from './display.service';
import { Throttle } from '@nestjs/throttler';

@ApiTags('display')
@Controller({ path: 'display', version: '1' })
export class DisplayController {
  constructor(private readonly displayService: DisplayService) {}

  @Public()
  @Get(':schoolSlug')
  @Throttle({ default: { ttl: 60000, limit: 120 } })
  @ApiOperation({ summary: 'Public: bugungi dars jadvali (zal ekrani)' })
  @ApiParam({ name: 'schoolSlug', description: 'Maktabning unikal slug identifikatori' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Filial ID (ixtiyoriy — berilmasa barcha filiallar)' })
  getTodaySchedule(
    @Param('schoolSlug') schoolSlug: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.displayService.getTodaySchedule(schoolSlug, branchId);
  }
}
