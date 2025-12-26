#!/bin/bash

# GoCart Development Environment Starter
# This script starts all microservices for development

set -e

echo "🚀 Starting GoCart Development Environment"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
        exit 1
    fi
}

# Function to check if Node.js is available
check_nodejs() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed. Please install Node.js and try again.${NC}"
        exit 1
    fi
}

# Function to check if npm is available
check_npm() {
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed. Please install npm and try again.${NC}"
        exit 1
    fi
}

# Function to install dependencies if node_modules doesn't exist
install_dependencies() {
    local service_name=$1
    local service_path=$2

    if [ ! -d "$service_path/node_modules" ]; then
        echo -e "${BLUE}📦 Installing dependencies for $service_name...${NC}"
        cd "$service_path"
        npm install
        cd - > /dev/null
    fi
}

# Function to start services with docker-compose
start_services() {
    echo -e "${BLUE}🐳 Starting Docker services...${NC}"

    # Start infrastructure services first
    docker-compose up -d postgres-auth postgres-payment postgres-main redis rabbitmq

    echo -e "${YELLOW}⏳ Waiting for databases and message queue to be ready...${NC}"
    sleep 10

    # Start microservices
    docker-compose up -d auth payment backend gateway

    echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
    sleep 15

    # Check service health
    check_service_health "gateway" "8080"
    check_service_health "auth" "3001"
    check_service_health "payment" "3002"
    check_service_health "backend" "5000"
}

# Function to check service health
check_service_health() {
    local service_name=$1
    local port=$2
    local max_attempts=10
    local attempt=1

    echo -e "${BLUE}🔍 Checking $service_name health...${NC}"

    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:$port/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is healthy${NC}"
            return 0
        fi

        echo -e "${YELLOW}⏳ Waiting for $service_name (attempt $attempt/$max_attempts)...${NC}"
        sleep 5
        ((attempt++))
    done

    echo -e "${RED}❌ $service_name failed to start${NC}"
    return 1
}

# Function to start frontend
start_frontend() {
    echo -e "${BLUE}⚛️  Starting Frontend...${NC}"

    # Install frontend dependencies
    install_dependencies "Frontend" "./gocart"

    # Start frontend in background
    cd ./gocart
    npm run dev > ../logs/frontend.log 2>&1 &
    echo $! > ../logs/frontend.pid
    cd - > /dev/null

    echo -e "${YELLOW}⏳ Waiting for frontend to start...${NC}"
    sleep 10

    check_service_health "frontend" "3000"
}

# Main execution
main() {
    # Create logs directory
    mkdir -p logs

    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    check_docker
    echo -e "${GREEN}✅ Docker is running${NC}"

    check_nodejs
    echo -e "${GREEN}✅ Node.js is available${NC}"

    check_npm
    echo -e "${GREEN}✅ npm is available${NC}"

    # Install shared libraries
    if [ ! -d "packages/shared/node_modules" ]; then
        echo -e "${BLUE}📦 Installing shared libraries...${NC}"
        cd packages/shared
        npm install
        cd - > /dev/null
    fi

    # Install service dependencies
    install_dependencies "API Gateway" "./services/gateway"
    install_dependencies "Auth Service" "./services/auth"
    install_dependencies "Payment Service" "./services/payment"
    install_dependencies "Backend" "./gocart-backend"

    # Start services
    start_services

    # Start frontend
    start_frontend

    echo ""
    echo -e "${GREEN}🎉 All services started successfully!${NC}"
    echo ""
    echo "📋 Service URLs:"
    echo "   Frontend:     http://localhost:3000"
    echo "   API Gateway:  http://localhost:8080"
    echo "   Auth Service: http://localhost:3001"
    echo "   Payment:      http://localhost:3002"
    echo "   Backend:      http://localhost:5000"
    echo "   RabbitMQ:     http://localhost:15672 (guest/guest)"
    echo ""
    echo "📁 Logs are available in the ./logs directory"
    echo "🛑 To stop all services, run: ./stop.sh"
    echo ""
    echo -e "${GREEN}🚀 GoCart is ready for development!${NC}"
}

# Run main function
main "$@"