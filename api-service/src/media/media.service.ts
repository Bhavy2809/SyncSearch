import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media, MediaStatus } from '../database/media.entity';
import { Project } from '../database/project.entity';
import { CreateMediaDto } from './dto/create-media.dto';
import { UploadUrlResponseDto } from './dto/upload-url-response.dto';
import { S3Service } from './s3.service';
import { QueueService } from './queue.service';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private mediaRepository: Repository<Media>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    private s3Service: S3Service,
    private queueService: QueueService,
  ) {}

  /**
   * Initialize media upload - generate pre-signed URL
   * 1. Verify user owns the project
   * 2. Create media record with UPLOADING status
   * 3. Generate S3 pre-signed URL
   * 4. Return URL to client for direct upload
   */
  async initializeUpload(userId: string, createMediaDto: CreateMediaDto): Promise<UploadUrlResponseDto> {
    // Verify project exists and user owns it
    const project = await this.projectRepository
      .createQueryBuilder('project')
      .where('project.id = :projectId', { projectId: createMediaDto.projectId })
      .getOne();

    if (!project) {
      throw new NotFoundException(`Project with ID ${createMediaDto.projectId} not found`);
    }

    // Check project ownership
    const ownershipCheck = await this.projectRepository
      .createQueryBuilder('project')
      .select('project.user_id', 'userId')
      .where('project.id = :projectId', { projectId: createMediaDto.projectId })
      .getRawOne();

    if (ownershipCheck?.userId !== userId) {
      throw new ForbiddenException('You do not have permission to upload to this project');
    }

    // Generate S3 key for the file
    const s3Key = this.s3Service.generateMediaKey(userId, createMediaDto.projectId, createMediaDto.filename);

    // Create media record in database with UPLOADING status
    const media = this.mediaRepository.create({
      project: { id: createMediaDto.projectId } as any,
      filename: createMediaDto.filename,
      originalS3Key: s3Key,
      mimeType: createMediaDto.mimeType,
      filesize: createMediaDto.filesize,
      status: MediaStatus.UPLOADING,
    });

    const savedMedia = await this.mediaRepository.save(media);

    // Generate pre-signed upload URL (15 minutes expiry)
    const uploadUrl = await this.s3Service.generateUploadUrl(s3Key, 900);

    return {
      mediaId: savedMedia.id,
      uploadUrl,
      expiresIn: 900,
      s3Key,
    };
  }

  /**
   * Confirm upload completion
   * 1. Update media status to PROCESSING
   * 2. Publish job to extract audio
   */
  async confirmUpload(mediaId: string, userId: string): Promise<Media> {
    const media = await this.findOne(mediaId, userId);

    if (media.status !== MediaStatus.UPLOADING) {
      throw new BadRequestException(`Media is not in UPLOADING status`);
    }

    // Update status to PROCESSING
    media.status = MediaStatus.PROCESSING;
    const updatedMedia = await this.mediaRepository.save(media);

    // Get project details for job
    const result = await this.mediaRepository
      .createQueryBuilder('media')
      .leftJoin('media.project', 'project')
      .select('project.id', 'projectId')
      .where('media.id = :mediaId', { mediaId })
      .getRawOne();

    // Publish job to extract audio
    await this.queueService.publishExtractAudioJob(
      media.id,
      userId,
      result.projectId,
      media.originalS3Key,
    );

    return updatedMedia;
  }

  /**
   * Find all media for a project
   * Verifies user owns the project
   */
  async findAllByProject(projectId: string, userId: string): Promise<Media[]> {
    // Verify project ownership
    const ownershipCheck = await this.projectRepository
      .createQueryBuilder('project')
      .select('project.user_id', 'userId')
      .where('project.id = :projectId', { projectId })
      .getRawOne();

    if (!ownershipCheck) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (ownershipCheck.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this project');
    }

    return this.mediaRepository.find({
      where: { project: { id: projectId } },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find a single media file by ID
   * Verifies user owns the parent project
   */
  async findOne(id: string, userId: string): Promise<Media> {
    const media = await this.mediaRepository
      .createQueryBuilder('media')
      .where('media.id = :id', { id })
      .getOne();

    if (!media) {
      throw new NotFoundException(`Media with ID ${id} not found`);
    }

    // Check project ownership
    const ownershipCheck = await this.mediaRepository
      .createQueryBuilder('media')
      .leftJoin('media.project', 'project')
      .select('project.user_id', 'userId')
      .where('media.id = :id', { id })
      .getRawOne();

    if (ownershipCheck?.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this media');
    }

    return media;
  }

  /**
   * Delete a media file
   * Verifies ownership and updates status
   */
  async remove(id: string, userId: string): Promise<void> {
    // Verify ownership
    await this.findOne(id, userId);

    // Delete from database (S3 cleanup handled by worker)
    await this.mediaRepository.delete(id);
  }

  /**
   * Update media status (called by workers)
   */
  async updateStatus(mediaId: string, status: MediaStatus, errorMessage?: string): Promise<Media> {
    const media = await this.mediaRepository.findOne({ where: { id: mediaId } });
    
    if (!media) {
      throw new NotFoundException(`Media with ID ${mediaId} not found`);
    }

    media.status = status;
    if (errorMessage) {
      media.errorMessage = errorMessage;
    }

    return this.mediaRepository.save(media);
  }

  /**
   * Update audio S3 key after extraction
   */
  async updateAudioKey(mediaId: string, audioS3Key: string, duration?: number): Promise<Media> {
    const media = await this.mediaRepository.findOne({ where: { id: mediaId } });
    
    if (!media) {
      throw new NotFoundException(`Media with ID ${mediaId} not found`);
    }

    media.audioS3Key = audioS3Key;
    if (duration) {
      media.duration = duration;
    }

    return this.mediaRepository.save(media);
  }
}
