#!/bin/bash

# Script to test locally with main database connection

echo "═══════════════════════════════════════════════════════"
echo "  Setting up local test with MAIN database"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check if .env exists
if [ ! -f "microservices/hr-service/.env" ]; then
    echo "⚠️  No .env file found. Creating one..."
    touch microservices/hr-service/.env
fi

# Get MONGO_URI from environment or prompt
if [ -z "$MONGO_URI" ]; then
    echo "Enter MongoDB connection string (or press Enter to use existing):"
    read -r mongo_uri
    if [ ! -z "$mongo_uri" ]; then
        export MONGO_URI="$mongo_uri"
    fi
fi

# Ensure DB_NAME is set to main database
export DB_NAME=etelios_hr_service
export MONGO_DB_NAME=etelios_hr_service

echo ""
echo "Environment variables:"
echo "  MONGO_URI: ${MONGO_URI:0:50}..."
echo "  DB_NAME: $DB_NAME"
echo "  MONGO_DB_NAME: $MONGO_DB_NAME"
echo ""

# Start HR service in background
echo "Starting HR service locally..."
cd microservices/hr-service
npm start > /tmp/hr-service.log 2>&1 &
HR_SERVICE_PID=$!
echo "HR Service PID: $HR_SERVICE_PID"
echo ""

# Wait for service to start
echo "Waiting for service to start..."
sleep 5

# Check if service is running
if ps -p $HR_SERVICE_PID > /dev/null; then
    echo "✅ HR Service is running"
    echo "Logs: tail -f /tmp/hr-service.log"
    echo ""
    
    # Run tests
    echo "Running tests..."
    cd ../..
    node scripts/test-full-hr-workflow.js --local
    
    # Stop service
    echo ""
    echo "Stopping HR service..."
    kill $HR_SERVICE_PID 2>/dev/null
    echo "✅ Done"
else
    echo "❌ HR Service failed to start. Check logs:"
    tail -20 /tmp/hr-service.log
    exit 1
fi

