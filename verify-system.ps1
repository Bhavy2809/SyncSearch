# SyncSearch System Verification Script
# Tests all components of the full-stack application

Write-Host "`n========================================"
Write-Host "   SYNCSEARCH SYSTEM VERIFICATION"
Write-Host "========================================`n"

$allHealthy = $true

# 1. INFRASTRUCTURE CHECKS
Write-Host "[1] INFRASTRUCTURE (Docker Containers)" -ForegroundColor Yellow
Write-Host "    Checking Docker containers...`n"

try {
    $containers = docker ps --format "{{.Names}},{{.Status}},{{.Ports}}" 2>$null
    
    $postgres = $containers | Select-String "syncsearch-postgres"
    $rabbitmq = $containers | Select-String "syncsearch-rabbitmq"
    $minio = $containers | Select-String "syncsearch-minio"
    
    if ($postgres) {
        Write-Host "    [OK] PostgreSQL: Running (Port 5432)" -ForegroundColor Green
    } else {
        Write-Host "    [FAIL] PostgreSQL: NOT RUNNING" -ForegroundColor Red
        $allHealthy = $false
    }
    
    if ($rabbitmq) {
        Write-Host "    [OK] RabbitMQ: Running (Port 5672, 15672)" -ForegroundColor Green
    } else {
        Write-Host "    [FAIL] RabbitMQ: NOT RUNNING" -ForegroundColor Red
        $allHealthy = $false
    }
    
    if ($minio) {
        Write-Host "    [OK] Minio S3: Running (Port 9000, 9001)" -ForegroundColor Green
    } else {
        Write-Host "    [FAIL] Minio S3: NOT RUNNING" -ForegroundColor Red
        $allHealthy = $false
    }
} catch {
    Write-Host "    [ERROR] Docker: $($_.Exception.Message)" -ForegroundColor Red
    $allHealthy = $false
}

Write-Host ""

# 2. BACKEND API CHECK
Write-Host "[2] BACKEND API (NestJS)" -ForegroundColor Yellow
Write-Host "    Testing API endpoints...`n"

try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get -TimeoutSec 5
    Write-Host "    [OK] API Service: RUNNING" -ForegroundColor Green
    Write-Host "         Status: $($health.status)"
    Write-Host "         URL: http://localhost:3000"
} catch {
    Write-Host "    [FAIL] API Service: NOT RESPONDING" -ForegroundColor Red
    Write-Host "           $($_.Exception.Message)" -ForegroundColor Gray
    $allHealthy = $false
}

# Test Authentication Endpoint
try {
    $null = Invoke-WebRequest -Uri "http://localhost:3000/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"test","password":"test"}' -TimeoutSec 5 -ErrorAction SilentlyContinue
} catch {
    if ($_.Exception.Response.StatusCode -eq 401 -or $_.Exception.Response.StatusCode -eq 400) {
        Write-Host "    [OK] Auth Endpoint: /auth/login accessible" -ForegroundColor Green
    } else {
        Write-Host "    [WARN] Auth Endpoint: Status $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

Write-Host ""

# 3. FRONTEND CHECK
Write-Host "[3] FRONTEND (React App)" -ForegroundColor Yellow
Write-Host "    Testing React dev server...`n"

try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3001" -Method Get -UseBasicParsing -TimeoutSec 5
    Write-Host "    [OK] Frontend: RUNNING" -ForegroundColor Green
    Write-Host "         Status: $($frontend.StatusCode)"
    Write-Host "         URL: http://localhost:3001"
    
    if ($frontend.Content -like "*SyncSearch*") {
        Write-Host "         App: SyncSearch loaded successfully"
    }
} catch {
    Write-Host "    [FAIL] Frontend: NOT RESPONDING" -ForegroundColor Red
    Write-Host "           $($_.Exception.Message)" -ForegroundColor Gray
    $allHealthy = $false
}

Write-Host ""

# 4. WORKERS CHECK
Write-Host "[4] WORKERS (Media and Transcription)" -ForegroundColor Yellow
Write-Host "    Checking worker processes...`n"

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

Write-Host "    Node.js Processes:"
if ($apiService) {
    Write-Host "      [OK] API Service: Running" -ForegroundColor Green
} else {
    Write-Host "      [FAIL] API Service: Not Running" -ForegroundColor Red
}

if ($frontendService) {
    Write-Host "      [OK] Frontend: Running" -ForegroundColor Green
} else {
    Write-Host "      [FAIL] Frontend: Not Running" -ForegroundColor Red
}

if ($mediaWorker) {
    Write-Host "      [OK] Media Worker: Running" -ForegroundColor Green
} else {
    Write-Host "      [OPTIONAL] Media Worker: Not Running" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "    Python Processes:"
if ($transcriptionWorker) {
    Write-Host "      [OK] Transcription Worker: Running" -ForegroundColor Green
} else {
    Write-Host "      [OPTIONAL] Transcription Worker: Not Running" -ForegroundColor Yellow
}

Write-Host ""

# 5. DATABASE CONNECTION TEST
Write-Host "[5] DATABASE (PostgreSQL)" -ForegroundColor Yellow
Write-Host "    Testing database connection...`n"

try {
    $null = docker exec syncsearch-postgres psql -U syncsearch -d syncsearch -c "SELECT COUNT(*) FROM users;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    [OK] Database: CONNECTED" -ForegroundColor Green
        Write-Host "         Users table accessible"
    } else {
        Write-Host "    [FAIL] Database: CONNECTION FAILED" -ForegroundColor Red
        $allHealthy = $false
    }
} catch {
    Write-Host "    [ERROR] Database: $($_.Exception.Message)" -ForegroundColor Red
    $allHealthy = $false
}

Write-Host ""

# 6. SUMMARY
Write-Host "========================================"
Write-Host "   SUMMARY"
Write-Host "========================================`n"

if ($allHealthy) {
    Write-Host "[SUCCESS] ALL CORE SERVICES ARE HEALTHY!" -ForegroundColor Green
} else {
    Write-Host "[WARNING] SOME SERVICES NEED ATTENTION" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "QUICK START COMMANDS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Start Infrastructure:" -ForegroundColor White
Write-Host "    docker-compose up -d"
Write-Host ""
Write-Host "  Start Backend API:" -ForegroundColor White
Write-Host "    cd api-service; npm run start:dev"
Write-Host ""
Write-Host "  Start Frontend:" -ForegroundColor White
Write-Host "    cd web-app; `$env:PORT='3001'; npm start"
Write-Host ""
Write-Host "  Start Media Worker (Optional):" -ForegroundColor White
Write-Host "    cd media-worker; npm run dev"
Write-Host ""
Write-Host "  Start Transcription Worker (Optional):" -ForegroundColor White
Write-Host "    cd transcription-worker; python main.py"
Write-Host ""
Write-Host "ACCESS POINTS:" -ForegroundColor Cyan
Write-Host "  Frontend:      http://localhost:3001"
Write-Host "  Backend API:   http://localhost:3000"
Write-Host "  RabbitMQ UI:   http://localhost:15672 (guest/guest)"
Write-Host "  Minio Console: http://localhost:9001 (minioadmin/minioadmin)"
Write-Host ""
Write-Host "========================================`n"
