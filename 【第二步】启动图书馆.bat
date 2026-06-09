@echo off
echo Starting Anne's Library...

start "Backend" /d "%~dp0backend" cmd /k "python -m uvicorn main:app --reload"
timeout /t 3 /nobreak >nul

start "Frontend" /d "%~dp0frontend" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul

powershell -ExecutionPolicy Bypass -File "%~dp0tunnel.ps1"
