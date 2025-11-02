# SyncSearch System Verification Script
# Tests all components of the full-stack application

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   SYNCSEARCH SYSTEM VERIFICATION" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$allHealthy = $true

# 1. INFRASTRUCTURE CHECKS
Write-Host "1️⃣  INFRASTRUCTURE (Docker Containers)" -ForegroundColor Yellow
Write-Host "   Checking Docker containers...`n" -ForegroundColor Gray

try {
    $containers = docker ps --format "{{.Names}},{{.Status}},{{.Ports}}" 2>$null
    
    $postgres = $containers | Select-String "syncsearch-postgres"
    $rabbitmq = $containers | Select-String "syncsearch-rabbitmq"
    $minio = $containers | Select-String "syncsearch-minio"
    
    if ($postgres) {
        Write-Host "   ✅ PostgreSQL: Running" -ForegroundColor Green
        Write-Host "      Port: 5432" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ PostgreSQL: NOT RUNNING" -ForegroundColor Red
        $allHealthy = $false
    }
    
    if ($rabbitmq) {
        Write-Host "   ✅ RabbitMQ: Running" -ForegroundColor Green
        Write-Host "      Port: 5672 (AMQP), 15672 (Management UI)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ RabbitMQ: NOT RUNNING" -ForegroundColor Red
        $allHealthy = $false
    }
    
    if ($minio) {
        Write-Host "   ✅ Minio S3: Running" -ForegroundColor Green
        Write-Host "      Ports: 9000 (API), 9001 (Console)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Minio S3: NOT RUNNING" -ForegroundColor Red
        $allHealthy = $false
    }
} catch {
    Write-Host "   ❌ Docker not available or error: $($_.Exception.Message)" -ForegroundColor Red
    $allHealthy = $false
}

Write-Host ""

# 2. BACKEND API CHECK
Write-Host "2️⃣  BACKEND API (NestJS)" -ForegroundColor Yellow
Write-Host "   Testing API endpoints...`n" -ForegroundColor Gray

try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get -TimeoutSec 5
    Write-Host "   ✅ API Service: RUNNING" -ForegroundColor Green
    Write-Host "      Status: $($health.status)" -ForegroundColor Gray
    Write-Host "      Service: $($health.service)" -ForegroundColor Gray
    Write-Host "      Time: $($health.timestamp)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ API Service: NOT RESPONDING" -ForegroundColor Red
    Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor Gray
    $allHealthy = $false
}

Write-Host ""

# Test Authentication Endpoint
try {
    $authTest = Invoke-WebRequest -Uri "http://localhost:3000/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"test","password":"test"}' -TimeoutSec 5 -ErrorAction SilentlyContinue
} catch {
    if ($_.Exception.Response.StatusCode -eq 401 -or $_.Exception.Response.StatusCode -eq 400) {
        Write-Host "   ✅ Auth Endpoint: ACCESSIBLE" -ForegroundColor Green
        Write-Host "      /auth/login responding (expected 400/401)" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  Auth Endpoint: Status $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

Write-Host ""

# 3. FRONTEND CHECK
Write-Host "3️⃣  FRONTEND (React App)" -ForegroundColor Yellow
Write-Host "   Testing React dev server...`n" -ForegroundColor Gray

try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3001" -Method Get -UseBasicParsing -TimeoutSec 5
    Write-Host "   ✅ Frontend: RUNNING" -ForegroundColor Green
    Write-Host "      Status: $($frontend.StatusCode)" -ForegroundColor Gray
    Write-Host "      URL: http://localhost:3001" -ForegroundColor Gray
    
    # Check if it's the React app
    if ($frontend.Content -like "*SyncSearch*") {
        Write-Host "      App: SyncSearch loaded ✓" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Frontend: NOT RESPONDING" -ForegroundColor Red
    Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor Gray
    $allHealthy = $false
}

Write-Host ""

# 4. WORKERS CHECK
Write-Host "[4] WORKERS (Media & Transcription)" -ForegroundColor Yellow
Write-Host "   Checking worker processes...`n" -ForegroundColor Gray

$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
$pythonProcesses = Get-Process -Name python* -ErrorAction SilentlyContinue

$apiService = $false
$frontendService = $false
$mediaWorker = $false
$transcriptionWorker = $false

if ($nodeProcesses) {
    foreach ($proc in $nodeProcesses) {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue).CommandLine
        if ($cmdLine -like "*api-service*") {
            $apiService = $true
        }
        if ($cmdLine -like "*web-app*") {
            $frontendService = $true
        }
        if ($cmdLine -like "*media-worker*") {
            $mediaWorker = $true
        }
    }
}

if ($pythonProcesses) {
    foreach ($proc in $pythonProcesses) {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue).CommandLine
        if ($cmdLine -like "*transcription-worker*") {
            $transcriptionWorker = $true
        }
    }
}

Write-Host "   Node.js Processes:" -ForegroundColor Gray
Write-Host "      API Service: $(if($apiService){'✅ Running'}else{'❌ Not Running'})" -ForegroundColor $(if($apiService){'Green'}else{'Red'})
Write-Host "      Frontend: $(if($frontendService){'✅ Running'}else{'❌ Not Running'})" -ForegroundColor $(if($frontendService){'Green'}else{'Red'})
Write-Host "      Media Worker: $(if($mediaWorker){'✅ Running'}else{'⚠️  Not Running (Optional)'})" -ForegroundColor $(if($mediaWorker){'Green'}else{'Yellow'})

Write-Host ""
Write-Host "   Python Processes:" -ForegroundColor Gray
Write-Host "      Transcription Worker: $(if($transcriptionWorker){'✅ Running'}else{'⚠️  Not Running (Optional)'})" -ForegroundColor $(if($transcriptionWorker){'Green'}else{'Yellow'})

Write-Host ""

# 5. DATABASE CONNECTION TEST
Write-Host "5️⃣  DATABASE (PostgreSQL)" -ForegroundColor Yellow
Write-Host "   Testing database connection...`n" -ForegroundColor Gray

try {
    $dbTest = docker exec syncsearch-postgres psql -U syncsearch -d syncsearch -c "SELECT COUNT(*) FROM users;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Database: CONNECTED" -ForegroundColor Green
        Write-Host "      Users table accessible" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Database: CONNECTION FAILED" -ForegroundColor Red
        $allHealthy = $false
    }
} catch {
    Write-Host "   ❌ Database: ERROR" -ForegroundColor Red
    Write-Host "      $($_.Exception.Message)" -ForegroundColor Gray
    $allHealthy = $false
}

Write-Host ""

# 6. SUMMARY
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SUMMARY" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($allHealthy) {
    Write-Host "✅ ALL CORE SERVICES ARE HEALTHY!" -ForegroundColor Green
} else {
    Write-Host "⚠️  SOME SERVICES NEED ATTENTION" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 QUICK COMMANDS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Start Infrastructure:" -ForegroundColor White
Write-Host "      docker-compose up -d" -ForegroundColor Gray
Write-Host ""
Write-Host "   Start Backend API:" -ForegroundColor White
Write-Host "      cd api-service; npm run start:dev" -ForegroundColor Gray
Write-Host ""
Write-Host "   Start Frontend:" -ForegroundColor White
Write-Host "      cd web-app; `$env:PORT=3001; npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "   Start Media Worker:" -ForegroundColor White
Write-Host "      cd media-worker; npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "   Start Transcription Worker:" -ForegroundColor White
Write-Host "      cd transcription-worker; python main.py" -ForegroundColor Gray
Write-Host ""
Write-Host "🌐 ACCESS POINTS:" -ForegroundColor Cyan
Write-Host "   Frontend:         http://localhost:3001" -ForegroundColor White
Write-Host "   Backend API:      http://localhost:3000" -ForegroundColor White
Write-Host "   RabbitMQ UI:      http://localhost:15672 (guest/guest)" -ForegroundColor White
Write-Host "   Minio Console:    http://localhost:9001 (minioadmin/minioadmin)" -ForegroundColor White
Write-Host ""
Write-Host "========================================`n" -ForegroundColor Cyan
