#!/bin/bash

# ============================================
# Create Kubernetes Secret for DocumentDB
# ============================================
# Creates a secure Kubernetes secret for DocumentDB credentials
# Does NOT expose credentials in code or config files
#
# Usage:
#   ./scripts/create-docdb-secret.sh
#   NAMESPACE=etelios-prod ./scripts/create-docdb-secret.sh
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
NAMESPACE="${NAMESPACE:-etelios-prod}"
SECRET_NAME="docdb-credentials"
DOCDB_TLS_CA_FILE="${DOCDB_TLS_CA_FILE:-/etc/ssl/certs/ca-cert.pem}"
MONGO_DB_NAME="${MONGO_DB_NAME:-hrms}"

ensure_tls_ca_file() {
    local uri="$1"
    if [[ -z "$uri" ]]; then
        echo "$uri"
        return
    fi

    if [[ "$uri" == *"tlsCAFile="* ]]; then
        echo "$uri"
        return
    fi

    if [[ "$uri" == *"?"* ]]; then
        echo "${uri}&tlsCAFile=${DOCDB_TLS_CA_FILE}"
    else
        echo "${uri}?tlsCAFile=${DOCDB_TLS_CA_FILE}"
    fi
}

ensure_docdb_auth_params() {
    local uri="$1"
    if [[ -z "$uri" ]]; then
        echo "$uri"
        return
    fi

    if [[ "$uri" != *"docdb.amazonaws.com"* ]]; then
        echo "$uri"
        return
    fi

    if [[ "$uri" != *"authSource="* ]]; then
        if [[ "$uri" == *"?"* ]]; then
            uri="${uri}&authSource=admin"
        else
            uri="${uri}?authSource=admin"
        fi
    fi

    if [[ "$uri" != *"authMechanism="* ]]; then
        if [[ "$uri" == *"?"* ]]; then
            uri="${uri}&authMechanism=SCRAM-SHA-1"
        else
            uri="${uri}?authMechanism=SCRAM-SHA-1"
        fi
    fi

    echo "$uri"
}

sanitize_uri_value() {
    local uri="$1"
    if [[ -z "$uri" ]] || [[ "$uri" == "<SET_VIA_ENV>" ]]; then
        echo ""
        return
    fi
    if [[ "$uri" == mongodb://* ]] || [[ "$uri" == mongodb+srv://* ]]; then
        echo "$uri"
        return
    fi
    echo ""
}

read_kv_value() {
    local key="$1"
    local value

    value=$(grep -m1 "^${key}=" documentdb-connection-info.txt | cut -d'=' -f2- || true)
    if [ -z "$value" ]; then
        value=$(grep -m1 "^export ${key}=" documentdb-connection-info.txt | cut -d'=' -f2- || true)
    fi

    value="${value%\"}"
    value="${value#\"}"
    echo "$value"
}

# Prefer environment variables. Fall back to local file only if present.
MONGO_URI="${MONGO_URI:-}"
MONGODB_URI="${MONGODB_URI:-}"
ENDPOINT="${DOCDB_ENDPOINT:-${ENDPOINT:-}}"
PORT="${DOCDB_PORT:-${PORT:-27017}}"
USERNAME="${DOCDB_USERNAME:-${USERNAME:-}}"
PASSWORD="${DOCDB_PASSWORD:-${PASSWORD:-}}"

if [ -f "documentdb-connection-info.txt" ]; then
    [ -z "$MONGO_URI" ] && MONGO_URI="$(read_kv_value "MONGO_URI")"
    [ -z "$MONGODB_URI" ] && MONGODB_URI="$(read_kv_value "MONGODB_URI")"
    [ -z "$ENDPOINT" ] && ENDPOINT="$(read_kv_value "ENDPOINT")"
    [ -z "$PORT" ] && PORT="$(read_kv_value "PORT")"
    [ -z "$USERNAME" ] && USERNAME="$(read_kv_value "USERNAME")"
    [ -z "$PASSWORD" ] && PASSWORD="$(read_kv_value "PASSWORD")"
fi

MONGO_URI="$(sanitize_uri_value "$MONGO_URI")"
MONGODB_URI="$(sanitize_uri_value "$MONGODB_URI")"

# Construct URI from endpoint credentials if URI is not provided.
if [ -z "$MONGO_URI" ] && [ -n "$ENDPOINT" ] && [ -n "$USERNAME" ] && [ -n "$PASSWORD" ]; then
    MONGO_URI="mongodb://${USERNAME}:${PASSWORD}@${ENDPOINT}:${PORT}/${MONGO_DB_NAME}?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
fi
if [ -z "$MONGODB_URI" ] && [ -n "$MONGO_URI" ]; then
    MONGODB_URI="$MONGO_URI"
fi

MONGO_URI="$(ensure_tls_ca_file "$MONGO_URI")"
MONGODB_URI="$(ensure_tls_ca_file "$MONGODB_URI")"
MONGO_URI="$(ensure_docdb_auth_params "$MONGO_URI")"
MONGODB_URI="$(ensure_docdb_auth_params "$MONGODB_URI")"

if [ -z "$MONGO_URI" ] || [ -z "$MONGODB_URI" ]; then
    error "MONGO_URI/MONGODB_URI is empty. Provide MONGO_URI/MONGODB_URI or DOCDB_ENDPOINT/DOCDB_USERNAME/DOCDB_PASSWORD."
    exit 1
fi
if [ -z "$ENDPOINT" ] || [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
    error "DOCDB endpoint/username/password is missing. Set DOCDB_ENDPOINT, DOCDB_USERNAME, DOCDB_PASSWORD."
    exit 1
fi

log "Creating Kubernetes secret for DocumentDB..."
log "Namespace: $NAMESPACE"
log "Secret name: $SECRET_NAME"

# Check if namespace exists
if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
    warning "Namespace $NAMESPACE does not exist. Creating..."
    kubectl create namespace "$NAMESPACE"
fi

# Check if secret already exists
if kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" &>/dev/null; then
    warning "Secret $SECRET_NAME already exists in namespace $NAMESPACE"
    read -p "Do you want to update it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Aborted. Using existing secret."
        exit 0
    fi
    log "Updating existing secret..."
    kubectl delete secret "$SECRET_NAME" -n "$NAMESPACE" --ignore-not-found=true
fi

# Create secret with DocumentDB credentials
log "Creating secret with DocumentDB credentials..."

kubectl create secret generic "$SECRET_NAME" \
    --namespace="$NAMESPACE" \
    --from-literal=MONGO_URI="$MONGO_URI" \
    --from-literal=MONGODB_URI="$MONGODB_URI" \
    --from-literal=MONGO_DB_NAME="$MONGO_DB_NAME" \
    --from-literal=DB_NAME="$MONGO_DB_NAME" \
    --from-literal=DOCDB_TLS="true" \
    --from-literal=DOCDB_TLS_CA_FILE="$DOCDB_TLS_CA_FILE" \
    --from-literal=DOCDB_ENDPOINT="$ENDPOINT" \
    --from-literal=DOCDB_PORT="$PORT" \
    --from-literal=DOCDB_USERNAME="$USERNAME" \
    --from-literal=DOCDB_PASSWORD="$PASSWORD"

log "✅ Secret created successfully!"
log ""
log "Secret details:"
kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath='{.data}' | jq 'keys' 2>/dev/null || echo "   (Use kubectl describe secret $SECRET_NAME -n $NAMESPACE to view)"
log ""
log "⚠️  IMPORTANT:"
log "   - Credentials are stored securely in Kubernetes"
log "   - No credentials are exposed in code or config files"
log "   - Secret is only accessible within the namespace"
log ""
log "Next step: Update deployments to use this secret"
