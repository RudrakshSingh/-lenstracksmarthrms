#!/bin/bash

###############################################################################
# Run Upcapto Super Admin Seed Script
# 
# This script runs the seed script to create Upcapto tenant and super admin
# 
# Usage:
#   ./run-seed-upcapto.sh                    # Run from Kubernetes pod
#   ./run-seed-upcapto.sh local              # Run locally
###############################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

MODE="${1:-k8s}"

log "=========================================="
log "Upcapto Super Admin Seed Script"
log "=========================================="
log ""

if [ "$MODE" == "local" ]; then
    log "Running in LOCAL mode..."
    log ""
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js first."
    fi
    
    # Check if required packages are installed
    if [ ! -d "node_modules" ]; then
        warning "node_modules not found. Installing dependencies..."
        npm install mongoose bcryptjs
    fi
    
    # Set MongoDB URI for local
    export MONGODB_URI="${MONGODB_URI:-mongodb://admin:etelios123@localhost:27017/etelios?authSource=admin}"
    
    log "MongoDB URI: ${MONGODB_URI}"
    log ""
    
    # Run the seed script
    node seed-upcapto-superadmin.js
    
else
    log "Running in KUBERNETES mode..."
    log ""
    
    NAMESPACE="etelios-prod"
    POD_NAME="mongodb-"
    
    # Find MongoDB pod
    log "Finding MongoDB pod..."
    MONGODB_POD=$(kubectl get pods -n $NAMESPACE | grep mongodb | grep Running | head -1 | awk '{print $1}')
    
    if [ -z "$MONGODB_POD" ]; then
        error "MongoDB pod not found or not running!"
    fi
    
    log "MongoDB Pod: $MONGODB_POD"
    log ""
    
    # Check if auth-service pod is available
    log "Finding auth-service pod..."
    AUTH_POD=$(kubectl get pods -n $NAMESPACE | grep auth-service | grep Running | head -1 | awk '{print $1}')
    
    if [ -z "$AUTH_POD" ]; then
        warning "auth-service pod not running, will run from MongoDB pod"
        RUN_POD=$MONGODB_POD
    else
        log "Auth Service Pod: $AUTH_POD"
        RUN_POD=$AUTH_POD
    fi
    
    log ""
    log "Copying seed script to pod..."
    kubectl cp seed-upcapto-superadmin.js $NAMESPACE/$RUN_POD:/tmp/seed-upcapto-superadmin.js
    
    log "Installing dependencies in pod..."
    kubectl exec -n $NAMESPACE $RUN_POD -- sh -c "npm install mongoose bcryptjs --prefix /tmp" || true
    
    log ""
    log "Running seed script in pod..."
    kubectl exec -n $NAMESPACE $RUN_POD -- sh -c "cd /tmp && node seed-upcapto-superadmin.js"
    
    log ""
    log "Cleaning up..."
    kubectl exec -n $NAMESPACE $RUN_POD -- rm -f /tmp/seed-upcapto-superadmin.js
fi

log ""
log "=========================================="
log "✅ Seed script completed!"
log "=========================================="
log ""

info "Login Credentials:"
info "Email:    admin@upcapto.com"
info "Password: Upcapto@2026"
info "Tenant:   upcapto"
log ""

warning "⚠️  CHANGE PASSWORD AFTER FIRST LOGIN!"
log ""
