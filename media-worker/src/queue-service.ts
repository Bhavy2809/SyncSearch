import amqp from 'amqplib';
import { config } from './config';
import { logger } from './logger';

export interface MediaJob {
  mediaId: string;
  userId: string;
  projectId: string;
  s3Key: string;
  operation: 'extract_audio' | 'transcribe' | 'generate_embeddings';
}

export class QueueService {
  private connection: any = null;
  private channel: any = null;

  /**
   * Connect to RabbitMQ
   */
  async connect(): Promise<void> {
    this.connection = await amqp.connect(config.rabbitmq.url);
    this.channel = await this.connection.createChannel();

    // Set prefetch count (how many jobs to process concurrently)
    await this.channel.prefetch(config.rabbitmq.prefetch);

    logger.info('✅ RabbitMQ connected');
  }

  /**
   * Disconnect from RabbitMQ
   */
  async disconnect(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
    logger.info('✅ RabbitMQ disconnected');
  }

  /**
   * Start consuming jobs from queue
   * @param handler - Function to handle each job
   */
  async consume(handler: (job: MediaJob) => Promise<void>): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const queueName = config.rabbitmq.queue;

    // Ensure queue exists with same configuration as API service
    await this.channel.assertQueue(queueName, {
      durable: true,
      arguments: {
        'x-message-ttl': 3600000, // 1 hour TTL (matches API service)
        'x-dead-letter-exchange': 'syncsearch.dlx',
      },
    });

    logger.info(`🎧 Listening for jobs on queue: ${queueName}`);

    await this.channel.consume(queueName, async (msg: any) => {
      if (!msg) return;

      try {
        const job: MediaJob = JSON.parse(msg.content.toString());
        logger.info(`📥 Received job: ${job.mediaId} (${job.operation})`);

        // Process the job
        await handler(job);

        // Acknowledge successful processing
        this.channel?.ack(msg);
        logger.info(`✅ Job completed: ${job.mediaId}`);
      } catch (error) {
        logger.error(`❌ Job failed: ${error}`);

        // Check if we should retry
        const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) + 1;

        if (retryCount < config.worker.maxRetries) {
          // Requeue with retry count
          logger.warn(`🔄 Retrying job (attempt ${retryCount}/${config.worker.maxRetries})`);
          
          setTimeout(() => {
            this.channel?.nack(msg, false, true); // Requeue
          }, config.worker.retryDelay);
        } else {
          // Max retries reached, send to dead-letter queue
          logger.error(`💀 Max retries reached, sending to DLQ`);
          this.channel?.nack(msg, false, false); // Don't requeue
        }
      }
    });
  }

  /**
   * Publish a job to another queue
   * @param queueName - Target queue name
   * @param job - Job payload
   */
  async publishJob(queueName: string, job: MediaJob): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    await this.channel.assertQueue(queueName, { durable: true });

    const message = Buffer.from(JSON.stringify(job));
    
    this.channel.sendToQueue(queueName, message, {
      persistent: true,
      contentType: 'application/json',
      timestamp: Date.now(),
    });

    logger.info(`📤 Published job to ${queueName}: ${job.mediaId}`);
  }
}
