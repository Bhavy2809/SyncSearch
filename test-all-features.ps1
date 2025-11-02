# =====================================
# SyncSearch - Complete Feature Test
# =====================================

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  SYNCSEARCH COMPLETE FEATURE TEST" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# Configuration
$baseUrl = "http://localhost:3000"
$frontendUrl = "http://localhost:3001"

# Test Results
$testResults = @()

# Helper Function
function Test-Feature {
    param(
        [string]$Name,
        [scriptblock]$Test
    )
    Write-Host "[TEST] $Name..." -ForegroundColor Yellow
    try {
        & $Test
        Write-Host "  [OK] $Name passed`n" -ForegroundColor Green
        $script:testResults += @{Name=$Name; Result="PASS"}
    } catch {
        Write-Host "  [FAIL] $Name failed: $($_.Exception.Message)`n" -ForegroundColor Red
        $script:testResults += @{Name=$Name; Result="FAIL"; Error=$_.Exception.Message}
    }
}

# =====================================
# 1. TEST SYSTEM HEALTH
# =====================================

Write-Host "`n[1] SYSTEM HEALTH CHECKS" -ForegroundColor Cyan -BackgroundColor Black
Write-Host "------------------------------------`n"

Test-Feature "Backend API Health" {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -TimeoutSec 5
    if ($health.status -ne "ok") { throw "API not healthy" }
}

Test-Feature "Frontend Accessibility" {
    $fe = Invoke-WebRequest -Uri $frontendUrl -UseBasicParsing -TimeoutSec 5
    if ($fe.StatusCode -ne 200) { throw "Frontend not responding" }
}

Test-Feature "Database Connection" {
    $result = docker exec syncsearch-postgres psql -U syncsearch -d syncsearch -c "SELECT 1;" 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Database connection failed" }
}

# =====================================
# 2. TEST AUTHENTICATION
# =====================================

Write-Host "`n[2] AUTHENTICATION TESTS" -ForegroundColor Cyan -BackgroundColor Black
Write-Host "------------------------------------`n"

$testEmail = "test-$(Get-Date -Format 'HHmmss')@demo.com"
$testPassword = "Test123!@#"
$userToken = $null

Test-Feature "User Registration" {
    $user = @{
        email = $testEmail
        password = $testPassword
    } | ConvertTo-Json

    $register = Invoke-RestMethod -Uri "$baseUrl/auth/register" `
        -Method POST -ContentType "application/json" -Body $user

    if (-not $register.access_token) { throw "No token received" }
    $script:userToken = $register.access_token
    Write-Host "    User: $testEmail"
    Write-Host "    Token: $($register.access_token.Substring(0,20))..."
}

Test-Feature "User Login" {
    $credentials = @{
        email = $testEmail
        password = $testPassword
    } | ConvertTo-Json

    $login = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method POST -ContentType "application/json" -Body $credentials

    if (-not $login.access_token) { throw "Login failed" }
    Write-Host "    Login successful"
}

Test-Feature "Get User Profile" {
    $headers = @{
        "Authorization" = "Bearer $userToken"
    }

    $profile = Invoke-RestMethod -Uri "$baseUrl/auth/me" `
        -Method GET -Headers $headers

    if ($profile.email -ne $testEmail) { throw "Profile mismatch" }
    Write-Host "    Email: $($profile.email)"
    Write-Host "    ID: $($profile.id)"
}

# =====================================
# 3. TEST PROJECT MANAGEMENT
# =====================================

Write-Host "`n[3] PROJECT MANAGEMENT TESTS" -ForegroundColor Cyan -BackgroundColor Black
Write-Host "------------------------------------`n"

$headers = @{
    "Authorization" = "Bearer $userToken"
    "Content-Type" = "application/json"
}

$projectId = $null

Test-Feature "Create Project" {
    $project = @{
        name = "Test Project $(Get-Date -Format 'HH:mm:ss')"
        description = "Automated test project"
    } | ConvertTo-Json

    $newProject = Invoke-RestMethod -Uri "$baseUrl/projects" `
        -Method POST -Headers $headers -Body $project

    if (-not $newProject.id) { throw "Project not created" }
    $script:projectId = $newProject.id
    Write-Host "    Project: $($newProject.name)"
    Write-Host "    ID: $($newProject.id)"
}

Test-Feature "List All Projects" {
    $projects = Invoke-RestMethod -Uri "$baseUrl/projects" `
        -Method GET -Headers $headers

    if ($projects.Count -eq 0) { throw "No projects found" }
    Write-Host "    Total Projects: $($projects.Count)"
}

Test-Feature "Get Single Project" {
    $project = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId" `
        -Method GET -Headers $headers

    if ($project.id -ne $projectId) { throw "Project mismatch" }
    Write-Host "    Project: $($project.name)"
}

Test-Feature "Update Project" {
    $update = @{
        name = "Updated Project Name"
        description = "Updated description"
    } | ConvertTo-Json

    $updated = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId" `
        -Method PATCH -Headers $headers -Body $update

    if ($updated.name -ne "Updated Project Name") { throw "Update failed" }
    Write-Host "    New Name: $($updated.name)"
}

# =====================================
# 4. TEST MEDIA UPLOAD
# =====================================

Write-Host "`n[4] MEDIA UPLOAD TESTS" -ForegroundColor Cyan -BackgroundColor Black
Write-Host "------------------------------------`n"

$mediaId = $null

Test-Feature "Request Upload URL" {
    $uploadRequest = @{
        projectId = $projectId
        filename = "test-video.mp4"
        contentType = "video/mp4"
        filesize = 1048576
    } | ConvertTo-Json

    $uploadUrl = Invoke-RestMethod -Uri "$baseUrl/media/upload-url" `
        -Method POST -Headers $headers -Body $uploadRequest

    if (-not $uploadUrl.uploadUrl) { throw "No upload URL received" }
    $script:mediaId = $uploadUrl.media.id
    Write-Host "    Media ID: $($uploadUrl.media.id)"
    Write-Host "    Upload URL: $($uploadUrl.uploadUrl.Substring(0,50))..."
}

Test-Feature "Confirm Upload" {
    $confirm = @{
        success = $true
    } | ConvertTo-Json

    $confirmed = Invoke-RestMethod -Uri "$baseUrl/media/$mediaId/confirm" `
        -Method POST -Headers $headers -Body $confirm

    Write-Host "    Status: $($confirmed.status)"
}

Test-Feature "List Project Media" {
    $media = Invoke-RestMethod -Uri "$baseUrl/media?projectId=$projectId" `
        -Method GET -Headers $headers

    if ($media.Count -eq 0) { throw "No media found" }
    Write-Host "    Total Files: $($media.Count)"
}

Test-Feature "Get Media Details" {
    $mediaDetails = Invoke-RestMethod -Uri "$baseUrl/media/$mediaId" `
        -Method GET -Headers $headers

    Write-Host "    Filename: $($mediaDetails.filename)"
    Write-Host "    Status: $($mediaDetails.status)"
}

# =====================================
# 5. TEST CLEANUP
# =====================================

Write-Host "`n[5] CLEANUP TESTS" -ForegroundColor Cyan -BackgroundColor Black
Write-Host "------------------------------------`n"

Test-Feature "Delete Media" {
    Invoke-RestMethod -Uri "$baseUrl/media/$mediaId" `
        -Method DELETE -Headers $headers | Out-Null
    Write-Host "    Media deleted: $mediaId"
}

Test-Feature "Delete Project" {
    Invoke-RestMethod -Uri "$baseUrl/projects/$projectId" `
        -Method DELETE -Headers $headers | Out-Null
    Write-Host "    Project deleted: $projectId"
}

# =====================================
# 6. SUMMARY
# =====================================

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

$passed = ($testResults | Where-Object { $_.Result -eq "PASS" }).Count
$failed = ($testResults | Where-Object { $_.Result -eq "FAIL" }).Count
$total = $testResults.Count

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if($failed -eq 0){"Green"}else{"Red"})

if ($failed -gt 0) {
    Write-Host "`nFailed Tests:" -ForegroundColor Red
    $testResults | Where-Object { $_.Result -eq "FAIL" } | ForEach-Object {
        Write-Host "  - $($_.Name): $($_.Error)" -ForegroundColor Red
    }
}

Write-Host "`n================================================`n" -ForegroundColor Cyan

if ($failed -eq 0) {
    Write-Host "ALL TESTS PASSED!" -ForegroundColor Green -BackgroundColor Black
    Write-Host "Your SyncSearch application is working perfectly!`n" -ForegroundColor Green
} else {
    Write-Host "SOME TESTS FAILED" -ForegroundColor Yellow -BackgroundColor Black
    Write-Host "Check the failed tests above for details.`n" -ForegroundColor Yellow
}

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Open browser: $frontendUrl"
Write-Host "  2. Login with: $testEmail / $testPassword"
Write-Host "  3. Test the beautiful new UI!"
Write-Host "  4. Create projects and upload media"
Write-Host "`n"
