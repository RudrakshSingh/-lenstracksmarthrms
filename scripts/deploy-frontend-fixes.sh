#!/bin/bash
set -e

echo "🚀 Deploying Frontend Fixes to Production..."
echo "=============================================="

REGION="ap-south-1"
ECR_ACCOUNT="383234048604"
NAMESPACE="etelios-prod"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get absolute path to project root (run once at start)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

deploy_service() {
  local SERVICE_NAME=$1
  local SERVICE_DIR=$2
  local ECR_REPO="etelios-${SERVICE_NAME}"
  local ECR_IMAGE="${ECR_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO}:latest"
  
  echo -e "${BLUE}📦 Deploying ${SERVICE_NAME}...${NC}"
  echo ""
  
  echo -e "${YELLOW}  Building Docker image...${NC}"
  docker buildx build --platform linux/amd64 -t ${ECR_REPO}:latest -f ${SERVICE_DIR}/Dockerfile --load .
  
  echo -e "${YELLOW}  Logging into ECR...${NC}"
  aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com
  
  echo -e "${YELLOW}  Tagging image...${NC}"
  docker tag ${ECR_REPO}:latest ${ECR_IMAGE}
  
  echo -e "${YELLOW}  Pushing to ECR...${NC}"
  docker push ${ECR_IMAGE}
  
  echo -e "${YELLOW}  Updating Kubernetes deployment...${NC}"
  kubectl set image deployment/${SERVICE_NAME} ${SERVICE_NAME}=${ECR_IMAGE} -n ${NAMESPACE}
  
  echo -e "${YELLOW}  Restarting deployment to ensure latest code is running...${NC}"
  kubectl rollout restart deployment/${SERVICE_NAME} -n ${NAMESPACE}
  
  echo -e "${YELLOW}  Waiting for rollout...${NC}"
  kubectl rollout status deployment/${SERVICE_NAME} -n ${NAMESPACE} --timeout=300s
  
  echo -e "${GREEN}  ✅ ${SERVICE_NAME} deployed and restarted!${NC}"
  echo ""
}

echo -e "${BLUE}📋 All Fixes Being Deployed:${NC}"
echo "  1. Department View - Added tenantId filter"
echo "  2. Store Delete - Added code lookup support"
echo "  3. Leave Apply - Improved employee lookup"
echo "  4. Attendance Edit - PUT endpoint for general editing"
echo "  5. Employee View/Edit - Tenant isolation verified"
echo "  6. Attendance Tenant Isolation - Verified working"
echo ""

# Deploy HR Service (All HR fixes: Department, Store, Leave, Employee)
deploy_service "hr-service" "microservices/hr-service"

# Deploy Attendance Service (Attendance Edit fix)
deploy_service "attendance-service" "microservices/attendance-service"

echo -e "${GREEN}🎉 All Fixes Deployed Successfully!${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "1. Test Leave Apply:"
echo "   POST /api/hr/leave-requests"
echo ""
echo "2. Test Attendance Edit:"
echo "   PUT /api/attendance/:id"
echo ""
echo "3. Check logs:"
echo "   kubectl logs -f deployment/hr-service -n ${NAMESPACE}"
echo "   kubectl logs -f deployment/attendance-service -n ${NAMESPACE}"
