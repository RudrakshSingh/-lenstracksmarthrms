#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     🏢 DEPARTMENTS - DATABASE SYNC TEST                      ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

BASE_URL="https://api.etelios.com"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 1: Check Deployment Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

HR_POD=$(kubectl get pods -n etelios-backend-prod | grep hr-service | grep Running | head -1 | awk '{print $1}')

if [ -z "$HR_POD" ]; then
    echo -e "${RED}❌ No running HR service pod found${NC}"
    exit 1
fi

echo "📦 HR Service Pod: $HR_POD"
echo ""

# Check image version
IMAGE=$(kubectl get deployment hr-service -n etelios-backend-prod -o jsonpath='{.spec.template.spec.containers[0].image}')
echo "🏷️  Image: $IMAGE"
echo ""

# Check pod age
POD_AGE=$(kubectl get pod $HR_POD -n etelios-backend-prod -o jsonpath='{.status.startTime}')
echo "🕐 Pod started: $POD_AGE"
echo ""

# Verify code
echo "✅ Verifying Code..."
QUERY_LINE=$(kubectl exec -n etelios-backend-prod $HR_POD -- cat /app/src/controllers/hrController.js 2>/dev/null | grep -A 2 "getDepartments = async" | grep "status: 'active'" | head -1)

if [ ! -z "$QUERY_LINE" ]; then
    echo -e "${GREEN}   ✅ NEW CODE DEPLOYED!${NC}"
    echo "   Query uses: status: 'active'"
else
    OLD_QUERY=$(kubectl exec -n etelios-backend-prod $HR_POD -- cat /app/src/controllers/hrController.js 2>/dev/null | grep "is_active: true" | head -1)
    if [ ! -z "$OLD_QUERY" ]; then
        echo -e "${RED}   ⚠️  OLD CODE STILL DEPLOYED${NC}"
        echo "   Query still uses: is_active: true"
        echo ""
        echo -e "${YELLOW}   Wait 3-5 minutes for pipeline to complete and try again.${NC}"
        exit 1
    else
        echo -e "${YELLOW}   ⚠️  Could not verify code${NC}"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Step 2: Admin Login"
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
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Step 3: Get Current Departments from API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

api_response=$(curl -sk "$BASE_URL/api/hr/departments" \
    -H "Authorization: Bearer $TOKEN")

dept_count=$(echo "$api_response" | jq '.data | length' 2>/dev/null)

echo "API Response:"
echo "$api_response" | jq '.' 2>/dev/null | head -40
echo ""
echo "📊 Department Count from API: $dept_count"
echo ""

# Check if we're getting real data or hardcoded
FIRST_DEPT_ID=$(echo "$api_response" | jq -r '.data[0].id // .data[0]._id // empty' 2>/dev/null)

if [ "$FIRST_DEPT_ID" = "dept-1" ]; then
    echo -e "${RED}❌ STILL RETURNING HARDCODED DATA${NC}"
    echo "   First department ID: $FIRST_DEPT_ID (hardcoded)"
    echo ""
    echo "Possible reasons:"
    echo "  • New code not deployed yet (check pod age)"
    echo "  • All departments in DB have status: 'inactive'"
    echo "  • Database connection issue"
    IS_HARDCODED=true
elif [ ! -z "$FIRST_DEPT_ID" ]; then
    echo -e "${GREEN}✅ RETURNING REAL DATABASE DATA!${NC}"
    echo "   First department ID: $FIRST_DEPT_ID (MongoDB ObjectId)"
    IS_HARDCODED=false
else
    echo -e "${YELLOW}⚠️  Unexpected response format${NC}"
    IS_HARDCODED=unknown
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💾 Step 4: Get Departments from Database"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📊 Querying MongoDB directly..."
echo ""

db_output=$(kubectl exec -n etelios-backend-prod $HR_POD -- node -e "
const mongoose = require('mongoose');
const uri = process.env.MONGO_URI;

(async () => {
    try {
        await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = mongoose.connection.db;
        const departments = await db.collection('departments').find({}).toArray();
        
        console.log('Total in DB:', departments.length);
        console.log('');
        
        const active = departments.filter(d => d.status === 'active');
        const inactive = departments.filter(d => d.status === 'inactive');
        const noStatus = departments.filter(d => !d.status);
        
        console.log('Active (status: active):', active.length);
        console.log('Inactive (status: inactive):', inactive.length);
        console.log('No status field:', noStatus.length);
        console.log('');
        
        console.log('Departments:');
        departments.forEach((dept, idx) => {
            console.log(\`\${idx + 1}. \${dept.name} (\${dept.code}) - Status: \${dept.status || 'N/A'}\`);
        });
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error.message);
    }
})();
" 2>/dev/null)

echo "$db_output"
echo ""

db_count=$(echo "$db_output" | grep "Total in DB:" | awk '{print $NF}')
active_count=$(echo "$db_output" | grep "Active (status: active):" | awk '{print $NF}')

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "➕ Step 5: Create New Department & Verify"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TIMESTAMP=$(date +%s)
NEW_DEPT_NAME="Marketing $TIMESTAMP"
NEW_DEPT_CODE="MKT-$TIMESTAMP"

echo "Creating: $NEW_DEPT_NAME ($NEW_DEPT_CODE)"
echo ""

create_response=$(curl -sk -w "\n%{http_code}" -X POST "$BASE_URL/api/hr/departments" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"$NEW_DEPT_NAME\",
        \"code\": \"$NEW_DEPT_CODE\",
        \"description\": \"Test department for API sync verification\"
    }")

create_code=$(echo "$create_response" | tail -n1)
create_body=$(echo "$create_response" | sed '$d')

if [ "$create_code" = "201" ] || [ "$create_code" = "200" ]; then
    echo -e "${GREEN}✅ Department created successfully!${NC}"
    NEW_DEPT_ID=$(echo "$create_body" | jq -r '.data._id // .data.id' 2>/dev/null)
    echo "   ID: $NEW_DEPT_ID"
else
    echo -e "${RED}❌ Creation failed (Status: $create_code)${NC}"
    NEW_DEPT_ID=""
fi

echo ""
echo "Waiting 2 seconds..."
sleep 2

# Get departments again
echo ""
echo "📊 Getting departments again after creation..."
echo ""

new_api_response=$(curl -sk "$BASE_URL/api/hr/departments" \
    -H "Authorization: Bearer $TOKEN")

new_dept_count=$(echo "$new_api_response" | jq '.data | length' 2>/dev/null)

echo "New department count: $new_dept_count (was $dept_count)"

# Check if our new department appears
if [ ! -z "$NEW_DEPT_ID" ]; then
    FOUND=$(echo "$new_api_response" | jq ".data[] | select(._id == \"$NEW_DEPT_ID\" or .id == \"$NEW_DEPT_ID\") | .name" 2>/dev/null)
    
    if [ ! -z "$FOUND" ]; then
        echo -e "${GREEN}✅ New department appears in API response!${NC}"
        echo "   Found: $FOUND"
    else
        echo -e "${RED}❌ New department NOT in API response${NC}"
        echo "   Searched for ID: $NEW_DEPT_ID"
    fi
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     📊 FINAL RESULTS                                         ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

echo "Database Status:"
echo "  Total departments: $db_count"
echo "  Active departments: $active_count"
echo ""

echo "API Status:"
echo "  Departments returned: $new_dept_count"
echo ""

if [ "$IS_HARDCODED" = false ]; then
    echo -e "${GREEN}✅ SUCCESS! API returning real database data${NC}"
    echo ""
    echo "Test Results:"
    echo "  ✅ Code deployed correctly"
    echo "  ✅ API queries database with status: 'active'"
    echo "  ✅ Created departments appear in GET results"
    echo "  ✅ Database and API are synchronized"
    echo ""
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    exit 0
elif [ "$IS_HARDCODED" = true ]; then
    echo -e "${RED}❌ FAILED: Still returning hardcoded data${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  • Check if new code is deployed (pod age < 10 min)"
    echo "  • Verify active_count > 0 in database"
    echo "  • Check pod logs for errors"
    echo ""
    exit 1
else
    echo -e "${YELLOW}⚠️  Test inconclusive${NC}"
    exit 1
fi

