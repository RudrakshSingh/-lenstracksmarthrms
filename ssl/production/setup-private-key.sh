#!/bin/bash

# Private Key Setup Script
# This script helps you set up the private key for the SSL certificate

set -e

echo "🔐 SSL Private Key Setup"
echo "========================"
echo ""

# Check if private key already exists
if [ -f "ssl/production/private/key.pem" ]; then
    echo "⚠️  Private key already exists at: ssl/production/private/key.pem"
    read -p "Do you want to replace it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing private key."
        exit 0
    fi
fi

# Create directory if it doesn't exist
mkdir -p ssl/production/private

echo "📋 Instructions:"
echo "1. You need to provide the private key file that matches your certificate"
echo "2. The certificate is at: ssl/production/cert.pem"
echo "3. Place your private key file in: ssl/production/private/key.pem"
echo ""
read -p "Press Enter when you've placed the private key file, or Ctrl+C to cancel..."

# Check if file exists now
if [ ! -f "ssl/production/private/key.pem" ]; then
    echo "❌ Error: Private key file not found at ssl/production/private/key.pem"
    echo ""
    echo "Please place your private key file there and run this script again."
    exit 1
fi

# Set proper permissions
chmod 600 ssl/production/private/key.pem
echo "✅ Set permissions to 600 (owner read/write only)"

# Verify key matches certificate
echo ""
echo "🔍 Verifying private key matches certificate..."

CERT_MODULUS=$(openssl x509 -noout -modulus -in ssl/production/cert.pem 2>/dev/null | openssl md5 | awk '{print $2}')
KEY_MODULUS=$(openssl rsa -noout -modulus -in ssl/production/private/key.pem 2>/dev/null | openssl md5 | awk '{print $2}')

if [ "$CERT_MODULUS" == "$KEY_MODULUS" ]; then
    echo "✅ Private key matches certificate!"
else
    echo "❌ WARNING: Private key does NOT match certificate!"
    echo "   Certificate modulus: $CERT_MODULUS"
    echo "   Key modulus: $KEY_MODULUS"
    echo ""
    echo "Please verify you're using the correct private key for this certificate."
    exit 1
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update your .env file with:"
echo "   ENABLE_SSL=true"
echo "   SSL_CERT_PATH=./ssl/production/cert.pem"
echo "   SSL_KEY_PATH=./ssl/production/private/key.pem"
echo ""
echo "2. Restart your services"
echo ""
