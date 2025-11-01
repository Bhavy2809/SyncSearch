import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { S3Service } from './s3.service';
import { QueueService } from './queue.service';
import { Media } from '../database/media.entity';
import { Project } from '../database/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Media, Project])],
  controllers: [MediaController],
  providers: [MediaService, S3Service, QueueService],
  exports: [MediaService, S3Service, QueueService],
})
export class MediaModule {}
