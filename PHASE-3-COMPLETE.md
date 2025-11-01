# Phase 3: Projects Module - COMPLETE ✅

## Summary
Successfully built and tested a complete Projects Module with full CRUD operations, JWT authentication, multi-tenancy, and comprehensive validation.

## What Was Built

### 1. DTOs (Data Transfer Objects)
- **`create-project.dto.ts`**: Validates project creation requests
  - `name`: Required string (max 100 characters)
  - `description`: Optional text (max 500 characters)
- **`update-project.dto.ts`**: All fields optional for partial updates

### 2. Service Layer (`projects.service.ts`)
- **`create(userId, dto)`**: Creates project owned by authenticated user
- **`findAllByUser(userId)`**: Lists all projects for the user, ordered by creation date
- **`findOne(id, userId)`**: Gets single project with ownership verification
- **`update(id, userId, dto)`**: Updates project after authorization check
- **`remove(id, userId)`**: Deletes project (CASCADE to media/transcripts)

### 3. Controller Layer (`projects.controller.ts`)
All routes protected with `@UseGuards(JwtAuthGuard)`:
- **POST** `/projects` - Create project
- **GET** `/projects` - List user's projects
- **GET** `/projects/:id` - Get single project
- **PATCH** `/projects/:id` - Update project
- **DELETE** `/projects/:id` - Delete project

### 4. Database Entity (`project.entity.ts`)
- Uses TypeORM `@ManyToOne` relation to User entity
- Foreign key: `user_id` with `CASCADE` on delete
- Timestamps: `created_at`, `updated_at`
- Relations: User (many-to-one), Media (one-to-many)

## Key Technical Decisions

### TypeORM Relation Pattern
**Problem**: Mixing `@Column()` and `@ManyToOne()` on the same database column caused TypeORM to insert `DEFAULT` for `user_id`.

**Solution**: Use **only** the `@ManyToOne()` relation (removed the `@Column({ name: 'user_id' }) userId` field):
```typescript
@ManyToOne(() => User, (user) => user.projects, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'user_id' })
user: User;
```

**Service Pattern**: Set relation using partial object:
```typescript
const project = repository.create({
  ...createProjectDto,
  user: { id: userId } as any, // TypeORM handles the FK
});
```

### JWT Strategy Return Value
**Problem**: JWT strategy returned `{ userId: ..., email: ... }` but `@CurrentUser('id')` tried to extract `user.id` (undefined).

**Solution**: Changed JWT strategy to return `{ id: ..., email: ... }` to match decorator expectations.

### Authorization Pattern
Uses a two-query approach in `findOne()`:
1. First query: Get the project entity
2. Second query: Get `user_id` via `QueryBuilder.getRawOne()` for authorization check

This avoids loading the entire User relation just for ownership verification.

## Test Results
✅ **All 11 tests passed:**
1. User registration
2. Project creation
3. Project listing
4. Project retrieval by ID
5. Project updating
6. Creating second project
7. Listing multiple projects
8. Authorization check (no token → 401)
9. Validation check (missing name → 400)
10. Project deletion
11. Verify deletion (404 after delete)

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
```

## API Examples

### Create Project
```bash
POST /projects
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "name": "My Video Library",
  "description": "Collection of training videos"
}

Response: 201 Created
{
  "id": "uuid",
  "name": "My Video Library",
  "description": "Collection of training videos",
  "createdAt": "2025-01-11T...",
  "updatedAt": "2025-01-11T..."
}
```

### List Projects
```bash
GET /projects
Authorization: Bearer <JWT_TOKEN>

Response: 200 OK
[
  {
    "id": "uuid",
    "name": "My Video Library",
    "createdAt": "2025-01-11T..."
  }
]
```

### Update Project
```bash
PATCH /projects/:id
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "name": "Updated Name"
}

Response: 200 OK
```

### Delete Project
```bash
DELETE /projects/:id
Authorization: Bearer <JWT_TOKEN>

Response: 200 OK (or 204 No Content)
```

## Security Features
- **JWT Authentication**: All routes require valid JWT token
- **Multi-Tenancy**: Users can only access their own projects
- **Authorization Checks**: Every read/update/delete verifies ownership
- **Validation**: class-validator decorators prevent invalid data
- **SQL Injection Protection**: TypeORM parameterized queries

## Next Steps: Phase 4 - Media Upload System
1. Generate pre-signed S3 URLs in `api-service`
2. Implement direct-to-S3 upload flow in `web-app`
3. Create `media-worker` with FFmpeg for audio extraction
4. Set up RabbitMQ job queue for async processing

## Bugs Fixed During Development
1. ❌ **CurrentUser decorator not extracting properties** → ✅ Added `data` parameter handling
2. ❌ **TypeORM inserting DEFAULT for user_id** → ✅ Removed conflicting `@Column()`, kept only relation
3. ❌ **JWT strategy returning wrong property name** → ✅ Changed `userId` to `id`
4. ❌ **Database with NULL user_id rows** → ✅ `TRUNCATE TABLE` cleanup
5. ❌ **Port 3000 occupied by orphaned process** → ✅ PowerShell cleanup script

## Files Created/Modified
**Created:**
- `api-service/src/projects/dto/create-project.dto.ts`
- `api-service/src/projects/dto/update-project.dto.ts`
- `api-service/src/projects/projects.service.ts`
- `api-service/src/projects/projects.controller.ts`
- `api-service/src/projects/projects.module.ts`
- `test-projects.js` (comprehensive test suite)

**Modified:**
- `api-service/src/app.module.ts` (imported ProjectsModule)
- `api-service/src/common/decorators/current-user.decorator.ts` (property extraction)
- `api-service/src/auth/strategies/jwt.strategy.ts` (fixed return value)
- `api-service/src/database/project.entity.ts` (removed conflicting column)

---
**Status**: Phase 3 Complete ✅  
**Date**: January 11, 2025  
**Next Phase**: Media Upload System (Phase 4)
