import { Controller, Get, Post, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { MediaService } from './media.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { UploadUrlResponseDto } from './dto/upload-url-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Media } from '../database/media.entity';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * POST /media/upload-url
   * Initialize media upload - get pre-signed S3 URL
   * Client will upload directly to S3 using this URL
   */
  @Post('upload-url')
  async getUploadUrl(
    @CurrentUser('id') userId: string,
    @Body() createMediaDto: CreateMediaDto,
  ): Promise<UploadUrlResponseDto> {
    console.log('🔍 Upload URL Request Received:');
    console.log('  User ID:', userId);
    console.log('  Body:', JSON.stringify(createMediaDto, null, 2));
    console.log('  DTO Keys:', Object.keys(createMediaDto));
    console.log('  Filename:', createMediaDto.filename);
    console.log('  ProjectId:', createMediaDto.projectId);
    console.log('  MimeType:', createMediaDto.mimeType);
    console.log('  FileType:', (createMediaDto as any).fileType);
    
    return this.mediaService.initializeUpload(userId, createMediaDto);
  }

  /**
   * POST /media/:id/confirm
   * Confirm that upload to S3 is complete
   * This triggers the processing pipeline (audio extraction)
   */
  @Post(':id/confirm')
  async confirmUpload(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<Media> {
    return this.mediaService.confirmUpload(id, userId);
  }

  /**
   * GET /media?projectId=xxx
   * List all media files for a project
   */
  @Get()
  async findAll(
    @Query('projectId') projectId: string,
    @CurrentUser('id') userId: string,
  ): Promise<Media[]> {
    return this.mediaService.findAllByProject(projectId, userId);
  }

  /**
   * GET /media/:id
   * Get a single media file by ID
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<Media> {
    return this.mediaService.findOne(id, userId);
  }

  /**
   * DELETE /media/:id
   * Delete a media file
   */
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ message: string }> {
    await this.mediaService.remove(id, userId);
    return { message: 'Media deleted successfully' };
  }
}
