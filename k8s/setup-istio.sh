#!/bin/bash

# ============================================================================
# Istio Setup Script
# Downloads and configures Istio for the first time
# ============================================================================

set -e

echo "=========================================="
echo "Istio Setup Script"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if Istio is already installed
if command -v istioctl &> /dev/null; then
    echo -e "${GREEN}✓ Istio is already installed${NC}"
    istioctl version
    exit 0
fi

# Determine download directory
DOWNLOAD_DIR="$HOME/istio"
ISTIO_VERSION="1.28.2"

echo "Downloading Istio $ISTIO_VERSION..."

# Create download directory
mkdir -p "$DOWNLOAD_DIR"
cd "$DOWNLOAD_DIR"

# Download Istio
if [ ! -d "istio-$ISTIO_VERSION" ]; then
    echo "Downloading Istio..."
    curl -L https://istio.io/downloadIstio | ISTIO_VERSION=$ISTIO_VERSION sh -
else
    echo "Istio directory already exists"
fi

# Add to PATH for current session
export PATH="$DOWNLOAD_DIR/istio-$ISTIO_VERSION/bin:$PATH"

# Verify istioctl is accessible
if [ -f "$DOWNLOAD_DIR/istio-$ISTIO_VERSION/bin/istioctl" ]; then
    echo -e "${GREEN}✓ Istio downloaded successfully${NC}"
    
    # Make istioctl executable
    chmod +x "$DOWNLOAD_DIR/istio-$ISTIO_VERSION/bin/istioctl"
    
    # Test istioctl
    "$DOWNLOAD_DIR/istio-$ISTIO_VERSION/bin/istioctl" version
    
    echo ""
    echo -e "${YELLOW}To use istioctl in this session, run:${NC}"
    echo "export PATH=\"$DOWNLOAD_DIR/istio-$ISTIO_VERSION/bin:\$PATH\""
    echo ""
    echo -e "${YELLOW}To make it permanent, add to ~/.zshrc:${NC}"
    echo "echo 'export PATH=\"$DOWNLOAD_DIR/istio-$ISTIO_VERSION/bin:\$PATH\"' >> ~/.zshrc"
    echo ""
    echo "Or run this script again and it will add it automatically:"
    read -p "Add to ~/.zshrc? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if ! grep -q "istio-$ISTIO_VERSION/bin" ~/.zshrc 2>/dev/null; then
            echo "export PATH=\"$DOWNLOAD_DIR/istio-$ISTIO_VERSION/bin:\$PATH\"" >> ~/.zshrc
            echo -e "${GREEN}✓ Added to ~/.zshrc${NC}"
            echo "Run: source ~/.zshrc or open a new terminal"
        else
            echo -e "${YELLOW}Already in ~/.zshrc${NC}"
        fi
    fi
else
    echo "Error: istioctl not found after download"
    exit 1
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Source your shell config: source ~/.zshrc"
echo "2. Verify: istioctl version"
echo "3. Install Istio: istioctl install --set values.defaultRevision=default -y"

