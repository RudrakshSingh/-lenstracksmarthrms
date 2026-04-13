#!/bin/bash

# Retrieve SSL Certificate and Private Key from Azure Key Vault using Azure CLI
# This is an alternative method if the Node.js script doesn't work

set -e

KEY_VAULT_NAME="${AZURE_KEY_VAULT_NAME:-etelios-keyvault}"
CERTIFICATE_NAME="${CERTIFICATE_NAME:-etelios-wildcard}"
OUTPUT_DIR="./ssl/production"

echo "🔐 Retrieving SSL Certificate from Azure Key Vault"
echo "==================================================="
echo "Key Vault: $KEY_VAULT_NAME"
echo "Certificate: $CERTIFICATE_NAME"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed"
    echo "   Install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in
if ! az account show &> /dev/null; then
    echo "⚠️  Not logged into Azure. Logging in..."
    az login
fi

# Create output directory
mkdir -p "$OUTPUT_DIR/private"

echo "📥 Retrieving certificate..."

# Get certificate (as secret)
CERT_CONTENT=$(az keyvault secret show \
    --vault-name "$KEY_VAULT_NAME" \
    --name "$CERTIFICATE_NAME" \
    --query value -o tsv 2>/dev/null || echo "")

if [ -z "$CERT_CONTENT" ]; then
    echo "❌ Certificate '$CERTIFICATE_NAME' not found in Key Vault"
    echo ""
    echo "Available certificates:"
    az keyvault certificate list --vault-name "$KEY_VAULT_NAME" --query "[].name" -o tsv
    exit 1
fi

# Save certificate
echo "$CERT_CONTENT" > "$OUTPUT_DIR/cert.pem"
chmod 644 "$OUTPUT_DIR/cert.pem"
echo "✅ Certificate saved to: $OUTPUT_DIR/cert.pem"

# Try to get private key
echo ""
echo "📥 Retrieving private key..."

PRIVATE_KEY_NAMES=(
    "${CERTIFICATE_NAME}-key"
    "${CERTIFICATE_NAME}-private-key"
    "${CERTIFICATE_NAME}PrivateKey"
    "${CERTIFICATE_NAME}_key"
)

KEY_FOUND=false
for KEY_NAME in "${PRIVATE_KEY_NAMES[@]}"; do
    KEY_CONTENT=$(az keyvault secret show \
        --vault-name "$KEY_VAULT_NAME" \
        --name "$KEY_NAME" \
        --query value -o tsv 2>/dev/null || echo "")
    
    if [ -n "$KEY_CONTENT" ]; then
        echo "$KEY_CONTENT" > "$OUTPUT_DIR/private/key.pem"
        chmod 600 "$OUTPUT_DIR/private/key.pem"
        echo "✅ Private key saved to: $OUTPUT_DIR/private/key.pem"
        KEY_FOUND=true
        break
    fi
done

if [ "$KEY_FOUND" = false ]; then
    echo "⚠️  Private key not found as separate secret"
    echo ""
    echo "💡 In Azure Key Vault, certificates store the private key within the certificate object."
    echo "   You can download the full certificate bundle and extract the key:"
    echo ""
    echo "   az keyvault certificate download \\"
    echo "     --vault-name $KEY_VAULT_NAME \\"
    echo "     --name $CERTIFICATE_NAME \\"
    echo "     --file certificate.pfx"
    echo ""
    echo "   Then extract the key using:"
    echo "   openssl pkcs12 -in certificate.pfx -nocerts -nodes -out key.pem"
fi

echo ""
echo "✅ Done!"
echo ""
echo "📝 Verify certificate:"
echo "   openssl x509 -in $OUTPUT_DIR/cert.pem -text -noout"

