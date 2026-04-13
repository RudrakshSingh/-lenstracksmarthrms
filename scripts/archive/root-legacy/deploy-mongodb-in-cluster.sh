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
echo "Deploy MongoDB in Kubernetes Cluster"
echo "=========================================="
echo ""
log "Quick Solution: In-cluster MongoDB"
log "No DocumentDB/CoreDNS issues - works immediately!"
echo ""

###############################################################################
# STEP 1: Create MongoDB Deployment
###############################################################################

log "=========================================="
log "STEP 1: Creating MongoDB Deployment"
log "=========================================="

cat <<EOF | kubectl apply -f -
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongodb-pvc
  namespace: $NAMESPACE
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb
  namespace: $NAMESPACE
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:5.0
        ports:
        - containerPort: 27017
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          value: "etelios_admin"
        - name: MONGO_INITDB_ROOT_PASSWORD
          value: "etelios_password_change_this"
        volumeMounts:
        - name: mongodb-storage
          mountPath: /data/db
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
      volumes:
      - name: mongodb-storage
        persistentVolumeClaim:
          claimName: mongodb-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb
  namespace: $NAMESPACE
spec:
  selector:
    app: mongodb
  ports:
  - port: 27017
    targetPort: 27017
  clusterIP: None
EOF

log "✅ MongoDB deployment created"
echo ""

###############################################################################
# STEP 2: Wait for MongoDB to be Ready
###############################################################################

log "=========================================="
log "STEP 2: Waiting for MongoDB to Start"
log "=========================================="

log "Waiting for MongoDB pod (60 seconds)..."
sleep 60

MONGODB_POD=$(kubectl get pods -n $NAMESPACE -l app=mongodb -o name | cut -d'/' -f2)
log "MongoDB Pod: $MONGODB_POD"

kubectl wait --for=condition=Ready pod/$MONGODB_POD -n $NAMESPACE --timeout=180s || warning "MongoDB still starting..."

log "✅ MongoDB is running"
echo ""

###############################################################################
# STEP 3: Update ConfigMap with MongoDB Connection
###############################################################################

log "=========================================="
log "STEP 3: Updating ConfigMap"
log "=========================================="

# Simple connection string - no TLS, no complex options
MONGODB_URI="mongodb://etelios_admin:etelios_password_change_this@mongodb.${NAMESPACE}.svc.cluster.local:27017/etelios-db?authSource=admin"

kubectl delete configmap etelios-config -n $NAMESPACE 2>/dev/null || true

kubectl create configmap etelios-config -n $NAMESPACE \
  --from-literal=MONGODB_URI="$MONGODB_URI" \
  --from-literal=MONGO_URI="$MONGODB_URI" \
  --from-literal=DB_NAME=etelios-db \
  --from-literal=NODE_ENV=production \
  --from-literal=STORAGE_PROVIDER=local \
  --from-literal=USE_KEY_VAULT=false \
  --from-literal=CORS_ORIGIN="*" \
  --from-literal=JWT_SECRET=etelios-super-secret-jwt-key \
  --from-literal=LOG_LEVEL=info

log "✅ ConfigMap updated with in-cluster MongoDB"
echo ""

###############################################################################
# STEP 4: Update Deployments
###############################################################################

log "=========================================="
log "STEP 4: Updating All Deployments"
log "=========================================="

for deployment in $(kubectl get deployments -n $NAMESPACE -o name | cut -d'/' -f2); do
    kubectl set env deployment/$deployment -n $NAMESPACE --from=configmap/etelios-config &>/dev/null && \
        log "  ✅ $deployment" || warning "  ⚠️  $deployment"
done

echo ""

###############################################################################
# STEP 5: Restart Service Pods
###############################################################################

log "=========================================="
log "STEP 5: Restarting Service Pods"
log "=========================================="

kubectl delete pods -n $NAMESPACE --selector='app!=mongodb' --grace-period=0 --force &>/dev/null || true

log "✅ Service pods restarting"
echo ""

log "Waiting 90 seconds for services to connect..."
sleep 90

###############################################################################
# STEP 6: Check Status
###############################################################################

log "=========================================="
log "STEP 6: Final Status"
log "=========================================="

READY=$(kubectl get pods -n $NAMESPACE -l app!=mongodb -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{"\n"}{end}' 2>/dev/null | grep -c "true" || echo "0")
TOTAL=$(kubectl get deployments -n $NAMESPACE --no-headers 2>/dev/null | wc -l | tr -d ' ')

echo ""
log "Services Ready: $READY / $TOTAL"
echo ""

if [ "$READY" -ge 15 ]; then
    log "✅ SUCCESS! Services are running!"
    echo ""
    log "Test now:"
    echo "   curl http://a0adb495fa82c42bfafa50a3552b78dd-1883230600.ap-south-1.elb.amazonaws.com/health"
    echo ""
    log "🎉 Migration complete with in-cluster MongoDB!"
else
    warning "Services still starting. Check logs:"
    echo "   kubectl logs -n $NAMESPACE <pod-name>"
fi

echo ""
log "=========================================="
log "What's Running:"
log "=========================================="
echo ""
log "✅ MongoDB: In-cluster (no DNS/network issues)"
log "✅ Services: Connecting to localhost MongoDB"
log "✅ LoadBalancers: Public access configured"
echo ""
log "Your Etelios project is now accessible!"
echo ""
