#!/bin/bash

# ============================================
# Update Services to Use DocumentDB
# ============================================
# Updates all service .env files with DocumentDB connection
#
# Usage:
#   ./scripts/update-services-to-documentdb.sh
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load DocumentDB connection info
if [ ! -f "documentdb-connection-info.txt" ]; then
    error "documentdb-connection-info.txt not found"
    exit 1
fi

source documentdb-connection-info.txt

log "Updating services to use DocumentDB..."
log "Endpoint: $ENDPOINT"

# Services to update
SERVICES=(
    "auth-service"
    "hr-service"
    "attendance-service"
    "tenant-registry-service"
    "tenant-management-service"
)

for service in "${SERVICES[@]}"; do
    ENV_FILE="microservices/$service/.env"
    
    if [ -f "$ENV_FILE" ]; then
        log "Updating $service..."
        
        # Backup original
        cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Update MONGO_URI
        if grep -q "^MONGO_URI=" "$ENV_FILE"; then
            sed -i.bak "s|^MONGO_URI=.*|MONGO_URI=$MONGO_URI|" "$ENV_FILE"
        else
            echo "MONGO_URI=$MONGO_URI" >> "$ENV_FILE"
        fi
        
        # Update MONGODB_URI
        if grep -q "^MONGODB_URI=" "$ENV_FILE"; then
            sed -i.bak "s|^MONGODB_URI=.*|MONGODB_URI=$MONGODB_URI|" "$ENV_FILE"
        else
            echo "MONGODB_URI=$MONGODB_URI" >> "$ENV_FILE"
        fi
        
        # Update database name
        if grep -q "^MONGO_DB_NAME=" "$ENV_FILE"; then
            sed -i.bak "s|^MONGO_DB_NAME=.*|MONGO_DB_NAME=hrms|" "$ENV_FILE"
        else
            echo "MONGO_DB_NAME=hrms" >> "$ENV_FILE"
        fi
        
        log "✅ $service updated"
    else
        warning "$ENV_FILE not found, creating..."
        cat > "$ENV_FILE" <<EOF
# DocumentDB Connection
MONGO_URI=$MONGO_URI
MONGODB_URI=$MONGODB_URI
MONGO_DB_NAME=hrms
DB_NAME=hrms

# Service Configuration
NODE_ENV=development
PORT=3000
EOF
        log "✅ $service .env created"
    fi
done

log ""
log "✅ All services updated!"
log ""
log "Next steps:"
log "1. Restart services to use DocumentDB"
log "2. Run: ./scripts/test-all-apis-with-documentdb.sh"
