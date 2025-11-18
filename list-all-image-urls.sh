#!/bin/bash
# Script to list all microservice image URLs

echo "=========================================="
echo "Etelios Microservice Image URLs"
echo "=========================================="
echo ""

echo "📦 MAIN API GATEWAY"
echo "   Registry: eteliosacr-hvawabdbgge7e0fu.azurecr.io"
echo "   Image: eteliosacr-hvawabdbgge7e0fu.azurecr.io/eteliosbackend:latest"
echo ""

echo "📦 MICROSERVICES (eteliosregistry.azurecr.io)"
echo ""

services=(
  "auth-service"
  "hr-service"
  "attendance-service"
  "payroll-service"
  "crm-service"
  "inventory-service"
  "sales-service"
  "purchase-service"
  "financial-service"
  "document-service"
  "service-management"
  "cpp-service"
  "prescription-service"
  "analytics-service"
  "notification-service"
  "monitoring-service"
  "tenant-registry-service"
  "realtime-service"
)

for service in "${services[@]}"; do
  echo "   • ${service}"
  echo "     eteliosregistry.azurecr.io/${service}:latest"
  echo ""
done

echo "=========================================="
echo "Total: 19 services (1 gateway + 18 microservices)"
echo "=========================================="
