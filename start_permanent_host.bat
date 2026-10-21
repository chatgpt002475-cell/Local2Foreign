@echo off
title LiveVoice AI - Permanent Unified Hosting
color 0b

echo ====================================================================
echo                 LIVEVOICE AI - PERMANENT LOCAL HOSTING
echo ====================================================================
echo.

cd /d "%~dp0"
set PYTHONPATH=%~dp0

echo [1/2] Starting Unified Server on Port 8000 (Serving UI, API, and WebSockets)...
start /b "" "C:\Users\naidu\.venvs\livevoice\Scripts\python.exe" -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000

timeout /t 2 /nobreak >nul

echo [2/2] Starting Auto-Healing Remote Tunnel Watchdog for Mobile / Tablet Devices...
start /b "" "C:\Users\naidu\.venvs\livevoice\Scripts\python.exe" scripts\tunnel_watchdog.py

timeout /t 4 /nobreak >nul

cls
echo ====================================================================
echo              LIVEVOICE AI IS RUNNING PERMANENTLY!
echo ====================================================================
echo.
echo  [A] PERMANENT LOCAL WI-FI LINKS (NEVER BREAKS - Works on Any Mobile/Tablet on Wi-Fi):
echo      Main Dashboard:    http://192.168.1.4:8000
echo      Speaker Studio:    http://192.168.1.4:8000/?mode=speaker^&room=LIVE-8821
echo      Listener Portal:   http://192.168.1.4:8000/?mode=listener^&room=LIVE-8821
echo.
echo  [B] LOCALHOST (This PC):
echo      http://localhost:8000
echo.
echo  [C] PUBLIC / MOBILE DATA ACCESS:
echo      See 'current_public_link.txt' or open 'current_public_link.html'
echo.
echo ====================================================================
echo Leave this window open. The server and tunnel will auto-heal if disconnected.
echo ====================================================================

pause
