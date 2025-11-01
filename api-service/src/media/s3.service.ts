import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    // Configure S3 client for Minio (local) or AWS S3 (production)
    const endpoint = this.configService.get<string>('S3_ENDPOINT') || 'http://localhost:9000';
    const region = this.configService.get<string>('S3_REGION') || 'us-east-1';
    
    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: this.configService.get<string>('S3_ACCESS_KEY_ID') || 'minioadmin',
        secretAccessKey: this.configService.get<string>('S3_SECRET_ACCESS_KEY') || 'minioadmin',
      },
      forcePathStyle: true, // Required for Minio
    });

    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME') || 'syncsearch-media';
  }

  /**
   * Generate a pre-signed URL for uploading a file to S3
   * @param key - S3 object key (path)
   * @param expiresIn - URL expiration time in seconds (default: 15 minutes)
   * @returns Pre-signed upload URL
   */
  async generateUploadUrl(key: string, expiresIn: number = 900): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      // ContentType can be specified by client during upload
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Generate a pre-signed URL for downloading a file from S3
   * @param key - S3 object key (path)
   * @param expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns Pre-signed download URL
   */
  async generateDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Generate S3 key for media file
   * @param userId - User ID
   * @param projectId - Project ID
   * @param filename - Original filename
   * @returns S3 key (path)
   */
  generateMediaKey(userId: string, projectId: string, filename: string): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `uploads/${userId}/${projectId}/${timestamp}-${sanitizedFilename}`;
  }

  /**
   * Generate S3 key for extracted audio file
   * @param originalKey - Original media S3 key
   * @returns S3 key for audio file
   */
  generateAudioKey(originalKey: string): string {
    // Replace the file extension with .mp3
    const pathWithoutExt = originalKey.replace(/\.[^/.]+$/, '');
    return `${pathWithoutExt}-audio.mp3`;
  }

  /**
   * Get the bucket name
   */
  getBucketName(): string {
    return this.bucketName;
  }
}
