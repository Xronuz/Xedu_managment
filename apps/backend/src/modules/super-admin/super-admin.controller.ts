import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import {
  SuperAdminService, CreateSchoolDto, ToggleModuleDto,
  UpdateSubscriptionDto, ImpersonateDto, BroadcastDto,
} from './super-admin.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole, JwtPayload } from '@eduplatform/types';
import { buildCookieOptions } from '@/common/utils/cookie-options.util';

@ApiTags('super-admin')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller({ path: 'super-admin', version: '1' })
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly config: ConfigService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platform statistikasi' })
  getStats() {
    return this.superAdminService.getPlatformStats();
  }

  @Get('schools')
  @ApiOperation({ summary: 'Barcha maktablar' })
  getSchools(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.superAdminService.getSchools(+page, +limit, search);
  }

  @Get('schools/:id')
  @ApiOperation({ summary: 'Maktab ma‘lumoti' })
  getSchool(@Param('id') id: string) {
    return this.superAdminService.getSchool(id);
  }

  @Post('schools')
  @ApiOperation({ summary: 'Yangi maktab qo‘shish (onboarding)' })
  createSchool(@Body() dto: CreateSchoolDto, @CurrentUser() user: JwtPayload) {
    return this.superAdminService.createSchool(dto, user);
  }

  @Post('schools/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Maktab faoliyatini to'xtatish (suspend)" })
  suspendSchool(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.superAdminService.suspendSchool(id, user);
  }

  @Post('schools/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Maktabni qayta faollashtirish' })
  reactivateSchool(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.superAdminService.reactivateSchool(id, user);
  }

  @Patch('schools/:id/subscription')
  @ApiOperation({ summary: 'Maktab obunasini boshqarish' })
  updateSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.superAdminService.updateSubscription(id, dto, user);
  }

  @Post('schools/:id/impersonate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Maktab rahbari sifatida vaqtinchalik kirish (impersonation)' })
  async impersonate(
    @Param('id') id: string,
    @Body() dto: ImpersonateDto,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.superAdminService.impersonate(id, dto, user);
    const cookieOptions = buildCookieOptions(this.config);
    // 30 daqiqalik access cookie; refresh cookie tozalanadi — impersonation
    // sessiyasidan chiqish to'liq logout (dizayn bo'yicha)
    res.cookie('access_token', result.tokens.accessToken, {
      ...cookieOptions,
      maxAge: result.tokens.expiresIn * 1000,
    });
    res.clearCookie('refresh_token', cookieOptions);
    return result;
  }

  @Post('broadcast')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Platforma e'loni — barcha (yoki bitta) maktab direktorlariga" })
  broadcast(@Body() dto: BroadcastDto, @CurrentUser() user: JwtPayload) {
    return this.superAdminService.broadcastToDirectors(dto, user);
  }

  @Put('schools/:id')
  @ApiOperation({ summary: 'Maktabni yangilash' })
  updateSchool(@Param('id') id: string, @Body() dto: Partial<CreateSchoolDto>) {
    return this.superAdminService.updateSchool(id, dto);
  }

  @Delete('schools/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Maktabni o'chirish (soft delete)" })
  deleteSchool(@Param('id') id: string, @CurrentUser() user: any) {
    return this.superAdminService.deleteSchool(id, user);
  }

  @Get('schools/:id/users')
  @ApiOperation({ summary: 'Maktab foydalanuvchilari' })
  getSchoolUsers(@Param('id') id: string, @Query('role') role?: string) {
    return this.superAdminService.getSchoolUsers(id, role);
  }

  @Get('schools/:id/modules')
  @ApiOperation({ summary: 'Maktab modullari' })
  getModules(@Param('id') id: string) {
    return this.superAdminService.getModules(id);
  }

  @Post('schools/:id/modules/toggle')
  @ApiOperation({ summary: 'Modul yoqish/o‘chirish' })
  toggleModule(@Param('id') id: string, @Body() dto: ToggleModuleDto) {
    return this.superAdminService.toggleModule(id, dto);
  }
}
