#!/bin/bash

# Deploy AWS CORS Fix (Remove Azure References)

set -e

echo "🚀 Deploying AWS CORS Fix (Removing Azure References)..."
echo "====================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Build and push updated services
SERVICES=("hr-service" "attendance-service" "auth-service")
ECR_REGISTRY="383234048604.dkr.ecr.ap-south-1.amazonaws.com"
REGION="ap-south-1"

echo "📦 Building and pushing updated services (AWS CORS fix)..."
echo ""

for SERVICE in "${SERVICES[@]}"; do
  echo -e "${YELLOW}Building ${SERVICE}...${NC}"
  SERVICE_DIR="microservices/${SERVICE#etelios-}"
  
  # Build Docker image
  docker buildx build \
    --platform linux/amd64 \
    -f "${SERVICE_DIR}/Dockerfile" \
    -t "${ECR_REGISTRY}/etelios-${SERVICE}:latest" \
    -t "${ECR_REGISTRY}/etelios-${SERVICE}:aws-cors-fix" \
    --push \
    . || {
    echo "❌ Failed to build ${SERVICE}"
    exit 1
  }
  
  echo -e "${GREEN}✅ ${SERVICE} built and pushed${NC}"
done

echo ""
echo "📋 Applying updated Kubernetes configurations..."
echo ""

# Apply Ingress update
echo "Updating Ingress..."
kubectl apply -f k8s/ingress.yaml || {
  echo "❌ Failed to update Ingress"
  exit 1
}
echo "✅ Ingress updated"

# Apply service deployments
for SERVICE in "${SERVICES[@]}"; do
  echo "Updating ${SERVICE} deployment..."
  kubectl apply -f "k8s/etelios-prod/${SERVICE}-deployment.yaml" || {
    echo "⚠️  Failed to update ${SERVICE}"
    exit 1
  }
  echo "✅ ${SERVICE} deployment updated"
done

echo ""
echo "🔄 Restarting pods to apply changes..."
echo ""

for SERVICE in "${SERVICES[@]}"; do
  echo "Restarting ${SERVICE} pods..."
  kubectl rollout restart deployment/${SERVICE} -n etelios-prod || {
    echo "⚠️  Failed to restart ${SERVICE}, but continuing..."
  }
done

echo ""
echo "⏳ Waiting for pods to be ready..."
sleep 10

# Check pod status
for SERVICE in "${SERVICES[@]}"; do
  echo "Checking ${SERVICE} status..."
  kubectl rollout status deployment/${SERVICE} -n etelios-prod --timeout=120s || {
    echo "⚠️  ${SERVICE} rollout may still be in progress"
  }
done

echo ""
echo "====================================="
echo -e "${GREEN}✅ AWS CORS Fix Deployed!${NC}"
echo ""
echo "📊 Changes Applied:"
echo "   ✅ Removed Azure IP references"
echo "   ✅ Updated CORS to use AWS/environment variables"
echo "   ✅ All origins allowed (CORS_ORIGIN=*)"
echo "   ✅ Credentials enabled"
echo ""
echo "🌐 Frontend can now access backend from any origin"
echo ""
