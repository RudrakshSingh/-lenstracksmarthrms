#!/bin/bash

# Azure App Service Startup Script
# Starts all microservices with correct SERVICE_NAME per service

echo "🚀 Starting Etelios Microservices on Azure App Service..."

# Set common environment variables
export NODE_ENV=production
export USE_KEY_VAULT=true
export AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/
export AZURE_KEY_VAULT_NAME=etelios-keyvault
export CORS_ORIGIN=*

# Start API Gateway (port 3000) - NO SERVICE_NAME needed
echo "Starting API Gateway on port 3000..."
PORT=3000 node src/server.js &
GATEWAY_PID=$!

# Wait for gateway to start
sleep 3

# Start Auth Service (port 3001)
echo "Starting Auth Service on port 3001..."
cd microservices/auth-service
PORT=3001 SERVICE_NAME=auth-service node src/server.js &
AUTH_PID=$!
cd ../..

# Start HR Service (port 3002)
echo "Starting HR Service on port 3002..."
cd microservices/hr-service
PORT=3002 SERVICE_NAME=hr-service node src/server.js &
HR_PID=$!
cd ../..

# Start Attendance Service (port 3003)
echo "Starting Attendance Service on port 3003..."
cd microservices/attendance-service
PORT=3003 SERVICE_NAME=attendance-service node src/server.js &
ATTENDANCE_PID=$!
cd ../..

# Start Payroll Service (port 3004)
echo "Starting Payroll Service on port 3004..."
cd microservices/payroll-service
PORT=3004 SERVICE_NAME=payroll-service node src/server.js &
PAYROLL_PID=$!
cd ../..

# Start CRM Service (port 3005)
echo "Starting CRM Service on port 3005..."
cd microservices/crm-service
PORT=3005 SERVICE_NAME=crm-service node src/server.js &
CRM_PID=$!
cd ../..

# Start Inventory Service (port 3006)
echo "Starting Inventory Service on port 3006..."
cd microservices/inventory-service
PORT=3006 SERVICE_NAME=inventory-service node src/server.js &
INVENTORY_PID=$!
cd ../..

# Wait for all services to start
echo "Waiting for services to start..."
sleep 5

# Check service health
echo "Checking service health..."
curl -f http://localhost:3000/health && echo "✅ API Gateway OK" || echo "❌ API Gateway FAILED"
curl -f http://localhost:3001/health && echo "✅ Auth Service OK" || echo "❌ Auth Service FAILED"
curl -f http://localhost:3002/health && echo "✅ HR Service OK" || echo "❌ HR Service FAILED"

echo "✅ All services started!"
echo "Gateway PID: $GATEWAY_PID"
echo "Auth PID: $AUTH_PID"
echo "HR PID: $HR_PID"

# Keep script running
wait

