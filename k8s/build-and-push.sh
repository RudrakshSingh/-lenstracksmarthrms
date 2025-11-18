#!/bin/bash

# Build and Push Docker Images to ACR
# Usage: ./build-and-push.sh [service-name] [tag]

set -e

IMAGE_TAG="${2:-latest}"
SERVICE="${1:-all}"

# ACR Registry Configuration
# Using single ACR for all services (eteliosregistry may not exist yet)
# Note: Use the ACR name (not the full login server URL)
GATEWAY_ACR="eteliosacr"
MICROSERVICES_ACR="eteliosacr"  # Using same ACR until eteliosregistry is created

# Function to get ACR for a service (macOS compatible - no associative arrays)
get_service_acr() {
    local service_name=$1
    if [ "$service_name" == "api-gateway" ]; then
        echo "${GATEWAY_ACR}"
    else
        echo "${MICROSERVICES_ACR}"
    fi
}

echo "🐳 Building and Pushing Docker Images"
echo "Gateway ACR: ${GATEWAY_ACR}"
echo "Microservices ACR: ${MICROSERVICES_ACR}"
echo "Tag: ${IMAGE_TAG}"
echo "Service: ${SERVICE}"
echo ""

# Login to both ACR registries
echo "🔐 Logging in to ACR registries..."
az acr login --name ${GATEWAY_ACR} || echo "⚠️  Warning: Could not login to ${GATEWAY_ACR}"
az acr login --name ${MICROSERVICES_ACR} || echo "⚠️  Warning: Could not login to ${MICROSERVICES_ACR}"
echo ""

# Function to build and push a service
build_and_push() {
    local service_name=$1
    local dockerfile_path=$2
    local context_path=$3
    
    # Get service-specific ACR and tag
    local service_acr=$(get_service_acr "$service_name")
    local service_tag="${IMAGE_TAG}"
    
    # Get ACR login server for this service
    local service_acr_server=$(az acr show --name ${service_acr} --query loginServer --output tsv 2>/dev/null || echo "${service_acr}.azurecr.io")
    
    echo "🔨 Building ${service_name}..."
    echo "   ACR: ${service_acr} (${service_acr_server})"
    echo "   Tag: ${service_tag}"
    
    if [ ! -f "$dockerfile_path" ]; then
        echo "⚠️  Dockerfile not found: ${dockerfile_path}"
        return 1
    fi
    
    # Ensure logged in to this ACR
    echo "🔐 Ensuring login to ${service_acr}..."
    az acr login --name ${service_acr} || {
        echo "❌ Failed to login to ${service_acr}"
        return 1
    }
    
    docker build \
        -t ${service_acr_server}/${service_name}:${service_tag} \
        -t ${service_acr_server}/${service_name}:latest \
        -f ${dockerfile_path} \
        ${context_path}
    
    echo "📤 Pushing ${service_name} to ${service_acr_server}..."
    docker push ${service_acr_server}/${service_name}:${service_tag}
    docker push ${service_acr_server}/${service_name}:latest
    
    echo "✅ ${service_name} built and pushed to ${service_acr_server}!"
    echo ""
}

# Build API Gateway
if [ "$SERVICE" == "all" ] || [ "$SERVICE" == "api-gateway" ]; then
    echo "=========================================="
    echo "Building API Gateway"
    echo "=========================================="
    build_and_push "api-gateway" "Dockerfile" "."
    if [ $? -eq 0 ]; then
        echo "✅ API Gateway built and pushed successfully!"
    else
        echo "❌ API Gateway build failed!"
    fi
    echo ""
fi

# Build microservices
if [ "$SERVICE" == "all" ]; then
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
    
    echo "=========================================="
    echo "Building ${#SERVICES[@]} Microservices"
    echo "=========================================="
    echo ""
    
    success_count=0
    fail_count=0
    
    for service in "${SERVICES[@]}"; do
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "Building: ${service}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        if build_and_push "$service" "microservices/${service}/Dockerfile" "microservices/${service}/"; then
            success_count=$((success_count + 1))
            echo "✅ ${service} built and pushed successfully!"
        else
            fail_count=$((fail_count + 1))
            echo "❌ ${service} build failed!"
        fi
        echo ""
    done
    
    echo "=========================================="
    echo "Build Summary"
    echo "=========================================="
    echo "Total: ${#SERVICES[@]} services"
    echo "✅ Successful: ${success_count}"
    echo "❌ Failed: ${fail_count}"
    echo "=========================================="
else
    # Build specific service
    if [ "$SERVICE" != "api-gateway" ]; then
        build_and_push "$SERVICE" "microservices/${SERVICE}/Dockerfile" "microservices/${SERVICE}/"
    fi
fi

echo ""
echo "✅ Build and push process completed!"
echo ""
echo "To verify images:"
echo "   ./verify-image-links.sh"
echo ""
echo "Or manually check:"
echo "   az acr repository list --name ${GATEWAY_ACR} --output table"
echo "   az acr repository list --name ${MICROSERVICES_ACR} --output table"

