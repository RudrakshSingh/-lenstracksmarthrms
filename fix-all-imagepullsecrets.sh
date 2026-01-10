#!/bin/bash

# Fix all K8s deployment files to add imagePullSecrets

set -e

echo "🔧 Adding imagePullSecrets to all deployment files..."
echo ""

SERVICES=(
  "analytics-service"
  "api-gateway"
  "attendance-service"
  "cpp-service"
  "crm-service"
  "document-service"
  "financial-service"
  "inventory-service"
  "monitoring-service"
  "notification-service"
  "payroll-service"
  "prescription-service"
  "purchase-service"
  "realtime-service"
  "sales-service"
  "service-management"
  "tenant-registry-service"
)

for SERVICE in "${SERVICES[@]}"; do
  FILE="k8s/deployments/${SERVICE}.yaml"
  
  if [ ! -f "$FILE" ]; then
    echo "⚠️  Skipping $SERVICE - file not found"
    continue
  fi
  
  # Check if imagePullSecrets already exists
  if grep -q "imagePullSecrets:" "$FILE"; then
    echo "✅ $SERVICE - already has imagePullSecrets"
    continue
  fi
  
  # Add imagePullSecrets before containers
  echo "🔧 Fixing $SERVICE..."
  sed -i.bak '/^    spec:$/,/^      containers:$/ {
    /^      containers:$/ i\
      imagePullSecrets:\
      - name: acr-secret
  }' "$FILE"
  
  # Remove backup file
  rm -f "${FILE}.bak"
  
  echo "✅ $SERVICE - imagePullSecrets added"
done

echo ""
echo "✅ All deployment files fixed!"
echo ""
echo "Next steps:"
echo "1. git add k8s/deployments/"
echo "2. git commit -m 'fix: Add imagePullSecrets to all deployments'"
echo "3. git push"

