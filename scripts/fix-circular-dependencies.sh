#!/bin/bash

# Fix circular dependencies in Dockerfiles caused by improper multi-stage build structure

set -e

echo "🔧 Fixing circular dependencies in Dockerfiles..."

fix_circular_dependency() {
    local service=$1
    local dockerfile="microservices/$service/Dockerfile"

    if [ ! -f "$dockerfile" ]; then
        echo "⚠️  Skipping $service - Dockerfile not found"
        return
    fi

    # Check if it has circular dependency (COPY --from=builder in builder stage)
    if grep -q "COPY --from=builder" "$dockerfile" && ! grep -q "^FROM.*AS production" "$dockerfile"; then
        echo "✅ $service: Already has correct structure"
        return
    fi

    # Check if it has the problematic pattern (COPY --from=builder before FROM ... AS production)
    if grep -A 20 "^FROM.*AS builder" "$dockerfile" | grep -q "COPY --from=builder"; then
        echo "📝 Fixing circular dependency in $service..."

        # Create a clean Dockerfile
        local port="3000"
        case $service in
            "auth-service") port="3001" ;;
            "hr-service") port="3002" ;;
            "attendance-service") port="3003" ;;
            "payroll-service") port="3004" ;;
            "inventory-service") port="3005" ;;
            "sales-service") port="3006" ;;
            "purchase-service") port="3007" ;;
            "financial-service") port="3008" ;;
            "analytics-service") port="3009" ;;
            "notification-service") port="3010" ;;
            "document-service") port="3011" ;;
            "service-management") port="3012" ;;
            "tenant-registry-service") port="3013" ;;
            "crm-service") port="3014" ;;
            "monitoring-service") port="3015" ;;
            "realtime-service") port="3016" ;;
            "prescription-service") port="3017" ;;
            "cpp-service") port="3018" ;;
            "tenant-management-service") port="3019" ;;
        esac

        cat > "${dockerfile}.fixed" << EOF
# Multi-stage build for ${service} Service
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files from service directory
COPY microservices/$service/package*.json ./

# Copy shared utilities directory
COPY microservices/shared ./shared

# Install dependencies
RUN if [ -f package-lock.json ]; then npm ci --omit=dev || npm install --omit=dev; else npm install --omit=dev; fi && npm cache clean --force

# Production stage
FROM node:22-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy shared utilities from builder
COPY --from=builder --chown=nodejs:nodejs /app/shared ./shared

# Copy application code from service directory
COPY --chown=nodejs:nodejs microservices/$service/ ./

# Create storage directories
RUN mkdir -p storage logs && \\
    chown -R nodejs:nodejs storage logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE $port

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:$port/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/server.js"]
EOF

        # Special handling for hr-service
        if [ "$service" = "hr-service" ]; then
            sed -i '' '/dumb-init/a\\
# Install PM2 globally for Azure App Service compatibility\\
RUN npm install -g pm2' "${dockerfile}.fixed"
            sed -i '' 's|CMD \["node", "src/server.js"\]|# Use PM2 for Azure App Service compatibility\\
# Azure App Service will use this if no startup command is set\\
# If Azure has a startup command, it will override this\\
CMD ["sh", "start.sh"]|' "${dockerfile}.fixed"
        fi

        # Replace the original file
        mv "${dockerfile}.fixed" "$dockerfile"
        echo "✅ Fixed $service (port: $port)"
    else
        echo "✅ $service: No circular dependency found"
    fi
}

# Services to check and fix
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

for service in "${SERVICES[@]}"; do
    fix_circular_dependency "$service"
done

echo ""
echo "🎉 Circular dependencies fixed!"
echo ""
echo "📋 All Dockerfiles now have proper multi-stage structure"
