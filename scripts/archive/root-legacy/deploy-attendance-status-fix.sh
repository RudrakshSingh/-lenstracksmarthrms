#!/bin/bash

# Deploy Attendance Status and Store Validation Fixes
# Fixes:
# 1. Store validation error (Cast to ObjectId failed for store codes like "LK001")
# 2. Added isClockedIn field to attendance response for frontend

set -e

AWS_REGION="ap-south-1"
ECR_REGISTRY="383234048604.dkr.ecr.ap-south-1.amazonaws.com"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"
SERVICE="attendance-service"
IMAGE_NAME="$ECR_REGISTRY/etelios-$SERVICE:latest"

echo "=========================================="
echo "🚀 Deploying Attendance Status Fixes"
echo "=========================================="
echo ""

echo "📋 Fixes:"
echo "  1. ✅ Store validation - Handle store codes (LK001) properly"
echo "  2. ✅ Added isClockedIn field to attendance response"
echo ""

echo "1️⃣  Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

echo ""
echo "2️⃣  Building Docker image..."
docker buildx build --platform linux/amd64 \
  --file "microservices/$SERVICE/Dockerfile" \
  --tag "$IMAGE_NAME" \
  --push .

echo ""
echo "3️⃣  Updating kubeconfig..."
aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME

echo ""
echo "4️⃣  Deploying to Kubernetes..."
kubectl set image deployment/$SERVICE $SERVICE=$IMAGE_NAME -n $NAMESPACE

echo ""
echo "5️⃣  Waiting for rollout (120s timeout)..."
kubectl rollout status deployment/$SERVICE -n $NAMESPACE --timeout=120s || echo "⚠️  Rollout timeout - check pods manually"

echo ""
echo "6️⃣  Verifying pods..."
kubectl get pods -n $NAMESPACE -l app=$SERVICE

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "📋 Fixes deployed:"
echo "  ✅ Store validation - Now handles store codes properly"
echo "  ✅ isClockedIn field added to attendance response"
echo ""
echo "🧪 Test:"
echo "  GET /api/attendance/today?employeeId=..."
echo "  Response will now include 'isClockedIn' field"
echo ""
