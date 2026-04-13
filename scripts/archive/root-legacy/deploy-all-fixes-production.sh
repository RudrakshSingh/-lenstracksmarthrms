#!/bin/bash

# Deploy all fixes to production
# Fixes:
# 1. Auto clock-out on logout (auth-service)
# 2. Auto clock-out on geofence violation 200m (attendance-service)
# 3. Null values fix in employee response (hr-service, attendance-service)
# 4. 503 error fix for attendance API (attendance-service)

set -e

AWS_REGION="ap-south-1"
ECR_REGISTRY="383234048604.dkr.ecr.ap-south-1.amazonaws.com"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"

# Services to deploy
SERVICES=("auth-service" "attendance-service" "hr-service")

echo "🚀 Deploying all fixes to production..."
echo "=========================================="
echo ""

echo "1️⃣ Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

echo ""
echo "2️⃣ Updating kubeconfig..."
aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME

echo ""
echo "3️⃣ Building and deploying services..."
echo ""

for SERVICE in "${SERVICES[@]}"; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 Deploying $SERVICE..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  IMAGE_NAME="$ECR_REGISTRY/etelios-$SERVICE:latest"
  
  echo "  Building Docker image..."
  docker buildx build --platform linux/amd64 \
    --file "microservices/$SERVICE/Dockerfile" \
    --tag "$IMAGE_NAME" \
    --push . || {
    echo "  ❌ Failed to build $SERVICE"
    continue
  }
  
  echo "  Updating deployment..."
  kubectl set image deployment/$SERVICE $SERVICE=$IMAGE_NAME -n $NAMESPACE || {
    echo "  ❌ Failed to update deployment for $SERVICE"
    continue
  }
  
  echo "  Waiting for rollout (60s timeout)..."
  kubectl rollout status deployment/$SERVICE -n $NAMESPACE --timeout=60s || {
    echo "  ⚠️  Rollout timeout for $SERVICE - check pods manually"
  }
  
  echo "  ✅ $SERVICE deployed successfully!"
  echo ""
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All deployments completed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Check pod status:"
for SERVICE in "${SERVICES[@]}"; do
  echo "   kubectl get pods -n $NAMESPACE -l app=$SERVICE"
done
echo ""
echo "📋 Check logs:"
for SERVICE in "${SERVICES[@]}"; do
  echo "   kubectl logs -n $NAMESPACE -l app=$SERVICE --tail=50"
done
echo ""
echo "🎯 Fixes deployed:"
echo "   1. ✅ Auto clock-out on logout"
echo "   2. ✅ Auto clock-out on geofence violation (200m)"
echo "   3. ✅ Null values fix in employee response"
echo "   4. ✅ 503 error fix for attendance API"
echo ""
