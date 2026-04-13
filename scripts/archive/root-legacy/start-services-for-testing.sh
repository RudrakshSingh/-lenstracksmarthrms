#!/bin/bash

# Script to start both services for local testing
# Usage: ./start-services-for-testing.sh

echo "🚀 Starting services for local testing..."
echo ""

# Check if services are already running
if lsof -ti:3001 > /dev/null 2>&1; then
  echo "⚠️  Auth Service (port 3001) is already running"
else
  echo "📦 Starting Auth Service..."
  cd microservices/auth-service
  npm start > /tmp/auth-service.log 2>&1 &
  AUTH_PID=$!
  echo "   Auth Service started (PID: $AUTH_PID)"
  echo "   Logs: tail -f /tmp/auth-service.log"
  cd ../..
  sleep 3
fi

# Check if HR service is already running
if lsof -ti:3002 > /dev/null 2>&1; then
  echo "⚠️  HR Service (port 3002) is already running"
else
  echo "📦 Starting HR Service..."
  cd microservices/hr-service
  npm start > /tmp/hr-service.log 2>&1 &
  HR_PID=$!
  echo "   HR Service started (PID: $HR_PID)"
  echo "   Logs: tail -f /tmp/hr-service.log"
  cd ../..
  sleep 3
fi

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if services are responding
echo ""
echo "🔍 Checking service health..."

if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "✅ Auth Service is responding"
else
  echo "❌ Auth Service is not responding yet"
  echo "   Check logs: tail -f /tmp/auth-service.log"
fi

if curl -s http://localhost:3002/health > /dev/null 2>&1; then
  echo "✅ HR Service is responding"
else
  echo "❌ HR Service is not responding yet"
  echo "   Check logs: tail -f /tmp/hr-service.log"
fi

echo ""
echo "📝 To stop services:"
echo "   kill $AUTH_PID $HR_PID"
echo ""
echo "📝 To view logs:"
echo "   tail -f /tmp/auth-service.log"
echo "   tail -f /tmp/hr-service.log"
echo ""
echo "✅ Services should be ready. Run the test:"
echo "   BASE_URL=http://localhost:3002 AUTH_URL=http://localhost:3001 node test-multi-tenant-implementation.js"
