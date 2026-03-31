# Multi-stage build for JTS Service
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files from service directory
COPY microservices/jts-service/package*.json ./

# Install dependencies
RUN if [ -f package-lock.json ]; then npm ci || npm install; else npm install; fi && npm cache clean --force

# Copy service source and shared utilities
COPY microservices/jts-service/ ./
COPY microservices/shared ./shared

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

# Copy package files from service directory
COPY microservices/jts-service/package*.json ./

# Install only production dependencies
RUN if [ -f package-lock.json ]; then npm ci --omit=dev || npm install --omit=dev; else npm install --omit=dev; fi && npm cache clean --force

# Copy application code from builder stage
COPY --from=builder /app/ ./

# Create necessary directories
RUN mkdir -p logs storage \
    && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3018

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "const port = process.env.PORT || 3018; require('http').get('http://localhost:' + port + '/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/server.js"]

