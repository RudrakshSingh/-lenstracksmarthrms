#!/bin/bash

set -e

NAMESPACE="etelios-prod"
REGION="ap-south-1"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

echo "=========================================="
echo "Make Etelios Services Accessible on AWS"
echo "=========================================="
echo ""
log "As DevOps Engineer: Exposing all services via ALB"
echo ""

###############################################################################
# STEP 1: Check Current Status
###############################################################################

log "=========================================="
log "STEP 1: Checking Current Status"
log "=========================================="

# Check if ingress exists
if kubectl get ingress -n $NAMESPACE &>/dev/null; then
    log "✅ Ingress resources found"
    kubectl get ingress -n $NAMESPACE
else
    warning "No ingress resources found"
fi
echo ""

# Check ALB Ingress Controller
if kubectl get pods -n kube-system | grep -q aws-load-balancer-controller; then
    log "✅ ALB Ingress Controller is running"
else
    warning "⚠️  ALB Ingress Controller might not be running"
fi
echo ""

###############################################################################
# STEP 2: Create/Update Ingress Resource
###############################################################################

log "=========================================="
log "STEP 2: Creating Ingress for All Services"
log "=========================================="

# Create comprehensive ingress YAML
INGRESS_YAML="/tmp/etelios-ingress.yaml"

cat > $INGRESS_YAML <<'EOF'
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: etelios-api-ingress
  namespace: etelios-prod
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/healthcheck-interval-seconds: '30'
    alb.ingress.kubernetes.io/healthcheck-timeout-seconds: '5'
    alb.ingress.kubernetes.io/healthy-threshold-count: '2'
    alb.ingress.kubernetes.io/unhealthy-threshold-count: '3'
spec:
  rules:
  - http:
      paths:
      # Health check
      - path: /health
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 3001
      # Auth Service
      - path: /api/auth
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 3001
      # HR Service
      - path: /api/hr
        pathType: Prefix
        backend:
          service:
            name: hr-service
            port:
              number: 3002
      # Attendance Service
      - path: /api/attendance
        pathType: Prefix
        backend:
          service:
            name: attendance-service
            port:
              number: 3003
      # Payroll Service
      - path: /api/payroll
        pathType: Prefix
        backend:
          service:
            name: payroll-service
            port:
              number: 3004
      # CRM Service
      - path: /api/crm
        pathType: Prefix
        backend:
          service:
            name: crm-service
            port:
              number: 3005
      # Inventory Service
      - path: /api/inventory
        pathType: Prefix
        backend:
          service:
            name: inventory-service
            port:
              number: 3006
      # Sales Service
      - path: /api/sales
        pathType: Prefix
        backend:
          service:
            name: sales-service
            port:
              number: 3007
      # Purchase Service
      - path: /api/purchase
        pathType: Prefix
        backend:
          service:
            name: purchase-service
            port:
              number: 3008
      # Financial Service
      - path: /api/financial
        pathType: Prefix
        backend:
          service:
            name: financial-service
            port:
              number: 3009
      # Document Service
      - path: /api/document
        pathType: Prefix
        backend:
          service:
            name: document-service
            port:
              number: 3010
      # Service Management
      - path: /api/service
        pathType: Prefix
        backend:
          service:
            name: service-management
            port:
              number: 3011
      # CPP Service
      - path: /api/cpp
        pathType: Prefix
        backend:
          service:
            name: cpp-service
            port:
              number: 3012
      # Prescription Service
      - path: /api/prescription
        pathType: Prefix
        backend:
          service:
            name: prescription-service
            port:
              number: 3013
      # Analytics Service
      - path: /api/analytics
        pathType: Prefix
        backend:
          service:
            name: analytics-service
            port:
              number: 3014
      # Notification Service
      - path: /api/notification
        pathType: Prefix
        backend:
          service:
            name: notification-service
            port:
              number: 3015
      # Monitoring Service
      - path: /api/monitoring
        pathType: Prefix
        backend:
          service:
            name: monitoring-service
            port:
              number: 3016
      # Realtime Service
      - path: /api/realtime
        pathType: Prefix
        backend:
          service:
            name: realtime-service
            port:
              number: 3017
      # JTS Service
      - path: /api/jts
        pathType: Prefix
        backend:
          service:
            name: jts-service
            port:
              number: 3018
      # Tenant Management
      - path: /api/tenant-management
        pathType: Prefix
        backend:
          service:
            name: tenant-management-service
            port:
              number: 3019
      # Tenant Registry
      - path: /api/tenant-registry
        pathType: Prefix
        backend:
          service:
            name: tenant-registry-service
            port:
              number: 3020
EOF

log "Applying ingress configuration..."
kubectl apply -f $INGRESS_YAML

if [ $? -eq 0 ]; then
    log "✅ Ingress created/updated successfully"
else
    error "Failed to create ingress"
    exit 1
fi

echo ""

###############################################################################
# STEP 3: Wait for ALB to be Created
###############################################################################

log "=========================================="
log "STEP 3: Waiting for ALB to be Created"
log "=========================================="

log "Waiting for ALB to be provisioned (this takes 2-5 minutes)..."
log "Checking ingress status..."

for i in {1..30}; do
    ALB_URL=$(kubectl get ingress -n $NAMESPACE etelios-api-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
    
    if [ -n "$ALB_URL" ] && [ "$ALB_URL" != "null" ]; then
        log "✅ ALB created: $ALB_URL"
        break
    fi
    
    if [ $i -eq 1 ]; then
        log "Waiting for ALB (checking every 10 seconds)..."
    fi
    
    sleep 10
done

echo ""

###############################################################################
# STEP 4: Get ALB URL and Test
###############################################################################

log "=========================================="
log "STEP 4: Service Access Information"
log "=========================================="

ALB_URL=$(kubectl get ingress -n $NAMESPACE etelios-api-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")

if [ -n "$ALB_URL" ] && [ "$ALB_URL" != "null" ]; then
    echo ""
    log "✅ SUCCESS! Your services are now accessible!"
    echo ""
    log "🌐 Access Your Services:"
    echo ""
    info "Base URL: http://$ALB_URL"
    echo ""
    log "Service Endpoints:"
    echo "  • Auth:        http://$ALB_URL/api/auth"
    echo "  • HR:          http://$ALB_URL/api/hr"
    echo "  • Attendance:  http://$ALB_URL/api/attendance"
    echo "  • Payroll:     http://$ALB_URL/api/payroll"
    echo "  • CRM:         http://$ALB_URL/api/crm"
    echo "  • Inventory:   http://$ALB_URL/api/inventory"
    echo "  • Sales:        http://$ALB_URL/api/sales"
    echo "  • Purchase:     http://$ALB_URL/api/purchase"
    echo "  • Financial:   http://$ALB_URL/api/financial"
    echo "  • Document:    http://$ALB_URL/api/document"
    echo "  • Analytics:   http://$ALB_URL/api/analytics"
    echo ""
    log "Health Check:"
    echo "  http://$ALB_URL/health"
    echo ""
else
    warning "ALB is still being created. It takes 2-5 minutes."
    warning "Check status with:"
    echo "  kubectl get ingress -n $NAMESPACE etelios-api-ingress"
    echo ""
    warning "Once ALB is ready, you'll see the URL in the output above"
fi

echo ""

###############################################################################
# STEP 5: Check Pod Status
###############################################################################

log "=========================================="
log "STEP 5: Service Status"
log "=========================================="

RUNNING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')
TOTAL=$(kubectl get deployments -n $NAMESPACE --no-headers 2>/dev/null | wc -l | tr -d ' ')

log "Services Running: $RUNNING / $TOTAL"
echo ""

if [ "$RUNNING" -ge 15 ]; then
    log "✅ Most services are running!"
elif [ "$RUNNING" -gt 0 ]; then
    warning "Some services still starting. Wait a few minutes."
else
    error "Services not running yet. Run: ./fix-image-pull-and-run.sh first"
fi

echo ""
log "=========================================="
log "Next Steps:"
log "=========================================="
echo ""
log "1. Wait 2-5 minutes for ALB to be fully ready"
log "2. Access your services using the URLs above"
log "3. Update your frontend to point to: http://$ALB_URL"
log "4. Test endpoints: curl http://$ALB_URL/health"
echo ""
