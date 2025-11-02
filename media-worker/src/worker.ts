import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { config } from './config';
import { logger } from './logger';
import { S3Service } from './s3-service';
import { DatabaseService, MediaStatus } from './database-service';
import { FFmpegService } from './ffmpeg-service';
import { QueueService, MediaJob } from './queue-service';

export class MediaWorker {
  private s3Service: S3Service;
  private dbService: DatabaseService;
  private ffmpegService: FFmpegService;
  private queueService: QueueService;

  constructor() {
    this.s3Service = new S3Service();
    this.dbService = new DatabaseService();
    this.ffmpegService = new FFmpegService();
    this.queueService = new QueueService();

    // Ensure temp directory exists
    if (!existsSync(config.worker.tempDir)) {
      mkdirSync(config.worker.tempDir, { recursive: true });
    }
  }

  /**
   * Initialize worker - connect to services
   */
  async initialize(): Promise<void> {
    logger.info('🚀 Initializing Media Worker...');
    
    await this.dbService.connect();
    await this.queueService.connect();

    logger.info('✅ Media Worker initialized');
  }

  /**
   * Start consuming jobs from queue
   */
  async start(): Promise<void> {
    logger.info('🎬 Media Worker started - waiting for jobs...');

    await this.queueService.consume(async (job: MediaJob) => {
      await this.processJob(job);
    });
  }

  /**
   * Shutdown worker gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down Media Worker...');
    
    await this.queueService.disconnect();
    await this.dbService.disconnect();

    logger.info('✅ Media Worker shut down');
  }

  /**
   * Process a single media job
   * @param job - Job to process
   */
  private async processJob(job: MediaJob): Promise<void> {
    const { mediaId, s3Key } = job;

    logger.info(`🎯 Processing job: ${mediaId}`);

    const inputPath = join(config.worker.tempDir, `${mediaId}-input`);
    const outputPath = join(config.worker.tempDir, `${mediaId}-audio.mp3`);

    try {
      // Step 1: Download video from S3
      logger.info(`📥 Step 1/5: Downloading video from S3...`);
      await this.s3Service.downloadFile(s3Key, inputPath);

      // Step 2: Extract audio using FFmpeg
      logger.info(`🎵 Step 2/5: Extracting audio with FFmpeg...`);
      const duration = await this.ffmpegService.extractAudio(inputPath, outputPath);

      // Step 3: Generate S3 key for audio file
      const audioS3Key = this.generateAudioKey(s3Key);
      logger.info(`📝 Step 3/5: Generated audio key: ${audioS3Key}`);

      // Step 4: Upload audio to S3
      logger.info(`📤 Step 4/5: Uploading audio to S3...`);
      await this.s3Service.uploadFile(outputPath, audioS3Key);

      // Step 5: Update database
      logger.info(`💾 Step 5/5: Updating database...`);
      await this.dbService.updateAudioInfo(mediaId, audioS3Key, duration);
      await this.dbService.updateMediaStatus(mediaId, MediaStatus.TRANSCRIBING);

      // Cleanup temp files
      this.cleanupFiles(inputPath, outputPath);

      // Publish next job: transcription
      logger.info(`📤 Publishing transcription job...`);
      await this.queueService.publishJob('media.transcribe', {
        ...job,
        s3Key: audioS3Key,
        operation: 'transcribe',
      });

      logger.info(`✅ Job completed successfully: ${mediaId}`);
    } catch (error: any) {
      logger.error(`❌ Job failed: ${mediaId}`, { error: error.message, stack: error.stack });

      // Update database with error
      await this.dbService.updateMediaStatus(
        mediaId,
        MediaStatus.FAILED,
        error.message
      );

      // Cleanup temp files
      this.cleanupFiles(inputPath, outputPath);

      throw error;
    }
  }

  /**
   * Generate S3 key for audio file
   * @param originalKey - Original video S3 key
   * @returns Audio S3 key
   */
  private generateAudioKey(originalKey: string): string {
    // Replace file extension with .mp3
    const pathWithoutExt = originalKey.replace(/\.[^/.]+$/, '');
    return `${pathWithoutExt}-audio.mp3`;
  }

  /**
   * Cleanup temporary files
   */
  private cleanupFiles(...paths: string[]): void {
    for (const path of paths) {
      try {
        if (existsSync(path)) {
          unlinkSync(path);
          logger.info(`🧹 Cleaned up: ${path}`);
        }
      } catch (error: any) {
        logger.warn(`⚠️  Failed to cleanup ${path}: ${error.message}`);
      }
    }
  }
}
