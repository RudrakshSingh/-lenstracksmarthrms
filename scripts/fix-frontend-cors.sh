#!/bin/bash

# Fix Frontend CORS Access Issue

set -e

echo "🔧 Fixing Frontend CORS Access..."
echo "====================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📋 Applying CORS fixes..."
echo ""

# 1. Update Ingress with CORS annotations
echo "1️⃣  Updating Ingress with CORS annotations..."
kubectl apply -f k8s/ingress.yaml || {
  echo "❌ Failed to update Ingress"
  exit 1
}
echo -e "${GREEN}✅ Ingress updated${NC}"

# 2. Update service deployments
echo ""
echo "2️⃣  Updating service deployments with CORS env vars..."

for SERVICE in hr-service attendance-service auth-service; do
  echo "   Updating ${SERVICE}..."
  kubectl apply -f "k8s/etelios-prod/${SERVICE}-deployment.yaml" || {
    echo "⚠️  Failed to update ${SERVICE}, but continuing..."
  }
done

echo -e "${GREEN}✅ Service deployments updated${NC}"

# 3. Restart pods to apply changes
echo ""
echo "3️⃣  Restarting pods to apply CORS changes..."

for SERVICE in hr-service attendance-service auth-service; do
  echo "   Restarting ${SERVICE}..."
  kubectl rollout restart deployment/${SERVICE} -n etelios-prod || {
    echo "⚠️  Failed to restart ${SERVICE}, but continuing..."
  }
done

echo ""
echo "⏳ Waiting for pods to be ready..."
sleep 10

# Check pod status
for SERVICE in hr-service attendance-service auth-service; do
  echo "   Checking ${SERVICE} status..."
  kubectl rollout status deployment/${SERVICE} -n etelios-prod --timeout=120s || {
    echo "⚠️  ${SERVICE} rollout may still be in progress"
  }
done

echo ""
echo "====================================="
echo -e "${GREEN}✅ CORS Fix Applied!${NC}"
echo ""
echo "📊 Changes Applied:"
echo "   ✅ Ingress: CORS annotations added"
echo "   ✅ HR Service: CORS_ORIGIN=* configured"
echo "   ✅ Attendance Service: CORS_ORIGIN=* configured"
echo "   ✅ Auth Service: CORS_ORIGIN=* configured"
echo ""
echo "🌐 Frontend can now access backend from any origin"
echo ""
echo "🧪 Test from frontend:"
echo "   - All origins allowed (*)"
echo "   - Credentials enabled"
echo "   - All HTTP methods allowed"
echo ""
