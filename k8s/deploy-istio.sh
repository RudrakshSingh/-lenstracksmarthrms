#!/bin/bash

# ============================================================================
# Istio Service Mesh Deployment Script
# ============================================================================
# This script deploys Istio configurations and removes API Gateway
# Usage: ./deploy-istio.sh [prod|dev|all]
# ============================================================================

set -e

ENVIRONMENT=${1:-all}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "Istio Service Mesh Deployment"
echo "Environment: $ENVIRONMENT"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if Istio is installed
check_istio() {
    if ! command -v istioctl &> /dev/null; then
        echo -e "${RED}Error: istioctl not found. Please install Istio first.${NC}"
        exit 1
    fi
    
    if ! kubectl get namespace istio-system &> /dev/null; then
        echo -e "${YELLOW}Warning: Istio not installed. Installing Istio...${NC}"
        install_istio
    fi
}

# Function to install Istio
install_istio() {
    echo "Installing Istio..."
    istioctl install --set values.defaultRevision=default -y
    kubectl label namespace istio-system istio-injection=enabled --overwrite
}

# Function to deploy Istio configurations
deploy_istio_configs() {
    local namespace=$1
    echo -e "${GREEN}Deploying Istio configurations to $namespace...${NC}"
    
    # Apply namespace labels
    kubectl apply -f "${SCRIPT_DIR}/istio/namespace-labels.yaml"
    
    # Apply PeerAuthentication for mTLS
    kubectl apply -f "${SCRIPT_DIR}/istio/peer-authentication.yaml"
    
    # Apply DestinationRules
    kubectl apply -f "${SCRIPT_DIR}/istio/destination-rules.yaml"
    
    # Apply VirtualServices
    kubectl apply -f "${SCRIPT_DIR}/istio/virtual-services.yaml"
    
    # Apply Gateway
    kubectl apply -f "${SCRIPT_DIR}/istio/gateway.yaml"
    
    echo -e "${GREEN}✓ Istio configurations deployed to $namespace${NC}"
}

# Function to remove API Gateway
remove_api_gateway() {
    echo -e "${YELLOW}Removing API Gateway...${NC}"
    
    # Delete API Gateway deployment and service
    kubectl delete deployment api-gateway -n etelios-backend-prod --ignore-not-found=true
    kubectl delete service api-gateway -n etelios-backend-prod --ignore-not-found=true
    kubectl delete hpa api-gateway -n etelios-backend-prod --ignore-not-found=true
    
    echo -e "${GREEN}✓ API Gateway removed${NC}"
}

# Function to deploy services
deploy_services() {
    local env=$1
    local namespace="etelios-backend-${env}"
    
    echo -e "${GREEN}Deploying services to $namespace...${NC}"
    
    # Apply ConfigMap
    kubectl apply -f "${SCRIPT_DIR}/${env}/configmap.yaml"
    
    # Apply Secrets (if exists)
    if [ -f "${SCRIPT_DIR}/${env}/secrets.yaml" ]; then
        kubectl apply -f "${SCRIPT_DIR}/${env}/secrets.yaml"
    fi
    
    # Deploy services
    kubectl apply -f "${SCRIPT_DIR}/${env}/auth-service.yaml"
    kubectl apply -f "${SCRIPT_DIR}/${env}/hr-service.yaml"
    kubectl apply -f "${SCRIPT_DIR}/${env}/attendance-service.yaml"
    
    echo -e "${GREEN}✓ Services deployed to $namespace${NC}"
}

# Function to wait for deployments
wait_for_deployments() {
    local namespace=$1
    echo -e "${YELLOW}Waiting for deployments to be ready in $namespace...${NC}"
    
    kubectl wait --for=condition=available --timeout=300s \
        deployment/auth-service \
        deployment/hr-service \
        deployment/attendance-service \
        -n "$namespace" || true
    
    echo -e "${GREEN}✓ Deployments ready${NC}"
}

# Function to verify Istio sidecars
verify_sidecars() {
    local namespace=$1
    echo -e "${YELLOW}Verifying Istio sidecars in $namespace...${NC}"
    
    local pods=$(kubectl get pods -n "$namespace" -l app=auth-service -o jsonpath='{.items[*].metadata.name}')
    for pod in $pods; do
        local containers=$(kubectl get pod "$pod" -n "$namespace" -o jsonpath='{.spec.containers[*].name}')
        if [[ $containers == *"istio-proxy"* ]]; then
            echo -e "${GREEN}✓ Sidecar injected in $pod${NC}"
        else
            echo -e "${RED}✗ No sidecar in $pod${NC}"
        fi
    done
}

# Main deployment flow
main() {
    check_istio
    
    case $ENVIRONMENT in
        prod)
            echo "Deploying to PRODUCTION..."
            deploy_istio_configs "etelios-backend-prod"
            remove_api_gateway
            deploy_services "prod"
            wait_for_deployments "etelios-backend-prod"
            verify_sidecars "etelios-backend-prod"
            ;;
        dev)
            echo "Deploying to DEVELOPMENT..."
            deploy_istio_configs "etelios-backend-dev"
            deploy_services "dev"
            wait_for_deployments "etelios-backend-dev"
            verify_sidecars "etelios-backend-dev"
            ;;
        all)
            echo "Deploying to ALL environments..."
            deploy_istio_configs "etelios-backend-prod"
            deploy_istio_configs "etelios-backend-dev"
            remove_api_gateway
            deploy_services "prod"
            deploy_services "dev"
            wait_for_deployments "etelios-backend-prod"
            wait_for_deployments "etelios-backend-dev"
            verify_sidecars "etelios-backend-prod"
            verify_sidecars "etelios-backend-dev"
            ;;
        *)
            echo -e "${RED}Error: Invalid environment. Use 'prod', 'dev', or 'all'${NC}"
            exit 1
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}=========================================="
    echo "Deployment Complete!"
    echo "==========================================${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Verify services: ./validate-istio.sh"
    echo "2. Check Istio dashboard: istioctl dashboard kiali"
    echo "3. Check metrics: istioctl dashboard prometheus"
}

main

