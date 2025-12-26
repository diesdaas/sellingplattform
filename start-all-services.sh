#!/bin/bash

# GoCart Microservices Startup Script
echo "🚀 Starting GoCart Microservices..."

# Function to wait for service to be ready
wait_for_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    echo "⏳ Waiting for $service_name..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo "✅ $service_name is ready!"
            return 0
        fi
        echo "   Attempt $attempt/$max_attempts..."
        sleep 2
        ((attempt++))
    done

    echo "❌ $service_name failed to start"
    return 1
}

# Start infrastructure (assuming Docker services are running)
echo "🔧 Checking infrastructure..."
# docker-compose up -d postgres-auth postgres-payment postgres-main redis rabbitmq

# Wait a bit for infrastructure
sleep 3

# Start Auth Service
echo "🔐 Starting Auth Service..."
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
echo "💳 Starting Payment Service..."
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
echo "🖥️  Starting Backend..."
cd gocart-backend
DATABASE_URL=postgresql://user:pass@localhost:5432/gocart \
RABBITMQ_URL=amqp://guest:guest@localhost:5672 \
JWT_SECRET=test-jwt-secret \
CORS_ORIGIN=http://localhost:3000,http://localhost:8080 \
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080 \
node test-health.js &
BACKEND_PID=$!
cd ..

wait_for_service "Backend" "http://localhost:5000/health"

# Start Gateway
echo "🌐 Starting API Gateway..."
cd services/gateway
JWT_SECRET=test-jwt-secret \
REDIS_URL=redis://localhost:6379 \
AUTH_SERVICE_URL=http://localhost:3002 \
PAYMENT_SERVICE_URL=http://localhost:3003 \
BACKEND_URL=http://localhost:5000 \
node src/index.js &
GATEWAY_PID=$!
cd ..

wait_for_service "API Gateway" "http://localhost:8080/health"

# Start Frontend
echo "🎨 Starting Frontend..."
cd gocart
npm run dev &
FRONTEND_PID=$!
cd ..

wait_for_service "Frontend" "http://localhost:3000"

echo ""
echo "🎉 All services started successfully!"
echo ""
echo "📋 Service URLs:"
echo "   Frontend:    http://localhost:3000"
echo "   API Gateway: http://localhost:8080"
echo "   Auth:        http://localhost:3002"
echo "   Payment:     http://localhost:3003"
echo "   Backend:     http://localhost:5000"
echo ""
echo "🛑 To stop all services: ./stop-all-services.sh"

# Store PIDs for cleanup
echo "$AUTH_PID $PAYMENT_PID $BACKEND_PID $GATEWAY_PID $FRONTEND_PID" > .service_pids

# Keep script running to show logs
echo "📊 Services are running. Press Ctrl+C to stop..."
trap 'echo "🛑 Stopping services..."; ./stop-all-services.sh; exit 0' INT
wait
