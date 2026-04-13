#!/bin/bash

# Deploy HR Service JWT Fix

set -e

SERVICE="hr-service"
IMAGE_NAME="383234048604.dkr.ecr.ap-south-1.amazonaws.com/$SERVICE:latest"

echo "1️⃣  Building HR service with JWT fix..."
docker build -t "$IMAGE_NAME" -f "microservices/$SERVICE/Dockerfile" . || {
  echo "❌ Build failed, trying with --no-cache..."
  docker build --no-cache -t "$IMAGE_NAME" -f "microservices/$SERVICE/Dockerfile" .
}

echo "2️⃣  Pushing to ECR..."
docker push "$IMAGE_NAME"

echo "3️⃣  Updating kubeconfig..."
aws eks update-kubeconfig --region ap-south-1 --name etelios-prod-v2

echo "4️⃣  Deploying to Kubernetes..."
kubectl set image deployment/hr-service hr-service="$IMAGE_NAME" -n etelios-prod

echo "5️⃣  Waiting for rollout..."
kubectl rollout status deployment/hr-service -n etelios-prod --timeout=120s

echo "6️⃣  Verifying pods..."
kubectl get pods -n etelios-prod | grep hr-service

echo ""
echo "=========================================="
echo "✅ HR Service JWT Fix Deployed!"
echo "=========================================="
echo ""
echo "🔧 Fixes applied:"
echo "  ✅ Enhanced JWT verification with multiple secrets"
echo "  ✅ Improved error handling and logging"
echo ""
echo "🧪 Test:"
echo "  Admin token should now work with HR service"
echo ""