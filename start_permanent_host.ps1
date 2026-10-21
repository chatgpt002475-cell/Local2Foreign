# LiveVoice AI - Permanent Hosting Launch Script (PowerShell)
$Host.UI.RawUI.WindowTitle = "LiveVoice AI - Permanent Hosting"
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "                LIVEVOICE AI - PERMANENT LOCAL HOSTING" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir
$env:PYTHONPATH = $ScriptDir

$PythonExe = "C:\Users\naidu\.venvs\livevoice\Scripts\python.exe"

Write-Host "[1/2] Starting Unified Server on Port 8000 (UI + API + WebSockets)..." -ForegroundColor Yellow
$ServerProcess = Start-Process -FilePath $PythonExe -ArgumentList "-m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000" -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 2

Write-Host "[2/2] Starting Auto-Healing Tunnel Watchdog..." -ForegroundColor Yellow
$TunnelProcess = Start-Process -FilePath $PythonExe -ArgumentList "scripts\tunnel_watchdog.py" -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 4

Clear-Host
Write-Host "====================================================================" -ForegroundColor Green
Write-Host "               LIVEVOICE AI IS RUNNING PERMANENTLY!" -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Green
Write-Host ""
Write-Host " [A] PERMANENT LOCAL WI-FI LINKS (NEVER BREAKS - Works on Any Mobile/Tablet):" -ForegroundColor White
Write-Host "     Main Dashboard:    http://192.168.1.4:8000" -ForegroundColor Cyan
Write-Host "     Speaker Studio:    http://192.168.1.4:8000/?mode=speaker&room=LIVE-8821" -ForegroundColor Cyan
Write-Host "     Listener Portal:   http://192.168.1.4:8000/?mode=listener&room=LIVE-8821" -ForegroundColor Cyan
Write-Host ""
Write-Host " [B] LOCALHOST (This PC):" -ForegroundColor White
Write-Host "     http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host " [C] PUBLIC REMOTE ACCESS:" -ForegroundColor White
Write-Host "     Check 'current_public_link.txt' or open 'current_public_link.html'" -ForegroundColor Cyan
Write-Host ""
Write-Host "====================================================================" -ForegroundColor Green
Write-Host "Keep this window open. Press Ctrl+C or close window to stop." -ForegroundColor Gray
Write-Host "====================================================================" -ForegroundColor Green

try {
    Wait-Process -Id $ServerProcess.Id
} finally {
    Stop-Process -Id $ServerProcess.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $TunnelProcess.Id -ErrorAction SilentlyContinue
}
