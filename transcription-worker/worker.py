"""
Main Transcription Worker
Processes audio files from S3 using Whisper AI
"""
import os
import time
from typing import Dict
from logger import logger
from s3_service import S3Service
from database_service import DatabaseService
from whisper_service import WhisperService
from queue_service import QueueService
import config

class TranscriptionWorker:
    def __init__(self):
        """Initialize worker with all services"""
        self.s3_service = S3Service()
        self.db_service = DatabaseService()
        self.whisper_service = WhisperService()
        self.queue_service = QueueService()
        
        # Ensure temp directory exists
        os.makedirs(config.TEMP_DIR, exist_ok=True)
    
    def process_job(self, job: Dict):
        """
        Process a transcription job
        
        Job format:
        {
            'mediaId': str,
            'userId': str,
            'projectId': str,
            's3Key': str,  # Audio S3 key (from media-worker)
            'operation': 'transcribe'
        }
        """
        media_id = job['mediaId']
        audio_s3_key = job['s3Key']
        
        logger.info(f"🎯 Processing transcription job: {media_id}")
        
        # Temp file path
        audio_path = os.path.join(config.TEMP_DIR, f"{media_id}-audio.mp3")
        
        try:
            # Step 1: Get media info
            logger.info("📋 Step 1/4: Fetching media info...")
            media = self.db_service.get_media(media_id)
            if not media:
                raise Exception(f"Media not found: {media_id}")
            
            # Step 2: Download audio from S3
            logger.info("📥 Step 2/4: Downloading audio from S3...")
            self.s3_service.download_file(audio_s3_key, audio_path)
            
            # Step 3: Transcribe with Whisper
            logger.info("🎙️  Step 3/4: Transcribing with Whisper AI...")
            start_time = time.time()
            
            result = self.whisper_service.transcribe(audio_path)
            
            transcription_time = time.time() - start_time
            logger.info(f"⏱️  Transcription took {transcription_time:.2f} seconds")
            
            # Step 4: Save to database
            logger.info("💾 Step 4/4: Saving transcript to database...")
            transcript_id = self.db_service.save_transcript(
                media_id=media_id,
                text=result['text'],
                segments=result['segments'],
                language=result['language'],
                confidence=result['confidence']
            )
            
            # Update media status to COMPLETE
            self.db_service.update_media_status(media_id, 'complete')
            
            logger.info(f"✅ Transcription complete!")
            logger.info(f"   Media ID: {media_id}")
            logger.info(f"   Transcript ID: {transcript_id}")
            logger.info(f"   Language: {result['language']}")
            logger.info(f"   Duration: {transcription_time:.2f}s")
            logger.info(f"   Segments: {len(result['segments'])}")
            
        except Exception as e:
            logger.error(f"❌ Job failed: {str(e)}")
            
            # Update media status to FAILED
            try:
                self.db_service.update_media_status(media_id, 'failed', str(e))
            except:
                pass
            
            raise
        
        finally:
            # Cleanup temp file
            if os.path.exists(audio_path):
                try:
                    os.remove(audio_path)
                    logger.info(f"🗑️  Cleaned up temp file: {audio_path}")
                except Exception as e:
                    logger.warning(f"⚠️  Failed to cleanup temp file: {str(e)}")
    
    def start(self):
        """Start the worker"""
        logger.info("═" * 60)
        logger.info("🎙️  SyncSearch Transcription Worker")
        logger.info("    Whisper AI Transcription Service")
        logger.info("═" * 60)
        logger.info("")
        logger.info("🚀 Starting Transcription Worker...")
        
        try:
            # Connect to RabbitMQ
            self.queue_service.connect()
            
            logger.info("✅ Worker initialized")
            logger.info("🎬 Transcription Worker started - waiting for jobs...")
            logger.info("")
            
            # Start consuming jobs
            self.queue_service.consume(self.process_job)
            
        except KeyboardInterrupt:
            logger.info("")
            logger.info("🛑 Received shutdown signal")
            self.stop()
        except Exception as e:
            logger.error(f"❌ Worker error: {str(e)}")
            self.stop()
            raise
    
    def stop(self):
        """Stop the worker gracefully"""
        logger.info("🛑 Shutting down Transcription Worker...")
        
        try:
            self.queue_service.disconnect()
            self.db_service.disconnect()
        except Exception as e:
            logger.error(f"❌ Error during shutdown: {str(e)}")
        
        logger.info("✅ Worker stopped")
