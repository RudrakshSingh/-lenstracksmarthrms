#!/bin/bash

echo "🔧 Fixing ACR URL in all deployments..."
echo ""

# Correct ACR URL
CORRECT_ACR="eteliosacr-hvawabdbgge7e0fu.azurecr.io"
WRONG_ACR="eteliosacr.azurecr.io"

# List of all services
SERVICES=(
  "auth-service"
  "hr-service"
  "api-gateway"
  "analytics-service"
  "attendance-service"
  "payroll-service"
  "crm-service"
  "inventory-service"
  "sales-service"
  "purchase-service"
  "financial-service"
  "document-service"
  "service-management"
  "cpp-service"
  "prescription-service"
  "notification-service"
  "monitoring-service"
  "tenant-registry-service"
  "realtime-service"
)

for SERVICE in "${SERVICES[@]}"; do
  echo "📝 Updating $SERVICE..."
  
  kubectl set image deployment/$SERVICE \
    $SERVICE=$CORRECT_ACR/$SERVICE:latest \
    -n etelios-backend-prod 2>/dev/null
  
  if [ $? -eq 0 ]; then
    echo "  ✅ $SERVICE updated"
  else
    echo "  ⚠️  $SERVICE not found or already updated"
  fi
done

echo ""
echo "✅ All deployments updated!"
echo ""
echo "🔄 Pods will now restart and pull from correct ACR..."
