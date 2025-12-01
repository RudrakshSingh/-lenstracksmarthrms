#!/bin/sh
# Startup script for HR Service on Azure App Service
# This script ensures the service starts correctly

set -e

echo "Starting HR Service..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Set default port if not set
export PORT=${PORT:-${WEBSITES_PORT:-3002}}
export NODE_ENV=${NODE_ENV:-production}
export SERVICE_NAME=${SERVICE_NAME:-hr-service}

echo "Environment:"
echo "  PORT: $PORT"
echo "  NODE_ENV: $NODE_ENV"
echo "  SERVICE_NAME: $SERVICE_NAME"
echo "  PWD: $(pwd)"
echo "  Node version: $(node --version)"
echo "  NPM version: $(npm --version)"

# Check if PM2 is available
if command -v pm2-runtime >/dev/null 2>&1; then
    echo "PM2 found, starting with PM2..."
    # Use PM2 if available
    exec pm2-runtime ecosystem.config.js
elif command -v pm2 >/dev/null 2>&1; then
    echo "PM2 found (without -runtime), starting with PM2..."
    exec pm2-runtime ecosystem.config.js
else
    echo "PM2 not found, starting with Node directly..."
    # Fallback to direct node execution
    exec node src/server.js
fi

