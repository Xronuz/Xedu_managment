import {
  Controller, Get, Post, Delete, Body, Param, Query,
  HttpCode, HttpStatus, UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
// Note: ResendInvitationDto exists but resend endpoint uses no body — kept for future use
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole, type JwtPayload } from '@eduplatform/types';
import { InvitationStatus } from '@prisma/client';
import { recordInvitationAccept } from '@/common/telemetry/pilot-telemetry';

@ApiTags('invitations')
@Controller({ path: 'invitations', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Yangi taklif yuborish' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  async create(@Body() dto: CreateInvitationDto, @CurrentUser() user: JwtPayload) {
    const { invitation } = await this.invitationsService.create(dto, user);
    return { invitation, message: 'Taklif yuborildi' };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Takliflar ro‘yxati' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: InvitationStatus })
  @Roles(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: InvitationStatus,
  ) {
    return this.invitationsService.findAll(user, page, limit, status);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bitta taklif haqida ma‘lumot' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.invitationsService.findOne(id, user);
  }

  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @ApiOperation({ summary: 'Taklifni qayta yuborish' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  async resend(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const { invitation } = await this.invitationsService.resend(id, user);
    return { invitation, message: 'Taklif qayta yuborildi' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Taklifni bekor qilish' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  async revoke(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.invitationsService.revoke(id, user);
    return { message: 'Taklif bekor qilindi' };
  }

  // ── Public endpoints (no auth) ───────────────────────────────────────────────

  @Public()
  @Get('validate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Taklif tokenini tekshirish (public)' })
  async validateToken(@Query('token') token: string) {
    return this.invitationsService.validateToken(token);
  }

  @Public()
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Taklifni qabul qilish va parol o‘rnatish (public)' })
  async accept(@Body() dto: AcceptInvitationDto) {
    recordInvitationAccept();
    return this.invitationsService.accept(dto.token, dto.password);
  }
}
