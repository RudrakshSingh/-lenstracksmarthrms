#!/bin/bash

# Deploy HR Service with Tenant Admin Dashboard Updates to Production
# This script builds, pushes, and deploys the HR service with tenant admin dashboard endpoints

set -e

echo "=========================================="
echo "🚀 Deploying Tenant Admin Dashboard to Production"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="hr-service"
NAMESPACE="etelios-prod"
IMAGE_REGISTRY="383234048604.dkr.ecr.ap-south-1.amazonaws.com"
IMAGE_NAME="${IMAGE_REGISTRY}/etelios-${SERVICE_NAME}"
IMAGE_TAG="latest"

echo -e "${BLUE}📦 Service: ${SERVICE_NAME}${NC}"
echo -e "${BLUE}📦 Namespace: ${NAMESPACE}${NC}"
echo -e "${BLUE}📦 Image: ${IMAGE_NAME}:${IMAGE_TAG}${NC}"
echo ""

# Step 1: Build Docker image
echo -e "${YELLOW}1️⃣  Building Docker image...${NC}"

# Check if Dockerfile exists
if [ ! -f "microservices/${SERVICE_NAME}/Dockerfile" ]; then
    echo -e "${RED}❌ Dockerfile not found!${NC}"
    exit 1
fi

# Build image from root directory (Dockerfile expects root as build context)
docker buildx build \
  --platform linux/amd64 \
  -t ${IMAGE_NAME}:${IMAGE_TAG} \
  -f microservices/${SERVICE_NAME}/Dockerfile \
  --load \
  .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker image built successfully${NC}"
echo ""

# Step 2: Push to ECR
echo -e "${YELLOW}2️⃣  Pushing image to ECR...${NC}"

# Login to ECR
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin ${IMAGE_REGISTRY} || {
    echo -e "${YELLOW}⚠️  ECR login failed, trying to continue...${NC}"
}

# Push image
docker push ${IMAGE_NAME}:${IMAGE_TAG}
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker push failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Image pushed to ECR successfully${NC}"
echo ""

# Step 3: Update Kubernetes deployment
echo -e "${YELLOW}3️⃣  Updating Kubernetes deployment...${NC}"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl not found!${NC}"
    exit 1
fi

# Update kubeconfig
aws eks update-kubeconfig --region ap-south-1 --name etelios-prod-v2 &>/dev/null || true

# Update deployment image
kubectl set image deployment/${SERVICE_NAME} \
  ${SERVICE_NAME}=${IMAGE_NAME}:${IMAGE_TAG} \
  -n ${NAMESPACE}

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment update failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Deployment updated successfully${NC}"
echo ""

# Step 4: Wait for rollout
echo -e "${YELLOW}4️⃣  Waiting for rollout to complete...${NC}"
kubectl rollout status deployment/${SERVICE_NAME} -n ${NAMESPACE} --timeout=300s
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Rollout timeout - checking pods...${NC}"
    kubectl get pods -n ${NAMESPACE} -l app=${SERVICE_NAME}
    exit 1
fi

echo -e "${GREEN}✅ Rollout completed successfully${NC}"
echo ""

# Step 5: Verify deployment
echo -e "${YELLOW}5️⃣  Verifying deployment...${NC}"
sleep 5

# Check pods
PODS=$(kubectl get pods -n ${NAMESPACE} -l app=${SERVICE_NAME} -o jsonpath='{.items[*].metadata.name}' 2>/dev/null)
if [ -z "$PODS" ]; then
    echo -e "${RED}❌ No pods found!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pods running:${NC}"
for pod in $PODS; do
    STATUS=$(kubectl get pod $pod -n ${NAMESPACE} -o jsonpath='{.status.phase}' 2>/dev/null)
    echo -e "   - ${pod}: ${STATUS}"
done
echo ""

echo -e "${GREEN}=========================================="
echo -e "✅ Deployment Complete!"
echo -e "==========================================${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo -e "   Service: ${SERVICE_NAME}"
echo -e "   Namespace: ${NAMESPACE}"
echo -e "   Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""
echo -e "${BLUE}🧪 Next Steps:${NC}"
echo -e "   Run: node scripts/test-tenant-admin-dashboard-prod.js"
echo ""
