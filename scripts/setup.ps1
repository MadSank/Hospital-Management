# MedFlow HMS — One-Command Project Setup
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  MedFlow Hospital Management System (HMS) - Setup" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

# 1. Backend Setup
Write-Host "`n[1/4] Configuring Python Backend..." -ForegroundColor Yellow
Set-Location "$RootDir\backend"

if (-not (Test-Path ".venv")) {
    Write-Host "  Creating virtual environment (.venv)..."
    python -m venv .venv
}

Write-Host "  Installing backend dependencies..."
.\.venv\Scripts\pip install -r requirements.txt --quiet

if (-not (Test-Path ".env")) {
    Write-Host "  Creating backend/.env from .env.example..."
    Copy-Item .env.example .env
}

Write-Host "  Applying database migrations (Alembic)..."
.\.venv\Scripts\alembic upgrade head

Write-Host "  Seeding initial roles and demo users..."
.\.venv\Scripts\python seed.py

# 2. Frontend Setup
Write-Host "`n[2/4] Configuring React Frontend..." -ForegroundColor Yellow
Set-Location "$RootDir\frontend"

Write-Host "  Installing frontend npm packages..."
npm install --silent

Write-Host "`n[3/4] Verifying TypeScript build..." -ForegroundColor Yellow
npm run build

# 3. Completion
Set-Location $RootDir
Write-Host "`n[4/4] Setup Completed Successfully!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  To launch both development servers, run:" -ForegroundColor White
Write-Host "  .\scripts\start.ps1" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green
