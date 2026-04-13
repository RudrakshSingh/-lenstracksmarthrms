#!/bin/bash
set -e

echo "🚀 Deploying Roster Employee Lookup Fix..."
echo "=========================================="

# Configuration
REGION="ap-south-1"
ECR_REPO_PREFIX="etelios"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"
SERVICE_NAME="hr-service"
ECR_REGISTRY="383234048604.dkr.ecr.${REGION}.amazonaws.com"
IMAGE_NAME="${ECR_REGISTRY}/${ECR_REPO_PREFIX}-${SERVICE_NAME}:latest"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}📋 Fix Details:${NC}"
echo "  - Roster POST API now accepts MongoDB _id as employeeId"
echo "  - Supports both _id and employeeId/employee_id string fields"
echo "  - Proper tenant isolation maintained"
echo ""

# Step 1: Login to ECR
echo -e "${YELLOW}1️⃣ Logging into ECR...${NC}"
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
echo -e "${GREEN}✅ ECR login successful${NC}"
echo ""

# Step 2: Build Docker image
echo -e "${YELLOW}2️⃣ Building Docker image...${NC}"
echo "  Platform: linux/amd64"
echo "  Image: ${IMAGE_NAME}"
echo ""

docker buildx build \
  --platform linux/amd64 \
  -f microservices/${SERVICE_NAME}/Dockerfile \
  -t ${IMAGE_NAME} \
  --push \
  . 2>&1 | grep -E "(building|DONE|error|Error|Pushing|pushed)" | tail -20

if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo -e "${RED}❌ Docker build/push failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Docker image built and pushed${NC}"
echo ""

# Step 3: Update kubeconfig
echo -e "${YELLOW}3️⃣ Updating kubeconfig...${NC}"
aws eks update-kubeconfig --region ${REGION} --name ${CLUSTER_NAME} &>/dev/null
echo -e "${GREEN}✅ Kubeconfig updated${NC}"
echo ""

# Step 4: Update deployment
echo -e "${YELLOW}4️⃣ Updating Kubernetes deployment...${NC}"
kubectl set image deployment/${SERVICE_NAME} \
  ${SERVICE_NAME}=${IMAGE_NAME} \
  -n ${NAMESPACE}
echo -e "${GREEN}✅ Deployment updated${NC}"
echo ""

# Step 5: Wait for rollout
echo -e "${YELLOW}5️⃣ Waiting for rollout to complete...${NC}"
kubectl rollout status deployment/${SERVICE_NAME} -n ${NAMESPACE} --timeout=600s
echo -e "${GREEN}✅ Rollout complete${NC}"
echo ""

# Step 6: Verify pods
echo -e "${YELLOW}6️⃣ Verifying pods...${NC}"
kubectl get pods -n ${NAMESPACE} | grep ${SERVICE_NAME} | head -3
echo ""

echo -e "${GREEN}=========================================="
echo "✅ Roster Employee Lookup Fix Deployed!"
echo "==========================================${NC}"
echo ""
echo "📝 Test the fix:"
echo "  POST /api/hr/roster"
echo "  Body: {"
echo "    \"employeeId\": \"<MongoDB _id or employeeId string>\","
echo "    \"storeId\": \"<storeId>\","
echo "    \"date\": \"2026-03-06\","
echo "    \"shift\": \"MORNING\","
echo "    \"shiftStart\": \"09:00\","
echo "    \"shiftEnd\": \"18:00\""
echo "  }"
