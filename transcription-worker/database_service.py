"""
Database service for updating transcription results
"""
import psycopg2
from psycopg2.extras import Json
from typing import Optional, List, Dict
from logger import logger
import config

class DatabaseService:
    def __init__(self):
        """Initialize database connection"""
        self.connection = None
        self.connect()
    
    def connect(self):
        """Connect to PostgreSQL database"""
        try:
            self.connection = psycopg2.connect(
                host=config.DATABASE_HOST,
                port=config.DATABASE_PORT,
                database=config.DATABASE_NAME,
                user=config.DATABASE_USER,
                password=config.DATABASE_PASSWORD
            )
            self.connection.autocommit = False
            logger.info("✅ Database connected")
        except Exception as e:
            logger.error(f"❌ Database connection failed: {str(e)}")
            raise
    
    def disconnect(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            logger.info("✅ Database disconnected")
    
    def update_media_status(self, media_id: str, status: str, error: Optional[str] = None):
        """
        Update media status
        
        Args:
            media_id: Media UUID
            status: New status (processing, transcribing, complete, failed)
            error: Optional error message
        """
        try:
            cursor = self.connection.cursor()
            
            if error:
                cursor.execute(
                    "UPDATE media SET status = %s, error = %s, updated_at = NOW() WHERE id = %s",
                    (status, error, media_id)
                )
            else:
                cursor.execute(
                    "UPDATE media SET status = %s, updated_at = NOW() WHERE id = %s",
                    (status, media_id)
                )
            
            self.connection.commit()
            logger.info(f"📝 Updated media {media_id} status: {status}")
            
        except Exception as e:
            self.connection.rollback()
            logger.error(f"❌ Failed to update media status: {str(e)}")
            raise
        finally:
            cursor.close()
    
    def save_transcript(
        self,
        media_id: str,
        text: str,
        segments: List[Dict],
        language: str,
        confidence: float
    ) -> str:
        """
        Save transcript to database
        
        Args:
            media_id: Media UUID
            text: Full transcript text
            segments: List of transcript segments with timestamps
            language: Detected language
            confidence: Average confidence score
            
        Returns:
            Transcript UUID
        """
        try:
            cursor = self.connection.cursor()
            
            # Insert transcript
            cursor.execute(
                """
                INSERT INTO transcripts (media_id, text, segments, language, confidence)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                """,
                (media_id, text, Json(segments), language, confidence)
            )
            
            transcript_id = cursor.fetchone()[0]
            self.connection.commit()
            
            logger.info(f"💾 Saved transcript {transcript_id} for media {media_id}")
            return str(transcript_id)
            
        except Exception as e:
            self.connection.rollback()
            logger.error(f"❌ Failed to save transcript: {str(e)}")
            raise
        finally:
            cursor.close()
    
    def get_media(self, media_id: str) -> Optional[Dict]:
        """
        Get media information
        
        Args:
            media_id: Media UUID
            
        Returns:
            Media dict or None
        """
        try:
            cursor = self.connection.cursor()
            cursor.execute(
                """
                SELECT id, user_id, project_id, filename, original_s3_key, 
                       audio_s3_key, duration, status
                FROM media
                WHERE id = %s
                """,
                (media_id,)
            )
            
            row = cursor.fetchone()
            if row:
                return {
                    'id': str(row[0]),
                    'user_id': str(row[1]),
                    'project_id': str(row[2]),
                    'filename': row[3],
                    'original_s3_key': row[4],
                    'audio_s3_key': row[5],
                    'duration': row[6],
                    'status': row[7]
                }
            return None
            
        except Exception as e:
            logger.error(f"❌ Failed to get media: {str(e)}")
            raise
        finally:
            cursor.close()
