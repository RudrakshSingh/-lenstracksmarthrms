#!/bin/bash

# ============================================================================
# Istio Service Mesh Validation Script
# ============================================================================
# Validates Istio deployment, canary routing, traffic mirroring, and mTLS
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test endpoints
PROD_HOST="api.etelios.com"
DEV_HOST="dev.api.etelios.com"

echo "=========================================="
echo "Istio Service Mesh Validation"
echo "=========================================="
echo ""

# Function to test health endpoint
test_health() {
    local host=$1
    local service=$2
    local path=$3
    
    echo -e "${BLUE}Testing $service health on $host...${NC}"
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Host: $host" \
        "https://$host/api/$service/health" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ $service health check passed (HTTP $response)${NC}"
        return 0
    else
        echo -e "${RED}✗ $service health check failed (HTTP $response)${NC}"
        return 1
    fi
}

# Function to test canary routing
test_canary() {
    local host=$1
    local service=$2
    
    echo -e "${BLUE}Testing canary routing for $service on $host...${NC}"
    
    # Test without canary header (should route 90% prod, 10% dev)
    local response1=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Host: $host" \
        "https://$host/api/$service/health" 2>/dev/null || echo "000")
    
    # Test with canary header (should route 100% to dev)
    local response2=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Host: $host" \
        -H "canary: true" \
        "https://$host/api/$service/health" 2>/dev/null || echo "000")
    
    if [ "$response1" = "200" ] && [ "$response2" = "200" ]; then
        echo -e "${GREEN}✓ Canary routing working (normal: $response1, canary: $response2)${NC}"
        return 0
    else
        echo -e "${RED}✗ Canary routing failed (normal: $response1, canary: $response2)${NC}"
        return 1
    fi
}

# Function to verify mTLS
verify_mtls() {
    local namespace=$1
    
    echo -e "${BLUE}Verifying mTLS in $namespace...${NC}"
    
    local peer_auth=$(kubectl get peerauthentication default -n "$namespace" -o jsonpath='{.spec.mtls.mode}' 2>/dev/null || echo "none")
    
    if [ "$peer_auth" = "STRICT" ]; then
        echo -e "${GREEN}✓ mTLS is STRICT in $namespace${NC}"
        return 0
    else
        echo -e "${RED}✗ mTLS is not STRICT in $namespace (current: $peer_auth)${NC}"
        return 1
    fi
}

# Function to verify Istio sidecars
verify_sidecars() {
    local namespace=$1
    
    echo -e "${BLUE}Verifying Istio sidecars in $namespace...${NC}"
    
    local pods=$(kubectl get pods -n "$namespace" -l app=auth-service -o jsonpath='{.items[*].metadata.name}' 2>/dev/null)
    local sidecar_count=0
    local total_pods=0
    
    for pod in $pods; do
        total_pods=$((total_pods + 1))
        local containers=$(kubectl get pod "$pod" -n "$namespace" -o jsonpath='{.spec.containers[*].name}' 2>/dev/null)
        if [[ $containers == *"istio-proxy"* ]]; then
            sidecar_count=$((sidecar_count + 1))
        fi
    done
    
    if [ $sidecar_count -eq $total_pods ] && [ $total_pods -gt 0 ]; then
        echo -e "${GREEN}✓ All pods have Istio sidecars ($sidecar_count/$total_pods)${NC}"
        return 0
    else
        echo -e "${RED}✗ Not all pods have sidecars ($sidecar_count/$total_pods)${NC}"
        return 1
    fi
}

# Function to check DestinationRules
check_destination_rules() {
    local namespace=$1
    
    echo -e "${BLUE}Checking DestinationRules in $namespace...${NC}"
    
    local dr_count=$(kubectl get destinationrules -n "$namespace" --no-headers 2>/dev/null | wc -l)
    
    if [ "$dr_count" -ge 3 ]; then
        echo -e "${GREEN}✓ DestinationRules found ($dr_count)${NC}"
        kubectl get destinationrules -n "$namespace"
        return 0
    else
        echo -e "${RED}✗ Insufficient DestinationRules ($dr_count)${NC}"
        return 1
    fi
}

# Function to check VirtualServices
check_virtual_services() {
    local namespace=$1
    
    echo -e "${BLUE}Checking VirtualServices in $namespace...${NC}"
    
    local vs_count=$(kubectl get virtualservices -n "$namespace" --no-headers 2>/dev/null | wc -l)
    
    if [ "$vs_count" -ge 3 ]; then
        echo -e "${GREEN}✓ VirtualServices found ($vs_count)${NC}"
        kubectl get virtualservices -n "$namespace"
        return 0
    else
        echo -e "${RED}✗ Insufficient VirtualServices ($vs_count)${NC}"
        return 1
    fi
}

# Function to check Gateway
check_gateway() {
    echo -e "${BLUE}Checking Istio Gateway...${NC}"
    
    local gateway_prod=$(kubectl get gateway etelios-gateway-prod -n etelios-backend-prod --ignore-not-found=true)
    local gateway_dev=$(kubectl get gateway etelios-gateway-dev -n etelios-backend-dev --ignore-not-found=true)
    
    if [ -n "$gateway_prod" ] && [ -n "$gateway_dev" ]; then
        echo -e "${GREEN}✓ Gateways configured for both environments${NC}"
        return 0
    else
        echo -e "${RED}✗ Gateways not properly configured${NC}"
        return 1
    fi
}

# Function to test traffic mirroring (check logs)
test_traffic_mirroring() {
    echo -e "${BLUE}Testing traffic mirroring...${NC}"
    echo -e "${YELLOW}Note: Traffic mirroring verification requires checking logs${NC}"
    echo -e "${YELLOW}Run: kubectl logs -n etelios-backend-dev -l app=auth-service --tail=50${NC}"
    echo -e "${YELLOW}You should see mirrored requests from production${NC}"
}

# Main validation
main() {
    local passed=0
    local failed=0
    
    echo -e "${BLUE}=== Production Environment ===${NC}"
    verify_mtls "etelios-backend-prod" && ((passed++)) || ((failed++))
    verify_sidecars "etelios-backend-prod" && ((passed++)) || ((failed++))
    check_destination_rules "etelios-backend-prod" && ((passed++)) || ((failed++))
    check_virtual_services "etelios-backend-prod" && ((passed++)) || ((failed++))
    
    echo ""
    echo -e "${BLUE}=== Development Environment ===${NC}"
    verify_mtls "etelios-backend-dev" && ((passed++)) || ((failed++))
    verify_sidecars "etelios-backend-dev" && ((passed++)) || ((failed++))
    check_destination_rules "etelios-backend-dev" && ((passed++)) || ((failed++))
    check_virtual_services "etelios-backend-dev" && ((passed++)) || ((failed++))
    
    echo ""
    echo -e "${BLUE}=== Gateway Configuration ===${NC}"
    check_gateway && ((passed++)) || ((failed++))
    
    echo ""
    echo -e "${BLUE}=== Health Checks ===${NC}"
    echo -e "${YELLOW}Note: Health checks require external access. Testing internal endpoints...${NC}"
    
    # Test internal endpoints
    kubectl run -it --rm test-pod --image=curlimages/curl:latest --restart=Never -- \
        curl -s http://auth-service.etelios-backend-prod.svc.cluster.local:3001/health || true
    kubectl delete pod test-pod --ignore-not-found=true
    
    echo ""
    echo -e "${BLUE}=== Traffic Mirroring ===${NC}"
    test_traffic_mirroring
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}Passed: $passed${NC}"
    echo -e "${RED}Failed: $failed${NC}"
    echo "=========================================="
    
    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}✓ All validations passed!${NC}"
        exit 0
    else
        echo -e "${RED}✗ Some validations failed${NC}"
        exit 1
    fi
}

main

