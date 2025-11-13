# Multi-stage build for Azure deployment
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including dev dependencies for build)
# Use npm install as fallback if package-lock.json is missing or incompatible
RUN if [ -f package-lock.json ]; then npm ci || npm install; else npm install; fi && npm cache clean --force

# Copy source code
COPY . .

# Build application (if needed)
RUN npm run build || echo "No build script found, skipping build step"

# Production stage
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# Copy package files
COPY package.json package-lock.json* ./

# Install only production dependencies
# Use npm install as fallback if package-lock.json is missing or incompatible
RUN if [ -f package-lock.json ]; then npm ci --omit=dev || npm install --omit=dev; else npm install --omit=dev; fi && npm cache clean --force

# Copy application code from builder stage
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./

# Create necessary directories
RUN mkdir -p logs storage/documents storage/images storage/backups storage/temp \
    && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/server.js"]