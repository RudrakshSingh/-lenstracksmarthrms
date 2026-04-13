#!/bin/bash

# Deploy SSL Certificate to Kubernetes Production
# This script creates a TLS secret from the Sectigo certificate

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 Deploying SSL Certificate to Kubernetes${NC}"
echo "=========================================="
echo ""

# Configuration
NAMESPACE="etelios-prod"
SECRET_NAME="etelios-tls"
CERT_FILE="ssl/production/etelios-cert.pem"
KEY_FILE="ssl/production/private/etelios-key.pem"

# Check if certificate file exists
if [ ! -f "$CERT_FILE" ]; then
    echo -e "${RED}❌ Error: Certificate file not found: $CERT_FILE${NC}"
    exit 1
fi

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
    echo -e "${RED}❌ Error: Private key file not found: $KEY_FILE${NC}"
    echo "   Please ensure the private key is saved at: $KEY_FILE"
    exit 1
fi

echo -e "${GREEN}✅ Certificate found: $CERT_FILE${NC}"
echo -e "${GREEN}✅ Private key found: $KEY_FILE${NC}"
echo ""

# Verify certificate
echo -e "${YELLOW}🔍 Verifying certificate...${NC}"
CERT_SUBJECT=$(openssl x509 -in "$CERT_FILE" -noout -subject 2>/dev/null | sed 's/subject=//')
CERT_DOMAIN=$(echo "$CERT_SUBJECT" | grep -o 'CN=[^,]*' | cut -d= -f2)
echo "   Subject: $CERT_SUBJECT"
echo "   Domain: $CERT_DOMAIN"
echo ""

# Verify certificate matches key
echo -e "${YELLOW}🔍 Verifying certificate matches private key...${NC}"
CERT_MODULUS=$(openssl x509 -noout -modulus -in "$CERT_FILE" 2>/dev/null | openssl md5 | awk '{print $2}')
KEY_MODULUS=$(openssl rsa -noout -modulus -in "$KEY_FILE" 2>/dev/null | openssl md5 | awk '{print $2}')

if [ "$CERT_MODULUS" == "$KEY_MODULUS" ]; then
    echo -e "${GREEN}✅ Certificate matches private key!${NC}"
else
    echo -e "${RED}❌ WARNING: Certificate does NOT match private key!${NC}"
    echo "   Certificate modulus: $CERT_MODULUS"
    echo "   Key modulus: $KEY_MODULUS"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ Error: kubectl is not installed or not in PATH${NC}"
    exit 1
fi

# Check if connected to cluster
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}❌ Error: Not connected to Kubernetes cluster${NC}"
    echo "   Please configure kubectl to connect to your cluster"
    exit 1
fi

echo -e "${GREEN}✅ Kubernetes cluster connection verified${NC}"
echo ""

# Create namespace if it doesn't exist
echo -e "${YELLOW}📦 Creating namespace if needed...${NC}"
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
echo -e "${GREEN}✅ Namespace ready: $NAMESPACE${NC}"
echo ""

# Delete existing secret if it exists
echo -e "${YELLOW}🗑️  Removing existing secret if present...${NC}"
kubectl delete secret "$SECRET_NAME" -n "$NAMESPACE" --ignore-not-found=true
echo ""

# Create TLS secret
echo -e "${GREEN}🔐 Creating TLS secret...${NC}"
kubectl create secret tls "$SECRET_NAME" \
    --cert="$CERT_FILE" \
    --key="$KEY_FILE" \
    --namespace="$NAMESPACE"

echo ""
echo -e "${GREEN}✅ TLS secret created successfully!${NC}"
echo ""

# Verify secret
echo -e "${YELLOW}🔍 Verifying secret...${NC}"
kubectl get secret "$SECRET_NAME" -n "$NAMESPACE"
echo ""

# Display secret details
echo -e "${YELLOW}📋 Secret Details:${NC}"
kubectl describe secret "$SECRET_NAME" -n "$NAMESPACE" | grep -E "Name:|Namespace:|Type:|Data:"
echo ""

echo -e "${GREEN}✅ SSL Certificate deployed to Kubernetes!${NC}"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Apply ingress configuration:"
echo "   kubectl apply -f k8s/ingress.yaml"
echo ""
echo "2. Verify ingress is using the secret:"
echo "   kubectl get ingress -n $NAMESPACE"
echo "   kubectl describe ingress etelios-ingress -n $NAMESPACE"
echo ""
echo "3. Test the endpoint:"
echo "   curl -I https://api.etelios.com/health"
echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
