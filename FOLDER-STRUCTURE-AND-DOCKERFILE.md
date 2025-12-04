# LensTrack Smart HRMS - Folder Structure & Dockerfile Documentation

## 📁 Project Folder Structure

```
lenstracksmarthrms/
│
├── 📄 Dockerfile                          # Main API Gateway Dockerfile (Node.js 22)
├── 📄 docker-compose.yml                  # Main docker-compose configuration
├── 📄 ecosystem.config.js                 # PM2 process manager configuration
├── 📄 package.json                        # Root package.json with dependencies
│
├── 📂 src/                                # Main API Gateway source code
│   ├── server.js                         # Main entry point for API Gateway
│   ├── config/
│   │   └── services.config.js            # Microservice configuration
│   ├── middleware/
│   │   └── production-security.js        # Security middleware
│   └── utils/                            # Utility functions
│       ├── cache.js                      # Caching utilities
│       └── ...
│
├── 📂 microservices/                      # All microservices
│   ├── 📂 auth-service/                  # Authentication & User Management
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── server.js
│   │   │   ├── config/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   └── logs/
│   │
│   ├── 📂 hr-service/                    # HR Management & Employee Data
│   ├── 📂 attendance-service/            # Attendance Tracking
│   ├── 📂 payroll-service/               # Payroll Management
│   ├── 📂 crm-service/                   # Customer Relationship Management
│   ├── 📂 analytics-service/             # Analytics & Reporting
│   ├── 📂 document-service/              # Document Management
│   ├── 📂 inventory-service/             # Inventory Management
│   ├── 📂 sales-service/                 # Sales Management
│   ├── 📂 purchase-service/              # Purchase Management
│   ├── 📂 financial-service/             # Financial Management
│   ├── 📂 prescription-service/          # Prescription Management
│   ├── 📂 notification-service/          # Notification Service
│   ├── 📂 monitoring-service/            # System Monitoring
│   ├── 📂 jts-service/                   # Job Tracking Service
│   ├── 📂 cpp-service/                   # Custom Service
│   ├── 📂 tenant-management-service/     # Multi-tenancy Management
│   ├── 📂 tenant-registry-service/       # Tenant Registry
│   ├── 📂 service-management/            # Service Management
│   ├── 📂 realtime-service/              # Real-time Communication
│   │
│   ├── 📂 shared/                        # Shared code across microservices
│   │   ├── config/                       # Shared configuration
│   │   ├── middleware/                   # Shared middleware
│   │   │   └── production-security.middleware.js
│   │   ├── services/                     # Shared services
│   │   └── utils/                        # Shared utilities
│   │
│   └── 📄 docker-compose.yml             # Microservices docker-compose
│
├── 📂 k8s/                                # Kubernetes deployment files
│   ├── deployments/                      # K8s deployment manifests
│   │   ├── auth-service.yaml
│   │   ├── hr-service.yaml
│   │   ├── analytics-service.yaml
│   │   └── ... (19 total deployment files)
│   ├── ingress.yaml                      # K8s ingress configuration
│   ├── namespace.yaml                    # K8s namespace
│   └── ...
│
├── 📂 docker/                             # Docker configuration files
│   ├── Dockerfile
│   ├── mongodb/
│   │   └── init-mongo.js
│   └── nginx/
│       ├── nginx.conf
│       └── conf.d/
│
├── 📂 scripts/                            # Utility scripts
│   ├── setup-keyvault-secrets.js
│   └── test-keyvault-connection.js
│
├── 📂 docs/                               # Documentation
│   └── openapi.yaml                      # OpenAPI specification
│
├── 📂 postman/                            # Postman API collections
│   ├── Etelios-Complete-API-Collection.json
│   └── HRMS-Complete-API-Collection.json
│
├── 📂 storage/                            # File storage directories
│   ├── documents/
│   ├── images/
│   ├── backups/
│   └── temp/
│
├── 📂 logs/                               # Application logs
│   ├── gateway-error.log
│   ├── gateway-out.log
│   ├── combined.log
│   └── ...
│
├── 📂 public/                             # Static files
│
├── 📂 tests/                              # Test files
│   └── unit/
│
├── 📂 .github/                            # GitHub workflows
│   └── workflows/
│
└── 📄 *.md                                # Various documentation files
    ├── ETELIOS-MASTER-TECHNICAL-DOCUMENTATION.md
    ├── DEPLOYMENT-READY-SUMMARY.md
    └── ...
```

---

## 🐳 Main Dockerfile (API Gateway)

**Location:** `/Dockerfile`

**Purpose:** Multi-stage Docker build for the main API Gateway service that routes requests to microservices.

### Complete Dockerfile:

```dockerfile
# Multi-stage build for Azure deployment
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# Copy package files
COPY package.json ./

# Install all dependencies (including dev dependencies for build)
# Use npm install as fallback if package-lock.json is missing or incompatible
RUN npm ci || npm install && npm cache clean --force

# Copy source code
COPY . .

# Ensure public directory exists (create if missing)
RUN mkdir -p public

# Build application (if needed)
RUN npm run build || echo "No build script found, skipping build step"

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

# Copy package files
COPY package.json package-lock.json* ./

# Install only production dependencies
# Use npm install as fallback if package-lock.json is missing or incompatible
RUN if [ -f package-lock.json ]; then npm ci --omit=dev || npm install --omit=dev; else npm install --omit=dev; fi && npm cache clean --force

# Copy application code from builder stage
COPY --from=builder /app/src ./src
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/microservices ./microservices
COPY --from=builder /app/ecosystem.config.js ./ecosystem.config.js

# Copy public directory (directory exists in builder stage, even if empty)
COPY --from=builder /app/public ./public

# Install dependencies for each microservice that has a package.json
# This ensures all microservices have their required dependencies
RUN for dir in microservices/*/; do \
      if [ -f "$dir/package.json" ]; then \
        echo "Installing dependencies for $dir"; \
        cd "$dir" && \
        if [ -f "package-lock.json" ]; then \
          npm ci --omit=dev || npm install --omit=dev; \
        else \
          npm install --omit=dev; \
        fi && \
        npm cache clean --force && \
        cd /app; \
      fi; \
    done

# Create necessary directories and set ownership
RUN mkdir -p logs storage/documents storage/images storage/backups storage/temp \
    && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check - use PORT env var or default to 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "const port = process.env.PORT || process.env.WEBSITES_PORT || 3000; require('http').get('http://localhost:' + port + '/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/server.js"]
```

---

## 📋 Dockerfile Explanation

### **Stage 1: Builder Stage**

1. **Base Image:** `node:22-alpine`
   - Uses Node.js 22 on Alpine Linux (lightweight)

2. **System Dependencies:**
   - `dumb-init`: Proper signal handling for containers
   - `curl`: For health checks and debugging
   - Creates `nodejs` user/group (UID 1001) for security

3. **Dependencies Installation:**
   - Copies `package.json`
   - Runs `npm ci` (preferred) or falls back to `npm install`
   - Installs ALL dependencies (including dev dependencies for build)

4. **Source Code:**
   - Copies entire project
   - Creates `public` directory if missing
   - Runs build script if available

### **Stage 2: Production Stage**

1. **Base Image:** `node:22-alpine` (fresh, clean image)

2. **Production Dependencies:**
   - Only installs production dependencies (`--omit=dev`)
   - Smaller final image size

3. **Code Copying:**
   - Copies only necessary files from builder stage:
     - `src/` - Main API Gateway source code
     - `package*.json` - Package files
     - `microservices/` - All microservice directories
     - `ecosystem.config.js` - PM2 configuration
     - `public/` - Static files

4. **Microservice Dependencies:**
   - **Critical Feature:** Iterates through all `microservices/*/` directories
   - Installs production dependencies for each microservice that has a `package.json`
   - Ensures each microservice has its own dependencies installed

5. **Directory Setup:**
   - Creates required directories:
     - `logs/` - Application logs
     - `storage/documents/` - Document storage
     - `storage/images/` - Image storage
     - `storage/backups/` - Backup storage
     - `storage/temp/` - Temporary files
   - Sets ownership to `nodejs` user

6. **Security:**
   - Switches to non-root user (`nodejs`)
   - Prevents privilege escalation attacks

7. **Health Check:**
   - Checks `/health` endpoint every 30 seconds
   - Uses `PORT` or `WEBSITES_PORT` environment variable (Azure compatibility)
   - Defaults to port 3000

8. **Entry Point:**
   - Uses `dumb-init` to handle signals properly (SIGTERM, SIGINT)
   - Starts application with `node src/server.js`

---

## 🔑 Key Features

### **Multi-Stage Build Benefits:**
- ✅ Smaller final image (only production dependencies)
- ✅ Faster builds (caching layers)
- ✅ Security (non-root user)
- ✅ Production-ready

### **Microservice Support:**
- ✅ Automatically installs dependencies for all microservices
- ✅ Each microservice can have its own `package.json`
- ✅ Handles missing `package-lock.json` gracefully

### **Azure Compatibility:**
- ✅ Uses `WEBSITES_PORT` environment variable
- ✅ Health check compatible with Azure App Service
- ✅ Proper signal handling for Azure deployments

### **Security:**
- ✅ Non-root user execution
- ✅ Minimal Alpine Linux base
- ✅ Only production dependencies in final image

---

## 🚀 Building the Docker Image

```bash
# Build the main API Gateway image
docker build -t lenstrack-api-gateway:latest -f Dockerfile .

# Build with specific tag
docker build -t lenstrack-api-gateway:v1.0.0 -f Dockerfile .

# Build with build arguments (if needed)
docker build -t lenstrack-api-gateway:latest \
  --build-arg NODE_ENV=production \
  -f Dockerfile .
```

---

## 📊 Image Structure

```
/app/
├── src/                    # API Gateway source code
├── microservices/          # All microservice directories
│   ├── auth-service/
│   │   ├── src/
│   │   ├── package.json
│   │   └── node_modules/   # Installed by Dockerfile
│   ├── hr-service/
│   │   └── ...
│   └── ... (20+ services)
├── package.json
├── ecosystem.config.js
├── public/
├── logs/                   # Created by Dockerfile
└── storage/                # Created by Dockerfile
    ├── documents/
    ├── images/
    ├── backups/
    └── temp/
```

---

## 🔧 Environment Variables

The Dockerfile expects these environment variables (set at runtime):

- `PORT` or `WEBSITES_PORT`: Port to run the application (default: 3000)
- `NODE_ENV`: Environment mode (production, development)
- `MONGO_URI`: MongoDB connection string
- `CORS_ORIGIN`: CORS allowed origins
- Service-specific variables for each microservice

---

## 📝 Notes

1. **Node.js Version:** Uses Node.js 22 (latest LTS)
2. **Base Image:** Alpine Linux (minimal, secure)
3. **User:** Runs as `nodejs` user (UID 1001, not root)
4. **Health Check:** Automatically checks `/health` endpoint
5. **Signal Handling:** Uses `dumb-init` for proper container shutdown
6. **Microservices:** Each microservice's dependencies are installed automatically

---

## 🐛 Troubleshooting

### Build Issues:
- Ensure `package.json` exists in root
- Check that all microservices have valid `package.json` files
- Verify `.dockerignore` excludes unnecessary files

### Runtime Issues:
- Check health endpoint: `curl http://localhost:3000/health`
- Verify port mapping: `docker run -p 3000:3000 ...`
- Check logs: `docker logs <container-id>`

### Microservice Issues:
- Verify each microservice has its own `package.json`
- Check that dependencies are installed correctly
- Review microservice logs in `/app/logs/`

---

**Last Updated:** December 4, 2025
**Dockerfile Version:** Node.js 22 Alpine
**Maintained By:** LensTrack Smart HRMS Team

