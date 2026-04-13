#!/bin/bash
# Deploy HR Service with Database Index Update
# This script builds and deploys HR service with the new { _id: 1, tenantId: 1 } index

set -e

echo "🚀 Deploying HR Service Database Index Update to Production..."
echo "====================================="
echo ""

# Configuration
SERVICE_NAME="hr-service"
ECR_REGISTRY="383234048604.dkr.ecr.ap-south-1.amazonaws.com"
REGION="ap-south-1"
CLUSTER="etelios-prod-v2"
NAMESPACE="etelios-prod"
IMAGE_NAME="${ECR_REGISTRY}/etelios-${SERVICE_NAME}:latest"

echo "📋 Configuration:"
echo "  Service: ${SERVICE_NAME}"
echo "  ECR Registry: ${ECR_REGISTRY}"
echo "  Region: ${REGION}"
echo "  Cluster: ${CLUSTER}"
echo "  Namespace: ${NAMESPACE}"
echo "  Image: ${IMAGE_NAME}"
echo ""

# Step 1: Check AWS credentials
echo "1️⃣ Checking AWS credentials..."
if ! aws sts get-caller-identity &>/dev/null; then
  echo "❌ AWS credentials not configured"
  exit 1
fi
echo "✅ AWS credentials OK"
echo ""

# Step 2: Update kubeconfig
echo "2️⃣ Updating kubeconfig..."
aws eks update-kubeconfig --region ${REGION} --name ${CLUSTER} &>/dev/null
echo "✅ Kubeconfig updated"
echo ""

# Step 3: Login to ECR
echo "3️⃣ Logging into ECR..."
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY} &>/dev/null
echo "✅ ECR login successful"
echo ""

# Step 4: Build Docker image
echo "4️⃣ Building Docker image..."
echo "  Building for platform: linux/amd64"
echo "  Dockerfile: microservices/${SERVICE_NAME}/Dockerfile"
echo "  Build context: . (root directory)"
echo ""

docker buildx build \
  --platform linux/amd64 \
  -f microservices/${SERVICE_NAME}/Dockerfile \
  -t ${IMAGE_NAME} \
  --load \
  . 2>&1 | grep -E "(building|DONE|error|Error)" | tail -20

if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo "❌ Docker build failed"
  exit 1
fi
echo "✅ Docker image built"
echo ""

# Step 5: Push image to ECR
echo "5️⃣ Pushing image to ECR..."
docker push ${IMAGE_NAME} 2>&1 | tail -5
echo "✅ Image pushed to ECR"
echo ""

# Step 6: Restart deployment
echo "6️⃣ Restarting deployment to pick up new image..."
kubectl rollout restart deployment/${SERVICE_NAME} -n ${NAMESPACE} &>/dev/null
echo "✅ Deployment restart initiated"
echo ""

# Step 7: Wait for rollout
echo "7️⃣ Waiting for rollout (180s timeout)..."
kubectl rollout status deployment/${SERVICE_NAME} -n ${NAMESPACE} --timeout=180s &>/dev/null
echo "✅ Rollout successful"
echo ""

# Step 8: Verify pods
echo "8️⃣ Verifying pods..."
kubectl get pods -n ${NAMESPACE} -l app=${SERVICE_NAME} --no-headers | head -5
echo ""

echo "====================================="
echo "✅ Deployment Complete!"
echo "====================================="
echo ""
echo "📋 Index Update Deployed:"
echo "  ✅ Added compound index { _id: 1, tenantId: 1 } for faster MongoDB _id lookups"
echo ""
echo "📊 Check Status:"
echo "  kubectl get pods -n ${NAMESPACE} -l app=${SERVICE_NAME}"
echo "  kubectl logs -n ${NAMESPACE} -l app=${SERVICE_NAME} --tail=50"
echo ""
echo "💡 Note: The index will be created automatically on next database operation."
echo "   MongoDB will build the index in the background."
