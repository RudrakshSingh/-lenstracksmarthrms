#!/bin/bash
set -e

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
  "jts-service"
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

TOTAL=${#SERVICES[@]}
CURRENT=0
SUCCESS=0
FAILED=0

echo "=========================================="
echo "Building $TOTAL microservice Docker images"
echo "This will take approximately 60-100 minutes"
echo "=========================================="
echo ""

for service in "${SERVICES[@]}"; do
  CURRENT=$((CURRENT + 1))
  echo "[$CURRENT/$TOTAL] Building $service..."
  
  if docker build -t "etelios-$service:latest" -f "$service/Dockerfile" "$service" > "/tmp/docker-build-$service.log" 2>&1; then
    echo "✓ $service built successfully"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "✗ $service build FAILED (check /tmp/docker-build-$service.log)"
    FAILED=$((FAILED + 1))
  fi
  echo ""
done

echo "=========================================="
echo "Build Summary:"
echo "  Total: $TOTAL"
echo "  Success: $SUCCESS"
echo "  Failed: $FAILED"
echo "=========================================="
