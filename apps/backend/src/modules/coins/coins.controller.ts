import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseIntPipe, DefaultValuePipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard }  from '@/common/guards/jwt-auth.guard';
import { RolesGuard }    from '@/common/guards/roles.guard';
import { Roles }         from '@/common/decorators/roles.decorator';
import { CurrentUser }   from '@/common/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { CoinsService, CreateShopItemDto } from './coins.service';
import { SpendCoinsDto } from './dto/spend-coins.dto';
import { EngagementConfigService } from '@/modules/engagement/engagement-config.service';
import { RequireEngagement } from '@/modules/engagement/require-engagement.decorator';
import { RequireEngagementGuard } from '@/modules/engagement/require-engagement.guard';

const ADMIN_ROLES = [
  UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.SUPER_ADMIN,
];

const TEACHER_ROLES = [
  UserRole.TEACHER, UserRole.CLASS_TEACHER, ...ADMIN_ROLES,
];

@ApiTags('coins')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'coins', version: '1' })
export class CoinsController {
  constructor(
    private readonly coinsService: CoinsService,
    private readonly engagementConfig: EngagementConfigService,
  ) {}

  // ─── Student endpoints ────────────────────────────────────────────────────

  @Get('balance')
  @Roles(UserRole.STUDENT)
  @RequireEngagement()
  @UseGuards(RequireEngagementGuard)
  @ApiOperation({ summary: "O'z coin balansini ko'rish" })
  getBalance(@CurrentUser() user: JwtPayload) {
    return this.coinsService.getBalance(user);
  }

  @Get('history')
  @Roles(UserRole.STUDENT)
  @RequireEngagement()
  @UseGuards(RequireEngagementGuard)
  @ApiOperation({ summary: "Coin tarixi (so'nggi N ta)" })
  @ApiQuery({ name: 'limit', required: false })
  getHistory(
    @CurrentUser() user: JwtPayload,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.coinsService.getHistory(user, limit);
  }

  @Get('shop')
  @Roles(UserRole.STUDENT, ...ADMIN_ROLES)
  @RequireEngagement('engagement_shop')
  @UseGuards(RequireEngagementGuard)
  @ApiOperation({ summary: "Do'kon — faol mahsulotlar (student ko'rishi uchun)" })
  getShopItems(@CurrentUser() user: JwtPayload) {
    return this.coinsService.getShopItems(user.schoolId!);
  }

  @Post('spend')
  @Roles(UserRole.STUDENT)
  @RequireEngagement('engagement_shop')
  @UseGuards(RequireEngagementGuard)
  @ApiOperation({ summary: 'Coinlarni sarflash (xarid qilish)' })
  spendCoins(
    @Body() dto: SpendCoinsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.coinsService.spendCoins(dto.itemId, user);
  }

  // ─── Admin: shop management ───────────────────────────────────────────────

  @Get('admin/shop')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: "Admin: barcha do'kon mahsulotlari (faol + nofaol)" })
  getAllShopItems(@CurrentUser() user: JwtPayload) {
    return this.coinsService.getAllShopItems(user.schoolId!);
  }

  @Post('admin/shop')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: "Admin: yangi mahsulot qo'shish" })
  createShopItem(
    @Body() dto: CreateShopItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.coinsService.createShopItem(dto, user);
  }

  @Patch('admin/shop/:id')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Admin: mahsulotni tahrirlash' })
  updateShopItem(
    @Param('id') id: string,
    @Body() dto: Partial<CreateShopItemDto> & { isActive?: boolean },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.coinsService.updateShopItem(id, dto, user);
  }

  @Delete('admin/shop/:id')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: "Admin: mahsulotni o'chirish" })
  deleteShopItem(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.coinsService.deleteShopItem(id, user);
  }

  @Get('admin/balances')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: "Admin: barcha o'quvchilar coin balanslari" })
  getStudentBalances(@CurrentUser() user: JwtPayload) {
    return this.coinsService.getStudentBalances(user);
  }

  @Get('admin/orders')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: "Admin: barcha do'kon xaridlari tarixi" })
  getShopOrders(@CurrentUser() user: JwtPayload) {
    return this.coinsService.getShopOrders(user);
  }

  // ─── Award / Deduct ───────────────────────────────────────────────────────

  @Post('award')
  @Roles(...TEACHER_ROLES)
  @RequireEngagement('engagement_teacher_award')
  @UseGuards(RequireEngagementGuard)
  @ApiOperation({ summary: "O'quvchiga qo'lda coin berish/ayirish" })
  async awardManual(
    @Body() body: { studentId: string; amount: number; comment?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    // Teacherlar faqat berishi mumkin, ayira olmaydi (agar alohida ruxsat berilmasa)
    if (user.role === UserRole.TEACHER || user.role === UserRole.CLASS_TEACHER) {
      if (body.amount < 0) {
        const canDeduct = await this.engagementConfig.get(user.schoolId!, 'engagement_teacher_deduct');
        if (!canDeduct) {
          return { error: "O'qituvchilar coin ayira olmaydi" };
        }
      }
    }
    return this.coinsService.awardManual(body.studentId, body.amount, user, body.comment);
  }

  // ─── Reversal ─────────────────────────────────────────────────────────────

  @Post('admin/reverse/:transactionId')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Tranzaksiyani bekor qilish' })
  reverseTransaction(
    @Param('transactionId') transactionId: string,
    @Body() body: { reason: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.coinsService.reverseTransaction(transactionId, user, body.reason);
  }

  // ─── Audit ────────────────────────────────────────────────────────────────

  @Get('admin/audit')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Coin harakatlari audit jurnali' })
  getAuditTrail(
    @CurrentUser() user: JwtPayload,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.coinsService.getAuditTrail(user, days);
  }

  // ─── Abuse Report ─────────────────────────────────────────────────────────

  @Get('admin/abuse-report')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Mukofot sui\'ist\'mol xabari' })
  getAbuseReport(@CurrentUser() user: JwtPayload) {
    return this.coinsService.getAbuseReport(user);
  }
}
