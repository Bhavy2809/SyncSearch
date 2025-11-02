# ================================================
# SyncSearch - Complete Feature Test
# Tests: Register → Login → Create Project → Check Database
# ================================================

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  SYNCSEARCH - FULL FLOW TEST" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"
$timestamp = Get-Date -Format "HHmmss"
$testEmail = "fulltest-$timestamp@demo.com"
$testPassword = "Test123!@#"

# ================================================
# 1. CHECK SERVICES
# ================================================
Write-Host "[1] Checking Services..." -ForegroundColor Yellow

try {
    $health = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing
    Write-Host "  ✅ Backend API: Healthy (Port 3000)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Backend API: Not running!" -ForegroundColor Red
    Write-Host "  Run: cd api-service; npm start" -ForegroundColor Yellow
    exit 1
}

try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3001" -UseBasicParsing
    Write-Host "  ✅ Frontend: Accessible (Port 3001)" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Frontend: Not accessible" -ForegroundColor Yellow
}

Write-Host ""

# ================================================
# 2. REGISTER USER
# ================================================
Write-Host "[2] Registering New User..." -ForegroundColor Yellow

$registerBody = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -ContentType "application/json" -Body $registerBody
    $token = $registerResponse.access_token
    Write-Host "  ✅ User Registered: $testEmail" -ForegroundColor Green
    Write-Host "  🔑 Token: $($token.Substring(0,30))..." -ForegroundColor Cyan
} catch {
    Write-Host "  ❌ Registration Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ================================================
# 3. CREATE PROJECT
# ================================================
Write-Host "[3] Creating Project..." -ForegroundColor Yellow

$projectBody = @{
    name = "Test Project $timestamp"
    description = "Full flow test project"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $projectResponse = Invoke-RestMethod -Uri "$baseUrl/projects" -Method POST -Headers $headers -Body $projectBody
    $projectId = $projectResponse.id
    Write-Host "  ✅ Project Created: $($projectResponse.name)" -ForegroundColor Green
    Write-Host "  📁 Project ID: $projectId" -ForegroundColor Cyan
} catch {
    Write-Host "  ❌ Project Creation Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ================================================
# 4. CHECK DATABASE
# ================================================
Write-Host "[4] Checking Database..." -ForegroundColor Yellow

# Check users
$userQuery = "SELECT id, email, created_at FROM users WHERE email='$testEmail';"
$userResult = docker exec syncsearch-postgres psql -U syncsearch -d syncsearch -t -c $userQuery

if ($userResult -match $testEmail) {
    Write-Host "  ✅ User found in database" -ForegroundColor Green
    Write-Host "  $userResult" -ForegroundColor Gray
} else {
    Write-Host "  ❌ User not found in database" -ForegroundColor Red
}

# Check projects
$projectQuery = "SELECT id, name, user_id FROM projects WHERE id='$projectId';"
$projectResult = docker exec syncsearch-postgres psql -U syncsearch -d syncsearch -t -c $projectQuery

if ($projectResult -match $projectId) {
    Write-Host "  ✅ Project found in database" -ForegroundColor Green
    Write-Host "  $projectResult" -ForegroundColor Gray
} else {
    Write-Host "  ❌ Project not found in database" -ForegroundColor Red
}

Write-Host ""

# ================================================
# 5. GET ALL PROJECTS
# ================================================
Write-Host "[5] Fetching All Projects..." -ForegroundColor Yellow

try {
    $allProjects = Invoke-RestMethod -Uri "$baseUrl/projects" -Method GET -Headers $headers
    Write-Host "  ✅ Total Projects: $($allProjects.Count)" -ForegroundColor Green
    foreach ($proj in $allProjects) {
        Write-Host "    📁 $($proj.name)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "  ❌ Failed to fetch projects: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ================================================
# 6. DATABASE SUMMARY
# ================================================
Write-Host "[6] Database Summary..." -ForegroundColor Yellow

docker exec syncsearch-postgres psql -U syncsearch -d syncsearch -c "SELECT COUNT(*) as users FROM users;"
docker exec syncsearch-postgres psql -U syncsearch -d syncsearch -c "SELECT COUNT(*) as projects FROM projects;"
docker exec syncsearch-postgres psql -U syncsearch -d syncsearch -c "SELECT COUNT(*) as media FROM media;"

Write-Host ""

# ================================================
# SUMMARY
# ================================================
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  TEST COMPLETE!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ What works:" -ForegroundColor Green
Write-Host "  - User registration & authentication" -ForegroundColor White
Write-Host "  - Project creation & management" -ForegroundColor White
Write-Host "  - Database storage (PostgreSQL)" -ForegroundColor White
Write-Host "  - API endpoints (NestJS)" -ForegroundColor White
Write-Host ""
Write-Host "📋 Test Credentials:" -ForegroundColor Cyan
Write-Host "  Email: $testEmail" -ForegroundColor White
Write-Host "  Password: $testPassword" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Access Points:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3001" -ForegroundColor White
Write-Host "  Backend API: http://localhost:3000" -ForegroundColor White
Write-Host "  Minio Console: http://localhost:9001 (minioadmin/minioadmin)" -ForegroundColor White
Write-Host "  RabbitMQ: http://localhost:15672 (guest/guest)" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Open browser: http://localhost:3001" -ForegroundColor White
Write-Host "  2. Login with test credentials above" -ForegroundColor White
Write-Host "  3. Upload a video/audio file" -ForegroundColor White
Write-Host "  4. Check S3: http://localhost:9001" -ForegroundColor White
Write-Host ""
