#!/bin/bash

# ============================================
# Setup DocumentDB SSL Certificate
# ============================================
# Downloads AWS RDS/DocumentDB CA certificate bundle
# Creates Kubernetes secret for use in deployments
#
# Usage:
#   ./scripts/setup-docdb-ssl-cert.sh
#   NAMESPACE=etelios-prod ./scripts/setup-docdb-ssl-cert.sh
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

step() {
    echo -e "${BLUE}▶ $1${NC}"
}

# Configuration
NAMESPACE="${NAMESPACE:-etelios-prod}"
SECRET_NAME="docdb-ca-cert"
CERT_FILE="rds-combined-ca-bundle.pem"
CERT_URL="https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem"

echo "=========================================="
echo "DocumentDB SSL Certificate Setup"
echo "=========================================="
echo ""
echo "Namespace: $NAMESPACE"
echo "Secret Name: $SECRET_NAME"
echo "Certificate File: $CERT_FILE"
echo ""

# Check prerequisites
if ! command -v kubectl &> /dev/null; then
    error "kubectl not found. Please install kubectl."
    exit 1
fi

if ! command -v curl &> /dev/null; then
    error "curl not found. Please install curl."
    exit 1
fi

# Step 1: Download certificate
step "Step 1: Downloading AWS RDS/DocumentDB CA certificate bundle..."

if [ -f "$CERT_FILE" ]; then
    warning "Certificate file already exists: $CERT_FILE"
    read -p "Do you want to download again? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Using existing certificate file"
    else
        log "Downloading certificate..."
        curl -sS "$CERT_URL" -o "$CERT_FILE" || {
            error "Failed to download certificate"
            exit 1
        }
        log "✅ Certificate downloaded"
    fi
else
    log "Downloading certificate from AWS..."
    curl -sS "$CERT_URL" -o "$CERT_FILE" || {
        error "Failed to download certificate"
        exit 1
    }
    log "✅ Certificate downloaded: $CERT_FILE"
fi

# Verify certificate
if [ ! -f "$CERT_FILE" ]; then
    error "Certificate file not found: $CERT_FILE"
    exit 1
fi

CERT_SIZE=$(wc -c < "$CERT_FILE")
if [ "$CERT_SIZE" -lt 1000 ]; then
    error "Certificate file seems too small ($CERT_SIZE bytes). Download may have failed."
    exit 1
fi

log "Certificate file size: $CERT_SIZE bytes"

# Verify it's a valid certificate
if command -v openssl &> /dev/null; then
    log "Verifying certificate format..."
    if openssl x509 -in "$CERT_FILE" -text -noout &>/dev/null || \
       openssl crl2pkcs7 -nocrl -certfile "$CERT_FILE" &>/dev/null; then
        log "✅ Certificate format is valid"
    else
        warning "Could not verify certificate format, but continuing..."
    fi
fi

echo ""

# Step 2: Check if namespace exists
step "Step 2: Checking namespace..."

if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
    error "Namespace '$NAMESPACE' does not exist"
    read -p "Do you want to create it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kubectl create namespace "$NAMESPACE" || {
            error "Failed to create namespace"
            exit 1
        }
        log "✅ Namespace created: $NAMESPACE"
    else
        error "Cannot proceed without namespace"
        exit 1
    fi
else
    log "✅ Namespace exists: $NAMESPACE"
fi

echo ""

# Step 3: Create or update Kubernetes secret
step "Step 3: Creating Kubernetes secret..."

if kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" &>/dev/null; then
    warning "Secret '$SECRET_NAME' already exists in namespace '$NAMESPACE'"
    read -p "Do you want to update it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Deleting existing secret..."
        kubectl delete secret "$SECRET_NAME" -n "$NAMESPACE" || {
            error "Failed to delete existing secret"
            exit 1
        }
    else
        log "Keeping existing secret. Skipping creation."
        echo ""
        echo "=========================================="
        echo "✅ Setup Complete (using existing secret)"
        echo "=========================================="
        exit 0
    fi
fi

log "Creating secret '$SECRET_NAME' in namespace '$NAMESPACE'..."
kubectl create secret generic "$SECRET_NAME" \
    --from-file=ca-cert.pem="$CERT_FILE" \
    -n "$NAMESPACE" || {
    error "Failed to create secret"
    exit 1
}

log "✅ Secret created successfully"
echo ""

# Step 4: Verify secret
step "Step 4: Verifying secret..."

SECRET_CHECK=$(kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath='{.data.ca-cert\.pem}' 2>/dev/null | wc -c)
if [ "$SECRET_CHECK" -gt 0 ]; then
    log "✅ Secret verified - contains certificate data"
else
    warning "⚠️  Secret exists but may be empty"
fi

echo ""

# Step 5: Show how to use in deployments
step "Step 5: Deployment configuration"

echo ""
echo "The certificate is now available as a Kubernetes secret."
echo ""
echo "To use it in your deployments, add this to your deployment YAML:"
echo ""
echo "  volumeMounts:"
echo "  - name: docdb-ca-cert"
echo "    mountPath: /etc/ssl/certs/ca-cert.pem"
echo "    subPath: ca-cert.pem"
echo "    readOnly: true"
echo ""
echo "  volumes:"
echo "  - name: docdb-ca-cert"
echo "    secret:"
echo "      secretName: docdb-ca-cert"
echo ""

# Summary
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "📋 Summary:"
echo "  ✅ Certificate downloaded: $CERT_FILE"
echo "  ✅ Secret created: $SECRET_NAME"
echo "  ✅ Namespace: $NAMESPACE"
echo ""
echo "📝 Next Steps:"
echo "  1. Verify secret: kubectl get secret $SECRET_NAME -n $NAMESPACE"
echo "  2. Check secret data: kubectl describe secret $SECRET_NAME -n $NAMESPACE"
echo "  3. Update deployments to mount the certificate (see above)"
echo "  4. Restart deployments: kubectl rollout restart deployment/<service> -n $NAMESPACE"
echo ""
echo "🧪 Test Connection:"
echo "  The certificate will be available at: /etc/ssl/certs/ca-cert.pem"
echo "  Use in connection string: ?tls=true&tlsCAFile=/etc/ssl/certs/ca-cert.pem"
echo ""
