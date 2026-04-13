#!/bin/bash
set -e

echo "🚀 Deploying All Fixes to Production..."
echo "========================================"

# Configuration
REGION="ap-south-1"
ECR_REPO_PREFIX="etelios"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to build and deploy a service
deploy_service() {
  local SERVICE_NAME=$1
  local SERVICE_DIR=$2
  
  echo -e "${YELLOW}📦 Building ${SERVICE_NAME}...${NC}"
  cd ${SERVICE_DIR}
  
  # Build Docker image
  docker buildx build \
    --platform linux/amd64 \
    -t ${ECR_REPO_PREFIX}-${SERVICE_NAME}:latest \
    -f Dockerfile \
    --load \
    ../../
  
  echo -e "${YELLOW}📤 Pushing to ECR...${NC}"
  # Get ECR login
  aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_REPO_PREFIX}.dkr.ecr.${REGION}.amazonaws.com
  
  # Tag for ECR
  ECR_IMAGE="${ECR_REPO_PREFIX}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO_PREFIX}-${SERVICE_NAME}:latest"
  docker tag ${ECR_REPO_PREFIX}-${SERVICE_NAME}:latest ${ECR_IMAGE}
  
  # Push to ECR
  docker push ${ECR_IMAGE}
  
  echo -e "${YELLOW}🔄 Updating Kubernetes Deployment...${NC}"
  # Update deployment
  kubectl set image deployment/${SERVICE_NAME} \
    ${SERVICE_NAME}=${ECR_IMAGE} \
    -n ${NAMESPACE}
  
  # Wait for rollout
  echo -e "${YELLOW}⏳ Waiting for rollout...${NC}"
  kubectl rollout status deployment/${SERVICE_NAME} -n ${NAMESPACE} --timeout=300s
  
  echo -e "${GREEN}✅ ${SERVICE_NAME} deployed!${NC}"
  echo ""
}

# Deploy HR Service
deploy_service "hr-service" "microservices/hr-service"

# Deploy Attendance Service
deploy_service "attendance-service" "microservices/attendance-service"

# Deploy Sales Service
deploy_service "sales-service" "microservices/sales-service"

echo -e "${GREEN}🎉 All services deployed successfully!${NC}"
echo ""
echo "📝 Next Steps:"
echo "1. Test APIs: BASE_URL=<url> node scripts/test-all-tenant-apis.js"
echo "2. Check pods: kubectl get pods -n ${NAMESPACE}"
echo "3. Check logs: kubectl logs -f deployment/hr-service -n ${NAMESPACE}"
