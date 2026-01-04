#!/bin/bash

# Extract Private Key from Azure Key Vault Certificate
# In Key Vault, certificates store the private key within the certificate bundle

set -e

KEY_VAULT_NAME="${AZURE_KEY_VAULT_NAME:-etelios-keyvault}"
CERTIFICATE_NAME="${CERTIFICATE_NAME:-etelios-wildcard}"
OUTPUT_DIR="./ssl/production"
TEMP_DIR=$(mktemp -d)

echo "🔐 Extracting Certificate and Private Key from Azure Key Vault"
echo "=============================================================="
echo "Key Vault: $KEY_VAULT_NAME"
echo "Certificate: $CERTIFICATE_NAME"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🧹 Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Create output directory
mkdir -p "$OUTPUT_DIR/private"

echo "📥 Downloading certificate bundle from Key Vault..."

# Download certificate as PFX (contains both cert and key)
PFX_FILE="$TEMP_DIR/certificate.pfx"
az keyvault certificate download \
    --vault-name "$KEY_VAULT_NAME" \
    --name "$CERTIFICATE_NAME" \
    --file "$PFX_FILE" 2>/dev/null || {
    echo "❌ Failed to download certificate bundle"
    echo ""
    echo "Trying alternative method: downloading as secret..."
    
    # Alternative: Get certificate as secret (base64 encoded)
    CERT_SECRET=$(az keyvault secret show \
        --vault-name "$KEY_VAULT_NAME" \
        --name "$CERTIFICATE_NAME" \
        --query value -o tsv 2>/dev/null)
    
    if [ -z "$CERT_SECRET" ]; then
        echo "❌ Certificate not found in Key Vault"
        echo ""
        echo "Available certificates:"
        az keyvault certificate list --vault-name "$KEY_VAULT_NAME" --query "[].name" -o tsv
        exit 1
    fi
    
    # Save certificate
    echo "$CERT_SECRET" > "$OUTPUT_DIR/cert.pem"
    chmod 644 "$OUTPUT_DIR/cert.pem"
    echo "✅ Certificate saved (as secret)"
    
    echo ""
    echo "⚠️  Private key not available as separate secret"
    echo "   The certificate was stored as a secret, not a certificate bundle"
    echo "   You may need to:"
    echo "   1. Re-upload the certificate with the private key to Key Vault"
    echo "   2. Or obtain the private key from your certificate provider"
    exit 0
}

if [ ! -f "$PFX_FILE" ] || [ ! -s "$PFX_FILE" ]; then
    echo "❌ Failed to download certificate bundle"
    exit 1
fi

echo "✅ Certificate bundle downloaded"
echo ""

# Check if PFX file is valid
if ! file "$PFX_FILE" | grep -q "PKCS"; then
    echo "⚠️  File doesn't appear to be a valid PFX bundle"
    echo "   Trying to extract anyway..."
fi

echo "🔓 Extracting certificate and private key from bundle..."
echo "   (You may be prompted for the PFX password - try leaving it blank or 'password')"
echo ""

# Extract private key (try without password first, then with common passwords)
EXTRACTED_KEY=false

# Try without password
if openssl pkcs12 -in "$PFX_FILE" -nocerts -nodes -out "$OUTPUT_DIR/private/key.pem" -passin pass: 2>/dev/null; then
    EXTRACTED_KEY=true
    echo "✅ Private key extracted (no password required)"
elif openssl pkcs12 -in "$PFX_FILE" -nocerts -nodes -out "$OUTPUT_DIR/private/key.pem" -passin pass:password 2>/dev/null; then
    EXTRACTED_KEY=true
    echo "✅ Private key extracted (password: 'password')"
else
    echo "⚠️  Could not extract private key automatically"
    echo "   The PFX file may be password-protected"
    echo ""
    echo "   Try extracting manually:"
    echo "   openssl pkcs12 -in $PFX_FILE -nocerts -nodes -out $OUTPUT_DIR/private/key.pem"
    echo ""
    read -p "Enter PFX password (or press Enter to skip): " -s PFX_PASSWORD
    echo ""
    
    if [ -n "$PFX_PASSWORD" ]; then
        if openssl pkcs12 -in "$PFX_FILE" -nocerts -nodes -out "$OUTPUT_DIR/private/key.pem" -passin pass:"$PFX_PASSWORD" 2>/dev/null; then
            EXTRACTED_KEY=true
            echo "✅ Private key extracted with provided password"
        else
            echo "❌ Extraction failed with provided password"
        fi
    fi
fi

# Extract certificate
if openssl pkcs12 -in "$PFX_FILE" -clcerts -nokeys -out "$OUTPUT_DIR/cert.pem" -passin pass: 2>/dev/null || \
   openssl pkcs12 -in "$PFX_FILE" -clcerts -nokeys -out "$OUTPUT_DIR/cert.pem" -passin pass:password 2>/dev/null; then
    echo "✅ Certificate extracted"
else
    # If PFX extraction fails, try to get certificate from secret
    CERT_SECRET=$(az keyvault secret show \
        --vault-name "$KEY_VAULT_NAME" \
        --name "$CERTIFICATE_NAME" \
        --query value -o tsv 2>/dev/null)
    
    if [ -n "$CERT_SECRET" ]; then
        echo "$CERT_SECRET" > "$OUTPUT_DIR/cert.pem"
        echo "✅ Certificate saved (from secret)"
    else
        echo "⚠️  Could not extract certificate"
    fi
fi

# Set permissions
chmod 644 "$OUTPUT_DIR/cert.pem"
if [ "$EXTRACTED_KEY" = true ]; then
    chmod 600 "$OUTPUT_DIR/private/key.pem"
fi

echo ""
if [ "$EXTRACTED_KEY" = true ]; then
    echo "✅ SUCCESS! Certificate and private key extracted"
    echo ""
    echo "📁 Files created:"
    echo "   Certificate: $OUTPUT_DIR/cert.pem"
    echo "   Private Key: $OUTPUT_DIR/private/key.pem"
    echo ""
    echo "🔍 Verifying key matches certificate..."
    
    CERT_MODULUS=$(openssl x509 -noout -modulus -in "$OUTPUT_DIR/cert.pem" 2>/dev/null | openssl md5 | awk '{print $2}')
    KEY_MODULUS=$(openssl rsa -noout -modulus -in "$OUTPUT_DIR/private/key.pem" 2>/dev/null | openssl md5 | awk '{print $2}')
    
    if [ "$CERT_MODULUS" = "$KEY_MODULUS" ] && [ -n "$CERT_MODULUS" ]; then
        echo "✅ Private key matches certificate!"
    else
        echo "⚠️  Warning: Could not verify key matches certificate"
        echo "   Certificate modulus: $CERT_MODULUS"
        echo "   Key modulus: $KEY_MODULUS"
    fi
else
    echo "⚠️  Certificate extracted, but private key extraction failed"
    echo ""
    echo "💡 Next steps:"
    echo "   1. Try extracting manually with:"
    echo "      openssl pkcs12 -in $PFX_FILE -nocerts -nodes -out $OUTPUT_DIR/private/key.pem"
    echo "   2. Or check if the private key is stored separately in Key Vault"
    echo "   3. Or contact your certificate provider for the private key"
fi

echo ""
echo "📝 Next steps:"
echo "   1. Update environment: ENABLE_SSL=true"
echo "   2. Set paths: SSL_CERT_PATH=./ssl/production/cert.pem"
if [ "$EXTRACTED_KEY" = true ]; then
    echo "      SSL_KEY_PATH=./ssl/production/private/key.pem"
fi
echo "   3. Restart services"

