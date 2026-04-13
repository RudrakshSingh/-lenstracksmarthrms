#!/bin/bash

###############################################################################
# Deploy to AWS via CloudShell
# Run this script in AWS CloudShell (not local terminal)
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

ACCOUNT_ID="383234048604"
REGION="ap-south-1"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

log "=========================================="
log "AWS Deployment via CloudShell"
log "=========================================="

# Install eksctl in CloudShell (if not already)
log "Installing eksctl..."
if ! command -v eksctl &> /dev/null; then
    curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
    sudo mv /tmp/eksctl /usr/local/bin
    log "✅ eksctl installed"
else
    log "✅ eksctl already installed"
fi

# Create cluster config
log "Creating cluster configuration..."
cat > /tmp/cluster-config.yaml <<EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: ${CLUSTER_NAME}
  region: ${REGION}
  version: "1.30"

managedNodeGroups:
  - name: main-workers
    instanceType: t3.medium
    desiredCapacity: 3
    minSize: 2
    maxSize: 10
    privateNetworking: false
    ssh:
      allow: false
    iam:
      withAddonPolicies:
        imageBuilder: true
        autoScaler: true
        albIngress: true
        cloudWatch: true

iam:
  withOIDC: true

cloudWatch:
  clusterLogging:
    enableTypes: ["*"]
EOF

# Create cluster
log "Creating EKS cluster (15-20 minutes)..."
log "Go get coffee ☕ this will take a while..."
eksctl create cluster -f /tmp/cluster-config.yaml

# Wait for cluster
log "Cluster created! Verifying..."
kubectl get nodes

# Create namespace
log "Creating namespace..."
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# Create ConfigMap
log "Creating ConfigMap..."
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: etelios-config
  namespace: ${NAMESPACE}
data:
  MONGODB_URI: "mongodb://admin:etelios123@mongodb.${NAMESPACE}.svc.cluster.local:27017/etelios?authSource=admin"
  NODE_ENV: "production"
  JWT_SECRET: "etelios-super-secret-jwt-key-2024"
  PORT: "3000"
EOF

# Deploy MongoDB
log "Deploying MongoDB..."
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongodb-pvc
  namespace: ${NAMESPACE}
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
  namespace: ${NAMESPACE}
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
          value: "admin"
        - name: MONGO_INITDB_ROOT_PASSWORD
          value: "etelios123"
        volumeMounts:
        - name: data
          mountPath: /data/db
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: mongodb-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb
  namespace: ${NAMESPACE}
spec:
  selector:
    app: mongodb
  ports:
  - port: 27017
EOF

log "Waiting for MongoDB..."
kubectl wait --for=condition=Available deployment/mongodb -n ${NAMESPACE} --timeout=300s || true

# Deploy services
log "Deploying services..."

SERVICES=(
  "auth-service"
  "hr-service"
  "payroll-service"
  "attendance-service"
  "analytics-service"
)

for SERVICE in "${SERVICES[@]}"; do
    log "Deploying ${SERVICE}..."
    
    kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${SERVICE}
  namespace: ${NAMESPACE}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ${SERVICE}
  template:
    metadata:
      labels:
        app: ${SERVICE}
    spec:
      containers:
      - name: ${SERVICE}
        image: ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/etelios-${SERVICE}:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: etelios-config
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "250m"
---
apiVersion: v1
kind: Service
metadata:
  name: ${SERVICE}
  namespace: ${NAMESPACE}
spec:
  selector:
    app: ${SERVICE}
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
EOF
    sleep 2
done

log "Waiting for services to start..."
sleep 60

log "=========================================="
log "✅ DEPLOYMENT COMPLETE!"
log "=========================================="
log ""
log "Check status:"
log "  kubectl get pods -n ${NAMESPACE}"
log "  kubectl get svc -n ${NAMESPACE}"
log ""
log "Get service URLs (wait 2-3 minutes for LoadBalancers):"
log "  kubectl get svc -n ${NAMESPACE} -o wide"
log ""
log "Test a service:"
log "  AUTH_URL=\$(kubectl get svc auth-service -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
log "  curl http://\${AUTH_URL}/health"
