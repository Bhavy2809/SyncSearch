import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { config } from './config';
import { logger } from './logger';

export class S3Service {
  private client: S3Client;
  private bucketName: string;

  constructor() {
    this.client = new S3Client({
      endpoint: config.s3.endpoint,
      region: config.s3.region,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      },
      forcePathStyle: config.s3.forcePathStyle,
    });
    this.bucketName = config.s3.bucketName;
  }

  /**
   * Download a file from S3 to local filesystem
   * @param s3Key - S3 object key
   * @param localPath - Local file path to save
   */
  async downloadFile(s3Key: string, localPath: string): Promise<void> {
    logger.info(`📥 Downloading from S3: ${s3Key} → ${localPath}`);

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    const response = await this.client.send(command);
    
    if (!response.Body) {
      throw new Error('S3 response body is empty');
    }

    // Stream the S3 object to local file
    const writeStream = createWriteStream(localPath);
    await pipeline(response.Body as NodeJS.ReadableStream, writeStream);

    logger.info(`✅ Download complete: ${localPath}`);
  }

  /**
   * Upload a file from local filesystem to S3
   * @param localPath - Local file path
   * @param s3Key - S3 object key
   */
  async uploadFile(localPath: string, s3Key: string): Promise<void> {
    logger.info(`📤 Uploading to S3: ${localPath} → ${s3Key}`);

    const fileStream = createReadStream(localPath);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      Body: fileStream,
      ContentType: 'audio/mpeg',
    });

    await this.client.send(command);

    logger.info(`✅ Upload complete: ${s3Key}`);
  }
}
