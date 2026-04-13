#!/bin/bash
set -e

echo "🚀 Deploying Tenant Admin Dashboard to ELB (AWS EKS)..."
echo "========================================================"

# Configuration
REGION="ap-south-1"
ACCOUNT_ID="383234048604"
ECR_REPO="etelios-hr-service"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"
SERVICE_NAME="hr-service"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# ECR Image URL
ECR_IMAGE="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO}:latest"

echo -e "${BLUE}📋 Configuration:${NC}"
echo "   Region: ${REGION}"
echo "   Cluster: ${CLUSTER_NAME}"
echo "   Namespace: ${NAMESPACE}"
echo "   Service: ${SERVICE_NAME}"
echo "   ECR Image: ${ECR_IMAGE}"
echo ""

# Step 1: Verify AWS credentials
echo -e "${YELLOW}🔐 Step 1: Verifying AWS credentials...${NC}"
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}❌ AWS credentials not configured!${NC}"
    echo "   Run: aws configure"
    exit 1
fi
echo -e "${GREEN}✅ AWS credentials verified${NC}"
echo ""

# Step 2: Verify kubectl access
echo -e "${YELLOW}🔧 Step 2: Verifying kubectl access...${NC}"
if ! kubectl get nodes > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  kubectl not configured, updating kubeconfig...${NC}"
    aws eks update-kubeconfig --name ${CLUSTER_NAME} --region ${REGION}
fi
echo -e "${GREEN}✅ kubectl access verified${NC}"
echo ""

# Step 3: Build Docker image
echo -e "${YELLOW}📦 Step 3: Building Docker image...${NC}"
cd "$(dirname "$0")/.."
cd microservices/hr-service

echo "   Building image: ${ECR_REPO}:latest"
docker buildx build \
  --platform linux/amd64 \
  -t ${ECR_REPO}:latest \
  -f Dockerfile \
  --load \
  ../../

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker image built successfully${NC}"
echo ""

# Step 4: Login to ECR
echo -e "${YELLOW}🔑 Step 4: Logging into ECR...${NC}"
aws ecr get-login-password --region ${REGION} | \
  docker login --username AWS --password-stdin \
  ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ECR login failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Logged into ECR${NC}"
echo ""

# Step 5: Tag and push image
echo -e "${YELLOW}📤 Step 5: Tagging and pushing image to ECR...${NC}"
docker tag ${ECR_REPO}:latest ${ECR_IMAGE}
docker push ${ECR_IMAGE}

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Image push failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Image pushed to ECR${NC}"
echo ""

# Step 6: Update Kubernetes deployment
echo -e "${YELLOW}🔄 Step 6: Updating Kubernetes deployment...${NC}"
kubectl set image deployment/${SERVICE_NAME} \
  ${SERVICE_NAME}=${ECR_IMAGE} \
  -n ${NAMESPACE}

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment update failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Deployment updated${NC}"
echo ""

# Step 7: Wait for rollout
echo -e "${YELLOW}⏳ Step 7: Waiting for rollout to complete...${NC}"
kubectl rollout status deployment/${SERVICE_NAME} -n ${NAMESPACE} --timeout=300s

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Rollout failed or timed out!${NC}"
    echo "   Check status: kubectl rollout status deployment/${SERVICE_NAME} -n ${NAMESPACE}"
    exit 1
fi
echo -e "${GREEN}✅ Rollout completed successfully${NC}"
echo ""

# Step 8: Verify deployment
echo -e "${YELLOW}🔍 Step 8: Verifying deployment...${NC}"
POD_NAME=$(kubectl get pods -n ${NAMESPACE} -l app=${SERVICE_NAME} -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

if [ -z "$POD_NAME" ]; then
    echo -e "${RED}❌ No pods found for ${SERVICE_NAME}${NC}"
    exit 1
fi

echo "   Pod: ${POD_NAME}"
POD_STATUS=$(kubectl get pod ${POD_NAME} -n ${NAMESPACE} -o jsonpath='{.status.phase}')
echo "   Status: ${POD_STATUS}"

if [ "$POD_STATUS" != "Running" ]; then
    echo -e "${YELLOW}⚠️  Pod is not in Running state. Check logs:${NC}"
    echo "   kubectl logs ${POD_NAME} -n ${NAMESPACE}"
else
    echo -e "${GREEN}✅ Pod is running${NC}"
fi
echo ""

# Step 9: Get service URL
echo -e "${YELLOW}🌐 Step 9: Getting service URL...${NC}"
SERVICE_URL=$(kubectl get svc ${SERVICE_NAME} -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)

if [ -z "$SERVICE_URL" ]; then
    # Try ALB/ELB annotation
    SERVICE_URL=$(kubectl get ingress -n ${NAMESPACE} -o jsonpath='{.items[*].status.loadBalancer.ingress[0].hostname}' 2>/dev/null)
fi

if [ -n "$SERVICE_URL" ]; then
    echo -e "${GREEN}✅ Service URL: https://${SERVICE_URL}${NC}"
else
    echo -e "${YELLOW}⚠️  Could not determine service URL${NC}"
    echo "   Check: kubectl get svc -n ${NAMESPACE}"
fi
echo ""

# Success message
echo -e "${GREEN}🎉 Tenant Admin Dashboard deployed successfully!${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "   1. Test endpoints:"
echo "      API_BASE_URL=https://api.etelios.com \\"
echo "      TEST_TOKEN=your-token \\"
echo "      TENANT_ID=lenstrack \\"
echo "      node scripts/test-tenant-admin-dashboard.js"
echo ""
echo "   2. Check pod logs:"
echo "      kubectl logs -f ${POD_NAME} -n ${NAMESPACE}"
echo ""
echo "   3. Verify endpoints:"
echo "      curl -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "           -H 'X-Tenant-Id: lenstrack' \\"
echo "           https://api.etelios.com/api/dashboard/stats"
echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
