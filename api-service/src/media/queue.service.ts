import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

export interface MediaJob {
  mediaId: string;
  userId: string;
  projectId: string;
  s3Key: string;
  operation: 'extract_audio' | 'transcribe' | 'generate_embeddings';
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly EXCHANGE_NAME = 'syncsearch';
  private readonly QUEUES = {
    EXTRACT_AUDIO: 'media.extract_audio',
    TRANSCRIBE: 'media.transcribe',
    EMBEDDINGS: 'media.embeddings',
  };

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Connect to RabbitMQ and set up exchange and queues
   */
  private async connect() {
    try {
      const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL') || 'amqp://syncsearch:devpassword@localhost:5672';
      
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Create exchange
      await this.channel.assertExchange(this.EXCHANGE_NAME, 'direct', { durable: true });

      // Create queues with dead-letter exchange for failed jobs
      for (const queueName of Object.values(this.QUEUES)) {
        await this.channel.assertQueue(queueName, {
          durable: true,
          arguments: {
            'x-message-ttl': 3600000, // 1 hour TTL
            'x-dead-letter-exchange': `${this.EXCHANGE_NAME}.dlx`,
          },
        });

        // Bind queue to exchange
        await this.channel.bindQueue(queueName, this.EXCHANGE_NAME, queueName);
      }

      console.log('✅ RabbitMQ connected and queues configured');
    } catch (error) {
      console.error('❌ Failed to connect to RabbitMQ:', error.message);
      // Don't throw - allow app to start even if RabbitMQ is down
    }
  }

  /**
   * Disconnect from RabbitMQ
   */
  private async disconnect() {
    try {
      await this.channel?.close();
      await this.connection?.close();
      console.log('✅ RabbitMQ disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting from RabbitMQ:', error.message);
    }
  }

  /**
   * Publish a job to the queue
   * @param queueName - Target queue name
   * @param job - Job payload
   */
  async publishJob(queueName: string, job: MediaJob): Promise<void> {
    if (!this.channel) {
      console.warn('⚠️  RabbitMQ not connected, skipping job publish');
      return;
    }

    try {
      const message = Buffer.from(JSON.stringify(job));
      
      this.channel.publish(
        this.EXCHANGE_NAME,
        queueName,
        message,
        {
          persistent: true,
          contentType: 'application/json',
          timestamp: Date.now(),
        }
      );

      console.log(`📤 Published job to ${queueName}:`, job.mediaId);
    } catch (error) {
      console.error(`❌ Failed to publish job to ${queueName}:`, error.message);
      throw error;
    }
  }

  /**
   * Publish audio extraction job
   */
  async publishExtractAudioJob(mediaId: string, userId: string, projectId: string, s3Key: string): Promise<void> {
    await this.publishJob(this.QUEUES.EXTRACT_AUDIO, {
      mediaId,
      userId,
      projectId,
      s3Key,
      operation: 'extract_audio',
    });
  }

  /**
   * Publish transcription job
   */
  async publishTranscribeJob(mediaId: string, userId: string, projectId: string, s3Key: string): Promise<void> {
    await this.publishJob(this.QUEUES.TRANSCRIBE, {
      mediaId,
      userId,
      projectId,
      s3Key,
      operation: 'transcribe',
    });
  }

  /**
   * Get queue names
   */
  getQueueNames() {
    return this.QUEUES;
  }
}
