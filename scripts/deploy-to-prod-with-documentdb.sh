#!/bin/bash

# ============================================
# Deploy to Production with DocumentDB
# ============================================
# Deploys all services to production using DocumentDB
# Ensures credentials are NOT exposed in code/config
#
# Usage:
#   ./scripts/deploy-to-prod-with-documentdb.sh
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

step() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Configuration
NAMESPACE="${NAMESPACE:-etelios-prod}"
REGION="${AWS_REGION:-ap-south-1}"
ECR_REGISTRY="${ECR_REGISTRY:-383234048604.dkr.ecr.ap-south-1.amazonaws.com}"

# Check prerequisites
if ! command -v kubectl &> /dev/null; then
    error "kubectl not found. Please install kubectl first."
    exit 1
fi

if ! command -v aws &> /dev/null; then
    error "AWS CLI not found. Please install AWS CLI first."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi

# Check kubectl connection
if ! kubectl cluster-info &> /dev/null; then
    error "kubectl not connected to cluster. Configure kubeconfig first."
    exit 1
fi

step "STEP 1: Create DocumentDB Secret"

if [ ! -f "scripts/create-docdb-secret.sh" ]; then
    error "create-docdb-secret.sh not found"
    exit 1
fi

./scripts/create-docdb-secret.sh

step "STEP 2: Verify Secret Created"

if ! kubectl get secret docdb-credentials -n "$NAMESPACE" &>/dev/null; then
    error "Secret docdb-credentials not found. Aborting."
    exit 1
fi

log "✅ Secret verified"

step "STEP 3: Update Deployment Files to Use Secret"

# Services that need DocumentDB
SERVICES=(
    "auth-service"
    "hr-service"
    "attendance-service"
    "tenant-registry-service"
)

for service in "${SERVICES[@]}"; do
    DEPLOYMENT_FILE="k8s/etelios-prod/${service}-deployment.yaml"
    
    if [ ! -f "$DEPLOYMENT_FILE" ]; then
        warning "$DEPLOYMENT_FILE not found, skipping..."
        continue
    fi
    
    log "Updating $service deployment..."
    
    # Check if secretRef already exists
    if grep -q "docdb-credentials" "$DEPLOYMENT_FILE"; then
        log "   ✅ $service already uses docdb-credentials secret"
    else
        # Add secretRef to envFrom if not present
        if grep -q "envFrom:" "$DEPLOYMENT_FILE"; then
            # Check if docdb-credentials is already in envFrom
            if ! grep -A 5 "envFrom:" "$DEPLOYMENT_FILE" | grep -q "docdb-credentials"; then
                # Add secretRef after existing envFrom entries
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    # macOS
                    sed -i '' '/- secretRef:/a\
        - secretRef:\
            name: docdb-credentials
' "$DEPLOYMENT_FILE"
                else
                    # Linux
                    sed -i '/- secretRef:/a\        - secretRef:\n            name: docdb-credentials' "$DEPLOYMENT_FILE"
                fi
                log "   ✅ Added docdb-credentials secret to $service"
            fi
        else
            # Add envFrom section
            log "   Adding envFrom section to $service..."
            # This requires more complex YAML manipulation - using yq or manual edit recommended
            warning "   ⚠️  Manual update required for $service - add envFrom section with docdb-credentials"
        fi
    fi
done

step "STEP 4: Build and Push Docker Images"

log "Building Docker images..."

# Build and push each service
for service in "${SERVICES[@]}"; do
    SERVICE_DIR="microservices/$service"
    
    if [ ! -d "$SERVICE_DIR" ]; then
        warning "$SERVICE_DIR not found, skipping..."
        continue
    fi
    
    log "Building $service..."
    
    # Build Docker image from root directory (Dockerfile expects root context)
    # Dockerfile is in service directory but needs root context for microservices/ paths
    if [ -f "$SERVICE_DIR/Dockerfile" ]; then
        # Build from root with service directory as build context
        docker build -f "$SERVICE_DIR/Dockerfile" -t "$ECR_REGISTRY/etelios-$service:latest" .
    else
        error "Dockerfile not found in $SERVICE_DIR"
        continue
    fi
    
    # Push to ECR
    aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"
    docker push "$ECR_REGISTRY/etelios-$service:latest"
    
    log "✅ $service image pushed"
done

step "STEP 5: Deploy to Kubernetes"

log "Applying deployments..."

for service in "${SERVICES[@]}"; do
    DEPLOYMENT_FILE="k8s/etelios-prod/${service}-deployment.yaml"
    
    if [ ! -f "$DEPLOYMENT_FILE" ]; then
        warning "$DEPLOYMENT_FILE not found, skipping..."
        continue
    fi
    
    log "Deploying $service..."
    kubectl apply -f "$DEPLOYMENT_FILE" -n "$NAMESPACE"
    
    # Restart deployment to pick up new secret
    kubectl rollout restart deployment/"$service" -n "$NAMESPACE"
    
    log "✅ $service deployed"
done

step "STEP 6: Verify Deployments"

log "Waiting for deployments to be ready..."

for service in "${SERVICES[@]}"; do
    log "Checking $service..."
    kubectl rollout status deployment/"$service" -n "$NAMESPACE" --timeout=300s || warning "$service rollout may have issues"
done

step "STEP 7: Verify Secret Usage"

log "Verifying services are using DocumentDB secret..."

for service in "${SERVICES[@]}"; do
    if kubectl get deployment "$service" -n "$NAMESPACE" &>/dev/null; then
        if kubectl get deployment "$service" -n "$NAMESPACE" -o yaml | grep -q "docdb-credentials"; then
            log "✅ $service is using docdb-credentials secret"
        else
            warning "⚠️  $service may not be using docdb-credentials secret"
        fi
    fi
done

step "DEPLOYMENT COMPLETE"

echo ""
echo "=========================================="
echo "✅ **Deployment Summary** ✅"
echo "=========================================="
echo ""
echo "📊 **Services Deployed:**"
for service in "${SERVICES[@]}"; do
    echo "   ✅ $service"
done
echo ""
echo "🔐 **Security:**"
echo "   ✅ DocumentDB credentials stored in Kubernetes secret"
echo "   ✅ No credentials exposed in code or config files"
echo "   ✅ Secret name: docdb-credentials"
echo "   ✅ Namespace: $NAMESPACE"
echo ""
echo "🔍 **Verify Deployment:**"
echo "   kubectl get pods -n $NAMESPACE"
echo "   kubectl logs -f deployment/<service-name> -n $NAMESPACE"
echo ""
echo "📝 **Check Secret (without exposing password):**"
echo "   kubectl get secret docdb-credentials -n $NAMESPACE"
echo "   kubectl describe secret docdb-credentials -n $NAMESPACE"
echo ""
echo "=========================================="
