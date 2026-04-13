#!/bin/bash
set -e

echo "🚀 Deploying Employee Flow Fixes..."
echo "=================================="

# Configuration
REGION="ap-south-1"
ECR_REPO_PREFIX="etelios"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"
SERVICE_NAME="hr-service"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📦 Building HR Service Docker Image...${NC}"
cd microservices/hr-service

# Build Docker image
docker buildx build \
  --platform linux/amd64 \
  -t ${ECR_REPO_PREFIX}-hr-service:latest \
  -f Dockerfile \
  --load \
  ../../

echo -e "${YELLOW}📤 Tagging and Pushing to ECR...${NC}"
# Get ECR login
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_REPO_PREFIX}.dkr.ecr.${REGION}.amazonaws.com

# Tag for ECR
ECR_IMAGE="${ECR_REPO_PREFIX}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO_PREFIX}-hr-service:latest"
docker tag ${ECR_REPO_PREFIX}-hr-service:latest ${ECR_IMAGE}

# Push to ECR
docker push ${ECR_IMAGE}

echo -e "${YELLOW}🔄 Updating Kubernetes Deployment...${NC}"
# Update deployment
kubectl set image deployment/hr-service \
  hr-service=${ECR_IMAGE} \
  -n ${NAMESPACE}

# Wait for rollout
echo -e "${YELLOW}⏳ Waiting for rollout to complete...${NC}"
kubectl rollout status deployment/hr-service -n ${NAMESPACE} --timeout=300s

echo -e "${GREEN}✅ HR Service deployed successfully!${NC}"

echo -e "${YELLOW}📦 Building Attendance Service Docker Image...${NC}"
cd ../attendance-service

# Build Docker image
docker buildx build \
  --platform linux/amd64 \
  -t ${ECR_REPO_PREFIX}-attendance-service:latest \
  -f Dockerfile \
  --load \
  ../../

echo -e "${YELLOW}📤 Tagging and Pushing to ECR...${NC}"
# Tag for ECR
ECR_IMAGE_ATT="${ECR_REPO_PREFIX}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO_PREFIX}-attendance-service:latest"
docker tag ${ECR_REPO_PREFIX}-attendance-service:latest ${ECR_IMAGE_ATT}

# Push to ECR
docker push ${ECR_IMAGE_ATT}

echo -e "${YELLOW}🔄 Updating Kubernetes Deployment...${NC}"
# Update deployment
kubectl set image deployment/attendance-service \
  attendance-service=${ECR_IMAGE_ATT} \
  -n ${NAMESPACE}

# Wait for rollout
echo -e "${YELLOW}⏳ Waiting for rollout to complete...${NC}"
kubectl rollout status deployment/attendance-service -n ${NAMESPACE} --timeout=300s

echo -e "${GREEN}✅ Attendance Service deployed successfully!${NC}"

echo -e "${GREEN}🎉 All fixes deployed!${NC}"
echo ""
echo "📝 Next Steps:"
echo "1. Test employee login: BASE_URL=<url> EMPLOYEE_PASSWORD=Employee123! node scripts/employee-attendance-sales-flow.js"
echo "2. Check dashboard: GET /api/hr/dashboard"
echo "3. Check sales: GET /api/sales/dashboard"
