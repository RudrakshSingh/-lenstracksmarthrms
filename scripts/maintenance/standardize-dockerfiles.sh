#!/bin/bash

# Standardize all Dockerfiles to use consistent multi-stage build pattern
# Pattern: Builder installs deps, Production copies source directly from build context

set -e

echo "🔧 Standardizing all Dockerfiles..."

standardize_dockerfile() {
    local service=$1
    local dockerfile="microservices/$service/Dockerfile"

    if [ ! -f "$dockerfile" ]; then
        echo "⚠️  Skipping $service - Dockerfile not found"
        return
    fi

    echo "📝 Standardizing $service..."

    # Create a new standardized Dockerfile
    cat > "${dockerfile}.new" << EOF
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
RUN addgroup -g 1001 -S nodejs && \
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
RUN mkdir -p storage logs && \
    chown -R nodejs:nodejs storage logs

# Switch to non-root user
USER nodejs

# Expose port (will be overridden by service-specific port)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/server.js"]
EOF

    # Get the service-specific port and health check
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

    # Update port and health check
    sed -i '' "s/EXPOSE 3000/EXPOSE $port/g" "${dockerfile}.new"
    sed -i '' "s|localhost:3000|localhost:$port|g" "${dockerfile}.new"

    # Special handling for services with different structures
    case $service in
        "hr-service")
            # HR service has special PM2 setup
            sed -i '' '/dumb-init/a\
# Install PM2 globally for Azure App Service compatibility\
RUN npm install -g pm2' "${dockerfile}.new"

            sed -i '' 's|CMD \["node", "src/server.js"\]|# Use PM2 for Azure App Service compatibility\
# Azure App Service will use this if no startup command is set\
# If Azure has a startup command, it will override this\
CMD ["sh", "start.sh"]' "${dockerfile}.new"
            ;;

        "attendance-service")
            # Attendance service might have different health check
            sed -i '' 's|node -e "require.*3000|node -e "const port = process.env.PORT || 3003; require('\''http'\'').get('\''http://localhost:'\'' + port + '\''/health'\'', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"|g' "${dockerfile}.new"
            ;;
    esac

    # Replace the original file
    mv "${dockerfile}.new" "$dockerfile"

    echo "✅ Standardized $service (port: $port)"
}

# Services to standardize
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
    standardize_dockerfile "$service"
done

echo ""
echo "🎉 All Dockerfiles standardized!"
echo ""
echo "📋 Standardization complete:"
echo "• Consistent multi-stage build pattern"
echo "• Repository root build context support"
echo "• Shared directory access for all services"
echo "• Service-specific ports and health checks"
echo "• Security hardening (non-root user, dumb-init)"
