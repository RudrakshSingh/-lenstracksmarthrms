#!/bin/bash
set -e

echo "🚀 Deploying Store Edit Fix to Production..."
echo "=============================================="

# Configuration
REGION="ap-south-1"
ECR_ACCOUNT="383234048604"
ECR_REPO="etelios-hr-service"
IMAGE_TAG="latest"
NAMESPACE="etelios-prod"
SERVICE_NAME="hr-service"

# Full ECR image path
ECR_IMAGE="${ECR_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO}:${IMAGE_TAG}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📋 Fix Details:${NC}"
echo "   - Store edit by code support (SHK02, etc.)"
echo "   - Better tenant mismatch error messages"
echo "   - Enhanced logging"
echo ""

# Step 1: Build Docker image
echo -e "${YELLOW}📦 Step 1: Building Docker image...${NC}"
cd microservices/hr-service

docker buildx build \
  --platform linux/amd64 \
  -t ${ECR_REPO}:${IMAGE_TAG} \
  -f Dockerfile \
  --load \
  ../../

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Docker build failed!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Docker image built successfully${NC}"
echo ""

# Step 2: Login to ECR
echo -e "${YELLOW}🔐 Step 2: Logging into ECR...${NC}"
aws ecr get-login-password --region ${REGION} | \
  docker login --username AWS --password-stdin \
  ${ECR_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ ECR login failed!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Logged into ECR${NC}"
echo ""

# Step 3: Tag image
echo -e "${YELLOW}🏷️  Step 3: Tagging image...${NC}"
docker tag ${ECR_REPO}:${IMAGE_TAG} ${ECR_IMAGE}

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Image tagging failed!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Image tagged: ${ECR_IMAGE}${NC}"
echo ""

# Step 4: Push to ECR
echo -e "${YELLOW}📤 Step 4: Pushing image to ECR...${NC}"
docker push ${ECR_IMAGE}

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Image push failed!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Image pushed to ECR${NC}"
echo ""

# Step 5: Update Kubernetes deployment
echo -e "${YELLOW}🔄 Step 5: Updating Kubernetes deployment...${NC}"
kubectl set image deployment/${SERVICE_NAME} \
  ${SERVICE_NAME}=${ECR_IMAGE} \
  -n ${NAMESPACE}

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Deployment update failed!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Deployment updated${NC}"
echo ""

# Step 6: Wait for rollout
echo -e "${YELLOW}⏳ Step 6: Waiting for rollout to complete...${NC}"
kubectl rollout status deployment/${SERVICE_NAME} -n ${NAMESPACE} --timeout=300s

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Rollout failed or timed out!${NC}"
  echo -e "${YELLOW}Checking pod status...${NC}"
  kubectl get pods -n ${NAMESPACE} -l app=${SERVICE_NAME}
  exit 1
fi

echo -e "${GREEN}✅ Rollout completed successfully${NC}"
echo ""

# Step 7: Verify deployment
echo -e "${YELLOW}🔍 Step 7: Verifying deployment...${NC}"
kubectl get pods -n ${NAMESPACE} -l app=${SERVICE_NAME}

echo ""
echo -e "${GREEN}🎉 Store Edit Fix Deployed Successfully!${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "1. Test store edit:"
echo "   GET /api/hr/stores/SHK02"
echo "   PUT /api/hr/stores/SHK02"
echo ""
echo "2. Check logs:"
echo "   kubectl logs -f deployment/${SERVICE_NAME} -n ${NAMESPACE}"
echo ""
echo "3. Monitor for errors:"
echo "   kubectl logs deployment/${SERVICE_NAME} -n ${NAMESPACE} | grep -i error"
echo ""
