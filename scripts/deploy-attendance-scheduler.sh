#!/bin/bash

# Deploy Attendance Service with Cron Jobs Scheduler to Production
# This script builds, pushes, and deploys the attendance service with the new scheduler

set -e

echo "=========================================="
echo "🚀 Deploying Attendance Service with Scheduler"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="attendance-service"
NAMESPACE="etelios-prod"
IMAGE_REGISTRY="383234048604.dkr.ecr.ap-south-1.amazonaws.com"
IMAGE_NAME="${IMAGE_REGISTRY}/etelios-attendance-service"
IMAGE_TAG="latest"

echo -e "${BLUE}📦 Service: ${SERVICE_NAME}${NC}"
echo -e "${BLUE}📦 Namespace: ${NAMESPACE}${NC}"
echo -e "${BLUE}📦 Image: ${IMAGE_NAME}:${IMAGE_TAG}${NC}"
echo ""

# Step 1: Build Docker image
echo -e "${YELLOW}1️⃣  Building Docker image...${NC}"

# Check if Dockerfile exists (Dockerfile expects root directory as context)
if [ ! -f "microservices/attendance-service/Dockerfile" ]; then
    echo -e "${RED}❌ Dockerfile not found!${NC}"
    exit 1
fi

# Build image from root directory (Dockerfile expects root as build context)
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -f microservices/attendance-service/Dockerfile .
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker image built successfully${NC}"
echo ""

# Step 2: Push to ECR
echo -e "${YELLOW}2️⃣  Pushing image to ECR...${NC}"

# Login to ECR (if not already logged in)
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

# Step 3: Apply Kubernetes deployment
echo -e "${YELLOW}3️⃣  Deploying to Kubernetes...${NC}"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl not found!${NC}"
    exit 1
fi

# Check if namespace exists
kubectl get namespace ${NAMESPACE} &> /dev/null || {
    echo -e "${RED}❌ Namespace ${NAMESPACE} not found!${NC}"
    exit 1
}

# Apply deployment
kubectl apply -f k8s/deployments/attendance-service.yaml -n ${NAMESPACE}
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Deployment applied successfully${NC}"
echo ""

# Step 4: Wait for rollout
echo -e "${YELLOW}4️⃣  Waiting for rollout to complete...${NC}"
kubectl rollout status deployment/${SERVICE_NAME} -n ${NAMESPACE} --timeout=300s
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Rollout failed or timed out!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Rollout completed successfully${NC}"
echo ""

# Step 5: Verify deployment
echo -e "${YELLOW}5️⃣  Verifying deployment...${NC}"
sleep 5

# Check pods
PODS=$(kubectl get pods -n ${NAMESPACE} -l app=${SERVICE_NAME} -o jsonpath='{.items[*].metadata.name}')
if [ -z "$PODS" ]; then
    echo -e "${RED}❌ No pods found!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pods running:${NC}"
for pod in $PODS; do
    STATUS=$(kubectl get pod $pod -n ${NAMESPACE} -o jsonpath='{.status.phase}')
    echo -e "   - ${pod}: ${STATUS}"
done
echo ""

# Step 6: Test scheduler endpoint
echo -e "${YELLOW}6️⃣  Testing scheduler status endpoint...${NC}"
sleep 10

# Get service endpoint
SERVICE_URL=$(kubectl get svc -n ${NAMESPACE} ${SERVICE_NAME} -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")

if [ -z "$SERVICE_URL" ]; then
    # Try port-forward for testing
    echo -e "${YELLOW}⚠️  Service URL not found, using port-forward for testing...${NC}"
    kubectl port-forward -n ${NAMESPACE} svc/${SERVICE_NAME} 3003:3003 &
    PORT_FORWARD_PID=$!
    sleep 5
    
    # Test scheduler status
    curl -s http://localhost:3003/api/attendance/scheduler/status | jq '.' || {
        echo -e "${YELLOW}⚠️  Scheduler status endpoint test failed (may need to wait for service to be ready)${NC}"
    }
    
    # Kill port-forward
    kill $PORT_FORWARD_PID 2>/dev/null || true
else
    # Test with service URL
    curl -s http://${SERVICE_URL}:3003/api/attendance/scheduler/status | jq '.' || {
        echo -e "${YELLOW}⚠️  Scheduler status endpoint test failed (may need to wait for service to be ready)${NC}"
    }
fi

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
echo -e "${BLUE}🧪 Test Commands:${NC}"
echo -e "   # Check scheduler status"
echo -e "   kubectl port-forward -n ${NAMESPACE} svc/${SERVICE_NAME} 3003:3003"
echo -e "   curl http://localhost:3003/api/attendance/scheduler/status"
echo ""
echo -e "${BLUE}📊 Monitor Commands:${NC}"
echo -e "   # View pods"
echo -e "   kubectl get pods -n ${NAMESPACE} -l app=${SERVICE_NAME}"
echo ""
echo -e "   # View logs"
echo -e "   kubectl logs -n ${NAMESPACE} -l app=${SERVICE_NAME} --tail=100 -f"
echo ""
echo -e "${BLUE}🔄 Rollback (if needed):${NC}"
echo -e "   kubectl rollout undo deployment/${SERVICE_NAME} -n ${NAMESPACE}"
echo ""
