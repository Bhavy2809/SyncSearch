# Chat History - Projects Module Implementation (Phase 3)

**Date**: November 1, 2025  
**Session**: Projects Module CRUD Implementation  
**Duration**: ~2 hours  
**Status**: ✅ Complete - All 11 tests passing

---

## Initial Question
**User**: "how to check" (referring to Projects Module verification)

**Agent**: Offered to run comprehensive tests for the Projects Module

---

## User Confirmation
**User**: "yess please"

**Agent**: Started clean test sequence

---

## Problem-Solving Journey

### Issue #1: NULL user_id Constraint Violation
**Symptom**: INSERT query showed `DEFAULT` for user_id column
```sql
INSERT INTO "projects"(..., "user_id", ...) VALUES (..., DEFAULT, ...)
```

**Root Cause**: Conflicting TypeORM annotations - had BOTH:
- `@Column({ name: 'user_id' }) userId: string`
- `@ManyToOne(() => User) @JoinColumn({ name: 'user_id' }) user: User`

**Solution**: Removed the `@Column()` declaration, kept only the relation

---

### Issue #2: CurrentUser Decorator Returning Undefined
**Symptom**: `requestUserId: undefined` in authorization checks

**Root Cause**: JWT Strategy was returning:
```typescript
return { userId: payload.sub, email: payload.email };
```

But `@CurrentUser('id')` decorator was trying to extract `user.id` (not `user.userId`)

**Solution**: Changed JWT Strategy to return:
```typescript
return { id: payload.sub, email: payload.email };
```

---

### Issue #3: Authorization 403 Error on findOne()
**Symptom**: `resultUserId: null` when querying user_id

**Root Cause**: QueryBuilder wasn't properly extracting the foreign key value

**Solution**: Used proper QueryBuilder pattern with `getRawOne()`:
```typescript
const result = await this.projectsRepository
  .createQueryBuilder('project')
  .select('project.user_id', 'userId')
  .where('project.id = :id', { id })
  .getRawOne();
```

---

## Code Changes

### Files Created
1. `api-service/src/projects/dto/create-project.dto.ts` - Input validation
2. `api-service/src/projects/dto/update-project.dto.ts` - Partial update DTO
3. `api-service/src/projects/projects.service.ts` - Business logic (5 methods)
4. `api-service/src/projects/projects.controller.ts` - REST endpoints
5. `api-service/src/projects/projects.module.ts` - NestJS module config
6. `test-projects.js` - 11-step comprehensive test suite
7. `PHASE-3-COMPLETE.md` - Documentation

### Files Modified
1. `api-service/src/app.module.ts` - Imported ProjectsModule
2. `api-service/src/auth/strategies/jwt.strategy.ts` - Fixed return value (userId → id)
3. `api-service/src/database/project.entity.ts` - Removed duplicate column
4. `api-service/src/common/decorators/current-user.decorator.ts` - (Already correct)

---

## Final Test Results ✅

```
🧪 Testing Projects Module

📝 Step 1: Registering test user... ✅
📝 Step 2: Creating a project... ✅
📝 Step 3: Listing all projects... ✅
📝 Step 4: Getting project by ID... ✅
📝 Step 5: Updating project... ✅
📝 Step 6: Creating second project... ✅
📝 Step 7: Listing all projects again... ✅
📝 Step 8: Testing authorization (no token)... ✅
📝 Step 9: Testing validation (missing name)... ✅
📝 Step 10: Deleting first project... ✅
📝 Step 11: Verifying project was deleted... ✅

🎉 All tests passed!
```

---

## Key Learnings

### 1. TypeORM Relation Pattern
**Don't mix** `@Column()` and `@ManyToOne()` on the same database column. Use one or the other:

**Option A (Relation - Recommended)**:
```typescript
@ManyToOne(() => User, (user) => user.projects, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'user_id' })
user: User;
```

Set relation: `repository.create({ ...dto, user: { id: userId } })`

**Option B (Column - Simpler)**:
```typescript
@Column({ name: 'user_id' })
userId: string;
```

Set directly: `repository.create({ ...dto, userId })`

### 2. JWT Strategy & Decorators Must Align
The object returned by `JwtStrategy.validate()` becomes `request.user`.

If you use `@CurrentUser('id')`, ensure the strategy returns `{ id: ... }`

### 3. QueryBuilder for Foreign Keys
When you need raw column values (not loaded relations), use QueryBuilder:
```typescript
.createQueryBuilder('alias')
.select('alias.column_name', 'propertyName')
.getRawOne()
```

### 4. Multi-Tenancy Authorization Pattern
Every service method that operates on a resource should:
1. Accept `userId` as parameter
2. Verify ownership before any operation
3. Throw `ForbiddenException` if user doesn't own resource

---

## API Documentation

### Authentication
All routes require JWT Bearer token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Endpoints

#### Create Project
```http
POST /projects
Content-Type: application/json

{
  "name": "My Project",
  "description": "Optional description"
}

Response: 201 Created
{
  "id": "uuid",
  "name": "My Project",
  "description": "Optional description",
  "createdAt": "2025-11-01T...",
  "updatedAt": "2025-11-01T..."
}
```

#### List Projects
```http
GET /projects

Response: 200 OK
[
  { "id": "uuid", "name": "Project 1", ... },
  { "id": "uuid", "name": "Project 2", ... }
]
```

#### Get Single Project
```http
GET /projects/:id

Response: 200 OK (or 404 Not Found, 403 Forbidden)
{
  "id": "uuid",
  "name": "Project 1",
  ...
}
```

#### Update Project
```http
PATCH /projects/:id
Content-Type: application/json

{
  "name": "Updated Name"
}

Response: 200 OK
```

#### Delete Project
```http
DELETE /projects/:id

Response: 200 OK (or 404 Not Found, 403 Forbidden)
```

---

## Database Schema

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
```

---

## Next Steps: Phase 4 - Media Upload System

### Architecture Decision
Use **pre-signed S3 URLs** for direct client-to-S3 uploads:

```
Client → API (get pre-signed URL) → Client uploads directly to S3 → 
S3 Event Notification → RabbitMQ → media-worker (FFmpeg) → transcription-worker (Whisper)
```

### Tasks
1. Implement S3 pre-signed URL generation in `api-service`
2. Create Media entity and endpoints
3. Build `media-worker` with FFmpeg
4. Set up RabbitMQ job queue
5. Implement S3 event notifications

### Why Pre-Signed URLs?
- **No API bottleneck**: Large files (GB+) upload directly to S3
- **Scalability**: API doesn't handle file bytes
- **Security**: Short-lived URLs (5-15 min expiry)
- **Cost-effective**: No bandwidth through API servers

---

## Commands Used

### Database Management
```powershell
# Clean all tables
docker exec syncsearch-postgres psql -U syncsearch -d syncsearch -c "TRUNCATE TABLE transcripts, media, projects, users CASCADE;"
```

### Process Management
```powershell
# Kill process on port 3000
$process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($process) { Stop-Process -Id $process -Force }

# Clean background jobs
Get-Job | Stop-Job
Get-Job | Remove-Job
```

### Testing
```powershell
# Run comprehensive test
node test-projects.js

# Run API in background
Start-Job -ScriptBlock { cd api-service; npm run start:dev }
```

---

## Debugging Tips

### Check TypeORM Queries
Enable query logging in `database.config.ts`:
```typescript
logging: true, // Shows all SQL queries
```

### Check JWT Payload
Add logging to JwtStrategy:
```typescript
async validate(payload: JwtPayload) {
  console.log('JWT Payload:', payload);
  // ...
}
```

### Check Request User Object
Add logging to CurrentUser decorator:
```typescript
console.log('Request User:', request.user);
```

### Check Background Job Logs
```powershell
Get-Job | Receive-Job | Select-String -Pattern "error|ERROR"
```

---

## Project Status

### ✅ Completed Phases
- **Phase 1**: Database setup (PostgreSQL, TypeORM entities)
- **Phase 2**: Authentication (JWT, bcrypt, register/login)
- **Phase 3**: Projects Module (CRUD, authorization, validation)

### 🚀 Next Phases
- **Phase 4**: Media Upload System (S3, pre-signed URLs)
- **Phase 5**: Workers (media-worker with FFmpeg, transcription-worker with Whisper)
- **Phase 6**: Frontend (React dashboard, upload UI)
- **Phase 7**: Semantic Search (embeddings, vector database)

---

**Session Duration**: ~2 hours  
**Tests Run**: 11 comprehensive test cases  
**Bugs Fixed**: 3 major issues  
**Files Created**: 7 new files  
**Files Modified**: 4 existing files  
**Final Status**: ✅ All tests passing, ready for Phase 4

