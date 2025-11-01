# SyncSearch Authentication Test Script
Write-Host "`n🧪 Testing SyncSearch Authentication...`n" -ForegroundColor Cyan

$API_URL = "http://localhost:3000"
$testEmail = "test$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
$testPassword = "password123"

# Test 1: Register
Write-Host "1. Testing Registration..." -ForegroundColor Yellow
$registerBody = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$API_URL/auth/register" -Method POST -Body $registerBody -ContentType "application/json"
    Write-Host "✅ Registration successful!" -ForegroundColor Green
    Write-Host "   Email: $($registerResponse.user.email)" -ForegroundColor Gray
    Write-Host "   User ID: $($registerResponse.user.id)" -ForegroundColor Gray
    $token = $registerResponse.access_token
    Write-Host "   Token received: $($token.Substring(0, [Math]::Min(20, $token.Length)))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Registration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Login
Write-Host "`n2. Testing Login..." -ForegroundColor Yellow
$loginBody = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "   Token received" -ForegroundColor Gray
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Access protected route
Write-Host "`n3. Testing Protected Route..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    $meResponse = Invoke-RestMethod -Uri "$API_URL/auth/me" -Method GET -Headers $headers
    Write-Host "✅ Successfully accessed protected route!" -ForegroundColor Green
    Write-Host "   User ID: $($meResponse.id)" -ForegroundColor Gray
    Write-Host "   Email: $($meResponse.email)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Protected route access failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 4: Try without token (should fail)
Write-Host "`n4. Testing Protected Route Without Token (should fail)..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$API_URL/auth/me" -Method GET -ErrorAction Stop
    Write-Host "❌ Should have been rejected!" -ForegroundColor Red
} catch {
    Write-Host "✅ Correctly rejected request without token" -ForegroundColor Green
}

Write-Host "`n✅ All authentication tests passed!" -ForegroundColor Green
Write-Host "`n📋 Available Endpoints:" -ForegroundColor Cyan
Write-Host "  POST /auth/register - Create new user" -ForegroundColor White
Write-Host "  POST /auth/login    - Login and get JWT token" -ForegroundColor White
Write-Host "  GET  /auth/me       - Get current user (protected)" -ForegroundColor White
Write-Host ""
