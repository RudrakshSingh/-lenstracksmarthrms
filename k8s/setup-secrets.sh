#!/bin/bash

# Secrets Setup Script for Etelios AKS
# This script helps create Kubernetes secrets

set -e

NAMESPACE="${NAMESPACE:-etelios-backend-prod}"
SECRETS_FILE="k8s/secrets.yaml"

echo "🔐 Setting up Kubernetes Secrets for Etelios"
echo "Namespace: ${NAMESPACE}"
echo ""

# Check if secrets file exists
if [ -f "${SECRETS_FILE}" ]; then
    echo "⚠️  Warning: ${SECRETS_FILE} already exists"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

# Create secrets file from template
if [ ! -f "k8s/secrets.yaml.template" ]; then
    echo "❌ Template file not found: k8s/secrets.yaml.template"
    exit 1
fi

cp k8s/secrets.yaml.template ${SECRETS_FILE}

echo "📝 Please provide the following secrets:"
echo "   (Press Enter to skip optional fields)"
echo ""

# Function to encode and update secret
update_secret() {
    local key=$1
    local prompt=$2
    local required=${3:-false}
    
    read -p "${prompt}: " value
    if [ -z "$value" ]; then
        if [ "$required" = true ]; then
            echo "❌ This field is required!"
            update_secret "$key" "$prompt" true
            return
        fi
        echo "   Skipped (optional)"
        return
    fi
    
    encoded=$(echo -n "$value" | base64)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|<base64-encoded-${key}>|${encoded}|g" ${SECRETS_FILE}
    else
        # Linux
        sed -i "s|<base64-encoded-${key}>|${encoded}|g" ${SECRETS_FILE}
    fi
    echo "   ✅ Set"
}

# Required secrets
echo "=== Required Secrets ==="
update_secret "jwt-secret" "JWT Secret (min 32 characters)" true
update_secret "jwt-refresh-secret" "JWT Refresh Secret (min 32 characters)" true

echo ""
echo "=== Database Secrets ==="
update_secret "mongo-uri-auth" "MongoDB URI for Auth Service" true
update_secret "mongo-uri-hr" "MongoDB URI for HR Service" true
update_secret "mongo-uri-common" "MongoDB URI for Common Services" false

echo ""
echo "=== Redis Secrets ==="
update_secret "redis-password" "Redis Password (if required)" false

echo ""
echo "=== Email Configuration ==="
update_secret "email-host" "SMTP Host (e.g., smtp.gmail.com)" false
update_secret "email-user" "Email Username" false
update_secret "email-pass" "Email Password/App Password" false

echo ""
echo "=== Encryption Keys ==="
update_secret "encryption-key" "Encryption Key (32 characters)" false
update_secret "encryption-master-key" "Master Encryption Key (32 characters)" false

echo ""
echo "=== Cloud Storage ==="
update_secret "azure-storage-connection-string" "Azure Storage Connection String" false
update_secret "cloudinary-api-key" "Cloudinary API Key" false
update_secret "cloudinary-api-secret" "Cloudinary API Secret" false

echo ""
echo "=== SMS (Twilio) ==="
update_secret "twilio-account-sid" "Twilio Account SID" false
update_secret "twilio-auth-token" "Twilio Auth Token" false

echo ""
echo "✅ Secrets file created: ${SECRETS_FILE}"
echo ""
echo "📝 Review the file and make any necessary changes:"
echo "   nano ${SECRETS_FILE}"
echo ""
read -p "Apply secrets to Kubernetes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Create namespace if it doesn't exist
    kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply secrets
    kubectl apply -f ${SECRETS_FILE}
    
    echo "✅ Secrets applied to Kubernetes!"
    echo ""
    echo "To verify:"
    echo "   kubectl get secrets -n ${NAMESPACE}"
    echo "   kubectl describe secret etelios-secrets -n ${NAMESPACE}"
else
    echo "Secrets file saved. Apply manually with:"
    echo "   kubectl apply -f ${SECRETS_FILE}"
fi

