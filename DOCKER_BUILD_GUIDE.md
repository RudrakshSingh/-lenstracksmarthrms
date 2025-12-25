# Docker Build Guide for Etelios HRMS

## Overview

This guide explains the Docker build process for the Etelios HRMS microservices architecture. All builds now use **repository root context** to ensure consistent access to shared utilities.

## Directory Structure

```
repository-root/
├── microservices/
│   ├── shared/              # Shared utilities (available to all services)
│   │   ├── config/         # Shared configuration utilities
│   │   ├── middleware/     # Shared middleware functions
│   │   ├── services/       # Shared service utilities
│   │   └── utils/          # Shared utility functions
│   ├── auth-service/       # Authentication service
│   ├── hr-service/         # HR Management service
│   ├── attendance-service/ # Attendance tracking
│   └── ...                 # Other microservices
├── scripts/
│   ├── build-services.sh   # Local build script
│   └── validate-docker-builds.sh # Build validation
├── Dockerfile              # API Gateway Dockerfile
└── azure-pipelines.yml     # CI/CD Pipeline
```

## Build Context Explanation

### Problem Solved

**Before:** Inconsistent build contexts caused `"../shared": not found` errors
```bash
# ❌ BROKEN: Service directory context
docker build -f Dockerfile -t image microservices/auth-service/
# COPY ../shared ./shared → FAILS (parent dir not accessible)

# ❌ BROKEN: Mixed contexts in pipeline
if [ "$SERVICE" = "hr-service" ]; then
  docker build -f Dockerfile .  # Repository root
else
  docker build -f Dockerfile microservices/$SERVICE/  # Service dir
fi
```

**After:** All builds use repository root context
```bash
# ✅ FIXED: Repository root context for all services
docker build -f microservices/auth-service/Dockerfile -t image .
# COPY microservices/shared ./shared → WORKS
```

### Why Repository Root Context?

- **Shared Access:** All services can access `microservices/shared/`
- **Consistency:** Same build process for all services
- **Maintainability:** No conditional logic in build scripts
- **CI/CD:** Simplified pipeline configuration

## Build Commands

### Build All Services (Local Development)
```bash
# From repository root
./scripts/build-services.sh
```

### Build Specific Service
```bash
# From repository root
./scripts/build-services.sh auth-service
./scripts/build-services.sh api-gateway
```

### Build API Gateway Only
```bash
./scripts/build-services.sh api-gateway
```

### Validate Builds
```bash
./scripts/validate-docker-builds.sh
```

## Dockerfile Structure

All service Dockerfiles now follow this pattern:

```dockerfile
# Multi-stage build for [Service Name]
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files from service directory
COPY microservices/auth-service/package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy shared utilities directory
COPY microservices/shared ./shared

# Copy source code from service directory
COPY microservices/auth-service/src ./src
COPY microservices/auth-service/*.js ./

# Production stage
FROM node:22-alpine

WORKDIR /app

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/shared ./shared
COPY --from=builder --chown=nodejs:nodejs /app .

USER nodejs

EXPOSE 3001

CMD ["node", "src/server.js"]
```

## CI/CD Pipeline

### Azure DevOps Configuration

The `azure-pipelines.yml` now uses consistent repository root context:

```yaml
# Build each service using repository root context
for SERVICE in $SERVICES; do
  docker build \
    --rm \
    -t $ACR_LOGIN_SERVER/$SERVICE:$IMAGE_TAG \
    -t $ACR_LOGIN_SERVER/$SERVICE:latest \
    -f microservices/$SERVICE/Dockerfile \
    .  # Repository root context
done
```

### Service Groups

Services are built in parallel groups for efficiency:

```yaml
# Group 1: Core services
SERVICES="auth-service hr-service attendance-service"

# Group 2: Business services
SERVICES="payroll-service inventory-service sales-service"

# Group 3: Supporting services
SERVICES="analytics-service notification-service monitoring-service"
```

## Troubleshooting

### Common Issues

#### 1. `"shared": not found` Error
**Cause:** Building from service directory instead of repository root
**Fix:** Ensure you're in repository root and use `.` as build context

```bash
# ❌ Wrong
cd microservices/auth-service
docker build -f Dockerfile .

# ✅ Correct
cd /path/to/repository
docker build -f microservices/auth-service/Dockerfile .
```

#### 2. `COPY failed: file not found`
**Cause:** Incorrect COPY paths in Dockerfile
**Fix:** Update paths to use full repository paths

```dockerfile
# ❌ Wrong
COPY package*.json ./
COPY src ./src

# ✅ Correct
COPY microservices/auth-service/package*.json ./
COPY microservices/auth-service/src ./src
```

#### 3. Permission Denied
**Cause:** Shared directory not accessible
**Fix:** Check that `microservices/shared/` exists and has proper permissions

```bash
ls -la microservices/shared/
```

#### 4. Build Context Too Large
**Cause:** Including unnecessary files in build context
**Fix:** Use `.dockerignore` to exclude large directories

```dockerfile
# .dockerignore
node_modules/
.git/
*.log
coverage/
```

### Debug Commands

#### Check Shared Directory Access
```bash
# Verify shared directory exists
ls -la microservices/shared/

# Test build context
docker build --no-cache -f microservices/auth-service/Dockerfile -t test .
```

#### Inspect Built Image
```bash
# Check if shared directory is included
docker run --rm -it etelios/auth-service ls -la /app/shared

# Check service-specific files
docker run --rm -it etelios/auth-service ls -la /app/src
```

#### Clean Up Failed Builds
```bash
# Remove dangling images
docker image prune -f

# Remove test images
docker rmi $(docker images -f "dangling=true" -q)
```

## Local Development

### Docker Compose Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  auth-service:
    build:
      context: .  # Repository root
      dockerfile: microservices/auth-service/Dockerfile
    image: etelios/auth-service:latest
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development

  hr-service:
    build:
      context: .  # Repository root
      dockerfile: microservices/hr-service/Dockerfile
    image: etelios/hr-service:latest
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=development
    depends_on:
      - auth-service
```

### Development Workflow

```bash
# 1. Build all services
./scripts/build-services.sh

# 2. Start services
docker-compose up -d

# 3. View logs
docker-compose logs -f auth-service

# 4. Test API
curl http://localhost:3001/health

# 5. Stop services
docker-compose down
```

## Performance Optimization

### Build Caching
- Package files copied first for dependency caching
- Shared directory copied early in build process
- Multi-stage builds for smaller final images

### Layer Optimization
```dockerfile
# Dependencies first (changes infrequently)
COPY microservices/shared/package*.json ./shared/
RUN npm ci --omit=dev

# Source code last (changes frequently)
COPY microservices/auth-service/src ./src
```

### Build Arguments
```dockerfile
ARG BUILD_DATE
ARG VERSION
ARG SERVICE_NAME

LABEL org.opencontainers.image.created=$BUILD_DATE \
      org.opencontainers.image.version=$VERSION \
      service.name=$SERVICE_NAME
```

## Security Considerations

### Non-Root User
```dockerfile
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs
```

### Minimal Base Images
- Use `node:22-alpine` for smaller images
- Multi-stage builds to exclude dev dependencies
- `npm cache clean --force` to reduce size

### Secure COPY Operations
```dockerfile
COPY --chown=nodejs:nodejs --from=builder /app/node_modules ./node_modules
```

## Monitoring & Health Checks

### Container Health
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

### Build Metrics
- Build time tracking
- Image size monitoring
- Cache hit ratios

## Migration Guide

### From Old Build System

1. **Update all Dockerfiles** (done automatically by script)
2. **Change build commands** to use repository root
3. **Update CI/CD pipeline** (done)
4. **Test builds** with validation script

### Breaking Changes

- Build context changed from service directories to repository root
- All COPY paths must include full `microservices/service-name/` prefix
- Shared directory access now available to all services

## Support

### Quick Reference

```bash
# Build everything
./scripts/build-services.sh

# Build one service
./scripts/build-services.sh auth-service

# Validate builds work
./scripts/validate-docker-builds.sh

# Clean up
docker system prune -f
```

### Common Patterns

- **All builds from repository root**
- **Shared directory at `/app/shared` in containers**
- **Service code at `/app/src` in containers**
- **Non-root user `nodejs` (uid 1001)**

---

**Last Updated:** December 25, 2025
**Build Context:** Repository Root (`.`)
**Shared Access:** ✅ Enabled for all services
