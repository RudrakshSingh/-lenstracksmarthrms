#!/bin/bash

# ============================================================================
# Complete Istio Installation Script
# Downloads istioctl, installs Istio in cluster, and configures PATH
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ISTIO_VERSION="1.28.2"
INSTALL_DIR="$HOME/istio"
ISTIO_BIN_DIR="$INSTALL_DIR/istio-$ISTIO_VERSION/bin"

echo "=========================================="
echo "Istio Installation Script"
echo "Version: $ISTIO_VERSION"
echo "=========================================="
echo ""

# Step 1: Check kubectl
echo -e "${BLUE}Step 1: Checking kubectl...${NC}"
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}✗ kubectl not found. Please install kubectl first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ kubectl found${NC}"
kubectl version --client 2>/dev/null | head -1 || echo "kubectl version check"

# Step 2: Check Kubernetes connection
echo ""
echo -e "${BLUE}Step 2: Checking Kubernetes cluster connection...${NC}"
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}✗ Cannot connect to Kubernetes cluster${NC}"
    echo ""
    echo "Please configure kubectl first:"
    echo "1. Check contexts: kubectl config get-contexts"
    echo "2. Set context: kubectl config use-context <context-name>"
    echo "3. For AKS: az aks get-credentials --resource-group <RG> --name <cluster-name>"
    exit 1
fi
echo -e "${GREEN}✓ Kubernetes cluster accessible${NC}"
kubectl cluster-info | head -1

# Step 3: Download Istio
echo ""
echo -e "${BLUE}Step 3: Downloading Istio...${NC}"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

if [ -d "istio-$ISTIO_VERSION" ]; then
    echo -e "${YELLOW}⚠ Istio directory already exists, skipping download${NC}"
else
    echo "Downloading Istio $ISTIO_VERSION..."
    curl -L https://istio.io/downloadIstio | ISTIO_VERSION=$ISTIO_VERSION sh -
    
    if [ ! -d "istio-$ISTIO_VERSION" ]; then
        echo -e "${RED}✗ Failed to download Istio${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Istio downloaded${NC}"
fi

# Step 4: Add to PATH
echo ""
echo -e "${BLUE}Step 4: Configuring PATH...${NC}"
if [ -f "$ISTIO_BIN_DIR/istioctl" ]; then
    chmod +x "$ISTIO_BIN_DIR/istioctl"
    
    # Add to PATH for current session
    export PATH="$ISTIO_BIN_DIR:$PATH"
    
    # Add to ~/.zshrc if not already there
    if ! grep -q "istio-$ISTIO_VERSION/bin" ~/.zshrc 2>/dev/null; then
        echo "" >> ~/.zshrc
        echo "# Istio" >> ~/.zshrc
        echo "export PATH=\"$ISTIO_BIN_DIR:\$PATH\"" >> ~/.zshrc
        echo -e "${GREEN}✓ Added to ~/.zshrc${NC}"
    else
        echo -e "${YELLOW}⚠ Already in ~/.zshrc${NC}"
    fi
    
    # Verify istioctl works
    if "$ISTIO_BIN_DIR/istioctl" version --remote=false &> /dev/null; then
        echo -e "${GREEN}✓ istioctl is working${NC}"
        "$ISTIO_BIN_DIR/istioctl" version --remote=false
    else
        echo -e "${RED}✗ istioctl not working${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ istioctl binary not found${NC}"
    exit 1
fi

# Step 5: Check if Istio is already installed
echo ""
echo -e "${BLUE}Step 5: Checking if Istio is already installed...${NC}"
if kubectl get namespace istio-system &> /dev/null; then
    echo -e "${YELLOW}⚠ Istio namespace already exists${NC}"
    read -p "Do you want to reinstall? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Uninstalling existing Istio..."
        "$ISTIO_BIN_DIR/istioctl" uninstall --purge -y || true
        kubectl delete namespace istio-system --ignore-not-found=true
        echo "Waiting for cleanup..."
        sleep 5
    else
        echo "Skipping installation. Istio is already installed."
        exit 0
    fi
fi

# Step 6: Install Istio
echo ""
echo -e "${BLUE}Step 6: Installing Istio in cluster...${NC}"
echo "This may take a few minutes..."

"$ISTIO_BIN_DIR/istioctl" install --set values.defaultRevision=default -y

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Istio installed successfully${NC}"
else
    echo -e "${RED}✗ Istio installation failed${NC}"
    exit 1
fi

# Step 7: Verify installation
echo ""
echo -e "${BLUE}Step 7: Verifying installation...${NC}"
sleep 10  # Wait for pods to start

if kubectl get pods -n istio-system &> /dev/null; then
    echo "Istio pods:"
    kubectl get pods -n istio-system
    
    # Wait for pods to be ready
    echo ""
    echo "Waiting for Istio pods to be ready..."
    kubectl wait --for=condition=ready pod -l app=istiod -n istio-system --timeout=300s || true
    kubectl wait --for=condition=ready pod -l app=istio-ingressgateway -n istio-system --timeout=300s || true
    
    echo ""
    echo -e "${GREEN}✓ Istio installation verified${NC}"
else
    echo -e "${RED}✗ Istio pods not found${NC}"
    exit 1
fi

# Step 8: Install addons (optional)
echo ""
read -p "Install Istio addons (Kiali, Prometheus, Grafana)? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Installing Istio addons...${NC}"
    
    # Install Kiali
    kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.28/samples/addons/kiali.yaml || true
    
    # Install Prometheus
    kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.28/samples/addons/prometheus.yaml || true
    
    # Install Grafana
    kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.28/samples/addons/grafana.yaml || true
    
    echo -e "${GREEN}✓ Addons installation initiated${NC}"
    echo "Note: Addons may take a few minutes to be ready"
fi

# Summary
echo ""
echo "=========================================="
echo -e "${GREEN}Installation Complete!${NC}"
echo "=========================================="
echo ""
echo "Istio is now installed in your cluster."
echo ""
echo "Next steps:"
echo "1. Source your shell: source ~/.zshrc"
echo "2. Verify: istioctl version"
echo "3. Deploy services: ./k8s/deploy-istio.sh all"
echo ""
echo "Access dashboards:"
echo "  istioctl dashboard kiali"
echo "  istioctl dashboard prometheus"
echo "  istioctl dashboard grafana"
echo ""
echo "Istio binary location: $ISTIO_BIN_DIR/istioctl"
echo "Add to PATH: export PATH=\"$ISTIO_BIN_DIR:\$PATH\""

