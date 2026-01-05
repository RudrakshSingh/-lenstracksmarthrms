#!/bin/bash

# Script to create TLS secret from production certificate
# This uses the Sectigo certificate from ssl/production/cert.pem

set -e

NAMESPACE="etelios-backend-prod"
SECRET_NAME="etelios-tls"
CERT_FILE="ssl/production/cert.pem"
KEY_FILE="ssl/production/key.pem"

echo "🔐 Creating TLS Secret for Ingress"
echo "===================================="
echo ""

# Check if certificate file exists
if [ ! -f "$CERT_FILE" ]; then
    echo "❌ Error: Certificate file not found: $CERT_FILE"
    exit 1
fi

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
    echo "⚠️  Warning: Private key file not found: $KEY_FILE"
    echo "   You need to provide the private key separately"
    echo "   Place it at: $KEY_FILE"
    echo ""
    read -p "Do you have the private key? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Cannot proceed without private key"
        exit 1
    fi
fi

# Create namespace if it doesn't exist
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Delete existing secret if it exists
kubectl delete secret "$SECRET_NAME" -n "$NAMESPACE" --ignore-not-found=true

# Create TLS secret
if [ -f "$KEY_FILE" ]; then
    echo "✅ Creating TLS secret with certificate and key..."
    kubectl create secret tls "$SECRET_NAME" \
        --cert="$CERT_FILE" \
        --key="$KEY_FILE" \
        --namespace="$NAMESPACE"
else
    echo "⚠️  Creating TLS secret with certificate only (key missing)..."
    echo "   You'll need to add the key later:"
    echo "   kubectl create secret tls $SECRET_NAME --cert=$CERT_FILE --key=<key-file> -n $NAMESPACE"
    exit 1
fi

echo ""
echo "✅ TLS secret created successfully!"
echo ""
echo "Verify with:"
echo "  kubectl get secret $SECRET_NAME -n $NAMESPACE"
echo "  kubectl describe secret $SECRET_NAME -n $NAMESPACE"
echo ""
echo "Note: If using cert-manager, it will automatically manage this secret."

