#!/bin/bash

set -e

REGION="ap-south-1"
ACCOUNT_ID="383234048604"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "=========================================="
echo "Rebuild Docker Images for AWS (AMD64)"
echo "=========================================="
echo ""
log "CRITICAL FIX: Building images for correct platform"
echo ""

warning "Problem: Images built on macOS M1 (ARM64)"
warning "AWS EC2 nodes are AMD64/x86_64"
warning "Solution: Rebuild with --platform linux/amd64"
echo ""

# Services list
SERVICES=(
  "analytics-service" "attendance-service" "auth-service" "cpp-service"
  "crm-service" "document-service" "financial-service" "hr-service"
  "inventory-service" "jts-service" "monitoring-service" "notification-service"
  "payroll-service" "prescription-service" "purchase-service" "realtime-service"
  "sales-service" "service-management" "tenant-management-service" "tenant-registry-service"
)

# Check if Docker is running
if ! docker ps &>/dev/null; then
    error "Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Login to ECR
log "Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

# Enable Docker buildx for multi-platform builds
log "Setting up Docker buildx..."
docker buildx create --name multiarch --use 2>/dev/null || docker buildx use multiarch 2>/dev/null || docker buildx use default

log "✅ Docker buildx ready"
echo ""

log "=========================================="
log "Rebuilding Images (AMD64 Platform)"
log "=========================================="
echo ""

SUCCESS=0
FAILED=0

cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms

for service in "${SERVICES[@]}"; do
    REPO_NAME="etelios-$service"
    IMAGE_NAME="$ECR_REGISTRY/$REPO_NAME"
    IMAGE_TAG="latest"
    
    log "[$((SUCCESS + FAILED + 1))/20] Building $service for AMD64..."
    
    # Check if Dockerfile exists
    if [ ! -f "microservices/$service/Dockerfile" ]; then
        warning "  ⚠️  Dockerfile not found for $service"
        FAILED=$((FAILED + 1))
        continue
    fi
    
    # Build for AMD64 platform using buildx
    if docker buildx build \
        --platform linux/amd64 \
        --tag "$IMAGE_NAME:$IMAGE_TAG" \
        --file "microservices/$service/Dockerfile" \
        --push \
        . &>/dev/null; then
        log "  ✅ $service (AMD64)"
        SUCCESS=$((SUCCESS + 1))
    else
        warning "  ❌ $service failed"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
log "=========================================="
log "Build Summary:"
log "  ✅ Success: $SUCCESS"
log "  ❌ Failed: $FAILED"
log "=========================================="
echo ""

if [ $SUCCESS -ge 15 ]; then
    log "✅ Most images rebuilt successfully!"
    echo ""
    log "Next: Restart pods to use new images"
    log "  kubectl delete pods --all -n etelios-prod"
elif [ $SUCCESS -gt 0 ]; then
    warning "Partial success. Some images failed."
else
    error "All images failed to build. Check Docker and Dockerfiles."
    exit 1
fi

echo ""
log "=========================================="
log "Images are now AMD64-compatible for AWS!"
log "=========================================="
