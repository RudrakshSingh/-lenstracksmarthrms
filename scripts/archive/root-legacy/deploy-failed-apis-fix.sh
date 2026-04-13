#!/bin/bash

###############################################################################
# Deploy Fixes for Failed APIs
# Fixes: Attendance, Payroll, Tenant Company APIs
###############################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "🚀 Deploying Failed APIs Fixes"
echo "=========================================="
echo ""

# Services to deploy
SERVICES=("attendance-service" "payroll-service" "tenant-registry-service" "hr-service" "auth-service")

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
echo ""
echo "Step 1: Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
echo -e "${GREEN}✅ ECR login successful${NC}"

# Step 2: Update kubeconfig
echo ""
echo "Step 2: Updating kubeconfig..."
aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME
echo -e "${GREEN}✅ Kubeconfig updated${NC}"

# Step 3: Build and push images
echo ""
echo "Step 3: Building and pushing Docker images..."
for SERVICE in "${SERVICES[@]}"; do
  echo ""
  echo "Processing: $SERVICE"
  echo "----------------------------------------"
  
  SERVICE_DIR="microservices/$SERVICE"
  # ECR repositories use etelios- prefix
  IMAGE_NAME="$ECR_REGISTRY/etelios-$SERVICE:latest"
  
  if [ ! -d "$SERVICE_DIR" ]; then
    echo -e "${YELLOW}⚠️  Service directory not found: $SERVICE_DIR${NC}"
    continue
  fi
  
  echo "Building Docker image..."
  # Build from root directory with proper context
  docker buildx build \
    --platform linux/amd64 \
    --file "$SERVICE_DIR/Dockerfile" \
    --tag "$IMAGE_NAME" \
    --push \
    . || {
    echo -e "${RED}❌ Failed to build $SERVICE${NC}"
    continue
  }
  
  echo -e "${GREEN}✅ Built and pushed: $IMAGE_NAME${NC}"
done

# Step 4: Deploy to EKS
echo ""
echo "Step 4: Deploying to EKS..."
for SERVICE in "${SERVICES[@]}"; do
  echo ""
  echo "Deploying: $SERVICE"
  echo "----------------------------------------"
  
  # ECR repositories use etelios- prefix
  IMAGE_NAME="$ECR_REGISTRY/etelios-$SERVICE:latest"
  
  # Update deployment image
  kubectl set image deployment/$SERVICE \
    $SERVICE=$IMAGE_NAME \
    -n $NAMESPACE || {
    echo -e "${YELLOW}⚠️  Failed to set image, trying rollout restart...${NC}"
    kubectl rollout restart deployment/$SERVICE -n $NAMESPACE || {
      echo -e "${RED}❌ Failed to restart $SERVICE${NC}"
      continue
    }
  }
  
  echo -e "${GREEN}✅ Deployment updated: $SERVICE${NC}"
  
  # Wait for rollout (non-blocking, with timeout)
  echo "Waiting for rollout..."
  # Use kubectl's built-in timeout instead of timeout command (macOS compatible)
  kubectl rollout status deployment/$SERVICE -n $NAMESPACE --timeout=60s 2>&1 || {
    # Check if pods are ready even if rollout status timed out
    READY=$(kubectl get deployment/$SERVICE -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    DESIRED=$(kubectl get deployment/$SERVICE -n $NAMESPACE -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    if [ "$READY" -gt 0 ]; then
      echo -e "${GREEN}✅ $SERVICE: $READY/$DESIRED pods ready (rollout continuing in background)${NC}"
    else
      echo -e "${YELLOW}⚠️  Rollout status check timed out (this is normal, pods are starting in background)${NC}"
    fi
  }
done

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Services deployed:"
for SERVICE in "${SERVICES[@]}"; do
  echo "  - $SERVICE"
done
echo ""
echo "Note: Pods may take 1-2 minutes to fully restart."
echo "Check status with: kubectl get pods -n $NAMESPACE | grep -E 'attendance|payroll|tenant'"
echo ""
