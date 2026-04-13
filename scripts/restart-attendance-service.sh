#!/bin/bash

# Quick script to restart attendance-service to pick up route fix
# This will make /api/attendance/stats work again

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔄 Restarting Attendance Service...${NC}"
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl not found. Please install kubectl first.${NC}"
    exit 1
fi

# Try to detect namespace
NAMESPACE=""
if kubectl get namespace etelios-prod &> /dev/null; then
    NAMESPACE="etelios-prod"
elif kubectl get namespace etelios-backend-prod &> /dev/null; then
    NAMESPACE="etelios-backend-prod"
elif kubectl get namespace default &> /dev/null; then
    NAMESPACE="default"
else
    echo -e "${YELLOW}⚠️  Could not detect namespace. Please specify:${NC}"
    echo "Usage: $0 <namespace>"
    exit 1
fi

if [ ! -z "$1" ]; then
    NAMESPACE="$1"
fi

echo -e "${YELLOW}Using namespace: ${NAMESPACE}${NC}"
echo ""

# Check if deployment exists
if ! kubectl get deployment attendance-service -n ${NAMESPACE} &> /dev/null; then
    echo -e "${RED}❌ attendance-service deployment not found in namespace ${NAMESPACE}${NC}"
    echo ""
    echo "Available deployments:"
    kubectl get deployments -n ${NAMESPACE} | head -10
    exit 1
fi

# Show current pods
echo -e "${YELLOW}Current pods:${NC}"
kubectl get pods -n ${NAMESPACE} -l app=attendance-service
echo ""

# Restart deployment
echo -e "${YELLOW}🔄 Restarting deployment...${NC}"
kubectl rollout restart deployment/attendance-service -n ${NAMESPACE}

echo ""
echo -e "${YELLOW}⏳ Waiting for rollout to complete (this may take 1-2 minutes)...${NC}"
kubectl rollout status deployment/attendance-service -n ${NAMESPACE} --timeout=120s || {
    echo -e "${YELLOW}⚠️  Rollout status check timed out, but deployment may still be in progress${NC}"
}

echo ""
echo -e "${YELLOW}New pods:${NC}"
kubectl get pods -n ${NAMESPACE} -l app=attendance-service

echo ""
echo -e "${GREEN}✅ Attendance service restart initiated!${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Wait 30-60 seconds for pods to be ready"
echo "2. Test the API: node scripts/test-all-stats-apis.js"
echo "3. Check logs: kubectl logs -n ${NAMESPACE} -l app=attendance-service --tail=50"
echo ""
