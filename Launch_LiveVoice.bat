@echo off
title LiveVoice AI - Permanent Host
color 0A
cd /d "%~dp0"

echo ======================================================================
echo              LIVEVOICE AI -- PERMANENT HOSTING LAUNCHER
echo ======================================================================
echo.

:: Check if port 8000 is already running
netstat -ano | findstr :8000 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo [OK] LiveVoice server is already running on port 8000!
) else (
    echo [STARTING] Launching LiveVoice background supervisor...
    start "" /B "C:\Users\naidu\.venvs\livevoice\Scripts\python.exe" "scripts\run_permanent_host.py"
    timeout /t 3 /nobreak >nul
)

echo.
echo ======================================================================
echo  PERMANENT ACCESS LINKS FOR ALL DEVICES:
echo ======================================================================
echo  [1] Local Computer:    http://localhost:8000
echo  [2] Any Device (Wi-Fi): http://10.106.215.147:8000
echo  [3] Apple/Android mDNS: http://ELLAGOWTHAMI.local:8000
echo  [4] Windows Device:    http://ELLAGOWTHAMI:8000
echo.
echo  Speaker Studio:        http://localhost:8000/?mode=speaker&room=LIVE-8821
echo  Listener Portal:       http://localhost:8000/?mode=listener&room=LIVE-8821
echo ======================================================================
echo.

echo Opening LiveVoice in browser...
start http://localhost:8000

echo.
echo Keep this window open or minimize it. LiveVoice will continue running.
echo.
pause
