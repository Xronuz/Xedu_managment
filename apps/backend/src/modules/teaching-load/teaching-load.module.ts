import { Module } from '@nestjs/common';
import { TeachingLoadController } from './teaching-load.controller';
import { TeachingLoadService } from './teaching-load.service';
import { TeachingLoadImportService } from './teaching-load-import.service';

@Module({
  controllers: [TeachingLoadController],
  providers: [TeachingLoadService, TeachingLoadImportService],
  exports: [TeachingLoadService],
})
export class TeachingLoadModule {}
