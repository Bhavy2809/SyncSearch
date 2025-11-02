"""
S3 Service for downloading audio files
"""
import os
import boto3
from botocore.client import Config
from logger import logger
import config

class S3Service:
    def __init__(self):
        """Initialize S3 client"""
        self.s3_client = boto3.client(
            's3',
            endpoint_url=config.S3_ENDPOINT,
            aws_access_key_id=config.S3_ACCESS_KEY,
            aws_secret_access_key=config.S3_SECRET_KEY,
            region_name=config.S3_REGION,
            config=Config(signature_version='s3v4')
        )
        self.bucket = config.S3_BUCKET
        logger.info(f"✅ S3 client initialized (endpoint: {config.S3_ENDPOINT})")
    
    def download_file(self, s3_key: str, local_path: str) -> None:
        """
        Download a file from S3 to local filesystem
        
        Args:
            s3_key: S3 object key
            local_path: Local file path to save to
        """
        try:
            logger.info(f"📥 Downloading from S3: {s3_key} → {local_path}")
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            
            # Download file
            self.s3_client.download_file(self.bucket, s3_key, local_path)
            
            file_size = os.path.getsize(local_path)
            logger.info(f"✅ Downloaded {file_size} bytes from S3")
            
        except Exception as e:
            logger.error(f"❌ Failed to download from S3: {str(e)}")
            raise
    
    def file_exists(self, s3_key: str) -> bool:
        """
        Check if a file exists in S3
        
        Args:
            s3_key: S3 object key
            
        Returns:
            True if file exists, False otherwise
        """
        try:
            self.s3_client.head_object(Bucket=self.bucket, Key=s3_key)
            return True
        except:
            return False
