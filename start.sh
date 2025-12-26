#!/bin/bash

# GoCart Development Environment Launcher
# Einfacher Start für das gesamte GoCart-System

set -e

echo "🚀 Starting GoCart Development Environment"
echo "=========================================="

# Farbcodes für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funktion für farbigen Output
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✓ $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ✗ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠ $1${NC}"
}

# Prüfe Voraussetzungen
check_prerequisites() {
    log "Checking prerequisites..."

    # Docker prüfen
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running. Please start Docker first."
        exit 1
    fi
    success "Docker is running"

    # Node.js prüfen
    if ! command -v node >/dev/null 2>&1; then
        error "Node.js is not installed."
        exit 1
    fi
    success "Node.js is available"

    # npm prüfen
    if ! command -v npm >/dev/null 2>&1; then
        error "npm is not installed."
        exit 1
    fi
    success "npm is available"
}

# Backend starten
start_backend() {
    log "Starting GoCart Backend..."

    cd gocart-backend

    # Stelle sicher, dass env.example existiert
    if [ ! -f ".env" ]; then
        if [ -f "env.example" ]; then
            cp env.example .env
            warning "Created .env from env.example - please configure your environment variables!"
        else
            error "Neither .env nor env.example found in gocart-backend/"
            exit 1
        fi
    fi

    # Docker Container starten
    docker-compose up --build -d

    # Warte bis Backend bereit ist
    log "Waiting for backend to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:5000/health >/dev/null 2>&1; then
            success "Backend is ready on http://localhost:5000"
            break
        fi
        sleep 2
    done

    if [ $i -eq 30 ]; then
        warning "Backend might still be starting... continuing anyway"
    fi

    cd ..
}

# Frontend starten
start_frontend() {
    log "Starting GoCart Frontend..."

    cd gocart

    # Dependencies installieren falls node_modules nicht existiert oder package-lock.json neuer ist
    if [ ! -d "node_modules" ] || [ "package-lock.json" -nt "node_modules" ]; then
        log "Installing frontend dependencies..."
        npm install
        if [ $? -ne 0 ]; then
            error "Failed to install frontend dependencies"
            cd ..
            return 1
        fi
    else
        log "Frontend dependencies already installed"
    fi

    # Frontend im Hintergrund starten
    npm run dev &
    FRONTEND_PID=$!

    # Kurze Pause für Next.js Startup
    log "Waiting for Next.js to start..."
    sleep 8

    # Prüfen ob Frontend noch läuft
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        success "Frontend started successfully (PID: $FRONTEND_PID)"
        success "Frontend should be available at http://localhost:3000"
    else
        error "Frontend failed to start"
        cd ..
        return 1
    fi

    cd ..
}

# Cleanup Funktion
cleanup() {
    echo ""
    warning "Shutting down GoCart..."

    # Frontend stoppen
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        success "Frontend stopped"
    fi

    # Backend stoppen
    cd gocart-backend
    docker-compose down 2>/dev/null || true
    success "Backend stopped"
    cd ..

    success "GoCart development environment stopped"
    exit 0
}

# Hauptfunktion
main() {
    # Signal Handler für sauberes Shutdown
    trap cleanup SIGINT SIGTERM

    # Prüfungen
    check_prerequisites

    echo ""

    # Backend starten
    start_backend

    # Frontend starten
    start_frontend

    echo ""
    success "🎉 GoCart Development Environment is running!"
    echo ""
    echo "📱 Frontend:    http://localhost:3000"
    echo "🔧 Backend API: http://localhost:5000"
    echo "🗄️  Database:   http://localhost:5555 (Prisma Studio)"
    echo ""
    warning "Press Ctrl+C to stop all services"
    echo "=========================================="

    # Warte auf User Input oder Signal
    wait
}

# Hilfe anzeigen
show_help() {
    echo "GoCart Development Launcher"
    echo ""
    echo "Usage:"
    echo "  ./start.sh              Start the entire GoCart stack"
    echo "  ./start.sh help         Show this help message"
    echo ""
    echo "This script will:"
    echo "  - Check if Docker and Node.js are available"
    echo "  - Start the backend with Docker Compose"
    echo "  - Start the frontend with npm run dev"
    echo "  - Wait for both services to be ready"
    echo "  - Handle graceful shutdown on Ctrl+C"
    echo ""
    echo "Services:"
    echo "  - Frontend: http://localhost:3000"
    echo "  - Backend: http://localhost:5000"
    echo "  - Database GUI: http://localhost:5555"
}

# Script-Argumente verarbeiten
case "${1:-}" in
    help|--help|-h)
        show_help
        exit 0
        ;;
    *)
        main
        ;;
esac
