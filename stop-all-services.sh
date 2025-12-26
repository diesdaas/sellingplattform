#!/bin/bash

# GoCart Microservices Stop Script
echo "🛑 Stopping GoCart Microservices..."

# Kill services if PIDs file exists
if [ -f .service_pids ]; then
    PIDS=$(cat .service_pids)
    for pid in $PIDS; do
        if kill -0 $pid 2>/dev/null; then
            echo "Stopping process $pid..."
            kill $pid 2>/dev/null || true
        fi
    done
    rm -f .service_pids
fi

# Kill any remaining Node processes
echo "Cleaning up any remaining Node processes..."
pkill -f "node.*src/index.js" || true
pkill -f "node.*test-health.js" || true
pkill -f "node.*test-notification.js" || true
pkill -f "next dev" || true

# Stop Docker services
# echo "Stopping Docker services..."
# docker-compose down

echo "✅ All services stopped!"
