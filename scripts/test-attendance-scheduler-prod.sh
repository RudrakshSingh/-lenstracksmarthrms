#!/bin/bash

# Test Attendance Scheduler in Production
# Tests all cron jobs and scheduler functionality

set -e

echo "=========================================="
echo "🧪 Testing Attendance Scheduler in Production"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
SERVICE_NAME="attendance-service"
NAMESPACE="etelios-prod"
API_BASE="http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api"

echo -e "${BLUE}📋 Configuration:${NC}"
echo -e "   Service: ${SERVICE_NAME}"
echo -e "   Namespace: ${NAMESPACE}"
echo -e "   API Base: ${API_BASE}"
echo ""

# Test 1: Check Scheduler Status
echo -e "${YELLOW}1️⃣  Testing Scheduler Status Endpoint...${NC}"
STATUS_RESPONSE=$(curl -s "${API_BASE}/attendance/scheduler/status" || echo "ERROR")
if echo "$STATUS_RESPONSE" | grep -q "isRunning"; then
    echo -e "${GREEN}✅ Scheduler status endpoint working${NC}"
    echo "$STATUS_RESPONSE" | jq '.' 2>/dev/null || echo "$STATUS_RESPONSE"
else
    echo -e "${RED}❌ Scheduler status endpoint failed${NC}"
    echo "$STATUS_RESPONSE"
fi
echo ""

# Test 2: Check Health Endpoint
echo -e "${YELLOW}2️⃣  Testing Health Endpoint...${NC}"
HEALTH_RESPONSE=$(curl -s "${API_BASE}/attendance/health" || echo "ERROR")
if echo "$HEALTH_RESPONSE" | grep -q "healthy\|operational"; then
    echo -e "${GREEN}✅ Health endpoint working${NC}"
    echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    echo -e "${RED}❌ Health endpoint failed${NC}"
    echo "$HEALTH_RESPONSE"
fi
echo ""

# Test 3: Check Pods
echo -e "${YELLOW}3️⃣  Checking Pods...${NC}"
if command -v kubectl &> /dev/null; then
    PODS=$(kubectl get pods -n ${NAMESPACE} -l app=${SERVICE_NAME} --no-headers 2>/dev/null || echo "")
    if [ ! -z "$PODS" ]; then
        echo -e "${GREEN}✅ Pods found:${NC}"
        kubectl get pods -n ${NAMESPACE} -l app=${SERVICE_NAME}
        echo ""
        
        # Check logs for scheduler start
        echo -e "${YELLOW}4️⃣  Checking Scheduler Logs...${NC}"
        POD_NAME=$(kubectl get pods -n ${NAMESPACE} -l app=${SERVICE_NAME} -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
        if [ ! -z "$POD_NAME" ]; then
            echo -e "${BLUE}Checking logs for scheduler start...${NC}"
            kubectl logs -n ${NAMESPACE} ${POD_NAME} --tail=50 | grep -i "scheduler\|cron" || echo "No scheduler logs found in last 50 lines"
        fi
    else
        echo -e "${RED}❌ No pods found${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  kubectl not available, skipping pod check${NC}"
fi
echo ""

# Test 4: Test Clock In/Out (if credentials available)
echo -e "${YELLOW}5️⃣  Testing Clock In/Out (with scheduler)...${NC}"
if [ -f "scripts/clockin-rudi.js" ]; then
    echo -e "${BLUE}Running clock-in test...${NC}"
    node scripts/clockin-rudi.js in 2>&1 | head -30 || echo "Clock-in test failed"
    echo ""
    
    echo -e "${BLUE}Running clock-out test...${NC}"
    node scripts/clockin-rudi.js out 2>&1 | head -30 || echo "Clock-out test failed"
else
    echo -e "${YELLOW}⚠️  Clock-in script not found, skipping${NC}"
fi
echo ""

# Test 5: Check for Cron Job Execution
echo -e "${YELLOW}6️⃣  Checking for Cron Job Execution...${NC}"
if command -v kubectl &> /dev/null && [ ! -z "$POD_NAME" ]; then
    echo -e "${BLUE}Searching for cron job execution logs...${NC}"
    kubectl logs -n ${NAMESPACE} ${POD_NAME} --tail=200 | grep -i "auto clock\|daily validation\|end of day\|hourly check\|weekly report" | tail -10 || echo "No cron job execution logs found"
else
    echo -e "${YELLOW}⚠️  Cannot check logs${NC}"
fi
echo ""

echo -e "${GREEN}=========================================="
echo -e "✅ Testing Complete!"
echo -e "==========================================${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "   - Scheduler Status: Checked"
echo -e "   - Health Endpoint: Checked"
echo -e "   - Pods: Checked"
echo -e "   - Logs: Checked"
echo ""
echo -e "${BLUE}💡 Next Steps:${NC}"
echo -e "   1. Monitor logs for cron job executions"
echo -e "   2. Wait 5 minutes and check for auto clock-out job"
echo -e "   3. Check at 11:55 PM for end-of-day processing"
echo -e "   4. Check at 11:59 PM for daily validation"
echo ""
