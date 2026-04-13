#!/bin/bash

# Deploy Attendance Service Employee Lookup Fix to Production
# Fixes employee lookup to properly find employees in HR service

set -e

echo "🚀 Deploying Attendance Service Employee Lookup Fix to Production..."
echo "====================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE="attendance-service"
ECR_REGISTRY="383234048604.dkr.ecr.ap-south-1.amazonaws.com"
REGION="ap-south-1"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"
IMAGE_NAME="${ECR_REGISTRY}/etelios-${SERVICE}:latest"

echo -e "${BLUE}Configuration:${NC}"
echo "  Service: ${SERVICE}"
echo "  ECR Registry: ${ECR_REGISTRY}"
echo "  Region: ${REGION}"
echo "  Cluster: ${CLUSTER_NAME}"
echo "  Namespace: ${NAMESPACE}"
echo "  Image: ${IMAGE_NAME}"
echo ""

# Check prerequisites
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found${NC}"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found${NC}"
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl not found${NC}"
    exit 1
fi

# Check AWS credentials
echo -e "${YELLOW}1️⃣ Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    exit 1
fi
echo -e "${GREEN}✅ AWS credentials OK${NC}"
echo ""

# Update kubeconfig
echo -e "${YELLOW}2️⃣ Updating kubeconfig...${NC}"
aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER_NAME" || {
    echo -e "${RED}❌ Failed to update kubeconfig${NC}"
    exit 1
}
echo -e "${GREEN}✅ Kubeconfig updated${NC}"
echo ""

# Login to ECR
echo -e "${YELLOW}3️⃣ Logging into ECR...${NC}"
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY" || {
    echo -e "${RED}❌ Failed to login to ECR${NC}"
    exit 1
}
echo -e "${GREEN}✅ ECR login successful${NC}"
echo ""

# Build Docker image
echo -e "${YELLOW}4️⃣ Building Docker image...${NC}"
echo "  Building for platform: linux/amd64"
echo "  Dockerfile: microservices/${SERVICE}/Dockerfile"
echo "  Build context: . (root directory)"
echo ""

docker buildx build \
  --platform linux/amd64 \
  -f "microservices/${SERVICE}/Dockerfile" \
  -t "$IMAGE_NAME" \
  --load \
  . || {
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
}

echo -e "${GREEN}✅ Docker image built${NC}"
echo ""

# Push to ECR
echo -e "${YELLOW}5️⃣ Pushing image to ECR...${NC}"
docker push "$IMAGE_NAME" || {
    echo -e "${RED}❌ Failed to push image${NC}"
    exit 1
}
echo -e "${GREEN}✅ Image pushed to ECR${NC}"
echo ""

# Restart deployment to pick up new image
echo -e "${YELLOW}6️⃣ Restarting deployment to pick up new image...${NC}"
kubectl rollout restart deployment/"${SERVICE}" -n "$NAMESPACE" || {
    echo -e "${RED}❌ Failed to restart deployment${NC}"
    exit 1
}
echo -e "${GREEN}✅ Deployment restart initiated${NC}"
echo ""

# Wait for rollout
echo -e "${YELLOW}7️⃣ Waiting for rollout (180s timeout)...${NC}"
if kubectl rollout status deployment/"${SERVICE}" -n "$NAMESPACE" --timeout=180s; then
    echo -e "${GREEN}✅ Rollout successful${NC}"
else
    echo -e "${YELLOW}⚠️  Rollout timeout - check pods manually${NC}"
fi
echo ""

# Verify pods
echo -e "${YELLOW}8️⃣ Verifying pods...${NC}"
kubectl get pods -n "$NAMESPACE" -l app="${SERVICE}" || {
    echo -e "${YELLOW}⚠️  Could not verify pods${NC}"
}
echo ""

# Summary
echo -e "${BLUE}=====================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""
echo -e "${BLUE}📋 Fix Deployed:${NC}"
echo "  ✅ Added upcapto tenant admin credentials support"
echo "  ✅ Improved employee lookup with multiple query parameters"
echo "  ✅ Enhanced email lookup with proper parameter handling"
echo "  ✅ Better error logging for debugging"
echo ""
echo -e "${BLUE}🧪 Test Clock-In/Clock-Out:${NC}"
echo "  BACKEND_URL=http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com \\"
echo "  EMAIL=Aditya@gmail.com \\"
echo "  PASSWORD=\"yrv0s48mA1!\" \\"
echo "  node scripts/test-clock-in-out.js"
echo ""
echo -e "${BLUE}📊 Check Status:${NC}"
echo "  kubectl get pods -n $NAMESPACE -l app=$SERVICE"
echo "  kubectl logs -n $NAMESPACE -l app=$SERVICE --tail=50"
echo ""
