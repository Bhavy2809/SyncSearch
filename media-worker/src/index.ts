import 'dotenv/config';
import { MediaWorker } from './worker';
import { logger } from './logger';

async function main() {
  logger.info('═══════════════════════════════════════════════════════');
  logger.info('🎬 SyncSearch Media Worker');
  logger.info('   Audio Extraction Service (FFmpeg)');
  logger.info('═══════════════════════════════════════════════════════');

  const worker = new MediaWorker();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('\n📛 Received SIGINT signal');
    await worker.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('\n📛 Received SIGTERM signal');
    await worker.shutdown();
    process.exit(0);
  });

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  try {
    // Initialize and start worker
    await worker.initialize();
    await worker.start();
  } catch (error) {
    logger.error('💥 Failed to start worker:', error);
    process.exit(1);
  }
}

main();
