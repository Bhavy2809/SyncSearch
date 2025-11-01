# Phase 4: Media Upload System - COMPLETE ✅

## Summary
Successfully built a production-ready media upload system with direct-to-S3 uploads, pre-signed URLs, RabbitMQ job queue integration, and complete authorization.

## What Was Built

### 1. S3 Service (`s3.service.ts`)
AWS SDK integration for Minio/S3:
- **`generateUploadUrl()`**: Creates pre-signed URLs for direct client uploads (15-min expiry)
- **`generateDownloadUrl()`**: Creates pre-signed URLs for secure downloads
- **`generateMediaKey()`**: Organizes S3 paths: `uploads/{userId}/{projectId}/{timestamp}-{filename}`
- **`generateAudioKey()`**: Generates paths for extracted audio files
- Supports both Minio (local dev) and AWS S3 (production)

### 2. Queue Service (`queue.service.ts`)
RabbitMQ integration for async job processing:
- **Direct exchange pattern** with durable queues
- **3 Queues configured**:
  - `media.extract_audio` - FFmpeg audio extraction
  - `media.transcribe` - Whisper AI transcription
  - `media.embeddings` - Vector embeddings (future)
- **Dead-letter exchange** for failed jobs (1-hour TTL)
- **Job payload**: `{ mediaId, userId, projectId, s3Key, operation }`
- Graceful degradation if RabbitMQ is unavailable

### 3. Media Service (`media.service.ts`)
Business logic for media management:
- **`initializeUpload()`**: 
  1. Verify project ownership
  2. Create media record with UPLOADING status
  3. Generate S3 key
  4. Return pre-signed URL to client
- **`confirmUpload()`**:
  1. Update status to PROCESSING
  2. Publish job to `media.extract_audio` queue
- **`findAllByProject()`**: List media with authorization
- **`findOne()`**: Get single media with ownership check
- **`remove()`**: Delete media (CASCADE from database)
- **`updateStatus()`**: Worker callback to update status
- **`updateAudioKey()`**: Worker callback after audio extraction

### 4. Media Controller (`media.controller.ts`)
REST API endpoints (all JWT-protected):
- **POST** `/media/upload-url` - Initialize upload, get pre-signed URL
- **POST** `/media/:id/confirm` - Confirm S3 upload complete
- **GET** `/media?projectId=xxx` - List media for project
- **GET** `/media/:id` - Get single media file
- **DELETE** `/media/:id` - Delete media file

### 5. DTOs
- **`CreateMediaDto`**: Validates upload initialization
  - `projectId` (required)
  - `filename` (required, max 255 chars)
  - `mimeType` (optional, validated list)
  - `filesize` (optional)
- **`UploadUrlResponseDto`**: Pre-signed URL response
  - `mediaId`, `uploadUrl`, `expiresIn`, `s3Key`

## 📊 Upload Flow Architecture

```
┌──────────┐      1. POST /media/upload-url        ┌─────────────┐
│  Client  │─────────────────────────────────────>│ API Service │
│ (React)  │<─────────────────────────────────────│   (NestJS)  │
└──────────┘    2. { uploadUrl, mediaId }          └─────────────┘
      │                                                     │
      │                                                     │ 3. Create media
      │                                                     │    record (UPLOADING)
      │                                                     ▼
      │                                              ┌─────────────┐
      │         4. PUT to pre-signed URL            │  PostgreSQL │
      │────────────────────────────────────────────>└─────────────┘
      │                                                     │
      │                                              ┌──────────┐
      │                                              │ Minio/S3 │
      │<─────────────────────────────────────────────└──────────┘
      │         5. Upload complete (200 OK)               
      │
      │         6. POST /media/:id/confirm          ┌─────────────┐
      └────────────────────────────────────────────>│ API Service │
                                                     └─────────────┘
                                                           │
                                                           │ 7. Update status
                                                           │    (PROCESSING)
                                                           ▼
                                                    ┌─────────────┐
                                                    │  PostgreSQL │
                                                    └─────────────┘
                                                           │
                                                           │ 8. Publish job
                                                           ▼
                                                    ┌─────────────┐
                                                    │  RabbitMQ   │
                                                    │ Queue:      │
                                                    │ extract_    │
                                                    │ audio       │
                                                    └─────────────┘
                                                           │
                                                           │ 9. Worker picks up
                                                           ▼
                                                    ┌─────────────┐
                                                    │media-worker │
                                                    │  (Phase 5)  │
                                                    └─────────────┘
```

## Key Technical Decisions

### Direct-to-S3 Upload Pattern
**Why not upload through API?**
- ❌ **API Bottleneck**: Large files (GB+) would overwhelm Node.js servers
- ❌ **Memory Issues**: Buffering large files causes OOM crashes
- ❌ **Bandwidth Costs**: Traffic through API servers is expensive
- ✅ **Direct Upload**: Client uploads directly to S3, API only handles metadata
- ✅ **Scalability**: Handles thousands of concurrent uploads
- ✅ **Cost-Effective**: No bandwidth through application servers

### Pre-Signed URLs
- **Short-lived**: 15-minute expiry (security)
- **Single-use**: Each upload gets unique URL
- **No credentials exposed**: Client never sees AWS keys
- **Auditable**: S3 logs every access

### S3 Key Structure
```
uploads/{userId}/{projectId}/{timestamp}-{filename}
```
**Benefits**:
- Easy to identify owner
- Group by project
- Prevent filename collisions (timestamp)
- Simple to implement S3 lifecycle policies

### Job Queue Pattern
**Why async processing?**
- Audio extraction takes 10-60 seconds (FFmpeg)
- API should respond immediately (< 200ms)
- Workers can scale independently
- Retry failed jobs automatically
- Monitor queue depth for scaling

### Media Status States
```typescript
enum MediaStatus {
  UPLOADING    = 'uploading',    // Pre-signed URL generated
  PROCESSING   = 'processing',   // FFmpeg audio extraction
  TRANSCRIBING = 'transcribing', // Whisper AI (Phase 5)
  COMPLETE     = 'complete',     // Ready for search
  FAILED       = 'failed',       // Error occurred
}
```

## Test Results
✅ **All 12 tests passing** 🎉

```
📊 Test Coverage:
✅ Media upload initialization
✅ Pre-signed URL generation (900s expiry)
✅ S3 key generation with proper structure
✅ Media listing by project
✅ Media retrieval by ID
✅ Upload confirmation
✅ RabbitMQ job publishing
✅ Status transitions (UPLOADING → PROCESSING)
✅ Authorization checks (project ownership)
✅ Validation checks (required fields)
✅ Media deletion
✅ 404 handling for deleted media
```

## Database Schema Updates
Media table already existed, no schema changes needed:
```sql
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_s3_key VARCHAR(500) NOT NULL,
  audio_s3_key VARCHAR(500),
  duration INT, -- seconds
  filesize BIGINT, -- bytes
  mime_type VARCHAR(100),
  status VARCHAR(20) DEFAULT 'uploading',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Examples

### 1. Initialize Upload
```bash
POST /media/upload-url
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "projectId": "cd156b67-c510-4aa3-8683-26098ef4aeed",
  "filename": "my-video.mp4",
  "mimeType": "video/mp4",
  "filesize": 52428800
}

Response: 201 Created
{
  "mediaId": "c3e2eca2-b3a6-4801-a255-44bacc3e84ff",
  "uploadUrl": "http://localhost:9000/syncsearch-media/uploads/...?X-Amz-Signature=...",
  "expiresIn": 900,
  "s3Key": "uploads/42da4df0-.../1762013845729-my-video.mp4"
}
```

### 2. Upload to S3 (Client-side)
```javascript
// Client uploads directly to S3 using pre-signed URL
const file = document.getElementById('file-input').files[0];
await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type }
});
```

### 3. Confirm Upload
```bash
POST /media/c3e2eca2-b3a6-4801-a255-44bacc3e84ff/confirm
Authorization: Bearer <JWT_TOKEN>

Response: 200 OK
{
  "id": "c3e2eca2-b3a6-4801-a255-44bacc3e84ff",
  "filename": "my-video.mp4",
  "status": "processing",
  "originalS3Key": "uploads/42da4df0-.../1762013845729-my-video.mp4",
  "createdAt": "2025-11-01T..."
}
```

### 4. List Media
```bash
GET /media?projectId=cd156b67-c510-4aa3-8683-26098ef4aeed
Authorization: Bearer <JWT_TOKEN>

Response: 200 OK
[
  {
    "id": "c3e2eca2-b3a6-4801-a255-44bacc3e84ff",
    "filename": "my-video.mp4",
    "status": "processing",
    "filesize": 52428800,
    "createdAt": "2025-11-01T..."
  }
]
```

### 5. Delete Media
```bash
DELETE /media/c3e2eca2-b3a6-4801-a255-44bacc3e84ff
Authorization: Bearer <JWT_TOKEN>

Response: 200 OK
{
  "message": "Media deleted successfully"
}
```

## RabbitMQ Integration

### Queue Configuration
```javascript
Exchange: "syncsearch" (direct, durable)
Queues:
  - media.extract_audio (durable, TTL: 1h, DLX enabled)
  - media.transcribe (durable, TTL: 1h, DLX enabled)
  - media.embeddings (durable, TTL: 1h, DLX enabled)
```

### Job Payload
```json
{
  "mediaId": "c3e2eca2-b3a6-4801-a255-44bacc3e84ff",
  "userId": "42da4df0-70e8-4f48-a31f-fc83d0ba0417",
  "projectId": "cd156b67-c510-4aa3-8683-26098ef4aeed",
  "s3Key": "uploads/42da4df0-.../1762013845729-my-video.mp4",
  "operation": "extract_audio"
}
```

### Viewing Queue Management UI
RabbitMQ Management Interface:
```
URL: http://localhost:15672
Username: syncsearch
Password: devpassword
```

## Security Features

### Authorization
- ✅ JWT required on all endpoints
- ✅ Project ownership verified before upload
- ✅ Media ownership verified on read/delete
- ✅ Multi-tenant isolation (users can't access others' media)

### S3 Security
- ✅ Pre-signed URLs expire after 15 minutes
- ✅ AWS credentials never exposed to client
- ✅ S3 bucket not publicly accessible
- ✅ Each upload gets unique key (no overwrites)

### Validation
- ✅ Filename length limited (255 chars)
- ✅ MIME type validated against whitelist
- ✅ Project ID must exist and belong to user
- ✅ Media ID validated on all operations

## Environment Variables Required

```env
# S3/Minio Configuration
S3_ENDPOINT=http://localhost:9000  # or https://s3.amazonaws.com for AWS
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET_NAME=syncsearch-media

# RabbitMQ Configuration
RABBITMQ_URL=amqp://syncsearch:devpassword@localhost:5672
```

## Files Created/Modified

### Created Files (9 new files):
1. `api-service/src/media/dto/create-media.dto.ts` - Upload initialization DTO
2. `api-service/src/media/dto/upload-url-response.dto.ts` - Response DTO
3. `api-service/src/media/s3.service.ts` - S3 pre-signed URL generation
4. `api-service/src/media/queue.service.ts` - RabbitMQ producer
5. `api-service/src/media/media.service.ts` - Business logic
6. `api-service/src/media/media.controller.ts` - REST endpoints
7. `api-service/src/media/media.module.ts` - NestJS module
8. `test-media.js` - Comprehensive test suite
9. `PHASE-4-COMPLETE.md` - This documentation

### Modified Files:
1. `api-service/src/app.module.ts` - Added MediaModule import
2. `api-service/package.json` - Added AWS SDK and amqplib dependencies

## Next Steps: Phase 5 - Media Worker

### Architecture
```
RabbitMQ Queue → media-worker (Node.js + FFmpeg) → S3 Audio Storage
```

### Tasks for Phase 5
1. **Build media-worker Docker image**
   - Node.js base image
   - Install FFmpeg via apt-get
   - Copy worker code

2. **Implement RabbitMQ Consumer**
   - Connect to queue: `media.extract_audio`
   - Prefetch 1-3 jobs concurrently
   - Retry logic with exponential backoff

3. **FFmpeg Audio Extraction**
   - Download from S3
   - Extract audio: `ffmpeg -i input.mp4 -vn -acodec libmp3lame -b:a 192k output.mp3`
   - Get duration metadata
   - Upload to S3

4. **Database Callbacks**
   - Update media status: PROCESSING → TRANSCRIBING
   - Set `audio_s3_key` and `duration`
   - Handle errors (update to FAILED with error message)

5. **Publish Next Job**
   - After audio extraction complete
   - Publish to `media.transcribe` queue
   - Pass audio S3 key to transcription worker

### Estimated Time: 2-3 hours
### Complexity: Medium (Docker, FFmpeg, streaming S3)

---

**Status**: Phase 4 Complete ✅  
**Date**: November 1, 2025  
**Test Results**: 12/12 Passing ✅  
**Next Phase**: Media Worker (FFmpeg Audio Extraction)
