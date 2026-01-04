#!/bin/bash

# SSL Certificate Generation Script
# Generates self-signed certificates for development/testing
# For production, use proper CA-signed certificates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}SSL Certificate Generation Script${NC}"
echo "=========================================="

# Configuration
SSL_DIR="${SSL_DIR:-./ssl}"
DAYS_VALID="${DAYS_VALID:-365}"
KEY_SIZE="${KEY_SIZE:-2048}"

# Create SSL directory if it doesn't exist
mkdir -p "$SSL_DIR"

CERT_PATH="$SSL_DIR/cert.pem"
KEY_PATH="$SSL_DIR/key.pem"

# Check if certificates already exist
if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
    echo -e "${YELLOW}Certificates already exist at:${NC}"
    echo "  Certificate: $CERT_PATH"
    echo "  Private Key: $KEY_PATH"
    read -p "Do you want to regenerate them? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}Skipping certificate generation.${NC}"
        exit 0
    fi
    echo -e "${YELLOW}Removing existing certificates...${NC}"
    rm -f "$CERT_PATH" "$KEY_PATH"
fi

# Get domain/IP from environment or prompt
DOMAIN="${SSL_DOMAIN:-localhost}"
if [ -z "$SSL_DOMAIN" ]; then
    echo -e "${YELLOW}Enter domain name or IP address (default: localhost):${NC}"
    read -r DOMAIN
    DOMAIN="${DOMAIN:-localhost}"
fi

# Generate subject alternative names
SAN="DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1"
if [ "$DOMAIN" != "localhost" ]; then
    # Check if it's an IP address
    if [[ $DOMAIN =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        SAN="$SAN,IP:$DOMAIN"
    else
        SAN="$SAN,DNS:$DOMAIN,DNS:*.$DOMAIN"
    fi
fi

echo -e "${GREEN}Generating SSL certificates...${NC}"
echo "  Domain/IP: $DOMAIN"
echo "  Valid for: $DAYS_VALID days"
echo "  Key size: $KEY_SIZE bits"
echo "  Output directory: $SSL_DIR"

# Generate private key
openssl genrsa -out "$KEY_PATH" "$KEY_SIZE"

# Generate certificate signing request and self-signed certificate
openssl req -new -x509 -key "$KEY_PATH" -out "$CERT_PATH" -days "$DAYS_VALID" \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN" \
    -addext "subjectAltName=$SAN"

# Set appropriate permissions
chmod 600 "$KEY_PATH"
chmod 644 "$CERT_PATH"

echo -e "${GREEN}✓ Certificates generated successfully!${NC}"
echo ""
echo "Certificate: $CERT_PATH"
echo "Private Key: $KEY_PATH"
echo ""
echo -e "${YELLOW}Note: These are self-signed certificates for development only.${NC}"
echo -e "${YELLOW}For production, use CA-signed certificates from Let's Encrypt or a commercial CA.${NC}"
echo ""
echo "To use these certificates, set the following environment variables:"
echo "  ENABLE_SSL=true"
echo "  SSL_CERT_PATH=$CERT_PATH"
echo "  SSL_KEY_PATH=$KEY_PATH"

