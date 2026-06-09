@echo off
echo ================================
echo   Generating public link...
echo ================================
echo.
echo Your public IP (share this as the tunnel password):
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R "IPv4"') do echo  %%a
echo.
echo Starting tunnel... (link will appear below)
echo Press Ctrl+C to stop sharing.
echo.
lt --port 5173
