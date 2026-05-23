@echo off
echo Starting Weather App...

:: Start the Express Backend on Port 5000 in a new window
echo Starting Backend Server on port 5000...
start "Weather App Backend" cmd /c "cd Backend && npm install && node server.js"

:: Give it a moment to initialize
timeout /t 3 /nobreak >nul

:: Start the Frontend Server on Port 3000
echo Starting Frontend Server on port 3000...
cd Frontend
npx serve . -p 3000

pause
