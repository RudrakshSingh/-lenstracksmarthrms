#!/bin/bash
set -e

echo "=========================================="
echo "🚀 Deploying HR Service Time-Tracking Fix"
echo "=========================================="
echo ""
echo "📋 Fix:"
echo "  ✅ Time-tracking endpoint returns 200 with empty array instead of 500"

# Configuration
SERVICE_NAME="hr-service"
ECR_REPO="383234048604.dkr.ecr.ap-south-1.amazonaws.com/etelios-hr-service"
REGION="ap-south-1"
K8S_NAMESPACE="etelios-prod"
K8S_DEPLOYMENT="hr-service"

echo ""
echo "1️⃣  Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REPO

echo ""
echo "2️⃣  Building Docker image..."
docker buildx build --platform linux/amd64 \
  -f microservices/$SERVICE_NAME/Dockerfile \
  -t $ECR_REPO:latest \
  --push \
  .

echo ""
echo "3️⃣  Updating kubeconfig..."
aws eks update-kubeconfig --region $REGION --name etelios-prod-v2

echo ""
echo "4️⃣  Deploying to Kubernetes..."
kubectl set image deployment/$K8S_DEPLOYMENT $K8S_DEPLOYMENT=$ECR_REPO:latest -n $K8S_NAMESPACE

echo ""
echo "5️⃣  Waiting for rollout (120s timeout)..."
kubectl rollout status deployment/$K8S_DEPLOYMENT -n $K8S_NAMESPACE --timeout=120s

echo ""
echo "6️⃣  Verifying pods..."
kubectl get pods -n $K8S_NAMESPACE | grep $K8S_DEPLOYMENT

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
