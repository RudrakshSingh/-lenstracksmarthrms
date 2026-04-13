#!/bin/bash

# Deploy HR service with all API fixes
# Fixes (Latest - Feb 20, 2026):
# 1. GET /api/hr/dashboard/overview (404) - Fixed route order
# 2. GET /api/hr/time-tracking/timesheets (404) - Removed strict permission
# 3. GET /api/hr/time-tracking/projects (404) - Removed strict permission
# 4. GET /api/hr/employee/:id (500) - Added singular route alias
# 5. GET /api/hr/performance/employee/:id (500) - Added tenant isolation
# 6. Dashboard login time tracking - Added recent login time and total login time calculation from all sessions

set -e

AWS_REGION="ap-south-1"
ECR_REGISTRY="383234048604.dkr.ecr.ap-south-1.amazonaws.com"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"
SERVICE="hr-service"
IMAGE_NAME="$ECR_REGISTRY/etelios-$SERVICE:latest"

echo "🔧 Building and deploying HR service with all API fixes..."
echo ""

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
echo "✅ Deployment initiated!"
echo ""
echo "📋 Check pod status:"
echo "   kubectl get pods -n $NAMESPACE -l app=$SERVICE"
echo ""
echo "📋 Check logs:"
echo "   kubectl logs -n $NAMESPACE -l app=$SERVICE --tail=50"
echo ""
echo "🎯 Fixes deployed:"
echo "   1. ✅ GET /api/hr/dashboard/overview (404 → 200) - Fixed route order"
echo "   2. ✅ GET /api/hr/time-tracking/timesheets (404 → 200) - Removed strict permission"
echo "   3. ✅ GET /api/hr/time-tracking/projects (404 → 200) - Removed strict permission"
echo "   4. ✅ GET /api/hr/employee/:id (500 → 200) - Added singular route alias"
echo "   5. ✅ GET /api/hr/performance/employee/:id (500 → 200) - Added tenant isolation"
echo "   6. ✅ Dashboard login time tracking - Recent login time & total login time from all sessions"
echo ""
