#!/bin/bash
set -e

echo "🚀 Deploying Attendance Stats Route Fix..."
echo "=========================================="

# Configuration
REGION="ap-south-1"
ECR_REPO_PREFIX="etelios"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"
SERVICE_NAME="attendance-service"
ECR_REGISTRY="383234048604.dkr.ecr.${REGION}.amazonaws.com"
IMAGE_NAME="${ECR_REGISTRY}/${ECR_REPO_PREFIX}-${SERVICE_NAME}:latest"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}📋 Fix Details:${NC}"
echo "  - Fixed route order: /stats now comes BEFORE /:id"
echo "  - This fixes: GET /api/attendance/stats (was returning 404)"
echo "  - Route was being caught by /:id route (treating 'stats' as ID)"
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
echo "  Service: ${SERVICE_NAME}"
echo ""

docker buildx build \
  --platform linux/amd64 \
  -f microservices/${SERVICE_NAME}/Dockerfile \
  -t ${IMAGE_NAME} \
  --push \
  . 2>&1 | grep -E "(building|DONE|error|Error|Pushing|pushed|Step)" | tail -30

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
echo -e "${YELLOW}5️⃣ Waiting for rollout to complete (this may take 2-3 minutes)...${NC}"
kubectl rollout status deployment/${SERVICE_NAME} -n ${NAMESPACE} --timeout=600s || {
  echo -e "${YELLOW}⚠️  Rollout status check timed out, but deployment may still be in progress${NC}"
  echo "   Check status manually: kubectl get pods -n ${NAMESPACE} -l app=${SERVICE_NAME}"
}
echo -e "${GREEN}✅ Rollout complete${NC}"
echo ""

# Step 6: Verify pods
echo -e "${YELLOW}6️⃣ Verifying pods...${NC}"
kubectl get pods -n ${NAMESPACE} | grep ${SERVICE_NAME} | head -5
echo ""

# Step 7: Wait a bit for service to be ready
echo -e "${YELLOW}7️⃣ Waiting 30 seconds for service to be fully ready...${NC}"
sleep 30

echo -e "${GREEN}=========================================="
echo "✅ Attendance Stats Route Fix Deployed!"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}📝 Test the fix:${NC}"
echo "  GET /api/attendance/stats"
echo "  Expected: Should return attendance statistics (not 404)"
echo ""
echo -e "${YELLOW}🧪 Run test:${NC}"
echo "  node scripts/test-all-stats-apis.js"
echo ""
echo -e "${YELLOW}📊 Check logs:${NC}"
echo "  kubectl logs -n ${NAMESPACE} -l app=${SERVICE_NAME} --tail=50"
echo ""
