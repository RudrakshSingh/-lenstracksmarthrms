#!/bin/bash

# Deploy Attendance Service Fixes
# Fixes: /api/attendance/today endpoint, date query fixes

set -e

AWS_REGION="ap-south-1"
ECR_REGISTRY="383234048604.dkr.ecr.ap-south-1.amazonaws.com"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"
SERVICE_NAME="attendance-service"

echo "🔧 Building and deploying Attendance Service fixes..."
echo "=================================================="
echo ""
echo "🎯 Fixes being deployed:"
echo "   1. ✅ GET /api/attendance/today endpoint (new)"
echo "   2. ✅ Date query fixes (check both 'date' and 'check_in_time' fields)"
echo "   3. ✅ Better employee attendance lookup"
echo ""

# Step 1: Login to ECR
echo "1️⃣ Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

echo ""
echo "2️⃣ Building Docker image..."
docker buildx build --platform linux/amd64 \
  --file "microservices/$SERVICE_NAME/Dockerfile" \
  --tag "$ECR_REGISTRY/etelios-$SERVICE_NAME:latest" \
  --push .

echo ""
echo "3️⃣ Updating kubeconfig..."
aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME

echo ""
echo "4️⃣ Deploying to Kubernetes..."
kubectl set image deployment/$SERVICE_NAME $SERVICE_NAME=$ECR_REGISTRY/etelios-$SERVICE_NAME:latest -n $NAMESPACE

echo ""
echo "5️⃣ Waiting for rollout (120s timeout)..."
kubectl rollout status deployment/$SERVICE_NAME -n $NAMESPACE --timeout=120s || echo "⚠️  Rollout timeout - check pods manually"

echo ""
echo "✅ Attendance Service deployed!"
echo ""
echo "📋 Check pod status:"
echo "   kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME"
echo ""
echo "📋 Check logs:"
echo "   kubectl logs -n $NAMESPACE -l app=$SERVICE_NAME --tail=50"
echo ""
echo "🎯 Fixes deployed:"
echo "   1. ✅ GET /api/attendance/today - Returns today's attendance for employee"
echo "   2. ✅ Date queries now check both 'date' and 'check_in_time' fields"
echo "   3. ✅ Better handling of employee attendance lookup"
echo ""
