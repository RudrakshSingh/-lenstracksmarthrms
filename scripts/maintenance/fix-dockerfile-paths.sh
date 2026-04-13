#!/bin/bash

# Fix Dockerfile COPY paths for repository root context
# Ensures all package.json paths are correct

set -e

echo "🔧 Fixing Dockerfile COPY paths..."

fix_service_dockerfile() {
    local service=$1
    local dockerfile="microservices/$service/Dockerfile"

    if [ ! -f "$dockerfile" ]; then
        echo "⚠️  Skipping $service - Dockerfile not found"
        return
    fi

    echo "📝 Fixing $service..."

    # Fix package.json copy path
    sed -i '' 's|COPY package\.json package-lock\.json\* \./|COPY microservices/'"$service"'/package*.json ./|g' "$dockerfile"
    sed -i '' 's|COPY package\*\.json \./|COPY microservices/'"$service"'/package*.json ./|g' "$dockerfile"

    # Fix source code copy (if it's just "COPY .")
    sed -i '' 's|COPY --chown=nodejs:nodejs \. \./|COPY --chown=nodejs:nodejs microservices/'"$service"'/ ./|g' "$dockerfile"

    echo "✅ Fixed $service"
}

# Services to fix
SERVICES=(
    "analytics-service"
    "attendance-service"
    "auth-service"
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
    "tenant-management-service"
    "tenant-registry-service"
)

for service in "${SERVICES[@]}"; do
    fix_service_dockerfile "$service"
done

echo ""
echo "🎉 All Dockerfile paths fixed!"
echo ""
echo "📋 Changes made:"
echo "• Package files now copy from: microservices/{service}/package*.json"
echo "• Source code now copies from: microservices/{service}/"
echo "• Shared directory access maintained"
