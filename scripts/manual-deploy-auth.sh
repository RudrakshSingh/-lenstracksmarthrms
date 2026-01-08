#!/bin/bash

# Manual deployment script for auth-service
# Use this when pipeline is stuck

set -e

echo "🚀 Manual Auth Service Deployment"
echo "=================================="
echo ""

# Configuration
ACR_LOGIN_SERVER="eteliosacr-hvawabdbgge7e0fu.azurecr.io"
SERVICE_NAME="auth-service"
NAMESPACE="etelios-backend-prod"
BUILD_ID="manual-$(date +%s)"

echo "📦 Building Docker image for linux/amd64..."
docker buildx build --platform linux/amd64 \
  -t ${ACR_LOGIN_SERVER}/${SERVICE_NAME}:${BUILD_ID} \
  -t ${ACR_LOGIN_SERVER}/${SERVICE_NAME}:latest \
  -f microservices/${SERVICE_NAME}/Dockerfile \
  --load \
  .

echo ""
echo "🔐 Logging into Azure Container Registry..."
# Get ACR credentials and login
az acr login --name eteliosacr

echo ""
echo "⬆️  Pushing to ACR..."
docker push ${ACR_LOGIN_SERVER}/${SERVICE_NAME}:${BUILD_ID}
docker push ${ACR_LOGIN_SERVER}/${SERVICE_NAME}:latest

echo ""
echo "♻️  Restarting deployment in Kubernetes..."
kubectl rollout restart deployment/${SERVICE_NAME} -n ${NAMESPACE}

echo ""
echo "⏳ Waiting for rollout to complete..."
kubectl rollout status deployment/${SERVICE_NAME} -n ${NAMESPACE} --timeout=300s

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🧪 Testing register endpoint..."
sleep 5

RESPONSE=$(curl -k -s -X POST "https://98.70.245.87/api/auth/register" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{"test":"check"}')

if echo "$RESPONSE" | grep -q "Route not found"; then
    echo "❌ Register endpoint still not available. Checking pods..."
    kubectl get pods -n ${NAMESPACE} -l app=${SERVICE_NAME}
    kubectl logs -n ${NAMESPACE} -l app=${SERVICE_NAME} --tail=20
elif echo "$RESPONSE" | grep -q "Validation failed"; then
    echo "✅ Register endpoint is now available!"
    echo ""
    echo "🎯 Next: Create admin user with this command:"
    echo ""
    echo "curl -k -X POST \"https://98.70.245.87/api/auth/register\" \\"
    echo "  -H \"Host: api.etelios.com\" \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -d '{"
    echo "    \"employee_id\": \"ADMIN-001\","
    echo "    \"name\": \"System Administrator\","
    echo "    \"email\": \"admin@etelios.com\","
    echo "    \"phone\": \"+919999999999\","
    echo "    \"password\": \"Admin@123456\","
    echo "    \"role\": \"admin\","
    echo "    \"department\": \"TECH\","
    echo "    \"designation\": \"System Administrator\""
    echo "  }'"
else
    echo "⚠️  Unexpected response: $RESPONSE"
fi

echo ""
echo "✅ Done!"

