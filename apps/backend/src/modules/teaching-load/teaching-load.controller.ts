import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, UploadedFile, UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TeachingLoadService } from './teaching-load.service';
import { TeachingLoadImportService } from './teaching-load-import.service';
import { CreateTeachingLoadDto, UpdateTeachingLoadDto } from './dto/create-teaching-load.dto';
import { QueryTeachingLoadDto } from './dto/query-teaching-load.dto';
import { ImportCommitDto } from './dto/import-teaching-load.dto';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('teaching-load')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'teaching-loads', version: '1' })
export class TeachingLoadController {
  constructor(
    private readonly service: TeachingLoadService,
    private readonly importService: TeachingLoadImportService,
  ) {}

  @Get()
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'O\'quv yuklamalari ro\'yxati' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryTeachingLoadDto) {
    return this.service.findAll(user, query);
  }

  @Get(':id')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Bitta o\'quv yuklamasi' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Yangi o\'quv yuklamasi yaratish' })
  create(@Body() dto: CreateTeachingLoadDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'O\'quv yuklamasini yangilash' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTeachingLoadDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'O\'quv yuklamasini arxivlash' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user);
  }

  @Post('import/preview')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Excel importni oldindan ko\'rish va tekshirish' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importPreview(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) throw new BadRequestException('Fayl yuklanmadi');
    return this.importService.parsePreview(file.buffer, user);
  }

  @Post('import/commit')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Tekshirilgan importni saqlash' })
  async importCommit(@Body() dto: ImportCommitDto, @CurrentUser() user: JwtPayload) {
    return this.importService.commit(dto.rows, user);
  }
}

// Need to import BadRequestException
