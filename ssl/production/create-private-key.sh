#!/bin/bash

# Script to create private key file from pasted content
# This helps when you have the private key content but need to save it as a file

set -e

echo "🔐 Create Private Key File"
echo "=========================="
echo ""
echo "This script will help you create the private key file."
echo ""
echo "⚠️  IMPORTANT: You need the PRIVATE KEY, not the certificate!"
echo ""
echo "The private key should look like one of these:"
echo "  -----BEGIN PRIVATE KEY-----"
echo "  -----BEGIN RSA PRIVATE KEY-----"
echo "  -----BEGIN EC PRIVATE KEY-----"
echo ""
echo "The certificate (which we already have) looks like:"
echo "  -----BEGIN CERTIFICATE-----"
echo ""
read -p "Do you have the PRIVATE KEY content? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "You need to obtain the private key that matches your certificate."
    echo "The private key should have been provided when you got the certificate from Sectigo."
    echo ""
    echo "If you don't have it:"
    echo "1. Check your Sectigo account/portal"
    echo "2. Contact your certificate provider"
    echo "3. Check where you originally saved it"
    exit 1
fi

echo ""
echo "📋 Instructions:"
echo "1. Copy your PRIVATE KEY content (including BEGIN and END lines)"
echo "2. Paste it below when prompted"
echo "3. Press Enter, then Ctrl+D (or type 'END' on a new line)"
echo ""
echo "Paste your private key content now:"
echo "-----------------------------------"

# Create temporary file
TEMP_FILE=$(mktemp)

# Read multi-line input until EOF or 'END'
cat > "$TEMP_FILE"

# Check if file contains private key markers
if ! grep -q "BEGIN.*PRIVATE KEY" "$TEMP_FILE"; then
    echo ""
    echo "❌ Error: This doesn't look like a private key!"
    echo ""
    echo "A private key should contain one of these:"
    echo "  - -----BEGIN PRIVATE KEY-----"
    echo "  - -----BEGIN RSA PRIVATE KEY-----"
    echo "  - -----BEGIN EC PRIVATE KEY-----"
    echo ""
    echo "You might have pasted the certificate instead."
    echo "The certificate starts with: -----BEGIN CERTIFICATE-----"
    echo ""
    rm "$TEMP_FILE"
    exit 1
fi

# Create directory if needed
mkdir -p ssl/production/private

# Move to final location
mv "$TEMP_FILE" ssl/production/private/key.pem

# Set secure permissions
chmod 600 ssl/production/private/key.pem

echo ""
echo "✅ Private key file created at: ssl/production/private/key.pem"
echo "✅ Permissions set to 600 (secure)"

# Verify key matches certificate
echo ""
echo "🔍 Verifying private key matches certificate..."

CERT_MODULUS=$(openssl x509 -noout -modulus -in ssl/production/cert.pem 2>/dev/null | openssl md5 | awk '{print $2}')
KEY_MODULUS=$(openssl rsa -noout -modulus -in ssl/production/private/key.pem 2>/dev/null 2>&1 | openssl md5 | awk '{print $2}')

if [ -z "$KEY_MODULUS" ]; then
    # Try EC key format
    KEY_MODULUS=$(openssl ec -noout -pubout -in ssl/production/private/key.pem 2>/dev/null | openssl md5 | awk '{print $2}')
fi

if [ "$CERT_MODULUS" == "$KEY_MODULUS" ] && [ -n "$KEY_MODULUS" ]; then
    echo "✅ SUCCESS: Private key matches certificate!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Update your .env file with:"
    echo "   ENABLE_SSL=true"
    echo "   SSL_CERT_PATH=./ssl/production/cert.pem"
    echo "   SSL_KEY_PATH=./ssl/production/private/key.pem"
    echo ""
    echo "2. Restart your services"
else
    echo "⚠️  WARNING: Could not verify key matches certificate"
    echo "   This might be okay if the key is in a different format"
    echo "   Please verify manually that this is the correct private key"
fi

echo ""
echo "✅ Setup complete!"

