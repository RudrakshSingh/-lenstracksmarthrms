#!/bin/bash

# Check Dockerfile structure and paths for repository root context compatibility

set -e

echo "🔍 Checking Dockerfile structures..."

check_dockerfile() {
    local service=$1
    local dockerfile="microservices/$service/Dockerfile"

    if [ ! -f "$dockerfile" ]; then
        echo "⚠️  $service: Dockerfile not found"
        return 1
    fi

    local issues=0

    # Check for repository root context paths
    if ! grep -q "COPY microservices/$service/package" "$dockerfile"; then
        echo "❌ $service: Missing correct package.json path"
        issues=$((issues + 1))
    fi

    if ! grep -q "COPY microservices/shared" "$dockerfile"; then
        echo "❌ $service: Missing shared directory access"
        issues=$((issues + 1))
    fi

    # Check for source code copy (either direct from build context or from builder stage)
    if ! grep -q "COPY --chown=nodejs:nodejs microservices/$service/" "$dockerfile" && ! grep -q "COPY --from=builder.*src" "$dockerfile"; then
        echo "❌ $service: Missing correct source code path"
        issues=$((issues + 1))
    fi

    # Check for problematic paths
    if grep -q "COPY \.\.\/shared" "$dockerfile"; then
        echo "❌ $service: Still has old ../shared path"
        issues=$((issues + 1))
    fi

    if grep -q "COPY --chown=nodejs:nodejs \. \./" "$dockerfile"; then
        echo "❌ $service: Still has old source copy path"
        issues=$((issues + 1))
    fi

    if [ $issues -eq 0 ]; then
        echo "✅ $service: Dockerfile structure OK"
        return 0
    else
        echo "❌ $service: $issues issues found"
        return 1
    fi
}

# Services to check
SERVICES=(
    "analytics-service"
    "attendance-service"
    "auth-service"
    "cpp-service"
    "crm-service"
    "document-service"
    "financial-service"
    "hr-service"
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

failed_services=()

for service in "${SERVICES[@]}"; do
    if ! check_dockerfile "$service"; then
        failed_services+=("$service")
    fi
done

echo ""
echo "========================================"

if [ ${#failed_services[@]} -eq 0 ]; then
    echo "✅ All Dockerfiles passed structure check!"
    echo ""
    echo "🎉 Ready for Docker builds with repository root context"
    exit 0
else
    echo "❌ Dockerfile structure issues found:"
    printf '%s\n' "${failed_services[@]}"
    echo ""
    echo "🔧 Please fix the issues above before building"
    exit 1
fi
