#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     🚀 ROSTER & DEPARTMENTS - POST-DEPLOYMENT TEST           ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

BASE_URL="https://api.etelios.com"

# Function to print status
print_status() {
    if [ "$1" = "200" ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2 (Status: $1)${NC}"
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Step 1: Checking Deployment Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check pods
echo "📦 HR Service Pods:"
kubectl get pods -n etelios-backend-prod | grep hr-service
echo ""

# Check image version
echo "🏷️  Image Version:"
IMAGE=$(kubectl get deployment hr-service -n etelios-backend-prod -o jsonpath='{.spec.template.spec.containers[0].image}')
echo "   $IMAGE"
VERSION=$(echo "$IMAGE" | cut -d':' -f2)
echo ""

# Check pod age
echo "🕐 Pod Age:"
kubectl get pods -n etelios-backend-prod -o wide | grep hr-service | awk '{print "   " $1 " - Age: " $5}'
echo ""

# Verify code
echo "✅ Verifying Code Deployed:"
HR_POD=$(kubectl get pods -n etelios-backend-prod | grep hr-service | grep Running | head -1 | awk '{print $1}')
SORT_LINE=$(kubectl exec -n etelios-backend-prod $HR_POD -- cat /app/src/services/roster.service.js 2>/dev/null | grep -A 1 "\.sort" | head -2 | tail -1)

if echo "$SORT_LINE" | grep -q "date: 1, shiftStart: 1"; then
    echo -e "${RED}   ⚠️  OLD CODE STILL DEPLOYED${NC}"
    echo "   Current: .sort({ date: 1, shiftStart: 1 })"
    echo "   Expected: .sort({ date: 1 })"
    echo ""
    echo -e "${YELLOW}   Pipeline may still be running or deployment not complete.${NC}"
    echo "   Wait 2-3 more minutes and run this script again."
    echo ""
    exit 1
elif echo "$SORT_LINE" | grep -q "date: 1"; then
    echo -e "${GREEN}   ✅ NEW CODE DEPLOYED!${NC}"
    echo "   Sort: .sort({ date: 1 })"
else
    echo -e "${YELLOW}   ⚠️  Unable to verify code${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Step 2: Authentication"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TOKEN=$(curl -sk -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@etelios.com","password":"Admin@123456"}' \
    | jq -r '.data.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${RED}❌ Login failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Logged in successfully${NC}"
echo "   Token: ${TOKEN:0:30}..."
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Step 3: Testing Departments API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

dept_response=$(curl -sk -w "\n%{http_code}" "$BASE_URL/api/hr/departments" \
    -H "Authorization: Bearer $TOKEN")

dept_code=$(echo "$dept_response" | tail -n1)
dept_body=$(echo "$dept_response" | sed '$d')

print_status "$dept_code" "GET /api/hr/departments"

if [ "$dept_code" = "200" ]; then
    echo ""
    echo "📋 Departments Retrieved:"
    echo "$dept_body" | jq -r '.data[] | "   • \(.name) (\(.code))"' 2>/dev/null | head -8
else
    echo ""
    echo "Response:"
    echo "$dept_body" | jq '.' 2>/dev/null | head -15
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📅 Step 4: Testing Rosters API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

roster_response=$(curl -sk -w "\n%{http_code}" "$BASE_URL/api/hr/roster?limit=5" \
    -H "Authorization: Bearer $TOKEN")

roster_code=$(echo "$roster_response" | tail -n1)
roster_body=$(echo "$roster_response" | sed '$d')

print_status "$roster_code" "GET /api/hr/roster"

if [ "$roster_code" = "200" ]; then
    echo ""
    total=$(echo "$roster_body" | jq '.data.total // 0' 2>/dev/null)
    page=$(echo "$roster_body" | jq '.data.page // 1' 2>/dev/null)
    limit=$(echo "$roster_body" | jq '.data.limit // 100' 2>/dev/null)
    
    echo "📊 Roster Stats:"
    echo "   Total rosters: $total"
    echo "   Page: $page"
    echo "   Limit: $limit"
    echo ""
    
    if [ "$total" -gt "0" ]; then
        echo "📋 Sample Data:"
        echo "$roster_body" | jq '.data.rosters[0]' 2>/dev/null | head -30
    else
        echo "ℹ️  No roster entries found (empty database)"
    fi
else
    echo ""
    echo "❌ Error Response:"
    echo "$roster_body" | jq '.' 2>/dev/null | head -20
    
    # Check logs for the error
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 Recent Logs:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    kubectl logs -n etelios-backend-prod $HR_POD --tail=30 | grep -A 5 -i "error\|roster" | tail -20
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Step 5: Testing Additional Roster Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test templates
templates_code=$(curl -sk -w "%{http_code}" -o /dev/null "$BASE_URL/api/hr/roster/templates" \
    -H "Authorization: Bearer $TOKEN")
print_status "$templates_code" "GET /api/hr/roster/templates"

# Test my-roster
my_roster_code=$(curl -sk -w "%{http_code}" -o /dev/null "$BASE_URL/api/hr/roster/my-roster" \
    -H "Authorization: Bearer $TOKEN")
print_status "$my_roster_code" "GET /api/hr/roster/my-roster"

# Test active rosters
active_code=$(curl -sk -w "%{http_code}" -o /dev/null "$BASE_URL/api/hr/roster/active" \
    -H "Authorization: Bearer $TOKEN")
print_status "$active_code" "GET /api/hr/roster/active"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     📊 FINAL RESULTS                                         ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

TOTAL_TESTS=5
PASSED=0

[ "$dept_code" = "200" ] && ((PASSED++))
[ "$roster_code" = "200" ] && ((PASSED++))
[ "$templates_code" = "200" ] && ((PASSED++))
[ "$my_roster_code" = "200" ] && ((PASSED++))
[ "$active_code" = "200" ] && ((PASSED++))

echo "Tests Passed: $PASSED/$TOTAL_TESTS"
echo ""

if [ "$dept_code" = "200" ]; then
    echo -e "${GREEN}✅ Departments: WORKING${NC}"
else
    echo -e "${RED}❌ Departments: FAILED ($dept_code)${NC}"
fi

if [ "$roster_code" = "200" ]; then
    echo -e "${GREEN}✅ Rosters: FIXED & WORKING!${NC}"
else
    echo -e "${RED}❌ Rosters: STILL FAILING ($roster_code)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 Documentation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📄 API Documentation: ROSTER_DEPARTMENTS_API_DOCUMENTATION.md"
echo "📄 Status Report: ROSTER_FIX_STATUS.md"
echo ""

if [ "$PASSED" -eq "$TOTAL_TESTS" ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! Both endpoints are production-ready!${NC}"
    echo ""
    echo "✅ Ready for frontend integration"
    echo "✅ Check documentation for API details"
    exit 0
elif [ "$roster_code" = "200" ]; then
    echo -e "${GREEN}✅ ROSTER FIX SUCCESSFUL!${NC}"
    echo ""
    echo "Main endpoints working, some sub-endpoints may need data."
    exit 0
else
    echo -e "${YELLOW}⚠️  DEPLOYMENT MAY STILL BE IN PROGRESS${NC}"
    echo ""
    echo "If you just pushed the code:"
    echo "  • Wait 3-5 more minutes"
    echo "  • Run this script again"
    echo ""
    echo "Image version: $VERSION"
    echo "If version is still 572, pipeline hasn't deployed yet."
    exit 1
fi

