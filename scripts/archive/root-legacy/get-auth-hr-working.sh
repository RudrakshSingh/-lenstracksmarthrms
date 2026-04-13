#!/bin/bash

set -e

NAMESPACE="etelios-prod"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "=========================================="
echo "Get Auth & HR Services Working"
echo "=========================================="
echo ""
log "Focus: सिर्फ 2 main services (Azure जैसा)"
echo ""

###############################################################################
# STEP 1: Check MongoDB Status
###############################################################################

log "=========================================="
log "STEP 1: Verify MongoDB is Running"
log "=========================================="

MONGODB_READY=$(kubectl get pod -n $NAMESPACE -l app=mongodb -o jsonpath='{.status.containerStatuses[0].ready}' 2>/dev/null)

if [ "$MONGODB_READY" == "true" ]; then
    log "✅ MongoDB is ready"
else
    warning "MongoDB not ready. Waiting..."
    kubectl wait --for=condition=Ready pod -l app=mongodb -n $NAMESPACE --timeout=120s || warning "MongoDB still starting..."
fi

MONGODB_POD=$(kubectl get pods -n $NAMESPACE -l app=mongodb -o name | cut -d'/' -f2)
log "MongoDB Pod: $MONGODB_POD"
echo ""

###############################################################################
# STEP 2: Update ConfigMap with Simple MongoDB Connection
###############################################################################

log "=========================================="
log "STEP 2: Configure Simple MongoDB Connection"
log "=========================================="

# Use simple connection - no DNS needed, direct service name
MONGODB_URI="mongodb://etelios_admin:etelios_password_change_this@mongodb:27017/etelios-db?authSource=admin"

kubectl delete configmap etelios-config -n $NAMESPACE 2>/dev/null || true

kubectl create configmap etelios-config -n $NAMESPACE \
  --from-literal=MONGODB_URI="$MONGODB_URI" \
  --from-literal=MONGO_URI="$MONGODB_URI" \
  --from-literal=DB_NAME=etelios-db \
  --from-literal=NODE_ENV=production \
  --from-literal=PORT=3001 \
  --from-literal=STORAGE_PROVIDER=local \
  --from-literal=USE_KEY_VAULT=false \
  --from-literal=CORS_ORIGIN="*" \
  --from-literal=JWT_SECRET=etelios-super-secret-jwt-key-production \
  --from-literal=JWT_EXPIRATION=24h \
  --from-literal=REFRESH_TOKEN_EXPIRATION=7d \
  --from-literal=LOG_LEVEL=info

log "✅ ConfigMap created with simple MongoDB connection"
echo ""

###############################################################################
# STEP 3: Focus on Auth & HR Services Only
###############################################################################

log "=========================================="
log "STEP 3: Update Auth & HR Services"
log "=========================================="

# Scale down all other services
log "Scaling down other services to save resources..."
for service in analytics attendance cpp crm document financial inventory jts monitoring notification payroll prescription purchase realtime sales service-management tenant-management tenant-registry; do
    kubectl scale deployment ${service}-service -n $NAMESPACE --replicas=0 &>/dev/null || true
done

# Scale auth and hr to 1 replica
log "Scaling auth and hr to 1 replica..."
kubectl scale deployment auth-service -n $NAMESPACE --replicas=1 &>/dev/null
kubectl scale deployment hr-service -n $NAMESPACE --replicas=1 &>/dev/null

# Update auth service
log "Updating auth-service..."
kubectl set env deployment/auth-service -n $NAMESPACE --from=configmap/etelios-config &>/dev/null
kubectl set env deployment/auth-service -n $NAMESPACE PORT=3001 SERVICE_NAME=auth-service &>/dev/null

# Update hr service  
log "Updating hr-service..."
kubectl set env deployment/hr-service -n $NAMESPACE --from=configmap/etelios-config &>/dev/null
kubectl set env deployment/hr-service -n $NAMESPACE PORT=3002 SERVICE_NAME=hr-service &>/dev/null

log "✅ Auth & HR configured"
echo ""

###############################################################################
# STEP 4: Delete and Recreate Pods
###############################################################################

log "=========================================="
log "STEP 4: Restarting Auth & HR Pods"
log "=========================================="

kubectl delete pods -n $NAMESPACE -l app=auth-service --force --grace-period=0 &>/dev/null || true
kubectl delete pods -n $NAMESPACE -l app=hr-service --force --grace-period=0 &>/dev/null || true

log "✅ Pods deleted, recreating..."
echo ""

log "Waiting 2 minutes for pods to start and connect to MongoDB..."
sleep 120

###############################################################################
# STEP 5: Check Status
###############################################################################

log "=========================================="
log "STEP 5: Status Check"
log "=========================================="

echo ""
log "Auth Service:"
kubectl get pods -n $NAMESPACE -l app=auth-service
AUTH_READY=$(kubectl get pods -n $NAMESPACE -l app=auth-service -o jsonpath='{.items[0].status.containerStatuses[0].ready}' 2>/dev/null)

echo ""
log "HR Service:"
kubectl get pods -n $NAMESPACE -l app=hr-service
HR_READY=$(kubectl get pods -n $NAMESPACE -l app=hr-service -o jsonpath='{.items[0].status.containerStatuses[0].ready}' 2>/dev/null)

echo ""

###############################################################################
# STEP 6: Test Services
###############################################################################

log "=========================================="
log "STEP 6: Testing Services"
log "=========================================="

echo ""
log "Testing Auth Service..."
echo "  URL: http://a0adb495fa82c42bfafa50a3552b78dd-1883230600.ap-south-1.elb.amazonaws.com/health"

AUTH_RESPONSE=$(curl -s --max-time 10 http://a0adb495fa82c42bfafa50a3552b78dd-1883230600.ap-south-1.elb.amazonaws.com/health 2>&1)

if [ -n "$AUTH_RESPONSE" ] && [ "$AUTH_RESPONSE" != "Empty reply from server" ]; then
    log "✅ Auth Service Response: $AUTH_RESPONSE"
else
    warning "Auth service not responding yet"
    log "Check logs:"
    kubectl logs -n $NAMESPACE -l app=auth-service --tail=20 2>&1 | head -n 20
fi

echo ""
log "Testing HR Service..."
echo "  URL: http://a92564b536d23459880ac316b0bf9062-849640911.ap-south-1.elb.amazonaws.com/health"

HR_RESPONSE=$(curl -s --max-time 10 http://a92564b536d23459880ac316b0bf9062-849640911.ap-south-1.elb.amazonaws.com/health 2>&1)

if [ -n "$HR_RESPONSE" ] && [ "$HR_RESPONSE" != "Empty reply from server" ]; then
    log "✅ HR Service Response: $HR_RESPONSE"
else
    warning "HR service not responding yet"
fi

echo ""

###############################################################################
# FINAL STATUS
###############################################################################

log "=========================================="
log "FINAL STATUS"
log "=========================================="

echo ""

if [ "$AUTH_READY" == "true" ] && [ "$HR_READY" == "true" ]; then
    log "🎉 SUCCESS! Auth & HR services are ready!"
    echo ""
    log "Your URLs:"
    echo "  Auth: http://a0adb495fa82c42bfafa50a3552b78dd-1883230600.ap-south-1.elb.amazonaws.com"
    echo "  HR:   http://a92564b536d23459880ac316b0bf9062-849640911.ap-south-1.elb.amazonaws.com"
    echo ""
    log "✅ Migration Complete (Same as Azure: 2 services)"
elif [ "$AUTH_READY" == "true" ] || [ "$HR_READY" == "true" ]; then
    warning "1 service ready, 1 still starting"
    warning "Wait 2-3 more minutes"
else
    warning "Services not ready yet"
    warning "Check pod logs for errors:"
    echo "  kubectl logs -n $NAMESPACE -l app=auth-service"
    echo "  kubectl logs -n $NAMESPACE -l app=hr-service"
fi

echo ""
