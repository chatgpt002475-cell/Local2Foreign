# LiveVoice AI - Permanent Local Common Hosting PowerShell Launcher
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir
$env:PYTHONPATH = $scriptDir

# Detect local Wi-Fi / LAN IP dynamically
$localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -match 'Wi-Fi|Ethernet' -and $_.IPAddress -notlike '169.254*' } | Select-Object -First 1).IPAddress
if (-not $localIp) { $localIp = "192.168.1.4" }
$hostName = $env:COMPUTERNAME

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "                LIVEVOICE AI - PERMANENT LOCAL HOSTING              " -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host ">> Starting Unified Engine on Port 8000..." -ForegroundColor White

# Start Uvicorn process
$pyExe = "C:\Users\naidu\.venvs\livevoice\Scripts\python.exe"
Start-Process -FilePath $pyExe -ArgumentList "-m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000" -WindowStyle Minimized

Start-Sleep -Seconds 2

Write-Host ">> Starting Secure Cloudflare Tunnel for Mobile Microphones..." -ForegroundColor White
$cfExe = "C:\Users\naidu\.tools\cloudflared.exe"
if (Test-Path $cfExe) {
    Start-Process -FilePath $cfExe -ArgumentList "tunnel --url http://localhost:8000" -WindowStyle Minimized
}

Start-Sleep -Seconds 2

Clear-Host
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "             LIVEVOICE AI IS RUNNING & HOSTED PERMANENTLY!          " -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  [1] LOCALHOST (This PC):" -ForegroundColor Yellow
Write-Host "      http://localhost:8000" -ForegroundColor White
Write-Host ""
Write-Host "  [2] PERMANENT LOCAL NETWORK LINKS (Open on ANY Phone / Tablet / Laptop):" -ForegroundColor Yellow
Write-Host "      http://$localIp:8000" -ForegroundColor Green
Write-Host "      http://${hostName}:8000" -ForegroundColor Green
Write-Host ""
Write-Host "  [3] SPEAKER BROADCAST STUDIO:" -ForegroundColor Yellow
Write-Host "      http://$localIp:8000/?mode=speaker&room=LIVE-8821" -ForegroundColor Cyan
Write-Host ""
Write-Host "  [4] AUDIENCE LISTENER PORTAL (Share with Listeners):" -ForegroundColor Yellow
Write-Host "      http://$localIp:8000/?mode=listener&room=LIVE-8821" -ForegroundColor Cyan
Write-Host ""
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "Both Frontend UI and Backend APIs are running together on Port 8000." -ForegroundColor Gray
Write-Host "Press Enter to exit this launcher window (services keep running in background)." -ForegroundColor Gray
Read-Host
