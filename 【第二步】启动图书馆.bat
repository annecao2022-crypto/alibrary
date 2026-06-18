@echo off
echo Stopping old processes...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5173 " ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000 " ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
timeout /t 1 /nobreak >nul

echo Starting Anne's Library...
start "Backend"  /d "%~dp0backend"  cmd /k "title Backend  && python -m uvicorn main:app --reload"
timeout /t 3 /nobreak >nul

start "Frontend" /d "%~dp0frontend" cmd /k "title Frontend && npm run dev"
timeout /t 5 /nobreak >nul

start "Public Link" powershell -ExecutionPolicy Bypass -File "%~dp0tunnel.ps1"
