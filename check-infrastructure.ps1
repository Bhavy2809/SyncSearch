# SyncSearch Infrastructure Health Check Script

Write-Host "`n=== SyncSearch Infrastructure Status ===" -ForegroundColor Cyan
Write-Host ""

# Check Docker
Write-Host "1. Docker Status:" -ForegroundColor Yellow
docker --version
Write-Host ""

# Check running containers
Write-Host "2. Running Containers:" -ForegroundColor Yellow
docker-compose ps
Write-Host ""

# Test PostgreSQL connection
Write-Host "3. PostgreSQL Connection Test:" -ForegroundColor Yellow
$pgTest = docker exec syncsearch-postgres psql -U syncsearch -d syncsearch -c "SELECT version();" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ PostgreSQL is accessible" -ForegroundColor Green
} else {
    Write-Host "❌ PostgreSQL connection failed" -ForegroundColor Red
}
Write-Host ""

# Test RabbitMQ
Write-Host "4. RabbitMQ Status:" -ForegroundColor Yellow
$rabbitTest = docker exec syncsearch-rabbitmq rabbitmq-diagnostics ping 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ RabbitMQ is running" -ForegroundColor Green
    Write-Host "   Management UI: http://localhost:15672" -ForegroundColor Gray
    Write-Host "   Username: syncsearch | Password: devpassword" -ForegroundColor Gray
} else {
    Write-Host "❌ RabbitMQ health check failed" -ForegroundColor Red
}
Write-Host ""

# Test Minio
Write-Host "5. Minio (S3) Status:" -ForegroundColor Yellow
try {
    $minioTest = Invoke-WebRequest -Uri "http://localhost:9000/minio/health/live" -TimeoutSec 5 -UseBasicParsing
    if ($minioTest.StatusCode -eq 200) {
        Write-Host "✅ Minio is running" -ForegroundColor Green
        Write-Host "   Console UI: http://localhost:9001" -ForegroundColor Gray
        Write-Host "   Username: minioadmin | Password: minioadmin" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Minio health check failed" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "=== Quick Access Links ===" -ForegroundColor Cyan
Write-Host "RabbitMQ Management: http://localhost:15672" -ForegroundColor White
Write-Host "Minio Console:       http://localhost:9001" -ForegroundColor White
Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "Ready to build the application services!" -ForegroundColor Green
Write-Host "Run: cd api-service && npm install" -ForegroundColor Gray
Write-Host ""
