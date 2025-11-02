"""
Configuration for Transcription Worker
"""
import os
from dotenv import load_dotenv

load_dotenv()

# RabbitMQ Configuration
RABBITMQ_URL = os.getenv('RABBITMQ_URL', 'amqp://syncsearch:devpassword@localhost:5672')
RABBITMQ_QUEUE = 'media.transcribe'
RABBITMQ_EXCHANGE = 'syncsearch'
RABBITMQ_PREFETCH = 1  # Process 1 job at a time (Whisper is CPU/GPU intensive)

# S3 Configuration
S3_ENDPOINT = os.getenv('S3_ENDPOINT', 'http://localhost:9000')
S3_BUCKET = os.getenv('S3_BUCKET', 'syncsearch-media')
S3_ACCESS_KEY = os.getenv('S3_ACCESS_KEY', 'minioadmin')
S3_SECRET_KEY = os.getenv('S3_SECRET_KEY', 'minioadmin')
S3_REGION = os.getenv('S3_REGION', 'us-east-1')

# Database Configuration
DATABASE_HOST = os.getenv('DATABASE_HOST', 'localhost')
DATABASE_PORT = int(os.getenv('DATABASE_PORT', '5432'))
DATABASE_NAME = os.getenv('DATABASE_NAME', 'syncsearch')
DATABASE_USER = os.getenv('DATABASE_USER', 'syncsearch')
DATABASE_PASSWORD = os.getenv('DATABASE_PASSWORD', 'devpassword')

# Whisper Configuration
WHISPER_MODEL = os.getenv('WHISPER_MODEL', 'base')  # tiny, base, small, medium, large
WHISPER_LANGUAGE = os.getenv('WHISPER_LANGUAGE', 'en')  # Auto-detect if None
WHISPER_DEVICE = os.getenv('WHISPER_DEVICE', 'cpu')  # cpu or cuda

# Worker Configuration
TEMP_DIR = os.getenv('TEMP_DIR', './tmp')
MAX_RETRIES = int(os.getenv('MAX_RETRIES', '3'))
RETRY_DELAY = int(os.getenv('RETRY_DELAY', '5'))  # seconds
