#!/bin/bash

# =====================================================================
# Generate Random Secrets for .env File
# =====================================================================
# This script generates strong random secrets for JWT and other configs
# Usage: ./scripts/generate-env-secrets.sh
# =====================================================================

echo "🔐 Generating Random Secrets for .env File..."
echo ""
echo "=================================================="
echo "Copy these values to your .env file:"
echo "=================================================="
echo ""

# Generate JWT Secret (64 bytes = 88 characters base64)
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo "# JWT Authentication Secret (Generated: $(date))"
echo "JWT_SECRET=$JWT_SECRET"
echo ""

# Generate JWT Refresh Secret (different from JWT_SECRET)
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo "# JWT Refresh Secret (Generated: $(date))"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo ""

# Generate Session Secret
SESSION_SECRET=$(openssl rand -base64 32 | tr -d '\n')
echo "# Session Secret (Generated: $(date))"
echo "SESSION_SECRET=$SESSION_SECRET"
echo ""

echo "=================================================="
echo "✅ Secrets Generated Successfully!"
echo "=================================================="
echo ""
echo "📋 Next Steps:"
echo "1. Copy the values above"
echo "2. Paste into your .env file"
echo "3. Replace JWT_SECRET and JWT_REFRESH_SECRET placeholders"
echo "4. Save and restart your services"
echo ""
echo "⚠️  IMPORTANT: Keep these secrets safe!"
echo "   - Never commit them to Git"
echo "   - Store securely in Azure Key Vault for production"
echo "   - Use different secrets for dev/staging/prod"
echo ""

# Optionally create a secrets.txt file (NOT for Git!)
read -p "💾 Save to secrets.txt file? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    SECRETS_FILE="secrets.txt"
    {
        echo "# Generated Secrets - $(date)"
        echo "# WARNING: DO NOT COMMIT THIS FILE TO GIT!"
        echo ""
        echo "JWT_SECRET=$JWT_SECRET"
        echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
        echo "SESSION_SECRET=$SESSION_SECRET"
        echo ""
        echo "# For Kubernetes (base64 encoded):"
        echo "JWT_SECRET_BASE64=$(echo -n "$JWT_SECRET" | base64)"
        echo "JWT_REFRESH_SECRET_BASE64=$(echo -n "$JWT_REFRESH_SECRET" | base64)"
    } > "$SECRETS_FILE"
    echo "✅ Secrets saved to: $SECRETS_FILE"
    echo "⚠️  Remember to delete this file after copying values!"
fi

echo ""
echo "🎉 Done! Your secrets are ready to use."

