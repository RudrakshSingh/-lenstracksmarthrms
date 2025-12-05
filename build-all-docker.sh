#!/bin/bash
set -e

echo "=== Building All Docker Images ==="
echo ""

# Main application
echo "[1/22] Building main application..."
docker build -t lenstrack-app:latest -f Dockerfile . &
MAIN_PID=$!

# Microservices
SERVICES=(
  "auth-service"
  "hr-service"
  "attendance-service"
  "payroll-service"
  "crm-service"
  "analytics-service"
  "document-service"
  "inventory-service"
  "sales-service"
  "purchase-service"
  "prescription-service"
  "notification-service"
  "monitoring-service"
  "financial-service"
  "cpp-service"
  "jts-service"
  "service-management"
  "tenant-management-service"
  "tenant-registry-service"
  "realtime-service"
)

wait $MAIN_PID
echo "[1/22] ✓ Main application built"

# Build all microservices
for i in "${!SERVICES[@]}"; do
  SERVICE="${SERVICES[$i]}"
  NUM=$((i + 2))
  echo "[$NUM/22] Building $SERVICE..."
  docker build -t "$SERVICE:latest" -f "microservices/$SERVICE/Dockerfile" "microservices/$SERVICE" &
  PIDS[$i]=$!
done

# Wait for all builds
for PID in "${PIDS[@]}"; do
  wait $PID
done

echo ""
echo "=== All Docker images built successfully! ==="
docker images | grep -E "lenstrack-app|auth-service|hr-service|attendance-service|payroll-service|crm-service" | head -10
