# Simple Test - SyncSearch Full Flow
Write-Host "`n=== SYNCSEARCH SIMPLE TEST ===`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"
$timestamp = Get-Date -Format "HHmmss"
$email = "test-$timestamp@demo.com"
$password = "Test123"

# 1. Check API
Write-Host "[1] Testing API..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing | Out-Null
    Write-Host "    OK - API is running" -ForegroundColor Green
} catch {
    Write-Host "    FAILED - API not running!" -ForegroundColor Red
    exit
}

# 2. Register
Write-Host "`n[2] Registering user: $email" -ForegroundColor Yellow
$regBody = @{ email=$email; password=$password } | ConvertTo-Json
$headers = @{ "Content-Type"="application/json" }

try {
    $reg = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -Headers $headers -Body $regBody
    $token = $reg.access_token
    Write-Host "    OK - User registered" -ForegroundColor Green
} catch {
    Write-Host "    FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 3. Create Project
Write-Host "`n[3] Creating project..." -ForegroundColor Yellow
$projBody = @{ name="Test $timestamp"; description="Test" } | ConvertTo-Json
$authHeaders = @{ "Authorization"="Bearer $token"; "Content-Type"="application/json" }

try {
    $proj = Invoke-RestMethod -Uri "$baseUrl/projects" -Method POST -Headers $authHeaders -Body $projBody
    Write-Host "    OK - Project created: $($proj.name)" -ForegroundColor Green
    Write-Host "    ID: $($proj.id)" -ForegroundColor Cyan
} catch {
    Write-Host "    FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 4. Check Database
Write-Host "`n[4] Checking database..." -ForegroundColor Yellow
docker exec syncsearch-postgres psql -U syncsearch -d syncsearch -c "SELECT COUNT(*) as total_users FROM users;"
docker exec syncsearch-postgres psql -U syncsearch -d syncsearch -c "SELECT COUNT(*) as total_projects FROM projects;"
docker exec syncsearch-postgres psql -U syncsearch -d syncsearch -c "SELECT COUNT(*) as total_media FROM media;"

# Summary
Write-Host "`n=== TEST COMPLETE ===" -ForegroundColor Green
Write-Host "Credentials: $email / $password" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "`n"
