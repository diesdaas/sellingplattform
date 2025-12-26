#!/bin/bash

# GoCart Microservices Startup Script
echo "🚀 Starting GoCart Microservices..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to wait for service to be ready
wait_for_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    echo -e "${YELLOW}⏳ Waiting for $service_name...${NC}"
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is ready!${NC}"
            return 0
        fi
        echo "   Attempt $attempt/$max_attempts..."
        sleep 2
        ((attempt++))
    done

    echo -e "${RED}❌ $service_name failed to start${NC}"
    return 1
}

# Function to kill process on a port
kill_port() {
    local port=$1
    lsof -ti:$port | xargs kill -9 2>/dev/null
}

# Check if Docker is running
echo -e "${BLUE}🔍 Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop and try again.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"

# Kill any existing processes on required ports
echo -e "${BLUE}🧹 Cleaning up ports...${NC}"
kill_port 3000
kill_port 3002
kill_port 3003
kill_port 5000
kill_port 8080
echo -e "${GREEN}✅ Ports cleared${NC}"

# Start Docker infrastructure
echo -e "${BLUE}🐳 Starting Docker infrastructure...${NC}"
docker-compose up -d postgres-auth postgres-payment postgres-main redis rabbitmq 2>/dev/null

# Wait for infrastructure to be ready
echo -e "${YELLOW}⏳ Waiting for databases and message queue...${NC}"
sleep 10

# Start Auth Service
echo -e "${BLUE}🔐 Starting Auth Service...${NC}"
cd services/auth
DATABASE_URL=postgresql://user:pass@localhost:5433/auth \
REDIS_URL=redis://localhost:6379 \
RABBITMQ_URL=amqp://guest:guest@localhost:5672 \
JWT_SECRET=test-jwt-secret \
JWT_REFRESH_SECRET=test-refresh-secret \
PORT=3002 \
node src/index.js &
AUTH_PID=$!
cd ../..

wait_for_service "Auth Service" "http://localhost:3002/health"

# Start Payment Service
echo -e "${BLUE}💳 Starting Payment Service...${NC}"
cd services/payment
DATABASE_URL=postgresql://user:pass@localhost:5434/payment \
RABBITMQ_URL=amqp://guest:guest@localhost:5672 \
STRIPE_SECRET_KEY=sk_test_placeholder \
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder \
STRIPE_WEBHOOK_SECRET=whsec_placeholder \
PORT=3003 \
node src/index.js &
PAYMENT_PID=$!
cd ../..

wait_for_service "Payment Service" "http://localhost:3003/health"

# Start Backend
echo -e "${BLUE}🖥️  Starting Backend...${NC}"
cd gocart-backend
DATABASE_URL=postgresql://user:pass@localhost:5432/gocart \
RABBITMQ_URL=amqp://guest:guest@localhost:5672 \
JWT_SECRET=test-jwt-secret \
CORS_ORIGIN=http://localhost:3000,http://localhost:8080 \
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080 \
PORT=5000 \
node server.js &
BACKEND_PID=$!
cd ..

wait_for_service "Backend" "http://localhost:5000/health"

# Start Gateway
echo -e "${BLUE}🌐 Starting API Gateway...${NC}"
cd services/gateway
JWT_SECRET=test-jwt-secret \
REDIS_URL=redis://localhost:6379 \
AUTH_SERVICE_URL=http://localhost:3002 \
PAYMENT_SERVICE_URL=http://localhost:3003 \
BACKEND_URL=http://localhost:5000 \
PORT=8080 \
node src/index.js &
GATEWAY_PID=$!
cd ../..

wait_for_service "API Gateway" "http://localhost:8080/health"

# Start Frontend
echo -e "${BLUE}🎨 Starting Frontend...${NC}"
cd gocart
npm run dev &
FRONTEND_PID=$!
cd ..

wait_for_service "Frontend" "http://localhost:3000"

echo ""
echo -e "${GREEN}🎉 All services started successfully!${NC}"
echo ""
echo "📋 Service URLs:"
echo "   Frontend:    http://localhost:3000"
echo "   API Gateway: http://localhost:8080"
echo "   Auth:        http://localhost:3002"
echo "   Payment:     http://localhost:3003"
echo "   Backend:     http://localhost:5000"
echo "   RabbitMQ:    http://localhost:15672 (guest/guest)"
echo ""
echo "🛑 To stop all services: ./stop-all-services.sh or Ctrl+C"

# Store PIDs for cleanup
echo "$AUTH_PID $PAYMENT_PID $BACKEND_PID $GATEWAY_PID $FRONTEND_PID" > .service_pids

# Keep script running to show logs
echo "📊 Services are running. Press Ctrl+C to stop..."
trap 'echo "🛑 Stopping services..."; ./stop-all-services.sh; exit 0' INT
wait
