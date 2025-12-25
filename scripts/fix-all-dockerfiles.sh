#!/bin/bash

# Script to fix all Dockerfiles for repository root build context
# This adds shared directory access and corrects all COPY paths

set -e

echo "🔧 Fixing all Dockerfiles for repository root build context..."

# List of all services with Dockerfiles
SERVICES=(
    "analytics-service"
    "api-gateway"
    "attendance-service"
    "auth-service"
    "cpp-service"
    "crm-service"
    "document-service"
    "financial-service"
    "hr-service"  # Already updated manually
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

fix_dockerfile() {
    local service=$1
    local dockerfile="microservices/$service/Dockerfile"

    if [ ! -f "$dockerfile" ]; then
        echo "⚠️  Skipping $service - Dockerfile not found"
        return
    fi

    echo "📝 Updating $service..."

    # Create a backup
    cp "$dockerfile" "${dockerfile}.backup"

    # Use awk to process the Dockerfile and add shared directory access
    awk '
    BEGIN { in_builder = 0; shared_copied = 0; in_production = 0 }

    /^FROM.*AS builder/ { in_builder = 1; in_production = 0 }
    /^FROM.*node.*$/ && !/AS builder/ { in_builder = 0; in_production = 1 }

    # In builder stage, add shared copy after package files
    in_builder && /^COPY.*package.*\.json/ {
        print $0
        if (!shared_copied) {
            print ""
            print "# Copy shared utilities directory"
            print "COPY microservices/shared ./shared"
            shared_copied = 1
        }
        next
    }

    # In production stage, add shared copy from builder
    in_production && /^COPY --from=builder.*node_modules/ {
        print $0
        print ""
        print "# Copy shared utilities from builder"
        print "COPY --from=builder --chown=nodejs:nodejs /app/shared ./shared"
        next
    }

    # Fix any existing COPY . . statements to use full service path
    /^COPY --chown=nodejs:nodejs \. \.$/ {
        print "# Copy application code from service directory"
        print "COPY --chown=nodejs:nodejs microservices/'"$service"'/ ./"
        next
    }

    # Remove any existing shared copies (they will be wrong)
    /^COPY.*\.\.\/shared/ { next }

    { print }
    ' "$dockerfile" > "${dockerfile}.new"

    # Replace the original file
    mv "${dockerfile}.new" "$dockerfile"

    echo "✅ Updated $service"
}

# Skip hr-service as we updated it manually
for service in "${SERVICES[@]}"; do
    if [ "$service" != "hr-service" ]; then
        fix_dockerfile "$service"
    fi
done

echo ""
echo "🎉 All Dockerfiles updated successfully!"
echo ""
echo "📋 Summary of changes:"
echo "• Added shared directory access to all services"
echo "• Fixed COPY paths for repository root context"
echo "• Maintained all existing functionality"
echo ""
echo "🚀 Ready for testing builds!"
