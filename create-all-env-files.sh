#!/bin/bash

# Create .env files for all microservices

set -e

echo "📝 Creating .env files for all microservices..."
echo ""

# Service configurations: "service-name:port:db-name"
SERVICES=(
  "attendance-service:3003:attendance-db"
  "payroll-service:3004:payroll-db"
  "notification-service:3005:notification-db"
  "analytics-service:3006:analytics-db"
  "document-service:3007:document-db"
  "crm-service:3008:crm-db"
  "cpp-service:3009:cpp-db"
  "prescription-service:3010:prescription-db"
  "purchase-service:3011:purchase-db"
  "sales-service:3012:sales-db"
  "inventory-service:3013:inventory-db"
  "financial-service:3014:financial-db"
  "service-management:3015:service-management-db"
  "realtime-service:3016:realtime-db"
  "tenant-registry-service:3017:tenant-registry-db"
  "monitoring-service:3018:monitoring-db"
)

for SERVICE_CONFIG in "${SERVICES[@]}"; do
  IFS=':' read -r SERVICE_NAME PORT DB_NAME <<< "$SERVICE_CONFIG"
  
  ENV_FILE="microservices/${SERVICE_NAME}/.env"
  
  # Check if service directory exists
  if [ ! -d "microservices/${SERVICE_NAME}" ]; then
    echo "⚠️  Skipping ${SERVICE_NAME} - directory not found"
    continue
  fi
  
  # Check if .env already exists
  if [ -f "$ENV_FILE" ]; then
    echo "✅ ${SERVICE_NAME} - .env already exists"
    continue
  fi
  
  # Create .env file
  echo "📝 Creating ${SERVICE_NAME}/.env..."
  
  # Convert service-name to Title Case for display
  SERVICE_DISPLAY=$(echo "$SERVICE_NAME" | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')
  
  cat > "$ENV_FILE" <<EOF
# ${SERVICE_DISPLAY} Configuration
SERVICE_NAME=${SERVICE_NAME}
PORT=${PORT}
DB_NAME=${DB_NAME}

# Environment
NODE_ENV=development
DEBUG=true

# Logging
LOG_LEVEL=debug
EOF
  
  echo "✅ ${SERVICE_NAME} - .env created"
done

echo ""
echo "✅ All .env files created!"
echo ""
echo "📋 Summary:"
echo "  - Root .env: Contains MONGO_URI, JWT secrets, shared config"
echo "  - Service .env: Contains PORT, DB_NAME, service-specific config"
echo ""
echo "🔄 Services will load:"
echo "  1. Root .env first (shared config)"
echo "  2. Service .env second (overrides)"

