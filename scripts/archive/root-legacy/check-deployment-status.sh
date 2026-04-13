#!/bin/bash

###############################################################################
# Check Deployment Status - Troubleshooting Script
###############################################################################

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

NAMESPACE="etelios-prod"

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Checking Deployment Status${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Check pods
echo -e "${GREEN}1. Pod Status:${NC}"
kubectl get pods -n $NAMESPACE | grep -E "payroll|hr-service"
echo ""

# Check deployments
echo -e "${GREEN}2. Deployment Status:${NC}"
kubectl get deployment payroll-service hr-service -n $NAMESPACE
echo ""

# Check rollout status
echo -e "${GREEN}3. Rollout Status:${NC}"
kubectl rollout status deployment/payroll-service -n $NAMESPACE --timeout=10s 2>&1 || echo "Still rolling out..."
kubectl rollout status deployment/hr-service -n $NAMESPACE --timeout=10s 2>&1 || echo "Still rolling out..."
echo ""

# Check pod events
echo -e "${GREEN}4. Recent Pod Events (payroll-service):${NC}"
kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | grep payroll-service | tail -5
echo ""

# Check pod logs if any pod is running
echo -e "${GREEN}5. Pod Logs (if available):${NC}"
PAYROLL_POD=$(kubectl get pods -n $NAMESPACE -l app=payroll-service --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -n "$PAYROLL_POD" ]; then
    echo "Payroll pod: $PAYROLL_POD"
    kubectl logs -n $NAMESPACE $PAYROLL_POD --tail=20 2>&1 | head -30
else
    echo "No running payroll pods found"
    # Check if there are any pods (even if not running)
    PAYROLL_POD=$(kubectl get pods -n $NAMESPACE -l app=payroll-service -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    if [ -n "$PAYROLL_POD" ]; then
        echo "Checking logs from pod: $PAYROLL_POD"
        kubectl logs -n $NAMESPACE $PAYROLL_POD --tail=20 2>&1 | head -30
    fi
fi
echo ""

HR_POD=$(kubectl get pods -n $NAMESPACE -l app=hr-service --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -n "$HR_POD" ]; then
    echo "HR pod: $HR_POD"
    kubectl logs -n $NAMESPACE $HR_POD --tail=20 2>&1 | head -30
else
    echo "No running HR pods found"
fi
echo ""

# Check describe for any issues
echo -e "${GREEN}6. Deployment Details (payroll-service):${NC}"
kubectl describe deployment payroll-service -n $NAMESPACE | grep -A 10 "Conditions:" || echo "No conditions found"
echo ""

echo -e "${YELLOW}==========================================${NC}"
echo -e "${YELLOW}If pods are stuck, try:${NC}"
echo -e "${YELLOW}1. kubectl delete pod <pod-name> -n $NAMESPACE${NC}"
echo -e "${YELLOW}2. kubectl rollout restart deployment/payroll-service -n $NAMESPACE${NC}"
echo -e "${YELLOW}3. Wait 2-3 minutes and check again${NC}"
echo -e "${YELLOW}==========================================${NC}"
