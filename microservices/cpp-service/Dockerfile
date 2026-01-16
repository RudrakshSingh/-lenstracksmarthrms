# Multi-stage build for cpp-service (copy ONLY this service, not repo root)
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files (service-scoped)
COPY microservices/cpp-service/package*.json ./

# Copy shared utilities used by services
COPY microservices/shared ./shared

# Install production dependencies
RUN if [ -f package-lock.json ]; then npm ci --omit=dev || npm install --omit=dev; else npm install --omit=dev; fi && npm cache clean --force

# Copy cpp-service source code
COPY microservices/cpp-service/ ./

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install system dependencies and create non-root user
RUN apk add --no-cache dumb-init curl && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy dependencies + code from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/shared ./shared
COPY --from=builder --chown=nodejs:nodejs /app/ ./

# Create necessary directories
RUN mkdir -p logs storage/documents storage/images storage/backups storage/temp && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3012

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const port = process.env.PORT || 3012; require('http').get('http://localhost:' + port + '/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
