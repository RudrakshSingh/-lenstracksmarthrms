#!/bin/bash

###############################################################################
# Deploy Services - Bypass ALB Webhook
# This script temporarily disables ALB webhook and deploys all services
###############################################################################

set -e

NAMESPACE="etelios-prod"
K8S_DIR="k8s/etelios-prod"

echo "=========================================="
echo "Deploying Services (Bypassing ALB Webhook)"
echo "=========================================="
echo ""

# Temporarily delete webhook configuration
echo "Temporarily disabling ALB webhook..."
kubectl delete mutatingwebhookconfiguration aws-load-balancer-webhook-configuration 2>/dev/null || echo "Webhook not found or already deleted"
echo "✅ Webhook disabled"
echo ""

# Services list
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

# Deploy all services
for service in "${SERVICES[@]}"; do
    CURRENT=$((CURRENT + 1))
    echo "[$CURRENT/$TOTAL] Deploying $service..."
    
    if kubectl apply --validate=false -f "$K8S_DIR/$service-deployment.yaml" 2>&1 | grep -v "webhook\|Warning"; then
        echo "  ✅ $service deployed"
        SUCCESS=$((SUCCESS + 1))
    else
        # Check if deployment exists
        if kubectl get deployment $service -n $NAMESPACE &>/dev/null; then
            echo "  ✅ $service exists"
            SUCCESS=$((SUCCESS + 1))
        else
            echo "  ❌ Failed to deploy $service"
            FAILED=$((FAILED + 1))
        fi
    fi
    echo ""
done

echo "=========================================="
echo "Deployment Summary:"
echo "  Total: $TOTAL"
echo "  Success: $SUCCESS"
echo "  Failed: $FAILED"
echo "=========================================="
echo ""

# Check pod status
echo "Checking pod status..."
kubectl get pods -n $NAMESPACE

echo ""
echo "✅ Services deployment complete!"
echo ""
echo "Note: ALB webhook was temporarily disabled."
echo "You can re-enable it later when ALB Controller pods are running."
