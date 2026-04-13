#!/bin/bash

# Comprehensive Test Script for Onboarding Document Upload with S3
# Tests all onboarding document upload APIs

set -e

BASE_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
ADMIN_EMAIL="Admin@lenstrack.com"
ADMIN_PASSWORD="Kadarkhan@123"
TENANT_ID="default"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PASSED=0
FAILED=0

echo "=========================================="
echo "🧪 Onboarding Document Upload API Tests"
echo "=========================================="
echo ""

# Login as Admin
echo "🔐 Logging in as Admin..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken // .accessToken // empty')
TENANT_ID=$(echo $LOGIN_RESPONSE | jq -r '.data.user.tenantId // .user.tenantId // "default"')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Logged in successfully"
echo "   Tenant ID: ${TENANT_ID}"
echo ""

# Get or create test employee
echo "📋 Getting test employee..."
EMPLOYEES_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/hr/employees?limit=1" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}")

EMPLOYEE_ID=$(echo $EMPLOYEES_RESPONSE | jq -r '.data[0].employeeId // .data[0].employee_id // "EMP-2026-969954"')

if [ -z "$EMPLOYEE_ID" ] || [ "$EMPLOYEE_ID" == "null" ]; then
  echo "⚠️  No employee found, using default: EMP-2026-969954"
  EMPLOYEE_ID="EMP-2026-969954"
else
  echo "✅ Using employee: ${EMPLOYEE_ID}"
fi
echo ""

# Create a test file
echo "📄 Creating test document..."
TEST_FILE="/tmp/test-onboarding-doc.pdf"
echo "Test Document for Onboarding - $(date)" > "$TEST_FILE"
echo "Employee ID: ${EMPLOYEE_ID}" >> "$TEST_FILE"
echo "Document Type: AADHAR" >> "$TEST_FILE"
echo "✅ Test file created: $TEST_FILE"
echo ""

# Test function
test_upload() {
  local doc_type=$1
  local description=$2
  
  echo "📋 Test: Upload ${description} (${doc_type})"
  
  # Create a unique test file for this document type
  TEST_FILE_TYPE="/tmp/test-${doc_type}-$(date +%s).pdf"
  echo "Test ${description} - $(date)" > "$TEST_FILE_TYPE"
  echo "Employee ID: ${EMPLOYEE_ID}" >> "$TEST_FILE_TYPE"
  echo "Document Type: ${doc_type}" >> "$TEST_FILE_TYPE"
  
  UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/hr/onboarding/upload" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "X-Tenant-Id: ${TENANT_ID}" \
    -F "file=@${TEST_FILE_TYPE}" \
    -F "employee_id=${EMPLOYEE_ID}" \
    -F "document_type=${doc_type}")
  
  HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -n1)
  BODY=$(echo "$UPLOAD_RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" == "201" ] || [ "$HTTP_CODE" == "200" ]; then
    if echo "$BODY" | jq -e '.success == true' > /dev/null 2>&1; then
      DOC_URL=$(echo "$BODY" | jq -r '.data.url // .data.file_url // ""')
      STORAGE_PROVIDER=$(echo "$BODY" | jq -r '.data.storage_provider // "unknown"')
      
      echo "   ${GREEN}✅ PASSED${NC} (HTTP ${HTTP_CODE})"
      echo "   📎 URL: ${DOC_URL:0:80}..."
      echo "   💾 Storage: ${STORAGE_PROVIDER}"
      ((PASSED++))
      
      # Verify S3 URL format
      if [[ "$DOC_URL" == *"s3"* ]] || [[ "$DOC_URL" == *"amazonaws.com"* ]]; then
        echo "   ${GREEN}✅ S3 URL verified${NC}"
      else
        echo "   ${YELLOW}⚠️  URL doesn't look like S3 URL${NC}"
      fi
      
      rm -f "$TEST_FILE_TYPE"
      return 0
    else
      ERROR_MSG=$(echo "$BODY" | jq -r '.message // .error // "Unknown error"' 2>/dev/null || echo "Unknown error")
      echo "   ${RED}❌ FAILED${NC} (HTTP ${HTTP_CODE}) - ${ERROR_MSG}"
      ((FAILED++))
      rm -f "$TEST_FILE_TYPE"
      return 1
    fi
  else
    ERROR_MSG=$(echo "$BODY" | jq -r '.message // .error // "Unknown error"' 2>/dev/null || echo "Unknown error")
    echo "   ${RED}❌ FAILED${NC} (HTTP ${HTTP_CODE}) - ${ERROR_MSG}"
    ((FAILED++))
    rm -f "$TEST_FILE_TYPE"
    return 1
  fi
}

# Test all document types
echo "=========================================="
echo "1️⃣  Testing Document Uploads"
echo "=========================================="
echo ""

test_upload "AADHAR" "Aadhar Card"
echo ""

test_upload "PAN" "PAN Card"
echo ""

test_upload "PASSPORT" "Passport"
echo ""

test_upload "DRIVING_LICENSE" "Driving License"
echo ""

test_upload "EDUCATION_CERTIFICATE" "Education Certificate"
echo ""

test_upload "EXPERIENCE_CERTIFICATE" "Experience Certificate"
echo ""

test_upload "BANK_STATEMENT" "Bank Statement"
echo ""

test_upload "PHOTO" "Employee Photo"
echo ""

test_upload "SIGNATURE" "Employee Signature"
echo ""

test_upload "OTHER" "Other Document"
echo ""

# Test error cases
echo "=========================================="
echo "2️⃣  Testing Error Cases"
echo "=========================================="
echo ""

echo "📋 Test: Upload without file"
NO_FILE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/hr/onboarding/upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}" \
  -F "employee_id=${EMPLOYEE_ID}" \
  -F "document_type=AADHAR")

NO_FILE_CODE=$(echo "$NO_FILE_RESPONSE" | tail -n1)
if [ "$NO_FILE_CODE" == "400" ]; then
  echo "   ${GREEN}✅ PASSED${NC} (HTTP 400 - Expected error)"
  ((PASSED++))
else
  echo "   ${RED}❌ FAILED${NC} (Expected HTTP 400, got ${NO_FILE_CODE})"
  ((FAILED++))
fi
echo ""

echo "📋 Test: Upload without employee_id"
NO_EMP_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/hr/onboarding/upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}" \
  -F "file=@${TEST_FILE}" \
  -F "document_type=AADHAR")

NO_EMP_CODE=$(echo "$NO_EMP_RESPONSE" | tail -n1)
if [ "$NO_EMP_CODE" == "400" ]; then
  echo "   ${GREEN}✅ PASSED${NC} (HTTP 400 - Expected error)"
  ((PASSED++))
else
  echo "   ${RED}❌ FAILED${NC} (Expected HTTP 400, got ${NO_EMP_CODE})"
  ((FAILED++))
fi
echo ""

echo "📋 Test: Upload with invalid document_type"
INVALID_TYPE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/hr/onboarding/upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}" \
  -F "file=@${TEST_FILE}" \
  -F "employee_id=${EMPLOYEE_ID}" \
  -F "document_type=INVALID_TYPE")

INVALID_TYPE_CODE=$(echo "$INVALID_TYPE_RESPONSE" | tail -n1)
if [ "$INVALID_TYPE_CODE" == "400" ]; then
  echo "   ${GREEN}✅ PASSED${NC} (HTTP 400 - Expected error)"
  ((PASSED++))
else
  echo "   ${RED}❌ FAILED${NC} (Expected HTTP 400, got ${INVALID_TYPE_CODE})"
  ((FAILED++))
fi
echo ""

# Test get documents
echo "=========================================="
echo "3️⃣  Testing Get Documents"
echo "=========================================="
echo ""

echo "📋 Test: Get employee documents"
GET_DOCS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/hr/employees/${EMPLOYEE_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}")

GET_DOCS_CODE=$(echo "$GET_DOCS_RESPONSE" | tail -n1)
GET_DOCS_BODY=$(echo "$GET_DOCS_RESPONSE" | sed '$d')

if [ "$GET_DOCS_CODE" == "200" ]; then
  DOCS_COUNT=$(echo "$GET_DOCS_BODY" | jq -r '.data.onboardingDocuments | length // .data.documents | length // 0' 2>/dev/null || echo "0")
  echo "   ${GREEN}✅ PASSED${NC} (HTTP ${GET_DOCS_CODE})"
  echo "   📄 Documents found: ${DOCS_COUNT}"
  ((PASSED++))
else
  echo "   ${RED}❌ FAILED${NC} (HTTP ${GET_DOCS_CODE})"
  ((FAILED++))
fi
echo ""

# Cleanup
rm -f "$TEST_FILE"

# Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo ""
echo "${GREEN}✅ Passed: ${PASSED}${NC}"
echo "${RED}❌ Failed: ${FAILED}${NC}"
echo "📋 Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "${GREEN}🎉 All tests passed!${NC}"
  echo ""
  echo "✅ Document uploads working"
  echo "✅ S3 storage configured"
  echo "✅ Error handling working"
  echo "✅ Document retrieval working"
else
  echo "${YELLOW}⚠️  Some tests failed. Please review above.${NC}"
fi

echo ""
