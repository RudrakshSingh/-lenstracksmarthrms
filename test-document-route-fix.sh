#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     🔧 DOCUMENT ROUTE FIX - PRODUCTION TEST                 ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

PROD_URL="https://98.70.245.87"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Step 1: Test Document Routes Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Testing: GET $PROD_URL/api/documents/health"
health1=$(curl -s -k "$PROD_URL/api/documents/health" 2>/dev/null)
code1=$(curl -s -k -w "%{http_code}" -o /dev/null "$PROD_URL/api/documents/health" 2>/dev/null)

if [ "$code1" = "200" ]; then
    echo "✅ /api/documents/health: WORKING"
    echo "$health1" | jq '.' 2>/dev/null || echo "$health1"
else
    echo "❌ /api/documents/health: $code1"
fi

echo ""
echo "Testing: GET $PROD_URL/api/hr/documents/health"
health2=$(curl -s -k "$PROD_URL/api/hr/documents/health" 2>/dev/null)
code2=$(curl -s -k -w "%{http_code}" -o /dev/null "$PROD_URL/api/hr/documents/health" 2>/dev/null)

if [ "$code2" = "200" ]; then
    echo "✅ /api/hr/documents/health: WORKING"
    echo "$health2" | jq '.' 2>/dev/null || echo "$health2"
else
    echo "❌ /api/hr/documents/health: $code2"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Step 2: Get Auth Token"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TOKEN=$(curl -s -k -X POST "$PROD_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@etelios.com","password":"Admin@123456"}' \
    | jq -r '.data.accessToken // .accessToken // empty' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    TOKEN=$(curl -s -k -X POST "$PROD_URL/api/auth/mock-login-fast" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@etelios.com","role":"admin"}' \
        | jq -r '.data.accessToken // .accessToken // empty' 2>/dev/null)
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Could not get token"
    exit 1
fi

echo "✅ Got token: ${TOKEN:0:50}..."
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📤 Step 3: Test Document Upload Routes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create test file
echo "Test Document" > /tmp/test-doc-upload.txt

echo "Testing: POST $PROD_URL/api/documents/upload"
upload1=$(curl -s -k -w "\n%{http_code}" -X POST "$PROD_URL/api/documents/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@/tmp/test-doc-upload.txt" \
    -F "employee_id=EMP-TEST-001" \
    -F "document_type=AADHAR" 2>/dev/null)

code1=$(echo "$upload1" | tail -n1)
body1=$(echo "$upload1" | sed '$d')

echo "Status: $code1"
if [ "$code1" = "200" ] || [ "$code1" = "201" ]; then
    echo "✅✅✅ /api/documents/upload: WORKING! ✅✅✅"
    echo "$body1" | jq '.' 2>/dev/null | head -15
elif [ "$code1" = "404" ]; then
    echo "❌ /api/documents/upload: 404 Not Found"
    echo "$body1" | jq '.' 2>/dev/null | head -10
else
    echo "⚠️  /api/documents/upload: $code1"
    echo "$body1" | jq '.' 2>/dev/null | head -10
fi

echo ""
echo "Testing: POST $PROD_URL/api/hr/documents/upload"
upload2=$(curl -s -k -w "\n%{http_code}" -X POST "$PROD_URL/api/hr/documents/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@/tmp/test-doc-upload.txt" \
    -F "employee_id=EMP-TEST-001" \
    -F "document_type=AADHAR" 2>/dev/null)

code2=$(echo "$upload2" | tail -n1)
body2=$(echo "$upload2" | sed '$d')

echo "Status: $code2"
if [ "$code2" = "200" ] || [ "$code2" = "201" ]; then
    echo "✅✅✅ /api/hr/documents/upload: WORKING! ✅✅✅"
    echo "$body2" | jq '.' 2>/dev/null | head -15
elif [ "$code2" = "404" ]; then
    echo "❌ /api/hr/documents/upload: 404 Not Found"
    echo "$body2" | jq '.' 2>/dev/null | head -10
else
    echo "⚠️  /api/hr/documents/upload: $code2"
    echo "$body2" | jq '.' 2>/dev/null | head -10
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     📊 FINAL RESULT                                          ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

if [ "$code1" = "200" ] || [ "$code1" = "201" ] || [ "$code2" = "200" ] || [ "$code2" = "201" ]; then
    echo "🎉 DOCUMENT UPLOAD: WORKING! 🎉"
    echo ""
    echo "✅ Route is fixed and working in production!"
else
    echo "⚠️  Document upload still returning error"
    echo ""
    echo "Next steps:"
    echo "  1. Wait for pipeline to complete deployment"
    echo "  2. Check service logs: kubectl logs -l app=hr-service | grep document"
    echo "  3. Verify route registration in logs"
    echo "  4. Restart service if needed: kubectl rollout restart deployment/hr-service"
fi

echo ""

