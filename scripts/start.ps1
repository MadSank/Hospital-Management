# MedFlow HMS — Launch Both Development Servers
$RootDir = Split-Path -Parent $PSScriptRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting MedFlow Hospital Management System (HMS)" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan

# Start Backend in separate job/window
$backendCmd = "cd '$RootDir\backend'; .\.venv\Scripts\Activate.ps1; python -m uvicorn app.main:app --reload --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd -Title "MedFlow Backend (Port 8000)"

# Start Frontend in separate job/window
$frontendCmd = "cd '$RootDir\frontend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd -Title "MedFlow Frontend (Port 5173)"

Write-Host "`nBoth servers have been launched in dedicated terminal windows." -ForegroundColor Green
Write-Host "Open http://localhost:5173 in your browser to access MedFlow." -ForegroundColor Yellow
