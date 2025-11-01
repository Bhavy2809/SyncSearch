# SyncSearch - AI Coding Agent Instructions

## Project Overview
SyncSearch is a cloud-native, asynchronous media processing and semantic search platform that unlocks knowledge trapped in video/audio files. Users upload media directly to S3, the system processes and transcribes it using self-hosted Whisper AI, and makes it semantically searchable.

## Architecture (AWS Cloud-Native + Event-Driven)

### Core Services
1. **web-app** (Frontend): React dashboard for authentication, project management, and media upload with direct-to-S3 capabilities
2. **api-service** (Node.js/NestJS): User management, billing (Stripe), generates pre-signed S3 URLs for direct client uploads
3. **storage-service**: AWS S3 for blob storage of original media files and processed audio
4. **job-queue**: RabbitMQ (Amazon MQ or self-hosted) for task distribution and async job orchestration
5. **media-worker** (Node.js): Dockerized workers that download from S3, extract audio with FFmpeg, re-upload to S3
6. **transcription-worker** (Python): Dockerized workers running self-hosted Whisper AI model (GPU-accelerated on AWS EC2 g4dn instances)
7. **database**: Amazon RDS PostgreSQL for metadata (users, projects, transcripts, embeddings)

### Data Flow Pattern
```
User Upload → api-service (pre-signed S3 URL) → S3 Direct Upload (client-side) → S3 Event Notification
→ RabbitMQ Job: "extract_audio" → media-worker (download, FFmpeg, re-upload) 
→ RabbitMQ Job: "transcribe" → transcription-worker (Whisper AI model)
→ PostgreSQL (transcript + timestamps) → RabbitMQ Job: "generate_embeddings" (Future Phase 2)
```

## Key Technical Decisions

### AWS Cloud-Native Architecture
- **S3 Direct Upload**: Frontend gets pre-signed URLs from `api-service`, uploads directly to S3 bucket (no API bottleneck)
- **RabbitMQ over Kafka**: Task queue pattern (not event streaming). RabbitMQ excels at job distribution with retry logic
- **Self-Hosted Whisper**: Python worker with OpenAI Whisper model in Docker. Shows AI model deployment skills (not just API calls)
- **ECS/EKS Deployment**: Run Dockerized workers on Amazon ECS (simpler) or EKS (Kubernetes) for horizontal scaling
- **GPU Instances**: Whisper worker runs on EC2 g4dn instances (NVIDIA T4 GPU) for 10x faster transcription

### File Upload Strategy
- **Never** handle large file uploads through the API directly
- Generate pre-signed S3/GCS URLs in `api-service` for client-side direct upload
- Use multipart upload for files >100MB
- API only stores metadata and triggers post-upload processing

### Asynchronous Processing
- All media processing happens via job queue (RabbitMQ/Kafka)
- Workers must be **idempotent** - jobs can retry on failure
- Job payload example: `{ media_id, s3_path, operation: "extract_audio" | "transcribe" }`
- Use dead-letter queues for failed jobs after N retries

### Docker & Scalability
- **media-worker** (Node.js): `FROM node:18-slim` + FFmpeg installed via apt-get
- **transcription-worker** (Python): `FROM nvidia/cuda:11.8.0-base-ubuntu22.04` + PyTorch + Whisper model
- Workers scale horizontally - 5 media-workers + 2 GPU transcription-workers can handle 100+ concurrent jobs
- Use Docker health checks (`HEALTHCHECK CMD curl --fail http://localhost:3000/health`) and graceful shutdown

### RabbitMQ Queue Design
- **Queues**: `media.extract_audio`, `media.transcribe`, `media.embed` (future)
- **Exchange**: Direct exchange with routing keys matching queue names
- **Retry Logic**: Use `x-message-ttl` and dead-letter exchange for failed jobs (retry 3x before DLQ)
- **Worker Pattern**: Each worker prefetches 1-5 jobs (`channel.prefetch(5)`), processes concurrently

## Development Workflows

### Local Development Setup
```bash
# Start infrastructure (PostgreSQL, RabbitMQ, Minio as S3 mock)
docker-compose up -d postgres rabbitmq minio

# Run services individually
cd api-service && npm run dev
cd media-worker && npm run dev
cd transcription-worker && python main.py
cd web-app && npm start
```

### AWS SDK Configuration (Node.js)
```javascript
// api-service: Generate pre-signed S3 upload URL
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({ region: 'us-east-1' });
const command = new PutObjectCommand({ Bucket: 'syncsearch-media', Key: `uploads/${mediaId}.mp4` });
const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 }); // 15 min
```

### FFmpeg in media-worker
- Install FFmpeg in Dockerfile: `RUN apt-get update && apt-get install -y ffmpeg`
- Audio extraction: `ffmpeg -i input.mp4 -vn -acodec libmp3lame -b:a 192k output.mp3`
- Always validate input files before processing (check mime types, file size <5GB limit)

### Whisper Transcription Worker (Python)
```python
# transcription-worker/worker.py
import whisper
model = whisper.load_model("base")  # or "medium" for better accuracy

def transcribe(audio_path):
    result = model.transcribe(audio_path, language="en", fp16=True)  # GPU acceleration
    return {
        "text": result["text"],
        "segments": result["segments"]  # Timestamps for each phrase
    }
```
- Use `fp16=True` for 2x speed on GPU (requires CUDA)
- Model sizes: `tiny` (fast), `base` (balanced), `medium`/`large` (accurate but slower)

### Database Patterns
- **Users Table**: `{ id, email, password_hash, stripe_customer_id, created_at }`
- **Projects Table**: `{ id, user_id, name, created_at }`
- **Media Table**: `{ id, project_id, filename, original_s3_key, audio_s3_key, duration, status: "uploading" | "processing" | "transcribing" | "complete" | "failed" }`
- **Transcripts Table**: `{ id, media_id, text, segments: jsonb, language, confidence, created_at }`
- Use database transactions when updating job status + writing results
- Index foreign keys (`user_id`, `project_id`, `media_id`) and `status` columns for fast queries

## Critical Conventions

### Environment Variables
- Never commit credentials - use `.env` files (ignored in git)
- Required vars: `DATABASE_URL`, `S3_BUCKET`, `S3_ACCESS_KEY`, `RABBITMQ_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`

### Error Handling in Workers
```javascript
// Workers must catch errors and decide: retry or dead-letter
try {
  await processMedia(job);
  channel.ack(msg); // Success - remove from queue
} catch (error) {
  if (isRetriable(error)) {
    channel.nack(msg, false, true); // Requeue
  } else {
    channel.nack(msg, false, false); // Dead-letter
    await logFailure(job, error);
  }
}
```

### API Authentication
- Use JWT tokens for user authentication
- Protect all `/api/*` routes except `/auth/login` and `/auth/register`
- Pre-signed URLs should be short-lived (5-15 minutes)

## Testing Approach
- **api-service**: Jest unit tests + Supertest integration tests
- **media-worker**: Mock S3 SDK and FFmpeg calls in tests
- Use Docker Compose for integration tests with real PostgreSQL + RabbitMQ

## Future Phase: Semantic Search
- Integrate vector database (Pinecone, Weaviate, or pgvector)
- Generate embeddings from transcript chunks
- Implement RAG (Retrieval-Augmented Generation) for intelligent query responses

## Common Pitfalls
- **Don't** block API responses waiting for media processing - always async via queue
- **Don't** store large files in PostgreSQL - use blob storage
- **Do** implement proper cleanup for failed uploads (orphaned S3 files)
- **Do** use streaming for large file downloads in workers (avoid memory overflow)
