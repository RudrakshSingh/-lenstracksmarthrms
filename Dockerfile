###############################################
# Etelios Smart HRMS – API Gateway Dockerfile #
# Using Node.js 22 + PM2 + Production Build    #
# CI/CD and Production Only                    #
###############################################

# -----------------------------
# 1️⃣ Base Builder Stage
# -----------------------------
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files first for caching
COPY package.json package-lock.json* ./

# Install only production dependencies
# npm ci doesn't support --only=production, use --omit=dev instead
RUN if [ -f "package-lock.json" ]; then \
      npm ci --omit=dev || npm install --omit=dev; \
    else \
      npm install --omit=dev; \
    fi && \
    npm cache clean --force

# Copy API Gateway source code
COPY src ./src
COPY ecosystem.config.js ./

# Copy etelios-microservices and install its dependencies
COPY etelios-microservices ./etelios-microservices

# Install dependencies for etelios-microservices shared package
RUN if [ -f "etelios-microservices/shared/package.json" ]; then \
      echo "Installing dependencies for etelios-microservices/shared"; \
      cd etelios-microservices/shared && \
      if [ -f "package-lock.json" ]; then \
        npm ci --omit=dev || npm install --omit=dev; \
      else \
        npm install --omit=dev; \
      fi && \
      npm cache clean --force && \
      cd /app; \
    fi

# Install dependencies for each etelios-microservices service
RUN for dir in etelios-microservices/services/*/; do \
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

# Copy microservices directory
COPY microservices ./microservices

# Create required directories
RUN mkdir -p logs storage/documents storage/images storage/backups storage/temp public

# -----------------------------
# 2️⃣ Runtime Stage
# -----------------------------
FROM node:22-slim

WORKDIR /app

# Install PM2 globally
RUN npm install -g pm2

# Copy built app from builder stage
COPY --from=builder /app /app

# Install dependencies for etelios-microservices (runtime stage)
RUN if [ -f "etelios-microservices/shared/package.json" ]; then \
      echo "Installing dependencies for etelios-microservices/shared (runtime)"; \
      cd etelios-microservices/shared && \
      if [ -f "package-lock.json" ]; then \
        npm ci --omit=dev || npm install --omit=dev; \
      else \
        npm install --omit=dev; \
      fi && \
      npm cache clean --force && \
      cd /app; \
    fi

RUN for dir in etelios-microservices/services/*/; do \
      if [ -f "$dir/package.json" ]; then \
        echo "Installing dependencies for $dir (runtime)"; \
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

# Install dependencies for each microservice that has a package.json
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

# Expose the API Gateway port
EXPOSE 8080

# Environment variables (override in K8s or Docker Compose)
ENV NODE_ENV=production \
    PORT=8080 \
    RUN_ONLY_GATEWAY=true

# Healthcheck for container monitoring
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', res => { if(res.statusCode!==200) process.exit(1); })"

# -----------------------------
# Start the API Gateway ONLY (not microservices)
# Microservices run independently in their own containers
# To run all services together, set RUN_ALL_SERVICES=true
# -----------------------------
CMD ["pm2-runtime", "ecosystem.config.js"]