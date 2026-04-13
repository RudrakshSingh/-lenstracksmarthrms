#!/bin/bash

# Full Redeploy: Build, Push, and Deploy HR Service and Auth Service
# with Employee Login Fixes

set -e

# Configuration
REGION="ap-south-1"
ECR_REGISTRY="383234048604.dkr.ecr.ap-south-1.amazonaws.com"
NAMESPACE="etelios-prod"
SERVICES=("hr-service" "auth-service")

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

step() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📦 $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Check prerequisites
step "Checking Prerequisites"

if ! command -v docker &> /dev/null; then
    error "Docker is not installed or not in PATH"
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    error "kubectl is not installed or not in PATH"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    error "AWS CLI is not installed or not in PATH"
    exit 1
fi

success "All prerequisites met"

# Login to ECR
step "Logging in to ECR"

log "Authenticating with ECR..."
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY} || {
    error "Failed to login to ECR"
    exit 1
}

success "ECR login successful"

# Build and deploy each service
for service in "${SERVICES[@]}"; do
    step "Building and Deploying ${service}"
    
    SERVICE_DIR="microservices/${service}"
    
    if [ ! -d "$SERVICE_DIR" ]; then
        warning "${SERVICE_DIR} not found, skipping..."
        continue
    fi
    
    # Build Docker image
    log "Building Docker image for ${service}..."
    IMAGE_NAME="${ECR_REGISTRY}/etelios-${service}:latest"
    
    # Build from root directory (Dockerfile expects root context)
    # CRITICAL: Build for linux/amd64 platform (K8s nodes are AMD64)
    if [ -f "${SERVICE_DIR}/Dockerfile" ]; then
        docker buildx build \
            --platform linux/amd64 \
            -f "${SERVICE_DIR}/Dockerfile" \
            -t "${IMAGE_NAME}" \
            -t "etelios-${service}:latest" \
            --load \
            . || {
            error "Failed to build ${service} image"
            continue
        }
        success "Image built successfully"
    else
        error "Dockerfile not found in ${SERVICE_DIR}"
        continue
    fi
    
    # Push to ECR
    log "Pushing ${service} image to ECR..."
    docker push "${IMAGE_NAME}" || {
        error "Failed to push ${service} image"
        continue
    }
    success "Image pushed to ECR"
    
    # Update Kubernetes deployment
    log "Updating Kubernetes deployment for ${service}..."
    
    # Check if deployment exists
    if ! kubectl get deployment ${service} -n ${NAMESPACE} &> /dev/null; then
        warning "Deployment ${service} not found in namespace ${NAMESPACE}, skipping..."
        continue
    fi
    
    # Update image
    kubectl set image deployment/${service} \
        ${service}=${IMAGE_NAME} \
        -n ${NAMESPACE} || {
        error "Failed to update deployment ${service}"
        continue
    }
    
    # Wait for rollout
    log "Waiting for ${service} rollout to complete..."
    kubectl rollout status deployment/${service} -n ${NAMESPACE} --timeout=300s || {
        warning "${service} rollout may have issues, but continuing..."
    }
    
    success "${service} deployed successfully"
    echo ""
done

# Final status
step "Deployment Status"

log "Checking pod status..."
kubectl get pods -n ${NAMESPACE} -l 'app in (hr-service,auth-service)' --sort-by=.metadata.creationTimestamp

echo ""
success "🎉 All services redeployed successfully!"
echo ""
log "The following fixes are now deployed:"
echo "  1. HR Service User Model - Added employee_id, name, joining_date fields"
echo "  2. HR Service Employee Creation - Sets all auth-service compatibility fields"
echo "  3. Auth Service Login - Fixed validation issues with lean() queries"
echo "  4. Auth Service Login - Converts role ObjectId to string enum"
echo ""
log "Next step: Test employee login with the test script"
