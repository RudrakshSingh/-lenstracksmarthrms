# Multi-stage build for Attendance Service
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY microservices/attendance-service/package*.json ./

# Copy shared utilities directory
COPY microservices/shared ./shared

# Install dependencies
RUN if [ -f package-lock.json ]; then npm ci --omit=dev || npm install --omit=dev; else npm install --omit=dev; fi && npm cache clean --force

# Production stage
FROM node:22-alpine AS production

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# Copy dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy shared utilities from builder
COPY --from=builder --chown=nodejs:nodejs /app/shared ./shared

# Copy application code from service directory
COPY --chown=nodejs:nodejs microservices/attendance-service/ ./

# Create necessary directories
RUN mkdir -p logs \
    && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "const port = process.env.PORT || 3003; require('http').get('http://localhost:' + port + '/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/server.js"]
