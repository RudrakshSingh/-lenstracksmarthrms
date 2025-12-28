#!/bin/bash

# ============================================================================
# Connection Troubleshooting Script
# Diagnoses and fixes common connection issues
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "Connection Troubleshooting"
echo "=========================================="
echo ""

# Function to check Kubernetes connectivity
check_k8s_connection() {
    echo -e "${BLUE}1. Checking Kubernetes cluster connection...${NC}"
    
    if kubectl cluster-info &> /dev/null; then
        echo -e "${GREEN}✓ Kubernetes cluster is accessible${NC}"
        kubectl cluster-info | head -1
        return 0
    else
        echo -e "${RED}✗ Cannot connect to Kubernetes cluster${NC}"
        echo ""
        echo "Possible fixes:"
        echo "1. Check if kubectl is configured: kubectl config get-contexts"
        echo "2. Set correct context: kubectl config use-context <context-name>"
        echo "3. Verify cluster credentials"
        return 1
    fi
}

# Function to check if Istio is installed in cluster
check_istio_installed() {
    echo ""
    echo -e "${BLUE}2. Checking if Istio is installed in cluster...${NC}"
    
    if kubectl get namespace istio-system &> /dev/null; then
        echo -e "${GREEN}✓ Istio namespace exists${NC}"
        
        local pods=$(kubectl get pods -n istio-system --no-headers 2>/dev/null | wc -l)
        if [ "$pods" -gt 0 ]; then
            echo -e "${GREEN}✓ Istio pods found: $pods${NC}"
            kubectl get pods -n istio-system | head -5
            return 0
        else
            echo -e "${YELLOW}⚠ Istio namespace exists but no pods found${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ Istio not installed in cluster${NC}"
        echo ""
        echo "Istio needs to be installed. Options:"
        echo "A. Install via istioctl (if you have it locally)"
        echo "B. Install via Helm (recommended if istioctl unavailable)"
        echo "C. Skip Istio for now and use direct service access"
        return 1
    fi
}

# Function to check namespaces
check_namespaces() {
    echo ""
    echo -e "${BLUE}3. Checking required namespaces...${NC}"
    
    local prod_ns=$(kubectl get namespace etelios-backend-prod --ignore-not-found=true)
    local dev_ns=$(kubectl get namespace etelios-backend-dev --ignore-not-found=true)
    
    if [ -n "$prod_ns" ]; then
        echo -e "${GREEN}✓ etelios-backend-prod namespace exists${NC}"
    else
        echo -e "${YELLOW}⚠ etelios-backend-prod namespace not found${NC}"
        echo "Creating namespace..."
        kubectl create namespace etelios-backend-prod
    fi
    
    if [ -n "$dev_ns" ]; then
        echo -e "${GREEN}✓ etelios-backend-dev namespace exists${NC}"
    else
        echo -e "${YELLOW}⚠ etelios-backend-dev namespace not found${NC}"
        echo "Creating namespace..."
        kubectl create namespace etelios-backend-dev
    fi
}

# Function to check services
check_services() {
    echo ""
    echo -e "${BLUE}4. Checking service deployments...${NC}"
    
    local prod_services=$(kubectl get deployments -n etelios-backend-prod --no-headers 2>/dev/null | wc -l)
    local dev_services=$(kubectl get deployments -n etelios-backend-dev --no-headers 2>/dev/null | wc -l)
    
    echo "Production deployments: $prod_services"
    echo "Development deployments: $dev_services"
    
    if [ "$prod_services" -eq 0 ] && [ "$dev_services" -eq 0 ]; then
        echo -e "${YELLOW}⚠ No services deployed yet${NC}"
        echo "You need to deploy services first"
        return 1
    fi
    
    return 0
}

# Function to check pod connectivity
check_pod_connectivity() {
    echo ""
    echo -e "${BLUE}5. Checking pod connectivity...${NC}"
    
    local prod_pods=$(kubectl get pods -n etelios-backend-prod --no-headers 2>/dev/null | grep Running | wc -l)
    local dev_pods=$(kubectl get pods -n etelios-backend-dev --no-headers 2>/dev/null | grep Running | wc -l)
    
    echo "Running pods in prod: $prod_pods"
    echo "Running pods in dev: $dev_pods"
    
    if [ "$prod_pods" -eq 0 ] && [ "$dev_pods" -eq 0 ]; then
        echo -e "${RED}✗ No running pods found${NC}"
        echo ""
        echo "Checking pod status..."
        kubectl get pods -n etelios-backend-prod 2>/dev/null || echo "No pods in prod"
        kubectl get pods -n etelios-backend-dev 2>/dev/null || echo "No pods in dev"
        return 1
    fi
    
    return 0
}

# Function to test service endpoints
test_service_endpoints() {
    echo ""
    echo -e "${BLUE}6. Testing service endpoints...${NC}"
    
    # Test internal service connectivity
    local test_pod="test-curl-$(date +%s)"
    
    echo "Creating test pod..."
    kubectl run "$test_pod" --image=curlimages/curl:latest --rm -i --restart=Never -- \
        curl -s http://auth-service.etelios-backend-prod.svc.cluster.local:3001/health || \
        echo -e "${YELLOW}⚠ Could not test internal connectivity${NC}"
    
    kubectl delete pod "$test_pod" --ignore-not-found=true &> /dev/null
}

# Function to provide installation options
provide_installation_options() {
    echo ""
    echo "=========================================="
    echo "Installation Options"
    echo "=========================================="
    echo ""
    echo "Option 1: Install Istio via Helm (Recommended if istioctl unavailable)"
    echo "----------------------------------------"
    echo "helm repo add istio https://istio-release.storage.googleapis.com/charts"
    echo "helm repo update"
    echo "kubectl create namespace istio-system"
    echo "helm install istio-base istio/base -n istio-system"
    echo "helm install istiod istio/istiod -n istio-system --wait"
    echo "helm install istio-ingress istio/gateway -n istio-system"
    echo ""
    echo "Option 2: Deploy without Istio (Direct Service Access)"
    echo "----------------------------------------"
    echo "You can deploy services directly without Istio:"
    echo "kubectl apply -f k8s/prod/auth-service.yaml"
    echo "kubectl apply -f k8s/prod/hr-service.yaml"
    echo "kubectl apply -f k8s/prod/attendance-service.yaml"
    echo ""
    echo "Option 3: Use existing NGINX Ingress (Skip Istio Gateway)"
    echo "----------------------------------------"
    echo "Keep using existing ingress.yaml but remove API Gateway references"
    echo ""
}

# Function to fix common issues
fix_common_issues() {
    echo ""
    echo "=========================================="
    echo "Common Fixes"
    echo "=========================================="
    echo ""
    
    echo "1. If 'connection refused' to Kubernetes:"
    echo "   kubectl config get-contexts"
    echo "   kubectl config use-context <your-context>"
    echo ""
    
    echo "2. If services not accessible:"
    echo "   kubectl get svc -n etelios-backend-prod"
    echo "   kubectl get endpoints -n etelios-backend-prod"
    echo ""
    
    echo "3. If pods not starting:"
    echo "   kubectl describe pod <pod-name> -n etelios-backend-prod"
    echo "   kubectl logs <pod-name> -n etelios-backend-prod"
    echo ""
    
    echo "4. If Istio sidecar issues:"
    echo "   kubectl label namespace etelios-backend-prod istio-injection=enabled --overwrite"
    echo "   kubectl rollout restart deployment/<service> -n etelios-backend-prod"
    echo ""
}

# Main execution
main() {
    local k8s_ok=false
    local istio_ok=false
    
    # Check Kubernetes connection
    if check_k8s_connection; then
        k8s_ok=true
    else
        echo ""
        echo -e "${RED}❌ Cannot proceed without Kubernetes connection${NC}"
        exit 1
    fi
    
    # Check namespaces
    check_namespaces
    
    # Check Istio
    if check_istio_installed; then
        istio_ok=true
    else
        echo ""
        echo -e "${YELLOW}⚠ Istio not installed - you can still deploy services without it${NC}"
    fi
    
    # Check services
    check_services
    
    # Check pods
    check_pod_connectivity
    
    # Test endpoints
    if [ "$k8s_ok" = true ]; then
        test_service_endpoints
    fi
    
    # Provide options
    if [ "$istio_ok" = false ]; then
        provide_installation_options
    fi
    
    # Common fixes
    fix_common_issues
    
    echo ""
    echo "=========================================="
    echo "Troubleshooting Complete"
    echo "=========================================="
}

main

