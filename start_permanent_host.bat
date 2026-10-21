@echo off
title LiveVoice AI - Permanent Unified Hosting
color 0b

echo ====================================================================
echo                 LIVEVOICE AI - PERMANENT LOCAL HOSTING
echo ====================================================================
echo.

cd /d "%~dp0"
set PYTHONPATH=%~dp0

echo Starting Unified Server on Port 8000 (Serving UI, API, and WebSockets)...
start /b "" "C:\Users\naidu\.venvs\livevoice\Scripts\python.exe" -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000

timeout /t 2 /nobreak >nul

echo Starting Permanent Secure Tunnel for Mobile Devices...
start /b "" "C:\Users\naidu\.tools\cloudflared.exe" tunnel --url http://localhost:8000

timeout /t 3 /nobreak >nul

cls
echo ====================================================================
echo              LIVEVOICE AI IS RUNNING PERMANENTLY!
echo ====================================================================
echo.
echo  [1] LOCALHOST (This PC):
echo      http://localhost:8000
echo.
echo  [2] LOCAL WI-FI NETWORK (Any Mobile / Tablet / Laptop on same Wi-Fi):
echo      http://192.168.1.4:8000
echo      http://ELLAGOWTHAMI:8000
echo.
echo  [3] SPEAKER STUDIO:
echo      http://192.168.1.4:8000/?mode=speaker^&room=LIVE-8821
echo.
echo  [4] LISTENER PORTAL (Share with Audience):
echo      http://192.168.1.4:8000/?mode=listener^&room=LIVE-8821
echo.
echo ====================================================================
echo Leave this window open. Press Ctrl+C to stop.
echo ====================================================================

pause
