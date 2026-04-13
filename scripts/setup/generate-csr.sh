#!/bin/bash

# CSR (Certificate Signing Request) Generation Script for Backend
# This generates a CSR that can be used to request a certificate from Sectigo or other CA

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 CSR (Certificate Signing Request) Generation Script${NC}"
echo "======================================================"
echo ""

# Configuration
SSL_DIR="${SSL_DIR:-./ssl/production}"
KEY_SIZE="${KEY_SIZE:-2048}"

# Create SSL directory if it doesn't exist
mkdir -p "$SSL_DIR/private"

# Default domain configuration for backend
DOMAIN="${SSL_DOMAIN:-*.etelios.com}"
ROOT_DOMAIN="${SSL_ROOT_DOMAIN:-etelios.com}"

echo -e "${YELLOW}Backend Domain Configuration:${NC}"
echo "  Primary Domain (Wildcard): $DOMAIN"
echo "  Root Domain: $ROOT_DOMAIN"
echo ""

# File paths
KEY_PATH="$SSL_DIR/private/etelios-key.pem"
CSR_PATH="$SSL_DIR/etelios-backend.csr"
CONFIG_PATH="$SSL_DIR/openssl-csr.conf"

# Check if key already exists
if [ -f "$KEY_PATH" ]; then
    echo -e "${YELLOW}⚠️  Private key already exists at: $KEY_PATH${NC}"
    read -p "Do you want to use existing key or generate new one? (use/new): " -r
    echo
    if [[ ! $REPLY =~ ^[Nn][Ee][Ww]$ ]]; then
        USE_EXISTING_KEY=true
        echo -e "${GREEN}Using existing private key...${NC}"
    else
        echo -e "${YELLOW}Generating new private key...${NC}"
        USE_EXISTING_KEY=false
    fi
else
    USE_EXISTING_KEY=false
fi

# Generate private key if needed
if [ "$USE_EXISTING_KEY" = false ]; then
    echo -e "${GREEN}Generating private key (${KEY_SIZE} bits)...${NC}"
    openssl genrsa -out "$KEY_PATH" "$KEY_SIZE"
    chmod 600 "$KEY_PATH"
    echo -e "${GREEN}✅ Private key generated: $KEY_PATH${NC}"
else
    echo -e "${GREEN}✅ Using existing private key: $KEY_PATH${NC}"
fi

# Create OpenSSL config file for CSR
echo -e "${GREEN}Creating CSR configuration...${NC}"
cat > "$CONFIG_PATH" <<EOF
[req]
default_bits = ${KEY_SIZE}
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=IN
ST=Maharashtra
L=Mumbai
O=Etelios Technologies
OU=IT Department
CN=${DOMAIN}
emailAddress=admin@etelios.com

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${DOMAIN}
DNS.2 = ${ROOT_DOMAIN}
DNS.3 = api.etelios.com
DNS.4 = www.etelios.com
DNS.5 = backend.etelios.com
EOF

echo -e "${GREEN}✅ CSR config created: $CONFIG_PATH${NC}"
echo ""

# Generate CSR
echo -e "${GREEN}Generating Certificate Signing Request (CSR)...${NC}"
openssl req -new -key "$KEY_PATH" -out "$CSR_PATH" -config "$CONFIG_PATH"

# Set appropriate permissions
chmod 644 "$CSR_PATH"
chmod 600 "$KEY_PATH"

echo ""
echo -e "${GREEN}✅ CSR generated successfully!${NC}"
echo ""
echo -e "${BLUE}📄 Files Generated:${NC}"
echo "  Private Key: $KEY_PATH"
echo "  CSR File:    $CSR_PATH"
echo "  Config File: $CONFIG_PATH"
echo ""

# Display CSR content
echo -e "${YELLOW}📋 CSR Content (copy this to submit to CA):${NC}"
echo "=========================================="
cat "$CSR_PATH"
echo "=========================================="
echo ""

# Display CSR details
echo -e "${YELLOW}📊 CSR Details:${NC}"
openssl req -in "$CSR_PATH" -noout -text | grep -A 10 "Subject:"
echo ""

# Instructions
echo -e "${GREEN}📝 Next Steps:${NC}"
echo "1. Copy the CSR content above (between BEGIN and END lines)"
echo "2. Submit it to Sectigo or your Certificate Authority"
echo "3. Once certificate is issued, save it as: ssl/production/etelios-cert.pem"
echo "4. The private key is already saved at: $KEY_PATH"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
echo "- Keep the private key ($KEY_PATH) secure and NEVER share it"
echo "- The CSR can be shared with the Certificate Authority"
echo "- After receiving the certificate, you can use it with the existing private key"
echo ""

# Verify CSR
echo -e "${GREEN}🔍 Verifying CSR...${NC}"
if openssl req -in "$CSR_PATH" -noout -verify -key "$KEY_PATH" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ CSR is valid and matches the private key!${NC}"
else
    echo -e "${RED}❌ Warning: CSR verification failed${NC}"
fi

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
