#!/bin/bash

# Start HR service locally with main database

cd "$(dirname "$0")/../microservices/hr-service"

echo "═══════════════════════════════════════════════════════"
echo "  Starting HR Service (Local - Main Database)"
echo "═══════════════════════════════════════════════════════"
echo ""

# Set environment variables for main database
export DB_NAME=etelios_hr_service
export MONGO_DB_NAME=etelios_hr_service
export PORT=3002
export NODE_ENV=development

# Use MONGO_URI from .env if exists, otherwise prompt
if [ -f .env ]; then
    source .env
    if [ -z "$MONGO_URI" ] && [ ! -z "$MONGODB_URI" ]; then
        export MONGO_URI="$MONGODB_URI"
    fi
fi

if [ -z "$MONGO_URI" ]; then
    echo "⚠️  MONGO_URI not set. Service will use fallback."
    echo "   Set MONGO_URI environment variable for production database"
    echo ""
fi

echo "Environment:"
echo "  PORT: $PORT"
echo "  DB_NAME: $DB_NAME"
echo "  MONGO_URI: ${MONGO_URI:0:50}..."
echo ""
echo "Starting service..."
echo "  Watch logs for: 'database: etelios_hr_service' (should be MAIN DB)"
echo ""

npm start

