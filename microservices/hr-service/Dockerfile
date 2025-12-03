# Multi-stage build for HRMS Service
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN if [ -f package-lock.json ]; then npm ci --omit=dev || npm install --omit=dev; else npm install --omit=dev; fi && npm cache clean --force

# Production stage
FROM node:22-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Install PM2 globally for Azure App Service compatibility
RUN npm install -g pm2

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code (includes ecosystem.config.js)
COPY --chown=nodejs:nodejs . .

# Create storage directories
RUN mkdir -p storage/documents storage/exports storage/images storage/temp logs && \
    chown -R nodejs:nodejs storage logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Make start.sh executable
RUN chmod +x start.sh

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application - Use PM2 for Azure App Service compatibility
# Azure App Service will use this if no startup command is set
# If Azure has a startup command, it will override this
CMD ["sh", "start.sh"]
