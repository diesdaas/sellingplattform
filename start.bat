@echo off
REM GoCart Development Environment Launcher (Windows)
REM Einfacher Start für das gesamte GoCart-System

echo 🚀 Starting GoCart Development Environment
echo ==========================================

REM Prüfe Voraussetzungen
echo [Checking prerequisites...]

docker info >nul 2>&1
if errorlevel 1 (
    echo ✗ Docker is not running. Please start Docker first.
    pause
    exit /b 1
)
echo ✓ Docker is running

node --version >nul 2>&1
if errorlevel 1 (
    echo ✗ Node.js is not installed.
    pause
    exit /b 1
)
echo ✓ Node.js is available

npm --version >nul 2>&1
if errorlevel 1 (
    echo ✗ npm is not installed.
    pause
    exit /b 1
)
echo ✓ npm is available

echo.
echo [Starting GoCart Backend...]

cd gocart-backend

REM Stelle sicher, dass .env existiert
if not exist ".env" (
    if exist "env.example" (
        copy env.example .env >nul
        echo ⚠ Created .env from env.example - please configure your environment variables!
    ) else (
        echo ✗ Neither .env nor env.example found in gocart-backend/
        cd ..
        pause
        exit /b 1
    )
)

REM Docker Container starten
docker-compose up --build -d

echo [Waiting for backend to be ready...]
timeout /t 5 /nobreak >nul

echo ✓ Backend started (may still be initializing)

cd ..

echo.
echo [Starting GoCart Frontend...]

cd gocart

REM Dependencies installieren falls node_modules nicht existiert
if not exist "node_modules" (
    echo [Installing frontend dependencies...]
    npm install
)

REM Frontend starten
start "GoCart Frontend" npm run dev

echo [Waiting for frontend to be ready...]
timeout /t 8 /nobreak >nul

echo ✓ Frontend started

cd ..

echo.
echo 🎉 GoCart Development Environment is running!
echo.
echo 📱 Frontend:    http://localhost:3000
echo 🔧 Backend API: http://localhost:5000
echo 🗄️  Database:   http://localhost:5555 (Prisma Studio)
echo.
echo Press Ctrl+C in the terminal windows to stop services
echo ==========================================

REM Warte auf User Input
echo Press any key to stop all services...
pause >nul

REM Cleanup
echo.
echo 🛑 Shutting down GoCart...

REM Frontend stoppen (findet und beendet npm/node Prozesse)
taskkill /f /im node.exe /t >nul 2>&1

REM Backend stoppen
cd gocart-backend
docker-compose down >nul 2>&1
cd ..

echo ✓ All services stopped
echo.
pause
