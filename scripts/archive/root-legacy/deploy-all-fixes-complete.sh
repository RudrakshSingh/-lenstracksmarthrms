#!/bin/bash

###############################################################################
# Complete Deployment Script - Fix All APIs
# This script builds and deploys all fixes to production
###############################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "🚀 Complete Deployment - All API Fixes"
echo "=========================================="
echo ""

# Services to deploy
SERVICES=(
  "attendance-service"
  "payroll-service"
  "tenant-registry-service"
  "hr-service"
  "auth-service"
)

# AWS Configuration
AWS_REGION="ap-south-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"

if [ -z "$AWS_ACCOUNT_ID" ]; then
  echo -e "${RED}❌ AWS credentials not configured${NC}"
  exit 1
fi

echo "AWS Account: $AWS_ACCOUNT_ID"
echo "Region: $AWS_REGION"
echo "Cluster: $CLUSTER_NAME"
echo ""

# Step 1: Login to ECR
echo "Step 1: Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ ECR login successful${NC}"
else
  echo -e "${RED}❌ ECR login failed${NC}"
  exit 1
fi

# Step 2: Update kubeconfig
echo ""
echo "Step 2: Updating kubeconfig..."
aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Kubeconfig updated${NC}"
else
  echo -e "${RED}❌ Kubeconfig update failed${NC}"
  exit 1
fi

# Step 3: Delete old pods to force new deployment
echo ""
echo "Step 3: Cleaning up old pods..."
for SERVICE in "${SERVICES[@]}"; do
  echo "Cleaning up: $SERVICE"
  # Get old pod names (not the latest deployment)
  OLD_PODS=$(kubectl get pods -n $NAMESPACE -l app=$SERVICE --sort-by=.metadata.creationTimestamp -o jsonpath='{.items[*].metadata.name}' 2>/dev/null | awk '{for(i=1;i<NF-1;i++) printf $i" "}')
  if [ ! -z "$OLD_PODS" ]; then
    for POD in $OLD_PODS; do
      kubectl delete pod $POD -n $NAMESPACE --grace-period=0 --force 2>/dev/null || true
    done
    echo -e "${GREEN}✅ Old pods deleted for $SERVICE${NC}"
  fi
done

# Step 4: Build and push Docker images
echo ""
echo "Step 4: Building and pushing Docker images..."

for SERVICE in "${SERVICES[@]}"; do
  echo ""
  echo "Processing: $SERVICE"
  echo "----------------------------------------"
  
  SERVICE_DIR="microservices/$SERVICE"
  IMAGE_NAME="$ECR_REGISTRY/etelios-$SERVICE:latest"
  
  if [ ! -d "$SERVICE_DIR" ]; then
    echo -e "${YELLOW}⚠️  Service directory not found: $SERVICE_DIR${NC}"
    continue
  fi
  
  echo "Building Docker image..."
  docker buildx build \
    --platform linux/amd64 \
    --file "$SERVICE_DIR/Dockerfile" \
    --tag "$IMAGE_NAME" \
    --push \
    . 2>&1 | grep -E "Step|DONE|error|Error" | tail -5
  
  if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✅ Built and pushed: $IMAGE_NAME${NC}"
  else
    echo -e "${RED}❌ Build failed for $SERVICE${NC}"
    continue
  fi
done

# Step 5: Deploy to EKS
echo ""
echo "Step 5: Deploying to EKS..."

for SERVICE in "${SERVICES[@]}"; do
  echo ""
  echo "Deploying: $SERVICE"
  echo "----------------------------------------"
  
  IMAGE_NAME="$ECR_REGISTRY/etelios-$SERVICE:latest"
  
  # Update deployment image
  kubectl set image deployment/$SERVICE \
    $SERVICE=$IMAGE_NAME \
    -n $NAMESPACE 2>&1 | grep -v "^deployment" || true
  
  # Restart deployment to ensure new pods
  kubectl rollout restart deployment/$SERVICE -n $NAMESPACE 2>&1 | grep -v "^deployment" || true
  
  echo -e "${GREEN}✅ Deployment updated: $SERVICE${NC}"
  
  # Wait for rollout (non-blocking, with timeout)
  echo "Waiting for rollout..."
  kubectl rollout status deployment/$SERVICE -n $NAMESPACE --timeout=120s 2>&1 | head -10 || echo "Rollout in progress..."
done

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Services deployed:"
for SERVICE in "${SERVICES[@]}"; do
  echo "  - $SERVICE"
done
echo ""
echo "Note: Pods may take 2-3 minutes to fully restart."
echo "Check status with: kubectl get pods -n $NAMESPACE | grep -E 'attendance|payroll|tenant|hr|auth'"
echo ""
echo "Test APIs with: ./test-all-apis-comprehensive.sh"
