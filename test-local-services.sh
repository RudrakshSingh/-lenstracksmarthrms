#!/bin/bash

# Quick test script to check if services are running locally

echo "🔍 Checking if services are running locally..."
echo ""

# Check HR Service
echo "Checking HR Service (port 3002)..."
if curl -s http://localhost:3002/health > /dev/null 2>&1; then
  echo "✅ HR Service is running"
else
  echo "❌ HR Service is NOT running on port 3002"
  echo "   Start it with: cd microservices/hr-service && npm start"
fi

# Check Auth Service
echo "Checking Auth Service (port 3001)..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "✅ Auth Service is running"
else
  echo "❌ Auth Service is NOT running on port 3001"
  echo "   Start it with: cd microservices/auth-service && npm start"
fi

echo ""
echo "To run the test:"
echo "  node test-multi-tenant-implementation.js"
echo ""
echo "Or with custom URLs:"
echo "  BASE_URL=http://localhost:3002 AUTH_URL=http://localhost:3001 node test-multi-tenant-implementation.js"
