#!/bin/bash

# ============================================================================
# Deploy Services Without Istio (Direct Access)
# Use this if Istio installation is causing connection issues
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENVIRONMENT=${1:-all}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "Deploy Services Without Istio"
echo "Environment: $ENVIRONMENT"
echo "=========================================="
echo ""

# Check Kubernetes connection
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot connect to Kubernetes cluster"
    echo "Run: kubectl config get-contexts"
    exit 1
fi

echo -e "${GREEN}✓ Kubernetes cluster accessible${NC}"

# Create namespaces if they don't exist
echo ""
echo "Creating namespaces..."
kubectl create namespace etelios-backend-prod --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace etelios-backend-dev --dry-run=client -o yaml | kubectl apply -f -

# Remove API Gateway
echo ""
echo -e "${YELLOW}Removing API Gateway...${NC}"
kubectl delete deployment api-gateway -n etelios-backend-prod --ignore-not-found=true
kubectl delete service api-gateway -n etelios-backend-prod --ignore-not-found=true
kubectl delete hpa api-gateway -n etelios-backend-prod --ignore-not-found=true

# Deploy services
deploy_services() {
    local env=$1
    local namespace="etelios-backend-${env}"
    
    echo ""
    echo -e "${BLUE}Deploying to $namespace...${NC}"
    
    # Apply ConfigMap
    if [ -f "${SCRIPT_DIR}/${env}/configmap.yaml" ]; then
        kubectl apply -f "${SCRIPT_DIR}/${env}/configmap.yaml"
    fi
    
    # Deploy services (without Istio annotations)
    if [ -f "${SCRIPT_DIR}/${env}/auth-service.yaml" ]; then
        # Remove Istio annotations temporarily
        sed 's/sidecar.istio.io\/inject: "true"//g' "${SCRIPT_DIR}/${env}/auth-service.yaml" | \
        kubectl apply -f -
    fi
    
    if [ -f "${SCRIPT_DIR}/${env}/hr-service.yaml" ]; then
        sed 's/sidecar.istio.io\/inject: "true"//g' "${SCRIPT_DIR}/${env}/hr-service.yaml" | \
        kubectl apply -f -
    fi
    
    if [ -f "${SCRIPT_DIR}/${env}/attendance-service.yaml" ]; then
        sed 's/sidecar.istio.io\/inject: "true"//g' "${SCRIPT_DIR}/${env}/attendance-service.yaml" | \
        kubectl apply -f -
    fi
    
    echo -e "${GREEN}✓ Services deployed to $namespace${NC}"
}

# Main deployment
case $ENVIRONMENT in
    prod)
        deploy_services "prod"
        ;;
    dev)
        deploy_services "dev"
        ;;
    all)
        deploy_services "prod"
        deploy_services "dev"
        ;;
    *)
        echo "Usage: $0 [prod|dev|all]"
        exit 1
        ;;
esac

# Wait for deployments
echo ""
echo "Waiting for deployments..."
kubectl wait --for=condition=available --timeout=300s \
    deployment/auth-service \
    deployment/hr-service \
    deployment/attendance-service \
    -n etelios-backend-prod --ignore-not-found=true

kubectl wait --for=condition=available --timeout=300s \
    deployment/auth-service \
    deployment/hr-service \
    deployment/attendance-service \
    -n etelios-backend-dev --ignore-not-found=true

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Services are deployed without Istio."
echo "You can add Istio later when connection issues are resolved."
echo ""
echo "Test services:"
echo "  kubectl get pods -n etelios-backend-prod"
echo "  kubectl get svc -n etelios-backend-prod"

