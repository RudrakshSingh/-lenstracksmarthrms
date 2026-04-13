#!/bin/bash

# Add missing source code COPY statements to Dockerfiles

set -e

echo "🔧 Adding missing source code COPY statements..."

fix_service() {
    local service=$1
    local dockerfile="microservices/$service/Dockerfile"

    if [ ! -f "$dockerfile" ]; then
        echo "⚠️  Skipping $service - Dockerfile not found"
        return
    fi

    # Check if source copy already exists
    if grep -q "COPY --chown=nodejs:nodejs microservices/$service/" "$dockerfile"; then
        echo "✅ $service: Source copy already exists"
        return
    fi

    echo "📝 Adding source copy to $service..."

    # Find where to insert the source copy (after shared copy)
    if grep -q "COPY --from=builder.*shared" "$dockerfile"; then
        sed -i '' '/COPY --from=builder.*shared/a\\
# Copy application code from service directory\\
COPY --chown=nodejs:nodejs microservices\/'"$service"'\/ ./' "$dockerfile"
        echo "✅ Added source copy to $service"
    else
        echo "❌ $service: Could not find shared copy location"
    fi
}

# Services that need fixing
SERVICES=(
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

for service in "${SERVICES[@]}"; do
    fix_service "$service"
done

echo ""
echo "🎉 Source code COPY statements added!"
echo ""
echo "📋 Ready for final validation"
