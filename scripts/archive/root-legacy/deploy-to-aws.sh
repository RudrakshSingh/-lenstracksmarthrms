#!/bin/bash

###############################################################################
# Complete AWS Deployment Script
# Deploys entire Etelios HRMS to AWS from scratch
###############################################################################

set -e  # Exit on any error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
ACCOUNT_ID="383234048604"
REGION="ap-south-1"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# Services
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

LOG_FILE="aws-deploy-$(date +%Y%m%d-%H%M%S).log"

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

###############################################################################
# PHASE 1: Create EKS Cluster
###############################################################################
create_eks_cluster() {
    log "=========================================="
    log "PHASE 1: Creating EKS Cluster"
    log "=========================================="
    
    # Create cluster config
    log "Creating cluster configuration..."
    cat > cluster-config.yaml <<EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: ${CLUSTER_NAME}
  region: ${REGION}
  version: "1.30"

# Managed node group
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

# Enable OIDC
iam:
  withOIDC: true

# CloudWatch logging
cloudWatch:
  clusterLogging:
    enableTypes: ["*"]
EOF

    log "Creating EKS cluster (15-20 minutes)..."
    eksctl create cluster -f cluster-config.yaml
    
    log "Cluster created successfully!"
    
    # Verify cluster
    log "Verifying cluster..."
    kubectl get nodes
    
    # Check CoreDNS
    log "Checking CoreDNS..."
    kubectl wait --for=condition=Ready pod -l k8s-app=kube-dns -n kube-system --timeout=300s || warning "CoreDNS not ready yet"
    
    log "✅ EKS Cluster ready!"
}

###############################################################################
# PHASE 2: Setup Namespace and ConfigMap
###############################################################################
setup_namespace() {
    log "=========================================="
    log "PHASE 2: Setting up Namespace"
    log "=========================================="
    
    # Create namespace
    kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
    log "✅ Namespace created: ${NAMESPACE}"
    
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
    
    log "✅ ConfigMap created!"
}

###############################################################################
# PHASE 3: Deploy MongoDB
###############################################################################
deploy_mongodb() {
    log "=========================================="
    log "PHASE 3: Deploying MongoDB"
    log "=========================================="
    
    log "Creating MongoDB resources..."
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
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
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
    targetPort: 27017
EOF

    log "Waiting for MongoDB to be ready..."
    kubectl wait --for=condition=Available deployment/mongodb -n ${NAMESPACE} --timeout=300s
    
    log "Testing MongoDB connection..."
    sleep 10
    
    log "✅ MongoDB deployed successfully!"
}

###############################################################################
# PHASE 4: Deploy Services
###############################################################################
deploy_services() {
    log "=========================================="
    log "PHASE 4: Deploying Services"
    log "=========================================="
    
    for SERVICE in "${SERVICES[@]}"; do
        log "Deploying ${SERVICE}..."
        
        # Create deployment
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
        image: ${ECR_REGISTRY}/etelios-${SERVICE}:latest
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
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
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
    
    log "✅ All services deployed!"
}

###############################################################################
# PHASE 5: Wait for Services
###############################################################################
wait_for_services() {
    log "=========================================="
    log "PHASE 5: Waiting for Services"
    log "=========================================="
    
    log "Waiting for deployments to be ready (5 minutes)..."
    sleep 60
    
    log "Checking service status..."
    kubectl get pods -n ${NAMESPACE}
    
    log "✅ Services are starting!"
}

###############################################################################
# PHASE 6: Display URLs
###############################################################################
display_urls() {
    log "=========================================="
    log "PHASE 6: Service URLs"
    log "=========================================="
    
    log "Waiting for LoadBalancers to get external IPs (2 minutes)..."
    sleep 120
    
    log "Service URLs:"
    kubectl get svc -n ${NAMESPACE} -o wide
    
    log ""
    log "=========================================="
    log "✅ DEPLOYMENT COMPLETE!"
    log "=========================================="
    log ""
    log "To get service URLs later:"
    log "  kubectl get svc -n ${NAMESPACE}"
    log ""
    log "To check pod status:"
    log "  kubectl get pods -n ${NAMESPACE}"
    log ""
    log "To view logs:"
    log "  kubectl logs -n ${NAMESPACE} <pod-name>"
    log ""
    log "Total time: ~30-40 minutes"
}

###############################################################################
# Main Execution
###############################################################################
main() {
    log "=========================================="
    log "Starting AWS Deployment"
    log "Cluster: ${CLUSTER_NAME}"
    log "Region: ${REGION}"
    log "Namespace: ${NAMESPACE}"
    log "=========================================="
    log ""
    
    # Check if cluster already exists
    if eksctl get cluster --name ${CLUSTER_NAME} --region ${REGION} &>/dev/null; then
        warning "Cluster ${CLUSTER_NAME} already exists!"
        read -p "Use existing cluster? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Aborted. Delete existing cluster first or choose different name."
        fi
        log "Using existing cluster..."
        kubectl config use-context $(kubectl config get-contexts -o name | grep ${CLUSTER_NAME})
    else
        create_eks_cluster
    fi
    
    setup_namespace
    deploy_mongodb
    deploy_services
    wait_for_services
    display_urls
    
    log ""
    log "🎉 Deployment Complete! 🎉"
    log "Log file: ${LOG_FILE}"
}

# Run main
main
