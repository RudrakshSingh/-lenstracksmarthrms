#!/bin/bash

###############################################################################
# Pre-flight Check - Verify everything is ready for AWS deployment
###############################################################################

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

echo "=========================================="
echo "Pre-flight Check for AWS Deployment"
echo "=========================================="
echo ""

# Check eksctl
echo -n "Checking eksctl... "
if command -v eksctl &> /dev/null; then
    VERSION=$(eksctl version)
    echo -e "${GREEN}✓${NC} $VERSION"
else
    echo -e "${RED}✗ Not installed${NC}"
    echo "  Install: brew install eksctl"
    ERRORS=$((ERRORS+1))
fi

# Check kubectl
echo -n "Checking kubectl... "
if command -v kubectl &> /dev/null; then
    VERSION=$(kubectl version --client --short 2>/dev/null | head -n1)
    echo -e "${GREEN}✓${NC} $VERSION"
else
    echo -e "${RED}✗ Not installed${NC}"
    echo "  Install: brew install kubectl"
    ERRORS=$((ERRORS+1))
fi

# Check AWS CLI
echo -n "Checking AWS CLI... "
if command -v aws &> /dev/null; then
    VERSION=$(aws --version 2>&1 | cut -d' ' -f1)
    echo -e "${GREEN}✓${NC} $VERSION"
else
    echo -e "${RED}✗ Not installed${NC}"
    echo "  Install: brew install awscli"
    ERRORS=$((ERRORS+1))
fi

# Check AWS credentials
echo -n "Checking AWS credentials... "
if aws sts get-caller-identity &> /dev/null; then
    ACCOUNT=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
    USER=$(aws sts get-caller-identity --query Arn --output text 2>/dev/null | cut -d'/' -f2)
    echo -e "${GREEN}✓${NC} Account: $ACCOUNT, User: $USER"
else
    echo -e "${RED}✗ Not configured${NC}"
    echo "  Run: aws configure"
    ERRORS=$((ERRORS+1))
fi

# Check ECR repositories
echo -n "Checking ECR repositories... "
REPO_COUNT=$(aws ecr describe-repositories --region ap-south-1 --query 'length(repositories)' --output text 2>/dev/null)
if [ "$REPO_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Found $REPO_COUNT repositories"
else
    echo -e "${YELLOW}⚠${NC} No repositories found (will need to push images)"
fi

# Check if cluster already exists
echo -n "Checking existing EKS clusters... "
CLUSTER_COUNT=$(aws eks list-clusters --region ap-south-1 --query 'length(clusters)' --output text 2>/dev/null)
if [ "$CLUSTER_COUNT" -gt 0 ]; then
    CLUSTERS=$(aws eks list-clusters --region ap-south-1 --query 'clusters' --output text 2>/dev/null)
    echo -e "${YELLOW}⚠${NC} Found existing cluster(s): $CLUSTERS"
else
    echo -e "${GREEN}✓${NC} No existing clusters (ready for fresh deployment)"
fi

# Check Docker (for building/pushing images if needed)
echo -n "Checking Docker... "
if command -v docker &> /dev/null; then
    if docker info &> /dev/null; then
        VERSION=$(docker --version | cut -d' ' -f3 | tr -d ',')
        echo -e "${GREEN}✓${NC} Docker $VERSION (running)"
    else
        echo -e "${YELLOW}⚠${NC} Docker installed but not running"
        echo "  Start Docker Desktop if you need to build/push images"
    fi
else
    echo -e "${YELLOW}⚠${NC} Not installed (only needed if building new images)"
fi

echo ""
echo "=========================================="

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Ready to deploy! Run:"
    echo "  ./deploy-to-aws.sh"
else
    echo -e "${RED}✗ $ERRORS error(s) found${NC}"
    echo "Please fix the errors above before deploying."
    exit 1
fi

echo "=========================================="
