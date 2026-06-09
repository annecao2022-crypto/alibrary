@echo off
echo ================================
echo   Library Setup - First Time
echo ================================
echo.

echo [1/3] Installing backend...
cd /d "%~dp0backend"
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo FAILED. Please make sure Python is installed.
    pause
    exit /b 1
)

echo.
echo [2/3] Init database and sample books...
python seed.py
if %errorlevel% neq 0 (
    echo FAILED.
    pause
    exit /b 1
)

echo.
echo [3/3] Installing frontend...
cd /d "%~dp0frontend"
npm install
if %errorlevel% neq 0 (
    echo FAILED. Please make sure Node.js is installed.
    pause
    exit /b 1
)

echo.
echo ================================
echo   Done! Run step 2 to start.
echo ================================
pause
