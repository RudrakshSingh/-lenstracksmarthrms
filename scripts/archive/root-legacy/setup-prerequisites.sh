#!/bin/bash

###############################################################################
# Prerequisites Setup Script
# Install all required tools for AWS Migration Day 1
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Installing Prerequisites for Day 1${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check Homebrew
if ! command -v brew &> /dev/null; then
    echo -e "${RED}❌ Homebrew not found!${NC}"
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
echo -e "${GREEN}✅ Homebrew found${NC}"

# Install AWS CLI
echo ""
echo "Installing AWS CLI..."
if command -v aws &> /dev/null; then
    echo -e "${YELLOW}⚠️  AWS CLI already installed${NC}"
    aws --version
else
    brew install awscli
    echo -e "${GREEN}✅ AWS CLI installed${NC}"
fi

# Install eksctl
echo ""
echo "Installing eksctl..."
if command -v eksctl &> /dev/null; then
    echo -e "${YELLOW}⚠️  eksctl already installed${NC}"
    eksctl version
else
    brew install eksctl
    echo -e "${GREEN}✅ eksctl installed${NC}"
fi

# Install kubectl
echo ""
echo "Installing kubectl..."
if command -v kubectl &> /dev/null; then
    echo -e "${YELLOW}⚠️  kubectl already installed${NC}"
    kubectl version --client --short
else
    brew install kubectl
    echo -e "${GREEN}✅ kubectl installed${NC}"
fi

# Check Docker
echo ""
echo "Checking Docker..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker found${NC}"
    docker --version
else
    echo -e "${YELLOW}⚠️  Docker not found${NC}"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Prerequisites Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next Steps:"
echo "1. Configure AWS CLI:"
echo "   aws configure"
echo "   - Enter your AWS Access Key ID"
echo "   - Enter your AWS Secret Access Key"
echo "   - Default region: ap-south-1"
echo "   - Default output: json"
echo ""
echo "2. Verify AWS access:"
echo "   aws sts get-caller-identity"
echo ""
echo "3. Run Day 1 setup:"
echo "   ./day1-aws-setup.sh"
echo ""
