import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  HttpCode, HttpStatus, UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole, JwtPayload } from '@eduplatform/types';

@ApiTags('announcements')
@Controller({ path: 'announcements', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Yangi e\'lon yaratish' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL)
  async create(@Body() dto: CreateAnnouncementDto, @CurrentUser() user: JwtPayload) {
    return this.announcementsService.create(dto, user);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'E\'lonlar ro\'yxati (admin view)' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.announcementsService.findAll(user, { status, page, limit });
  }

  @Get('my')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mening e\'lonlarim (recipient view)' })
  async findMyAnnouncements(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('isRead') isRead?: string,
  ) {
    return this.announcementsService.findMyAnnouncements(user, {
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      page,
      limit,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bitta e\'lon haqida ma\'lumot' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.announcementsService.findOne(id, user);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'E\'lonni o\'qildi deb belgilash' })
  async markAsRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.announcementsService.markAsRead(id, user);
  }

  @Post(':id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'E\'lonni tasdiqlash (agar talab qilingan bo\'lsa)' })
  async acknowledge(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.announcementsService.acknowledge(id, user);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'E\'lonni tahrirlash (faqat draft)' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL)
  async update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto, @CurrentUser() user: JwtPayload) {
    return this.announcementsService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'E\'lonni bekor qilish' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL)
  async cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.announcementsService.cancel(id, user);
  }
}
