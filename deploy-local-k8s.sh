#!/bin/bash

# Deploy Etelios Application to Local Kubernetes Cluster
# This script builds Docker images locally and deploys to Kubernetes

set -e

echo "🚀 Deploying Etelios to Local Kubernetes"
echo "============================================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed${NC}"
    echo "Please install kubectl: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Kubernetes cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${YELLOW}⚠️  Kubernetes cluster is not accessible${NC}"
    echo ""
    echo "Please start a local Kubernetes cluster:"
    echo "  - Docker Desktop: Enable Kubernetes in Settings > Kubernetes"
    echo "  - Minikube: minikube start"
    echo "  - Kind: kind create cluster"
    exit 1
fi

echo -e "${GREEN}✅ Kubernetes cluster is accessible${NC}"

# Set local image prefix
LOCAL_IMAGE_PREFIX="etelios-local"
NAMESPACE="etelios-backend-prod"

# Step 1: Create namespace
echo ""
echo "📦 Step 1: Creating namespace..."
kubectl apply -f k8s/namespace.yaml

# Step 2: Create ConfigMap
echo ""
echo "📦 Step 2: Creating ConfigMap..."
kubectl apply -f k8s/configmap.yaml

# Step 3: Create Secrets
echo ""
echo "📦 Step 3: Creating Secrets..."
if [ -f "k8s/secrets-local.yaml" ]; then
    echo "  Using local secrets file..."
    kubectl apply -f k8s/secrets-local.yaml
elif [ -f "k8s/secrets.yaml" ] && ! grep -q "<base64-encoded" k8s/secrets.yaml; then
    echo "  Using secrets.yaml..."
    kubectl apply -f k8s/secrets.yaml
else
    echo -e "${YELLOW}⚠️  Creating minimal secrets for local development...${NC}"
    kubectl create secret generic etelios-secrets \
        --from-literal=MONGO_URI="mongodb://mongodb-service:27017/etelios" \
        --from-literal=JWT_SECRET="local-dev-jwt-secret-change-in-production" \
        --from-literal=JWT_REFRESH_SECRET="local-dev-refresh-secret-change-in-production" \
        --from-literal=REDIS_HOST="redis-service" \
        --from-literal=REDIS_PORT="6379" \
        -n $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
fi

# Step 4: Build and load Docker images
echo ""
echo "🐳 Step 4: Building Docker images..."
echo "This may take a while..."

# Build API Gateway
echo "  Building API Gateway..."
docker build -t $LOCAL_IMAGE_PREFIX/api-gateway:latest -f Dockerfile .

# Build all microservices
SERVICES=(
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

for SERVICE in "${SERVICES[@]}"; do
    echo "  Building $SERVICE..."
    docker build -t $LOCAL_IMAGE_PREFIX/$SERVICE:latest -f microservices/$SERVICE/Dockerfile microservices/$SERVICE/
done

echo -e "${GREEN}✅ All images built${NC}"

# Step 5: Load images into Kubernetes (for Docker Desktop or minikube)
echo ""
echo "📤 Step 5: Loading images into Kubernetes..."

# Check if we're using Docker Desktop or minikube
if kubectl get nodes -o jsonpath='{.items[0].metadata.name}' | grep -q "docker-desktop\|minikube"; then
    # For Docker Desktop, images are already available
    echo "  Using Docker Desktop - images are available"
elif command -v minikube &> /dev/null; then
    echo "  Loading images into minikube..."
    minikube image load $LOCAL_IMAGE_PREFIX/api-gateway:latest
    for SERVICE in "${SERVICES[@]}"; do
        minikube image load $LOCAL_IMAGE_PREFIX/$SERVICE:latest
    done
else
    echo -e "${YELLOW}⚠️  Could not determine Kubernetes type. Images should be available if using Docker Desktop.${NC}"
fi

# Step 6: Update manifests to use local images
echo ""
echo "📝 Step 6: Updating manifests for local deployment..."

# Create temporary directory for modified manifests
TEMP_DIR=$(mktemp -d)
cp -r k8s $TEMP_DIR/

# Replace ACR images with local images in all YAML files
find $TEMP_DIR/k8s -name "*.yaml" -type f -exec sed -i '' "s|eteliosacr-hvawabdbgge7e0fu.azurecr.io/|$LOCAL_IMAGE_PREFIX/|g" {} \;
find $TEMP_DIR/k8s -name "*.yaml" -type f -exec sed -i '' "s|imagePullPolicy: Always|imagePullPolicy: IfNotPresent|g" {} \;

# Step 7: Deploy MongoDB and Redis
echo ""
echo "📦 Step 7: Deploying MongoDB and Redis..."
if [ -f "k8s/mongodb.yaml" ]; then
    kubectl apply -f $TEMP_DIR/k8s/mongodb.yaml
fi
if [ -f "k8s/redis.yaml" ]; then
    kubectl apply -f $TEMP_DIR/k8s/redis.yaml
fi

# Step 8: Deploy API Gateway
echo ""
echo "📦 Step 8: Deploying API Gateway..."
kubectl apply -f $TEMP_DIR/k8s/api-gateway.yaml

# Step 9: Deploy all microservices
echo ""
echo "📦 Step 9: Deploying microservices..."
kubectl apply -f $TEMP_DIR/k8s/deployments/

# Step 10: Wait for deployments
echo ""
echo "⏳ Step 10: Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment --all -n $NAMESPACE || true

# Step 11: Show status
echo ""
echo "📊 Deployment Status:"
echo "============================================================"
kubectl get deployments -n $NAMESPACE
echo ""
kubectl get services -n $NAMESPACE
echo ""
kubectl get pods -n $NAMESPACE

# Step 12: Port forward instructions
echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📋 Next Steps:"
echo "============================================================"
echo "1. Port forward to access API Gateway:"
echo "   kubectl port-forward -n $NAMESPACE svc/api-gateway 3000:3000"
echo ""
echo "2. Access the API at: http://localhost:3000"
echo ""
echo "3. Check logs:"
echo "   kubectl logs -n $NAMESPACE -l app=api-gateway -f"
echo ""
echo "4. Delete deployment:"
echo "   kubectl delete namespace $NAMESPACE"

# Cleanup
rm -rf $TEMP_DIR

echo ""
echo -e "${GREEN}🎉 Done!${NC}"

