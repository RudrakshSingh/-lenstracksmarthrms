#!/bin/bash

ALB_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║         TESTING ALL SERVICE ENDPOINTS VIA ALB                    ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

test_endpoint() {
    local name=$1
    local path=$2
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "${ALB_URL}${path}" 2>/dev/null)
    
    if [ "$status_code" = "200" ]; then
        echo "  ✅ ${name}: ${status_code} - Working"
        return 0
    elif [ "$status_code" = "401" ] || [ "$status_code" = "403" ]; then
        echo "  🔒 ${name}: ${status_code} - Requires Auth"
        return 1
    elif [ "$status_code" = "404" ]; then
        echo "  ❌ ${name}: ${status_code} - Not Found"
        return 2
    elif [ "$status_code" = "502" ] || [ "$status_code" = "503" ]; then
        echo "  ⚠️  ${name}: ${status_code} - Service Down"
        return 3
    else
        echo "  ⚠️  ${name}: ${status_code}"
        return 4
    fi
}

echo "═══════════════════════════════════════════════════════════════════"
echo "1. BASE ENDPOINTS"
echo "═══════════════════════════════════════════════════════════════════"
test_endpoint "Root (/)" "/"
test_endpoint "Health (/health)" "/health"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "2. AUTH SERVICE"
echo "═══════════════════════════════════════════════════════════════════"
test_endpoint "Auth Base" "/api/auth"
test_endpoint "Auth Status" "/api/auth/status"
test_endpoint "Auth Health" "/api/auth/health"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "3. HR SERVICE"
echo "═══════════════════════════════════════════════════════════════════"
test_endpoint "HR Base" "/api/hr"
test_endpoint "HR Status" "/api/hr/status"
test_endpoint "HR Health" "/api/hr/health"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "4. ANALYTICS SERVICE"
echo "═══════════════════════════════════════════════════════════════════"
test_endpoint "Analytics Base" "/api/analytics"
test_endpoint "Analytics Status" "/api/analytics/status"
test_endpoint "Analytics Health" "/api/analytics/health"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "5. ATTENDANCE SERVICE"
echo "═══════════════════════════════════════════════════════════════════"
test_endpoint "Attendance Base" "/api/attendance"
test_endpoint "Attendance Status" "/api/attendance/status"
test_endpoint "Attendance Health" "/api/attendance/health"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "6. PAYROLL SERVICE"
echo "═══════════════════════════════════════════════════════════════════"
test_endpoint "Payroll Base" "/api/payroll"
test_endpoint "Payroll Status" "/api/payroll/status"
test_endpoint "Payroll Health" "/api/payroll/health"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "7. CRM SERVICE"
echo "═══════════════════════════════════════════════════════════════════"
test_endpoint "CRM Base" "/api/crm"
test_endpoint "CRM Status" "/api/crm/status"
test_endpoint "CRM Health" "/api/crm/health"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "8. DOCUMENT SERVICE"
echo "═══════════════════════════════════════════════════════════════════"
test_endpoint "Document Base" "/api/document"
test_endpoint "Document Status" "/api/document/status"
test_endpoint "Document Health" "/api/document/health"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "9. FINANCIAL SERVICE"
echo "═══════════════════════════════════════════════════════════════════"
test_endpoint "Financial Base" "/api/financial"
test_endpoint "Financial Status" "/api/financial/status"
test_endpoint "Financial Health" "/api/financial/health"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "10. INVENTORY SERVICE"
echo "═══════════════════════════════════════════════════════════════════"
test_endpoint "Inventory Base" "/api/inventory"
test_endpoint "Inventory Status" "/api/inventory/status"
test_endpoint "Inventory Health" "/api/inventory/health"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "11. JTS SERVICE"
echo "═══════════════════════════════════════════════════════════════════"
test_endpoint "JTS Base" "/api/jts"
test_endpoint "JTS Status" "/api/jts/status"
test_endpoint "JTS Health" "/api/jts/health"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "12. MONITORING SERVICE"
echo "═══════════════════════════════════════════════════════════════════"
test_endpoint "Monitoring Base" "/api/monitoring"
test_endpoint "Monitoring Status" "/api/monitoring/status"
test_endpoint "Monitoring Health" "/api/monitoring/health"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "13. NOTIFICATION SERVICE"
echo "═══════════════════════════════════════════════════════════════════"
test_endpoint "Notification Base" "/api/notification"
test_endpoint "Notification Status" "/api/notification/status"
test_endpoint "Notification Health" "/api/notification/health"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "14. PRESCRIPTION SERVICE"
echo "═══════════════════════════════════════════════════════════════════"
test_endpoint "Prescription Base" "/api/prescription"
test_endpoint "Prescription Status" "/api/prescription/status"
test_endpoint "Prescription Health" "/api/prescription/health"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "15. PURCHASE SERVICE"
echo "═══════════════════════════════════════════════════════════════════"
test_endpoint "Purchase Base" "/api/purchase"
test_endpoint "Purchase Status" "/api/purchase/status"
test_endpoint "Purchase Health" "/api/purchase/health"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "16. REALTIME SERVICE"
echo "═══════════════════════════════════════════════════════════════════"
test_endpoint "Realtime Base" "/api/realtime"
test_endpoint "Realtime Status" "/api/realtime/status"
test_endpoint "Realtime Health" "/api/realtime/health"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "17. SALES SERVICE"
echo "═══════════════════════════════════════════════════════════════════"
test_endpoint "Sales Base" "/api/sales"
test_endpoint "Sales Status" "/api/sales/status"
test_endpoint "Sales Health" "/api/sales/health"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "18. TENANT SERVICE"
echo "═══════════════════════════════════════════════════════════════════"
test_endpoint "Tenant Base" "/api/tenant"
test_endpoint "Tenant Status" "/api/tenant/status"
test_endpoint "Tenant Health" "/api/tenant/health"
echo ""

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                     TEST COMPLETE                                ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
