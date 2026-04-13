#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/rudrakshsingh/Desktop/lenstracksmarthrms"
NS="${NS:-etelios-prod}"
AWS_REGION="${AWS_REGION:-ap-south-1}"
IMAGE_REPO="${IMAGE_REPO:-383234048604.dkr.ecr.ap-south-1.amazonaws.com/etelios-attendance-service}"
IMAGE_TAG="${IMAGE_TAG:-attfix-$(date +%Y%m%d-%H%M%S)}"
IMAGE_URI="${IMAGE_REPO}:${IMAGE_TAG}"

# Employee to repair (required)
EMAIL="${EMAIL:-Aditya@gmail.com}"
PASSWORD="${PASSWORD:-yrv0s48mA1!}"

# Admin for tenant operations
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@upcapto.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Upcapto@2026}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
error() { echo "❌ [$(date '+%Y-%m-%d %H:%M:%S')] $*" >&2; }

# Function to get ALB URL dynamically from Kubernetes
# Prioritizes ingress controller ALB for backend APIs
get_alb_url() {
  local url=""
  
  # Try to get from ingress-nginx controller service (most common for backend APIs)
  if url=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null); then
    if [ -n "$url" ] && [ "$url" != "null" ] && [ "$url" != "" ]; then
      # Test if backend API is accessible
      if curl -s --max-time 5 --head "http://$url/api/health" >/dev/null 2>&1 || \
         curl -s --max-time 5 -X POST "http://$url/api/auth/login" -H "Content-Type: application/json" -d '{}' >/dev/null 2>&1; then
        echo "http://$url"
        return 0
      fi
    fi
  fi
  
  # Try to get from any ingress in the namespace
  if url=$(kubectl get ingress -n "$NS" -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}' 2>/dev/null); then
    if [ -n "$url" ] && [ "$url" != "null" ] && [ "$url" != "" ]; then
      # Test if backend API is accessible
      if curl -s --max-time 5 --head "http://$url/api/health" >/dev/null 2>&1 || \
         curl -s --max-time 5 -X POST "http://$url/api/auth/login" -H "Content-Type: application/json" -d '{}' >/dev/null 2>&1; then
        echo "http://$url"
        return 0
      fi
    fi
  fi
  
  # Fallback URLs from documentation (prioritize ingress controller URLs for backend APIs)
  local fallbacks=(
    "http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com"
    "http://k8s-ingressn-ingressn-3f8da1d2c3-bf10356d47b52801.elb.ap-south-1.amazonaws.com"
    "http://etelios-frontend-alb-557163772.ap-south-1.elb.amazonaws.com"
  )
  
  # Try fallback URLs and verify backend API is accessible
  for fallback in "${fallbacks[@]}"; do
    # Test backend API endpoint (not just health, but actual API endpoint)
    if curl -s --max-time 5 -X POST "$fallback/api/auth/login" -H "Content-Type: application/json" -d '{}' >/dev/null 2>&1; then
      # Got a response (even if 400/401, means API is accessible)
      echo "$fallback"
      return 0
    elif curl -s --max-time 5 --head "$fallback/api/health" >/dev/null 2>&1; then
      # Health endpoint works
      echo "$fallback"
      return 0
    fi
  done
  
  return 1
}

# Get ALB URL
log "0/7 Getting ALB URL from Kubernetes..."
if [ -n "${ALB_URL:-}" ]; then
  log "Using provided ALB_URL: $ALB_URL"
else
  if ALB_URL=$(get_alb_url); then
    log "✅ Found ALB URL: $ALB_URL"
  else
    error "Could not determine ALB URL. Please set ALB_URL environment variable."
    error "Tried:"
    error "  1. kubectl get svc -n ingress-nginx ingress-nginx-controller"
    error "  2. kubectl get ingress -n $NS"
    error "  3. Fallback URLs from documentation"
    exit 1
  fi
fi

# Verify connectivity to backend API
log "Verifying backend API connectivity..."
if ! curl -s --max-time 10 -X POST "$ALB_URL/api/auth/login" -H "Content-Type: application/json" -d '{}' >/dev/null 2>&1 && \
   ! curl -s --max-time 10 --head "$ALB_URL/api/health" >/dev/null 2>&1 && \
   ! curl -s --max-time 10 --head "$ALB_URL/health" >/dev/null 2>&1; then
  error "Cannot reach backend API at $ALB_URL"
  error "This might be a network issue or the ALB might not be accessible from your location."
  error "You may need to:"
  error "  1. Check your network/VPN connection"
  error "  2. Verify the ALB security groups allow your IP"
  error "  3. Use kubectl port-forward as an alternative"
  exit 1
fi
log "✅ Backend API is reachable"

log "1/7 Validate JS syntax"
node --check "$ROOT/microservices/attendance-service/src/utils/hrServiceClient.js"
node --check "$ROOT/microservices/attendance-service/src/services/attendance.service.js"
node --check "$ROOT/scripts/fix-employee-store-assignment.js"

log "2/7 Fix employee store assignment"
if BACKEND_URL="$ALB_URL" EMAIL="$EMAIL" PASSWORD="$PASSWORD" ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  node "$ROOT/scripts/fix-employee-store-assignment.js"; then
  log "✅ Store assignment completed"
else
  log "⚠️  Store assignment failed (may require manual intervention due to tenant isolation)"
  log "   Continuing with deployment..."
fi

log "3/7 Docker login to ECR"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$(echo "$IMAGE_REPO" | cut -d/ -f1)"

log "4/7 Build attendance-service image: $IMAGE_URI"
docker build -f "$ROOT/microservices/attendance-service/Dockerfile" -t "$IMAGE_URI" "$ROOT"

log "5/7 Push image"
docker push "$IMAGE_URI"

log "6/7 Deploy image and wait rollout"
kubectl -n "$NS" set image deploy/attendance-service attendance-service="$IMAGE_URI"
if kubectl -n "$NS" rollout status deploy/attendance-service --timeout=600s; then
  log "✅ Deployment rollout completed"
else
  log "⚠️  Deployment rollout timeout or still in progress"
  log "   Check status with: kubectl -n $NS rollout status deploy/attendance-service"
  log "   Continuing with API test..."
fi

log "7/7 Run ingress API sweep"
bash "$ROOT/scripts/ops/test-all-ingress-apis.sh"

log "DONE"
echo "Deployed image: $IMAGE_URI"
