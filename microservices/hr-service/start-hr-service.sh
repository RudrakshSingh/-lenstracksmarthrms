#!/bin/bash

# Start HR Service on correct port
# This ensures the service uses port 3002

echo "🚀 Starting HR Service..."
echo "=========================="

# Set port explicitly
export PORT=3002
export NODE_ENV=${NODE_ENV:-development}

echo "Port: $PORT"
echo "Environment: $NODE_ENV"
echo ""

# Check if port is already in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port $PORT is already in use!"
    echo "   Killing existing process..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null
    sleep 2
fi

# Start the service
cd "$(dirname "$0")"
npm run dev

