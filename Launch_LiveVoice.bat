@echo off
title LiveVoice AI - Permanent Host
color 0A
cd /d "%~dp0"

echo ======================================================================
echo              LIVEVOICE AI -- PERMANENT HOSTING LAUNCHER
echo ======================================================================
echo.

:: Detect current Wi-Fi IPv4 address dynamically
set LOCAL_IP=localhost
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip
set LOCAL_IP=%LOCAL_IP: =%

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
echo  ACTIVE ACCESS LINKS FOR ALL DEVICES:
echo ======================================================================
echo  [1] This Computer:       http://localhost:8000
echo  [2] Any Device (Wi-Fi):   http://%LOCAL_IP%:8000
echo  [3] Apple/Android mDNS:   http://ELLAGOWTHAMI.local:8000
echo  [4] Windows Device:       http://ELLAGOWTHAMI:8000
echo.
echo  Speaker Studio (Local):  http://%LOCAL_IP%:8000/?mode=speaker^&room=LIVE-8821
echo  Listener Portal (Local): http://%LOCAL_IP%:8000/?mode=listener^&room=LIVE-8821
echo ======================================================================
echo.

echo Opening LiveVoice in your browser...
start http://localhost:8000

echo.
echo LiveVoice is running. You can minimize this window.
echo.
pause
