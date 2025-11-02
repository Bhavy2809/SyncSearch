import { DataSource } from 'typeorm';
import { config } from './config';
import { logger } from './logger';

export enum MediaStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  TRANSCRIBING = 'transcribing',
  COMPLETE = 'complete',
  FAILED = 'failed',
}

export class DatabaseService {
  private dataSource: DataSource;

  constructor() {
    this.dataSource = new DataSource({
      type: 'postgres',
      host: config.database.host,
      port: config.database.port,
      username: config.database.username,
      password: config.database.password,
      database: config.database.database,
      synchronize: false,
      logging: false,
    });
  }

  async connect(): Promise<void> {
    await this.dataSource.initialize();
    logger.info('✅ Database connected');
  }

  async disconnect(): Promise<void> {
    await this.dataSource.destroy();
    logger.info('✅ Database disconnected');
  }

  /**
   * Update media status
   */
  async updateMediaStatus(
    mediaId: string,
    status: MediaStatus,
    errorMessage?: string
  ): Promise<void> {
    const query = errorMessage
      ? `UPDATE media SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3`
      : `UPDATE media SET status = $1, updated_at = NOW() WHERE id = $2`;

    const params = errorMessage ? [status, errorMessage, mediaId] : [status, mediaId];

    await this.dataSource.query(query, params);
    logger.info(`📝 Updated media ${mediaId} status: ${status}`);
  }

  /**
   * Update audio S3 key and duration
   */
  async updateAudioInfo(
    mediaId: string,
    audioS3Key: string,
    duration?: number
  ): Promise<void> {
    const query = duration
      ? `UPDATE media SET audio_s3_key = $1, duration = $2, updated_at = NOW() WHERE id = $3`
      : `UPDATE media SET audio_s3_key = $1, updated_at = NOW() WHERE id = $2`;

    const params = duration ? [audioS3Key, duration, mediaId] : [audioS3Key, mediaId];

    await this.dataSource.query(query, params);
    logger.info(`📝 Updated media ${mediaId} audio info`);
  }

  /**
   * Get media info
   */
  async getMedia(mediaId: string): Promise<any> {
    const result = await this.dataSource.query(
      `SELECT * FROM media WHERE id = $1`,
      [mediaId]
    );
    return result[0];
  }
}
