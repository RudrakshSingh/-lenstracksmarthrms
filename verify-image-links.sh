#!/bin/bash

# Script to verify if all Docker images exist in Azure Container Registry
# Requires: Azure CLI and proper authentication

echo "=========================================="
echo "Verifying Docker Image Links in ACR"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed${NC}"
    echo "Please install Azure CLI: https://docs.microsoft.com/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Azure. Attempting to login...${NC}"
    az login
fi

echo "Checking images in registries..."
echo ""

# Function to check if image exists
check_image() {
    local registry=$1
    local repository=$2
    local tag=$3
    local full_image="${registry}/${repository}:${tag}"
    
    # Extract ACR name from registry URL
    local acr_name=$(echo $registry | sed 's/\.azurecr\.io//')
    
    echo -n "Checking: ${full_image} ... "
    
    # Check if repository exists
    if az acr repository show --name $acr_name --repository $repository &> /dev/null; then
        # Check if tag exists
        if az acr repository show-tags --name $acr_name --repository $repository --query "[?name=='${tag}']" --output tsv | grep -q "${tag}"; then
            echo -e "${GREEN}✅ EXISTS${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  Repository exists but tag '${tag}' not found${NC}"
            # Show available tags
            local tags=$(az acr repository show-tags --name $acr_name --repository $repository --output tsv 2>/dev/null | head -5)
            if [ -n "$tags" ]; then
                echo "   Available tags: $tags"
            fi
            return 1
        fi
    else
        echo -e "${RED}❌ NOT FOUND${NC}"
        return 1
    fi
}

# Counters
total=0
found=0
not_found=0

echo "=========================================="
echo "📦 MAIN API GATEWAY"
echo "=========================================="
total=$((total + 1))
if check_image "eteliosacr-hvawabdbgge7e0fu.azurecr.io" "eteliosbackend" "latest"; then
    found=$((found + 1))
else
    not_found=$((not_found + 1))
fi
echo ""

echo "=========================================="
echo "📦 MICROSERVICES"
echo "=========================================="

# List of microservices
services=(
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

for service in "${services[@]}"; do
    total=$((total + 1))
    if check_image "eteliosregistry.azurecr.io" "$service" "latest"; then
        found=$((found + 1))
    else
        not_found=$((not_found + 1))
    fi
done

echo ""
echo "=========================================="
echo "📊 SUMMARY"
echo "=========================================="
echo "Total images checked: $total"
echo -e "${GREEN}Found: $found${NC}"
echo -e "${RED}Not found: $not_found${NC}"
echo ""

if [ $not_found -eq 0 ]; then
    echo -e "${GREEN}✅ All images exist in ACR!${NC}"
    exit 0
elif [ $found -eq 0 ]; then
    echo -e "${RED}❌ No images found. They may need to be built and pushed.${NC}"
    echo ""
    echo "To build and push images, run:"
    echo "  ./k8s/build-and-push.sh all"
    echo "  or trigger the Azure DevOps pipelines"
    exit 1
else
    echo -e "${YELLOW}⚠️  Some images are missing.${NC}"
    echo ""
    echo "To build and push missing images:"
    echo "  ./k8s/build-and-push.sh <service-name>"
    echo "  or trigger the Azure DevOps pipelines"
    exit 1
fi

