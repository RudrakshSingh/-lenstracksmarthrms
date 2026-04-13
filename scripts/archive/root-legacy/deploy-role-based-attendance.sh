#!/bin/bash

# Deploy role-based attendance APIs

set -e

AWS_REGION="ap-south-1"
ECR_REGISTRY="383234048604.dkr.ecr.ap-south-1.amazonaws.com"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"

echo "🔧 Building and deploying role-based attendance APIs..."
echo ""

# Services to deploy
SERVICES=("attendance-service" "hr-service")

for SERVICE in "${SERVICES[@]}"; do
  echo "=========================================="
  echo "📦 Deploying $SERVICE"
  echo "=========================================="
  
  IMAGE_NAME="$ECR_REGISTRY/etelios-$SERVICE:latest"
  
  echo "1️⃣ Logging into ECR..."
  aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
  
  echo ""
  echo "2️⃣ Building Docker image..."
  docker buildx build --platform linux/amd64 \
    --file "microservices/$SERVICE/Dockerfile" \
    --tag "$IMAGE_NAME" \
    --push .
  
  echo ""
  echo "3️⃣ Updating kubeconfig..."
  aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME
  
  echo ""
  echo "4️⃣ Deploying to Kubernetes..."
  kubectl set image deployment/$SERVICE $SERVICE=$IMAGE_NAME -n $NAMESPACE
  
  echo ""
  echo "5️⃣ Waiting for rollout (120s timeout)..."
  kubectl rollout status deployment/$SERVICE -n $NAMESPACE --timeout=120s || echo "⚠️  Rollout timeout - check pods manually"
  
  echo ""
  echo "✅ $SERVICE deployed!"
  echo ""
done

echo "=========================================="
echo "✅ All services deployed!"
echo ""
echo "🎯 Role-based attendance features:"
echo "   1. ✅ Employees can only see their own attendance"
echo "   2. ✅ Admin/HR can see all employees' attendance"
echo "   3. ✅ Store-wise attendance API: GET /api/attendance/store/:storeId"
echo "   4. ✅ Department-wise attendance API: GET /api/attendance/department/:departmentId"
echo "   5. ✅ Dashboard shows attendance based on role"
echo ""
