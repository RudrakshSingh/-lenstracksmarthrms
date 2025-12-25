#!/bin/bash

# Fix production stage in multi-stage Dockerfiles to properly copy from builder

set -e

echo "🔧 Fixing production stages..."

fix_production_stage() {
    local service=$1
    local dockerfile="microservices/$service/Dockerfile"

    if [ ! -f "$dockerfile" ]; then
        echo "⚠️  Skipping $service - Dockerfile not found"
        return
    fi

    # Check if it already has the correct structure
    if grep -q "COPY --from=builder.*node_modules" "$dockerfile"; then
        echo "✅ $service: Already has correct production stage"
        return
    fi

    echo "📝 Fixing production stage for $service..."

    # Replace the old production stage structure
    sed -i '' '/# Copy package files/,/# Copy application code from builder stage/{
        /# Copy package files/c\
# Copy dependencies from builder\
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules\
\
# Copy shared utilities from builder\
COPY --from=builder --chown=nodejs:nodejs /app/shared ./shared\
\
# Copy application code from builder stage
    }' "$dockerfile"

    echo "✅ Fixed $service"
}

# Services to fix
SERVICES=(
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
    fix_production_stage "$service"
done

echo ""
echo "🎉 Production stages fixed!"
echo ""
echo "📋 All services now properly copy from builder stage"
