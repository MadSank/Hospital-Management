# MedFlow HMS — Reset Database and Reseed
$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location "$RootDir\backend"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  MedFlow HMS - Database Reset and Reseed Utility" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Remove SQLite database files if they exist
$dbFiles = @("medflow.db", "medflow.db-wal", "medflow.db-shm")
foreach ($file in $dbFiles) {
    if (Test-Path $file) {
        Write-Host "  Removing $file..." -ForegroundColor Yellow
        Remove-Item -Force $file
    }
}

Write-Host "  Applying clean database migrations..." -ForegroundColor Yellow
.\.venv\Scripts\alembic upgrade head

Write-Host "  Seeding fresh demo roles and users..." -ForegroundColor Yellow
.\.venv\Scripts\python seed.py

Write-Host "`n[✔] Database successfully reset and reseeded with clean demo accounts!" -ForegroundColor Green
