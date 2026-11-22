@echo off
title Whiteboard Web App
cd /d "%~dp0"

echo ===================================================
echo               Whiteboard Web App
echo ===================================================
echo.

:: -----------------------------------------------------------------------------
:: 1. Check if application is ALREADY running on port 8000
::    If running, stop it immediately.
:: -----------------------------------------------------------------------------
python -c "import socket; s = socket.socket(); err = s.connect_ex(('127.0.0.1', 8000)); s.close(); exit(0 if err == 0 else 1)" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [STATUS] Whiteboard is currently RUNNING on http://127.0.0.1:8000.
    echo [ACTION] Stopping Whiteboard application...
    echo.
    python -c "import subprocess; [subprocess.run([r'C:\Windows\System32\taskkill.exe', '/F', '/T', '/PID', line.split()[-1]], capture_output=True) for line in subprocess.check_output([r'C:\Windows\System32\netstat.exe', '-ano'], text=True).splitlines() if ':8000' in line and 'LISTENING' in line]" >nul 2>&1
    powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue; if ($c) { $c.OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }" >nul 2>&1
    echo ---------------------------------------------------
    echo  Whiteboard application has been STOPPED.
    echo ---------------------------------------------------
    echo.
    echo Press any key to close this window...
    pause >nul
    exit /b 0
)

:: -----------------------------------------------------------------------------
:: 2. Application is NOT running -> Start it
:: -----------------------------------------------------------------------------
echo [STATUS] Whiteboard is NOT running.
echo [ACTION] Starting Whiteboard server...
echo.

:: Check if uv is installed (recommended: bypasses Windows AppControl DLL restrictions)
where uv >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [1/2] Launching Whiteboard server with uv...
    echo ---------------------------------------------------
    echo  Server running at: http://127.0.0.1:8000
    echo  Run this batch file again to STOP the server.
    echo ---------------------------------------------------
    echo.
    start "" http://127.0.0.1:8000
    uv run --with-requirements requirements.txt python -m uvicorn app:app --host 0.0.0.0 --port 8000
    goto :done
)

:: Check if Python is installed and accessible
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python was not found!
    echo Please install Python 3.8+ from https://www.python.org/
    echo and ensure "Add Python to PATH" is checked during setup.
    echo.
    pause
    exit /b 1
)

echo [1/3] Checking dependencies...
python -c "import fastapi, uvicorn, jinja2" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Installing required packages from requirements.txt...
    python -m pip install -r requirements.txt
)

echo [2/3] Opening browser at http://127.0.0.1:8000...
start "" http://127.0.0.1:8000

echo [3/3] Starting Whiteboard server...
echo ---------------------------------------------------
echo  Server running at: http://127.0.0.1:8000
echo  Run this batch file again to STOP the server.
echo ---------------------------------------------------
echo.

python -m uvicorn app:app --host 0.0.0.0 --port 8000

:done
if %ERRORLEVEL% neq 0 (
    echo.
    echo [INFO] Server stopped or exited with error.
    pause
)
