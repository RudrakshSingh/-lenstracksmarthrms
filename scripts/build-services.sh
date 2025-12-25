#!/bin/bash

# Build script for local development
# Usage: ./scripts/build-services.sh [service-name]
# Example: ./scripts/build-services.sh auth-service
# Or: ./scripts/build-services.sh (builds all services)

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

echo "Current directory: $(pwd)"
echo "Root directory: $ROOT_DIR"

# All services with Dockerfiles
ALL_SERVICES=(
    "analytics-service"
    "attendance-service"
    "auth-service"
    "cpp-service"
    "crm-service"
    "document-service"
    "financial-service"
    "hr-service"
    "inventory-service"
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

build_service() {
    local service=$1
    echo ""
    echo "========================================"
    echo "Building: $service"
    echo "========================================"

    if [ ! -f "microservices/$service/Dockerfile" ]; then
        echo "ERROR: Dockerfile not found for $service"
        return 1
    fi

    # Build the image
    docker build \
        --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
        --build-arg VERSION=dev \
        --build-arg SERVICE_NAME=$service \
        -t etelios/$service:latest \
        -t etelios/$service:dev \
        -f microservices/$service/Dockerfile \
        .

    # Verify build succeeded
    if [ $? -eq 0 ]; then
        echo "✓ Successfully built $service"
    else
        echo "✗ Failed to build $service"
        return 1
    fi
}

# Function to build API Gateway
build_api_gateway() {
    echo ""
    echo "========================================"
    echo "Building: api-gateway"
    echo "========================================"

    if [ ! -f "Dockerfile" ]; then
        echo "ERROR: Root Dockerfile not found for api-gateway"
        return 1
    fi

    # Build the API Gateway image
    docker build \
        --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
        --build-arg VERSION=dev \
        -t etelios/api-gateway:latest \
        -t etelios/api-gateway:dev \
        -f Dockerfile \
        .

    if [ $? -eq 0 ]; then
        echo "✓ Successfully built api-gateway"
    else
        echo "✗ Failed to build api-gateway"
        return 1
    fi
}

if [ $# -eq 0 ]; then
    # Build all services
    echo "Building all services..."
    build_api_gateway
    for service in "${ALL_SERVICES[@]}"; do
        build_service "$service"
    done
elif [ "$1" = "api-gateway" ]; then
    # Build only API Gateway
    build_api_gateway
else
    # Build specific service
    build_service "$1"
fi

echo ""
echo "========================================"
echo "Build complete!"
echo "========================================"

# Show built images
echo "Built images:"
docker images | grep etelios

echo ""
echo "💡 Tips:"
echo "• Run services: docker-compose up"
echo "• Test specific service: docker run -p 3001:3001 etelios/auth-service"
echo "• Clean up: docker system prune"
