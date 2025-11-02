import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import { config } from './config';
import { logger } from './logger';

export class FFmpegService {
  /**
   * Extract audio from video file
   * @param inputPath - Path to input video file
   * @param outputPath - Path to save extracted audio
   * @returns Duration in seconds
   */
  async extractAudio(inputPath: string, outputPath: string): Promise<number> {
    logger.info(`🎵 Extracting audio: ${inputPath} → ${outputPath}`);

    return new Promise((resolve, reject) => {
      let duration = 0;

      ffmpeg(inputPath)
        .noVideo() // Remove video stream
        .audioCodec(config.ffmpeg.audioCodec)
        .audioBitrate(config.ffmpeg.audioBitrate)
        .format(config.ffmpeg.audioFormat)
        .on('codecData', (data) => {
          // Parse duration from FFmpeg metadata
          const durationStr = data.duration;
          if (durationStr) {
            const parts = durationStr.split(':');
            if (parts.length === 3) {
              const hours = parseInt(parts[0], 10);
              const minutes = parseInt(parts[1], 10);
              const seconds = parseFloat(parts[2]);
              duration = hours * 3600 + minutes * 60 + seconds;
            }
          }
          logger.info(`📊 Media duration: ${duration.toFixed(2)}s`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            logger.info(`⏳ Progress: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          logger.info(`✅ Audio extraction complete`);
          resolve(Math.floor(duration));
        })
        .on('error', (err) => {
          logger.error(`❌ FFmpeg error: ${err.message}`);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /**
   * Get media file metadata
   * @param filePath - Path to media file
   */
  async getMetadata(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata);
        }
      });
    });
  }
}
