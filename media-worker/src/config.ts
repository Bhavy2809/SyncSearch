export const config = {
  // RabbitMQ Configuration
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://syncsearch:devpassword@localhost:5672',
    exchange: 'syncsearch',
    queue: 'media.extract_audio',
    prefetch: 2, // Process 2 jobs concurrently
  },

  // S3/Minio Configuration
  s3: {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    region: process.env.S3_REGION || 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'minioadmin',
    bucketName: process.env.S3_BUCKET_NAME || 'syncsearch-media',
    forcePathStyle: true, // Required for Minio
  },

  // Database Configuration
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USERNAME || 'syncsearch',
    password: process.env.DATABASE_PASSWORD || 'devpassword',
    database: process.env.DATABASE_NAME || 'syncsearch',
  },

  // FFmpeg Configuration
  ffmpeg: {
    audioCodec: 'libmp3lame',
    audioBitrate: '192k',
    audioFormat: 'mp3',
  },

  // Worker Configuration
  worker: {
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    tempDir: process.env.TEMP_DIR || './tmp',
  },
};
