#!/bin/bash

# Deploy Clock-in and Roster API Fixes to Production
# This script deploys fixes for:
# 1. Clock-in performance optimization and multiple clock-ins per day
# 2. Roster API 503 errors (added /api/roster alias routes)

set -e

echo "=========================================="
echo "🚀 Deploying Clock-in and Roster API Fixes"
echo "=========================================="
echo ""

# Configuration
AWS_REGION="ap-south-1"
ECR_REGISTRY="383234048604.dkr.ecr.ap-south-1.amazonaws.com"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"
ATTENDANCE_SERVICE="attendance-service"
HR_SERVICE="hr-service"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "📋 Fixes being deployed:"
echo "  1. ✅ Clock-in performance optimization (date filter, lean query)"
echo "  2. ✅ Multiple clock-ins per day support (after clock-out)"
echo "  3. ✅ Roster API /api/roster alias routes"
echo ""

# Step 1: Build and deploy Attendance Service
echo "=========================================="
echo "1️⃣  Building and Deploying Attendance Service..."
echo "=========================================="

echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

echo ""
echo "📦 Building Docker image..."
docker buildx build --platform linux/amd64 \
  --file "microservices/$ATTENDANCE_SERVICE/Dockerfile" \
  --tag "$ECR_REGISTRY/etelios-$ATTENDANCE_SERVICE:latest" \
  --push .

echo ""
echo "🔄 Updating kubeconfig..."
aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME

echo ""
echo "🚀 Deploying to Kubernetes..."
kubectl set image deployment/$ATTENDANCE_SERVICE $ATTENDANCE_SERVICE=$ECR_REGISTRY/etelios-$ATTENDANCE_SERVICE:latest -n $NAMESPACE

echo ""
echo "⏳ Waiting for rollout (120s timeout)..."
kubectl rollout status deployment/$ATTENDANCE_SERVICE -n $NAMESPACE --timeout=120s || echo "⚠️  Rollout timeout - check pods manually"

echo "✅ Attendance service deployed!"
echo ""

# Step 2: Build and deploy HR Service
echo "=========================================="
echo "2️⃣  Building and Deploying HR Service..."
echo "=========================================="

echo "📦 Building Docker image..."
docker buildx build --platform linux/amd64 \
  --file "microservices/$HR_SERVICE/Dockerfile" \
  --tag "$ECR_REGISTRY/etelios-$HR_SERVICE:latest" \
  --push .

echo ""
echo "🚀 Deploying to Kubernetes..."
kubectl set image deployment/$HR_SERVICE $HR_SERVICE=$ECR_REGISTRY/etelios-$HR_SERVICE:latest -n $NAMESPACE

echo ""
echo "⏳ Waiting for rollout (120s timeout)..."
kubectl rollout status deployment/$HR_SERVICE -n $NAMESPACE --timeout=120s || echo "⚠️  Rollout timeout - check pods manually"

echo "✅ HR service deployed!"
echo ""

# Step 3: Verify pods
echo "=========================================="
echo "3️⃣  Verifying pods..."
echo "=========================================="
kubectl get pods -n $NAMESPACE -l app=$ATTENDANCE_SERVICE
echo ""
kubectl get pods -n $NAMESPACE -l app=$HR_SERVICE

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "📋 Deployed fixes:"
echo "  ✅ Clock-in performance optimization (date filter, lean query)"
echo "  ✅ Multiple clock-ins per day support (after clock-out)"
echo "  ✅ Roster API /api/roster routes (frontend compatibility)"
echo ""
echo "📋 Check pod status:"
echo "   kubectl get pods -n $NAMESPACE -l app=$ATTENDANCE_SERVICE"
echo "   kubectl get pods -n $NAMESPACE -l app=$HR_SERVICE"
echo ""
echo "📋 Check logs:"
echo "   kubectl logs -n $NAMESPACE -l app=$ATTENDANCE_SERVICE --tail=50"
echo "   kubectl logs -n $NAMESPACE -l app=$HR_SERVICE --tail=50"
echo ""
echo "🧪 Next: Run test script to verify fixes"
echo "   ./test-clockin-roster-apis.sh"
echo ""
