#!/bin/bash

# Deploy auth-service with register API fix
# Fixes: 500 error when creating auth account for employee

set -e

AWS_REGION="ap-south-1"
ECR_REGISTRY="383234048604.dkr.ecr.ap-south-1.amazonaws.com"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"
SERVICE="auth-service"
IMAGE_NAME="$ECR_REGISTRY/etelios-$SERVICE:latest"

echo "🔧 Building and deploying auth-service with register fix..."
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
