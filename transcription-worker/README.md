# 🎙️ Transcription Worker - Whisper AI

Python microservice that transcribes audio files using OpenAI's Whisper model.

## Features
- **Whisper AI Integration**: State-of-the-art speech recognition
- **Multiple Model Sizes**: tiny, base, small, medium, large
- **GPU Acceleration**: CUDA support for faster processing
- **Timestamped Segments**: Precise word-level timestamps
- **Language Detection**: Automatic language identification
- **Confidence Scores**: Quality metrics for each transcription
- **Retry Logic**: Automatic retry on transient failures
- **Graceful Shutdown**: Completes in-flight jobs before exit

## Architecture

```
RabbitMQ (media.transcribe queue)
           ↓
  Transcription Worker
           ↓
    Whisper AI Model
           ↓
   PostgreSQL (transcripts table)
```

## Installation

### Local Development

1. **Create virtual environment** (recommended):
```bash
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

3. **Download Whisper model** (first run):
```python
import whisper
whisper.load_model('base')  # Downloads ~150MB
```

4. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your settings
```

5. **Run the worker**:
```bash
python main.py
```

### Docker

```bash
# Build image
docker build -t transcription-worker .

# Run container
docker run -it --env-file .env transcription-worker

# Or use docker-compose
docker-compose up transcription-worker
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RABBITMQ_URL` | `amqp://syncsearch:devpassword@localhost:5672` | RabbitMQ connection URL |
| `S3_ENDPOINT` | `http://localhost:9000` | S3 endpoint (Minio for dev) |
| `S3_BUCKET` | `syncsearch-media` | S3 bucket name |
| `S3_ACCESS_KEY` | `minioadmin` | S3 access key |
| `S3_SECRET_KEY` | `minioadmin` | S3 secret key |
| `DATABASE_HOST` | `localhost` | PostgreSQL host |
| `DATABASE_PORT` | `5432` | PostgreSQL port |
| `DATABASE_NAME` | `syncsearch` | Database name |
| `DATABASE_USER` | `syncsearch` | Database user |
| `DATABASE_PASSWORD` | `devpassword` | Database password |
| `WHISPER_MODEL` | `base` | Whisper model size |
| `WHISPER_LANGUAGE` | `en` | Target language (or auto-detect) |
| `WHISPER_DEVICE` | `cpu` | Device (cpu or cuda) |
| `TEMP_DIR` | `./tmp` | Temporary directory for audio files |
| `MAX_RETRIES` | `3` | Maximum retry attempts |
| `RETRY_DELAY` | `5` | Delay between retries (seconds) |

### Whisper Models

| Model | Size | VRAM | Speed | Accuracy |
|-------|------|------|-------|----------|
| `tiny` | 39 MB | ~1 GB | Fastest | Basic |
| `base` | 74 MB | ~1 GB | Fast | Good |
| `small` | 244 MB | ~2 GB | Medium | Better |
| `medium` | 769 MB | ~5 GB | Slow | Great |
| `large` | 1550 MB | ~10 GB | Slowest | Best |

**Recommendation**: Use `base` for development, `medium` or `large` for production.

## Processing Pipeline

### 4-Step Workflow

```python
1. Fetch media info from database
2. Download audio file from S3
3. Transcribe with Whisper AI
   - Load audio
   - Run inference
   - Extract segments with timestamps
4. Save transcript to database
   - Full text
   - Timestamped segments
   - Language & confidence
   - Update media status to COMPLETE
```

### Job Format

Jobs consumed from RabbitMQ queue:

```json
{
  "mediaId": "uuid-here",
  "userId": "uuid-here",
  "projectId": "uuid-here",
  "s3Key": "uploads/user/project/file-audio.mp3",
  "operation": "transcribe"
}
```

### Transcript Output

Saved to database:

```json
{
  "text": "Full transcript text here...",
  "segments": [
    {
      "start": 0.0,
      "end": 2.5,
      "text": "Hello world",
      "confidence": 0.95
    }
  ],
  "language": "en",
  "confidence": 0.93
}
```

## GPU Acceleration

### CUDA Setup (Optional)

For 10x faster transcription on NVIDIA GPUs:

1. **Install CUDA Toolkit** (11.8 or later)
2. **Install PyTorch with CUDA**:
```bash
pip install torch==2.1.0+cu118 torchaudio==2.1.0+cu118 --index-url https://download.pytorch.org/whl/cu118
```

3. **Set device in .env**:
```bash
WHISPER_DEVICE=cuda
```

4. **Use CUDA Docker image**:
```dockerfile
FROM nvidia/cuda:11.8.0-base-ubuntu22.04
```

### Performance

| Setup | Base Model | Medium Model |
|-------|------------|--------------|
| CPU (Intel i7) | ~1x realtime | ~0.2x realtime |
| GPU (RTX 3060) | ~10x realtime | ~3x realtime |
| GPU (A100) | ~50x realtime | ~15x realtime |

## Logging

Structured logging with timestamps:

```
2025-01-11 22:00:00 - transcription-worker - INFO - ✅ RabbitMQ connected
2025-01-11 22:00:00 - transcription-worker - INFO - ✅ Whisper model loaded (device: cpu)
2025-01-11 22:00:01 - transcription-worker - INFO - 📥 Received job: abc-123 (transcribe)
2025-01-11 22:00:01 - transcription-worker - INFO - 🎙️  Transcribing audio: tmp/abc-123-audio.mp3
2025-01-11 22:00:15 - transcription-worker - INFO - ✅ Transcription complete:
2025-01-11 22:00:15 - transcription-worker - INFO -    Language: en
2025-01-11 22:00:15 - transcription-worker - INFO -    Segments: 42
2025-01-11 22:00:15 - transcription-worker - INFO -    Confidence: 93.5%
```

## Error Handling

### Retry Logic

1. **Transient Errors**: Retry up to 3 times (configurable)
2. **Permanent Errors**: Send to dead-letter queue
3. **Database Updates**: Always update status to FAILED on error
4. **Temp File Cleanup**: Always cleanup in finally block

### Common Issues

**Issue**: `FileNotFoundError: Audio file not found`
- **Solution**: Ensure media-worker completed audio extraction first

**Issue**: `CUDA out of memory`
- **Solution**: Use smaller model or switch to CPU

**Issue**: `RabbitMQ connection refused`
- **Solution**: Ensure RabbitMQ is running on correct port

**Issue**: `S3 access denied`
- **Solution**: Check S3 credentials in .env

## Testing

### Manual Test

1. **Upload a video** through the API
2. **Wait for audio extraction** (media-worker)
3. **Check RabbitMQ** for transcribe job
4. **Watch worker logs** for processing
5. **Query database** for transcript

### Check Transcript

```bash
# PostgreSQL
docker exec -it syncsearch-postgres psql -U syncsearch -d syncsearch

# Query transcripts
SELECT id, media_id, language, confidence, 
       LEFT(text, 100) as preview
FROM transcripts
ORDER BY created_at DESC
LIMIT 5;
```

## Production Deployment

### AWS Deployment

1. **EC2 Instance**: Use GPU instances (g4dn.xlarge or better)
2. **ECS/EKS**: Deploy as container with GPU support
3. **S3**: Use real S3 (not Minio)
4. **RDS**: Use managed PostgreSQL
5. **Amazon MQ**: Use managed RabbitMQ

### Scaling

- **Horizontal**: Run multiple workers (1 per GPU)
- **Vertical**: Use larger models for better accuracy
- **Batch Processing**: Process multiple files in parallel
- **Warm Start**: Keep model loaded in memory

### Monitoring

- **CloudWatch**: Log aggregation and metrics
- **Prometheus**: Queue depth and processing time
- **Datadog**: End-to-end tracing
- **Sentry**: Error tracking

## File Structure

```
transcription-worker/
├── main.py                 # Entry point
├── worker.py               # Main orchestration
├── config.py               # Configuration
├── logger.py               # Logging setup
├── s3_service.py          # S3 download
├── database_service.py    # PostgreSQL operations
├── whisper_service.py     # Whisper AI integration
├── queue_service.py       # RabbitMQ consumer
├── requirements.txt       # Python dependencies
├── Dockerfile             # Docker configuration
├── .env                   # Environment variables
└── tmp/                   # Temporary audio files
```

## Dependencies

- **openai-whisper**: OpenAI's speech recognition model
- **torch**: PyTorch for ML inference
- **pika**: RabbitMQ client
- **boto3**: AWS S3 client
- **psycopg2**: PostgreSQL driver
- **python-dotenv**: Environment configuration

## License

MIT License - See LICENSE file for details

---

**Built with ❤️ using OpenAI Whisper**
