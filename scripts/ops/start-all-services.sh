#!/bin/bash

# Start All Microservices Locally
# This script starts all services in the background

echo "🚀 Starting All Microservices Locally..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if port is in use
check_port() {
    lsof -ti:$1 > /dev/null 2>&1
}

# Function to start service
start_service() {
    local service_name=$1
    local port=$2
    local service_dir=$3
    
    if check_port $port; then
        echo -e "${YELLOW}⚠️  $service_name (port $port) is already running${NC}"
        return 0
    fi
    
    echo -e "${GREEN}Starting $service_name (port $port)...${NC}"
    cd "$service_dir" || exit 1
    npm start > "/tmp/${service_name}-service.log" 2>&1 &
    local pid=$!
    echo "  PID: $pid"
    echo "  Log: /tmp/${service_name}-service.log"
    sleep 2
    return 0
}

# Start Auth Service
start_service "Auth" 3001 "microservices/auth-service"

# Start HR Service
start_service "HR" 3002 "microservices/hr-service"

# Start Attendance Service
start_service "Attendance" 3003 "microservices/attendance-service"

# Start Tenant Registry Service
start_service "Tenant Registry" 3020 "microservices/tenant-registry-service"

echo ""
echo "⏳ Waiting for services to start..."
sleep 8

echo ""
echo "🔍 Service Status:"
echo ""

# Check service status
check_service() {
    local service_name=$1
    local port=$2
    local health_path=$3
    
    if curl -s "http://localhost:${port}${health_path}" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $service_name (port $port): Running${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name (port $port): Not responding${NC}"
        return 1
    fi
}

check_service "Auth" 3001 "/api/auth/health"
check_service "HR" 3002 "/api/hr/health"
check_service "Attendance" 3003 "/api/attendance/health"
check_service "Tenant Registry" 3020 "/health"

echo ""
echo "📋 Service Logs:"
echo "  Auth Service: tail -f /tmp/Auth-service.log"
echo "  HR Service: tail -f /tmp/HR-service.log"
echo "  Attendance Service: tail -f /tmp/Attendance-service.log"
echo "  Tenant Registry: tail -f /tmp/Tenant Registry-service.log"
echo ""
echo "🛑 To stop all services:"
echo "  pkill -f 'node.*server.js'"
echo "  or"
echo "  lsof -ti:3001,3002,3003,3020 | xargs kill"

