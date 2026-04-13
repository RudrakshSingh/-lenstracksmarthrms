#!/bin/bash

# Fix Docker build context issues by ensuring all Dockerfiles use repository root context properly

set -e

echo "🔧 Fixing Docker build context issues..."

fix_service_dockerfile() {
    local service=$1
    local dockerfile="microservices/$service/Dockerfile"

    if [ ! -f "$dockerfile" ]; then
        echo "⚠️  Skipping $service - Dockerfile not found"
        return
    fi

    echo "📝 Fixing $service..."

    # Ensure builder stage has correct COPY paths
    sed -i '' 's|COPY package\.json package-lock\.json\* \./|COPY microservices/'"$service"'/package*.json ./|g' "$dockerfile"

    # Add shared directory copy after package files if not present
    if ! grep -q "COPY microservices/shared" "$dockerfile"; then
        sed -i '' '/COPY microservices\/'"$service"'\/package/a\\
# Copy shared utilities directory\\
COPY microservices/shared ./shared' "$dockerfile"
    fi

    # Fix production stage source copy
    if grep -q "COPY --from=builder.*src" "$dockerfile"; then
        # Remove builder source copies
        sed -i '' '/COPY --from=builder.*src/d' "$dockerfile"
        sed -i '' '/COPY --from=builder.*package/d' "$dockerfile"

        # Add direct source copy
        if ! grep -q "COPY --chown=nodejs:nodejs microservices/$service/" "$dockerfile"; then
            sed -i '' '/COPY --from=builder.*shared/a\\
# Copy application code from service directory\\
COPY --chown=nodejs:nodejs microservices/'"$service"'/ ./' "$dockerfile"
        fi
    fi

    # Ensure we don't have conflicting source copies
    if grep -q "COPY --chown=nodejs:nodejs \. \./" "$dockerfile"; then
        sed -i '' 's|COPY --chown=nodejs:nodejs \. \./|COPY --chown=nodejs:nodejs microservices/'"$service"'/ ./|g' "$dockerfile"
    fi

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
echo "🎉 Docker build context fixes applied!"
echo ""
echo "📋 Changes made:"
echo "• Package files now copy from: microservices/{service}/package*.json"
echo "• Shared directory accessible to all services"
echo "• Source code copies from correct paths"
echo "• No more conflicting COPY statements"
