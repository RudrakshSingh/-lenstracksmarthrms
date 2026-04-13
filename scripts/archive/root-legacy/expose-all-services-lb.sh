#!/bin/bash

set -e

NAMESPACE="etelios-prod"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

echo "=========================================="
echo "Expose Services via LoadBalancer"
echo "=========================================="
echo ""
log "Creating LoadBalancer services for external access"
echo ""

# Create LoadBalancer for auth-service (main entry point)
log "Creating LoadBalancer for auth-service..."

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: auth-service-lb
  namespace: $NAMESPACE
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
spec:
  type: LoadBalancer
  selector:
    app: auth-service
  ports:
  - name: http
    port: 80
    targetPort: 3001
    protocol: TCP
EOF

log "✅ Auth service LoadBalancer created"
echo ""

# Create LoadBalancer for hr-service
log "Creating LoadBalancer for hr-service..."

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: hr-service-lb
  namespace: $NAMESPACE
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
spec:
  type: LoadBalancer
  selector:
    app: hr-service
  ports:
  - name: http
    port: 80
    targetPort: 3002
    protocol: TCP
EOF

log "✅ HR service LoadBalancer created"
echo ""

# Wait for LoadBalancers to get external IPs
log "Waiting for LoadBalancers to get external URLs (60 seconds)..."
sleep 60

# Get LoadBalancer URLs
AUTH_LB=$(kubectl get service auth-service-lb -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
HR_LB=$(kubectl get service hr-service-lb -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")

echo ""
log "=========================================="
log "🌐 Your Services Are Now Accessible!"
log "=========================================="
echo ""

if [ -n "$AUTH_LB" ] && [ "$AUTH_LB" != "null" ]; then
    log "✅ Auth Service:"
    echo "   http://$AUTH_LB"
    echo "   http://$AUTH_LB/api/auth/login"
    echo "   http://$AUTH_LB/health"
    echo ""
else
    info "⏳ Auth LoadBalancer URL: Generating (check in 2-3 minutes)"
    echo "   kubectl get service auth-service-lb -n $NAMESPACE"
    echo ""
fi

if [ -n "$HR_LB" ] && [ "$HR_LB" != "null" ]; then
    log "✅ HR Service:"
    echo "   http://$HR_LB"
    echo "   http://$HR_LB/api/hr/employees"
    echo ""
else
    info "⏳ HR LoadBalancer URL: Generating (check in 2-3 minutes)"
    echo "   kubectl get service hr-service-lb -n $NAMESPACE"
    echo ""
fi

log "=========================================="
log "Test Your Services:"
log "=========================================="
echo ""

if [ -n "$AUTH_LB" ] && [ "$AUTH_LB" != "null" ]; then
    log "Health Check:"
    echo "   curl http://$AUTH_LB/health"
    echo ""
    log "Login Endpoint:"
    echo "   curl -X POST http://$AUTH_LB/api/auth/login \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -H 'X-Tenant-Id: your-tenant-id' \\"
    echo "     -d '{\"emailOrEmployeeId\": \"user@example.com\", \"password\": \"password\"}'"
    echo ""
fi

log "=========================================="
log "Update Frontend:"
log "=========================================="
echo ""
log "Update your frontend .env file:"
if [ -n "$AUTH_LB" ] && [ "$AUTH_LB" != "null" ]; then
    echo "   REACT_APP_API_URL=http://$AUTH_LB"
    echo "   VITE_API_URL=http://$AUTH_LB"
else
    echo "   Get URL with: kubectl get service auth-service-lb -n $NAMESPACE"
fi
echo ""

log "✅ Services are now accessible like Azure!"
echo ""

# Show all services
log "All Services:"
kubectl get services -n $NAMESPACE -o wide | grep -E "NAME|LoadBalancer" || kubectl get services -n $NAMESPACE

echo ""
