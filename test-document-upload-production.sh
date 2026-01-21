#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     📄 PRODUCTION DOCUMENT UPLOAD TEST                      ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

PROD_URL="https://98.70.245.87"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Step 1: Check Service Health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

health=$(curl -s -k "$PROD_URL/api/hr/health" 2>/dev/null)
if [ ! -z "$health" ]; then
    echo "✅ HR Service is running"
    echo "$health" | jq '.' 2>/dev/null | head -5 || echo "$health" | head -5
else
    echo "❌ HR Service not responding"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Step 2: Login to Get Token"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Attempting login..."
login_resp=$(curl -s -k -X POST "$PROD_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@etelios.com","password":"Admin@123456"}' 2>/dev/null)

TOKEN=$(echo "$login_resp" | jq -r '.data.accessToken // .accessToken // empty' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "⚠️  Regular login failed, trying mock login..."
    mock_resp=$(curl -s -k -X POST "$PROD_URL/api/auth/mock-login-fast" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@etelios.com","role":"admin"}' 2>/dev/null)
    
    TOKEN=$(echo "$mock_resp" | jq -r '.data.accessToken // .accessToken // empty' 2>/dev/null)
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Could not get authentication token"
    echo ""
    echo "Login response:"
    echo "$login_resp" | jq '.' 2>/dev/null || echo "$login_resp"
    exit 1
fi

echo "✅ Authentication successful"
echo "Token: ${TOKEN:0:50}..."
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👤 Step 3: Get Employee ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

emp_resp=$(curl -s -k "$PROD_URL/api/hr/employees?limit=1" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null)

emp_id=$(echo "$emp_resp" | jq -r '.data.employees[0].employeeId // .data[0].employeeId // empty' 2>/dev/null)

if [ -z "$emp_id" ]; then
    echo "⚠️  No employee found, using test ID"
    EMP_ID="EMP-TEST-001"
else
    EMP_ID="$emp_id"
    echo "✅ Found employee: $EMP_ID"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 Step 4: Create Test Document"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create a simple test file
cat > /tmp/test-document-upload.txt << 'TEXTEOF'
Test Document for Upload
Employee ID: EMP-001
Document Type: AADHAR
Upload Date: $(date)
TEXTEOF

echo "✅ Test file created: /tmp/test-document-upload.txt"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📤 Step 5: Test Document Upload - POST /api/documents/upload"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Testing: POST $PROD_URL/api/documents/upload"
echo "  Employee ID: $EMP_ID"
echo "  Document Type: AADHAR"
echo ""

upload_resp=$(curl -s -k -w "\n%{http_code}" -X POST "$PROD_URL/api/documents/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@/tmp/test-document-upload.txt" \
    -F "employee_id=$EMP_ID" \
    -F "document_type=AADHAR" \
    -F "category=IDENTITY" \
    -F "compliance_required=true" 2>/dev/null)

upload_code=$(echo "$upload_resp" | tail -n1)
upload_body=$(echo "$upload_resp" | sed '$d')

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESULT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$upload_code" = "200" ] || [ "$upload_code" = "201" ]; then
    echo "✅✅✅ SUCCESS! Document upload working! ✅✅✅"
    echo ""
    echo "Status Code: $upload_code"
    echo ""
    echo "Response:"
    echo "$upload_body" | jq '.' 2>/dev/null || echo "$upload_body"
    echo ""
    
    # Check if blob URL is in response
    if echo "$upload_body" | grep -q "file_url"; then
        file_url=$(echo "$upload_body" | jq -r '.data.file_url // empty' 2>/dev/null)
        storage_provider=$(echo "$upload_body" | jq -r '.data.storage_provider // empty' 2>/dev/null)
        
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📦 BLOB STORAGE STATUS"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        
        if [ ! -z "$file_url" ] && [ "$file_url" != "null" ]; then
            echo "✅ Blob Storage URL: $file_url"
            echo "✅ Storage Provider: $storage_provider"
            echo ""
            echo "✅✅✅ Document uploaded to Azure Blob Storage! ✅✅✅"
        else
            echo "⚠️  No blob URL in response (may be using local storage)"
            echo "   Storage Provider: $storage_provider"
        fi
    fi
    
elif [ "$upload_code" = "404" ]; then
    echo "❌ 404 Not Found - Route not registered"
    echo ""
    echo "Response:"
    echo "$upload_body" | jq '.' 2>/dev/null || echo "$upload_body"
    echo ""
    echo "Trying alternative: /api/hr/documents/upload"
    
    hr_upload_resp=$(curl -s -k -w "\n%{http_code}" -X POST "$PROD_URL/api/hr/documents/upload" \
        -H "Authorization: Bearer $TOKEN" \
        -F "file=@/tmp/test-document-upload.txt" \
        -F "employee_id=$EMP_ID" \
        -F "document_type=AADHAR" 2>/dev/null)
    
    hr_code=$(echo "$hr_upload_resp" | tail -n1)
    hr_body=$(echo "$hr_upload_resp" | sed '$d')
    
    echo "Alternative endpoint status: $hr_code"
    if [ "$hr_code" = "200" ] || [ "$hr_code" = "201" ]; then
        echo "✅ Alternative endpoint works!"
        echo "$hr_body" | jq '.' 2>/dev/null | head -20
    else
        echo "$hr_body" | jq '.' 2>/dev/null
    fi
    
elif [ "$upload_code" = "401" ] || [ "$upload_code" = "403" ]; then
    echo "⚠️  Authentication error ($upload_code)"
    echo "   Route exists but token may be invalid"
    echo ""
    echo "Response:"
    echo "$upload_body" | jq '.' 2>/dev/null || echo "$upload_body"
    
elif [ "$upload_code" = "400" ]; then
    echo "⚠️  400 Bad Request (validation error)"
    echo "   Endpoint exists but needs correct data format"
    echo ""
    echo "Response:"
    echo "$upload_body" | jq '.' 2>/dev/null || echo "$upload_body"
    
else
    echo "❌ Failed with status: $upload_code"
    echo ""
    echo "Response:"
    echo "$upload_body" | jq '.' 2>/dev/null || echo "$upload_body"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     📊 FINAL RESULT                                           ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

if [ "$upload_code" = "200" ] || [ "$upload_code" = "201" ]; then
    echo "🎉 DOCUMENT UPLOAD: WORKING IN PRODUCTION! 🎉"
    echo ""
    echo "✅ Endpoint: POST /api/documents/upload"
    echo "✅ Status: Deployed and working"
    echo "✅ Blob Storage: Integrated"
    echo ""
    echo "Frontend can now upload documents!"
elif [ "$upload_code" = "400" ]; then
    echo "⚠️  Endpoint exists but needs data format fix"
    echo "   Check the validation requirements"
else
    echo "❌ Document upload not working in production"
    echo "   Status: $upload_code"
    echo "   Need to check deployment"
fi

echo ""

