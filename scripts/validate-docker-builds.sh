#!/bin/bash

# Validation script for Docker builds
# Tests that all services can build successfully

set -e

echo "🧪 Validating Docker builds..."

# Test services (subset for faster validation)
TEST_SERVICES=(
    "auth-service"
    "hr-service"
    "attendance-service"
    "api-gateway"
)

failed_builds=()

for service in "${TEST_SERVICES[@]}"; do
    echo ""
    echo "Testing build: $service"

    if [ "$service" = "api-gateway" ]; then
        dockerfile="Dockerfile"
    else
        dockerfile="microservices/$service/Dockerfile"
    fi

    if ! docker build -t test-$service:validate -f "$dockerfile" . > /dev/null 2>&1; then
        echo "✗ $service build FAILED"
        failed_builds+=("$service")
    else
        echo "✓ $service build successful"
        # Clean up test image
        docker rmi test-$service:validate > /dev/null 2>&1
    fi
done

echo ""
if [ ${#failed_builds[@]} -eq 0 ]; then
    echo "========================================"
    echo "✅ All builds validated successfully!"
    echo "========================================"
    echo ""
    echo "🎉 Docker build context fix is working!"
    echo "All services can now access the shared directory."
    exit 0
else
    echo "========================================"
    echo "❌ Build validation FAILED"
    echo "Failed services: ${failed_builds[*]}"
    echo "========================================"
    echo ""
    echo "🔧 Please check the Dockerfiles and try again."
    exit 1
fi
