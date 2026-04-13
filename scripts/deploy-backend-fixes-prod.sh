#!/bin/bash
set -e

echo "🚀 Deploying Backend Fixes to Production..."
echo "=========================================="

# Configuration
REGION="ap-south-1"
ECR_ACCOUNT="383234048604"
ECR_REGISTRY="${ECR_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"
NAMESPACE="etelios-prod"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

step() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Check prerequisites
if ! command -v docker &> /dev/null; then
    error "Docker not found. Please install Docker first."
    exit 1
fi

if ! command -v aws &> /dev/null; then
    error "AWS CLI not found. Please install AWS CLI first."
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    error "kubectl not found. Please install kubectl first."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi

# Check kubectl connection
if ! kubectl cluster-info &> /dev/null; then
    error "kubectl not connected to cluster. Configure kubeconfig first."
    exit 1
fi

# Function to build and deploy a service
deploy_service() {
  local SERVICE_NAME=$1
  local SERVICE_DIR="microservices/${SERVICE_NAME}"
  local ECR_REPO="etelios-${SERVICE_NAME}"
  local ECR_IMAGE="${ECR_REGISTRY}/${ECR_REPO}:latest"
  
  step "Deploying ${SERVICE_NAME}"
  
  if [ ! -d "$SERVICE_DIR" ]; then
    error "${SERVICE_DIR} not found, skipping..."
    return 1
  fi
  
  log "Building Docker image for ${SERVICE_NAME}..."
  cd "$SERVICE_DIR"
  
  # Build Docker image with platform linux/amd64
  docker buildx build \
    --platform linux/amd64 \
    -t ${ECR_REPO}:latest \
    -f Dockerfile \
    --load \
    ../../
  
  if [ $? -ne 0 ]; then
    error "Failed to build ${SERVICE_NAME} image"
    return 1
  fi
  
  log "Logging in to ECR..."
  aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
  
  log "Tagging image for ECR..."
  docker tag ${ECR_REPO}:latest ${ECR_IMAGE}
  
  log "Pushing ${SERVICE_NAME} to ECR..."
  docker push ${ECR_IMAGE}
  
  if [ $? -ne 0 ]; then
    error "Failed to push ${SERVICE_NAME} image"
    return 1
  fi
  
  log "Updating Kubernetes deployment..."
  kubectl set image deployment/${SERVICE_NAME} \
    ${SERVICE_NAME}=${ECR_IMAGE} \
    -n ${NAMESPACE}
  
  log "Waiting for rollout to complete..."
  kubectl rollout status deployment/${SERVICE_NAME} -n ${NAMESPACE} --timeout=300s
  
  if [ $? -eq 0 ]; then
    log "✅ ${SERVICE_NAME} deployed successfully!"
  else
    error "❌ ${SERVICE_NAME} rollout failed or timed out"
    return 1
  fi
  
  cd - > /dev/null
  echo ""
}

# Main deployment
step "Starting Production Deployment"

# Deploy HR Service (has fixes for permissions, routes, leave balance)
log "Deploying HR Service with fixes..."
deploy_service "hr-service"

# Deploy Attendance Service (has fixes for permissions, stats)
log "Deploying Attendance Service with fixes..."
deploy_service "attendance-service"

step "Deployment Complete!"

log "📋 Summary of fixes deployed:"
echo "  ✅ Check-in endpoint - Improved employee lookup"
echo "  ✅ Permissions - Employees can view own data"
echo "  ✅ Missing routes - Added /api/tasks, /api/payroll/preview, /api/hr/attendance/check-in"
echo "  ✅ Leave balance - Improved employee lookup"
echo ""

log "📝 Next Steps:"
echo "  1. Check pods: kubectl get pods -n ${NAMESPACE}"
echo "  2. Check logs: kubectl logs -f deployment/hr-service -n ${NAMESPACE}"
echo "  3. Test APIs: curl -k https://api.etelios.com/api/auth/login"
echo ""

log "🎉 Deployment completed!"
