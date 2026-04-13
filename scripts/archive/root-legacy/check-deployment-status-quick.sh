#!/bin/bash

###############################################################################
# Quick Deployment Status Check
###############################################################################

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

NAMESPACE="etelios-prod"
SERVICES=("attendance-service" "tenant-registry-service" "hr-service")

echo -e "${BLUE}=========================================="
echo "📊 Deployment Status Check"
echo "==========================================${NC}"
echo ""

for SERVICE in "${SERVICES[@]}"; do
    echo -e "${BLUE}Checking $SERVICE...${NC}"
    
    # Get deployment status
    READY=$(kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    DESIRED=$(kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    UPDATED=$(kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.status.updatedReplicas}' 2>/dev/null || echo "0")
    
    if [ "$READY" -eq "$DESIRED" ] && [ "$READY" -gt 0 ]; then
        echo -e "${GREEN}✅ $SERVICE: $READY/$DESIRED pods ready${NC}"
    elif [ "$READY" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $SERVICE: $READY/$DESIRED pods ready (still updating...)${NC}"
    else
        echo -e "${RED}❌ $SERVICE: $READY/$DESIRED pods ready (not ready yet)${NC}"
    fi
    
    # Show pod status
    echo "   Pods:"
    kubectl get pods -n $NAMESPACE -l app=$SERVICE --no-headers 2>/dev/null | while read line; do
        STATUS=$(echo "$line" | awk '{print $3}')
        if [ "$STATUS" == "Running" ]; then
            echo -e "   ${GREEN}✅ $line${NC}"
        elif [ "$STATUS" == "Pending" ] || [ "$STATUS" == "ContainerCreating" ]; then
            echo -e "   ${YELLOW}⏳ $line${NC}"
        else
            echo -e "   ${RED}❌ $line${NC}"
        fi
    done
    
    echo ""
done

echo -e "${BLUE}=========================================="
echo "✅ Status Check Complete"
echo "==========================================${NC}"
echo ""
echo "To watch pods in real-time:"
echo "  kubectl get pods -n $NAMESPACE -w | grep -E 'attendance|tenant|hr-service'"
echo ""
