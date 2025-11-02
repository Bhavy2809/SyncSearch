# Test MIME type validation for WhatsApp audio files

Write-Host "Testing MIME type validation..." -ForegroundColor Cyan

# Login first
Write-Host "`nLogging in..." -ForegroundColor Yellow
$loginBody = @{
    email = "test@example.com"
    password = "test123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.access_token
    Write-Host "✅ Login successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test different MIME types
$projectId = "9ed664f4-33c5-45f9-b824-686494adc919"
$headers = @{
    Authorization = "Bearer $token"
}

# Test 1: application/octet-stream
Write-Host "`n1. Testing with 'application/octet-stream':" -ForegroundColor Yellow
$body1 = @{
    projectId = $projectId
    filename = "test.opus"
    mimeType = "application/octet-stream"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/media/upload-url" -Method POST -ContentType "application/json" -Headers $headers -Body $body1
    Write-Host "✅ Success! Got upload URL" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $($_.Exception.Response.StatusCode) - $($_.ErrorDetails.Message)" -ForegroundColor Red
}

# Test 2: Empty string
Write-Host "`n2. Testing with empty string '':" -ForegroundColor Yellow
$body2 = @{
    projectId = $projectId
    filename = "test2.opus"
    mimeType = ""
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/media/upload-url" -Method POST -ContentType "application/json" -Headers $headers -Body $body2
    Write-Host "✅ Success! Got upload URL" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $($_.Exception.Response.StatusCode) - $($_.ErrorDetails.Message)" -ForegroundColor Red
}

# Test 3: audio/opus
Write-Host "`n3. Testing with 'audio/opus':" -ForegroundColor Yellow
$body3 = @{
    projectId = $projectId
    filename = "test3.opus"
    mimeType = "audio/opus"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/media/upload-url" -Method POST -ContentType "application/json" -Headers $headers -Body $body3
    Write-Host "✅ Success! Got upload URL" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $($_.Exception.Response.StatusCode) - $($_.ErrorDetails.Message)" -ForegroundColor Red
}

# Test 4: No mimeType field (undefined)
Write-Host "`n4. Testing without mimeType field:" -ForegroundColor Yellow
$body4 = @{
    projectId = $projectId
    filename = "test4.opus"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/media/upload-url" -Method POST -ContentType "application/json" -Headers $headers -Body $body4
    Write-Host "✅ Success! Got upload URL" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed: $($_.Exception.Response.StatusCode) - $($_.ErrorDetails.Message)" -ForegroundColor Red
}

Write-Host "`nDone!" -ForegroundColor Cyan
