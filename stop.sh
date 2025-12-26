#!/bin/bash

# GoCart Development Environment Stopper
# This script stops all microservices

set -e

echo "🛑 Stopping GoCart Development Environment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to stop frontend
stop_frontend() {
    if [ -f "logs/frontend.pid" ]; then
        local pid=$(cat logs/frontend.pid)
        if kill -0 $pid 2>/dev/null; then
            echo -e "${BLUE}⚛️  Stopping Frontend (PID: $pid)...${NC}"
            kill $pid
            sleep 2
            if kill -0 $pid 2>/dev/null; then
                echo -e "${YELLOW}⚠️  Force killing frontend...${NC}"
                kill -9 $pid
            fi
        fi
        rm -f logs/frontend.pid
        echo -e "${GREEN}✅ Frontend stopped${NC}"
    else
        echo -e "${BLUE}⚛️  Frontend not running${NC}"
    fi
}

# Function to stop Docker services
stop_docker_services() {
    echo -e "${BLUE}🐳 Stopping Docker services...${NC}"

    # Stop all services
    docker-compose down

    echo -e "${GREEN}✅ Docker services stopped${NC}"
}

# Function to clean up logs
cleanup_logs() {
    echo -e "${BLUE}🧹 Cleaning up old logs...${NC}"

    # Remove old log files (keep last 7 days)
    find logs -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true

    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Main execution
main() {
    # Stop frontend first
    stop_frontend

    # Stop Docker services
    stop_docker_services

    # Optional cleanup
    if [ "$1" = "--clean" ]; then
        cleanup_logs
    fi

    echo ""
    echo -e "${GREEN}🎉 All services stopped successfully!${NC}"
    echo ""
    if [ "$1" != "--clean" ]; then
        echo "💡 Tip: Use './stop.sh --clean' to also clean up old logs"
    fi
}

# Run main function
main "$@"
