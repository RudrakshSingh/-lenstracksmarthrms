#!/usr/bin/env bash
# Build all microservice images (linux/amd64), push to ECR with one tag, rollout etelios-prod.
#
# Usage (repo root):
#   export RELEASE_TAG=permrbac-202604031200   # optional; default permrbac-YYYYMMDDHHMM
#   ./scripts/etelios-prod-full-release.sh
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REGISTRY="${ECR:-383234048604.dkr.ecr.ap-south-1.amazonaws.com}"
REGION="${AWS_REGION:-ap-south-1}"
NS="${NS:-etelios-prod}"
TAG="${RELEASE_TAG:-permrbac-$(date +%Y%m%d%H%M)}"

echo "==> Release tag: $TAG"
echo "==> Registry:    $REGISTRY"
echo "==> Namespace:   $NS"

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY"

build_push() {
  local dep="$1"
  local repo="$2"
  local dockerfile="$3"
  local image="${REGISTRY}/${repo}:${TAG}"
  echo ""
  echo ">>> [$dep] build $dockerfile -> $image"
  DOCKER_BUILDKIT=1 docker build \
    --platform linux/amd64 \
    -f "$dockerfile" \
    -t "$image" \
    "$ROOT"
  echo ">>> [$dep] push"
  docker push "$image"
}

ROWS=(
  "auth-service|etelios-auth-service|microservices/auth-service/Dockerfile"
  "hr-service|etelios-hr-service|microservices/hr-service/Dockerfile"
  "attendance-service|etelios-attendance-service|microservices/attendance-service/Dockerfile"
  "jts-service|etelios-jts-service|microservices/jts-service/Dockerfile"
  "sales-service|etelios-sales-service|microservices/sales-service/Dockerfile"
  "tenant-management-service|etelios-tenant-management-service|microservices/tenant-management-service/Dockerfile"
  "inventory-service|etelios-inventory-service|microservices/inventory-service/Dockerfile"
  "notification-service|etelios-notification-service|microservices/notification-service/Dockerfile"
  "crm-service|etelios-crm-service|microservices/crm-service/Dockerfile"
  "payroll-service|etelios-payroll-service|microservices/payroll-service/Dockerfile"
  "analytics-service|etelios-analytics-service|microservices/analytics-service/Dockerfile"
  "cpp-service|etelios-cpp-service|microservices/cpp-service/Dockerfile"
  "financial-service|etelios-financial-service|microservices/financial-service/Dockerfile"
  "realtime-service|etelios-realtime-service|microservices/realtime-service/Dockerfile"
  "prescription-service|etelios-prescription-service|microservices/prescription-service/Dockerfile"
  "service-management|etelios-service-management|microservices/service-management/Dockerfile"
  "purchase-service|etelios-purchase-service|microservices/purchase-service/Dockerfile"
  "monitoring-service|etelios-monitoring-service|microservices/monitoring-service/Dockerfile"
  "tenant-registry-service|etelios-tenant-registry-service|microservices/tenant-registry-service/Dockerfile"
  "document-service|etelios-document-service|microservices/document-service/Dockerfile"
)

for row in "${ROWS[@]}"; do
  IFS='|' read -r dep repo df <<<"$row"
  build_push "$dep" "$repo" "$df"
done

echo ""
echo "==> kubectl set image (api-gateway = jts image)"
kubectl -n "$NS" set image deployment/auth-service auth-service="${REGISTRY}/etelios-auth-service:${TAG}"
kubectl -n "$NS" set image deployment/hr-service hr-service="${REGISTRY}/etelios-hr-service:${TAG}"
kubectl -n "$NS" set image deployment/attendance-service attendance-service="${REGISTRY}/etelios-attendance-service:${TAG}"
kubectl -n "$NS" set image deployment/jts-service jts-service="${REGISTRY}/etelios-jts-service:${TAG}"
kubectl -n "$NS" set image deployment/sales-service sales-service="${REGISTRY}/etelios-sales-service:${TAG}"
kubectl -n "$NS" set image deployment/api-gateway api-gateway="${REGISTRY}/etelios-jts-service:${TAG}"

kubectl -n "$NS" set image deployment/tenant-management-service tenant-management-service="${REGISTRY}/etelios-tenant-management-service:${TAG}"
kubectl -n "$NS" set image deployment/inventory-service inventory-service="${REGISTRY}/etelios-inventory-service:${TAG}"
kubectl -n "$NS" set image deployment/notification-service notification-service="${REGISTRY}/etelios-notification-service:${TAG}"
kubectl -n "$NS" set image deployment/crm-service crm-service="${REGISTRY}/etelios-crm-service:${TAG}"
kubectl -n "$NS" set image deployment/payroll-service payroll-service="${REGISTRY}/etelios-payroll-service:${TAG}"
kubectl -n "$NS" set image deployment/analytics-service analytics-service="${REGISTRY}/etelios-analytics-service:${TAG}"
kubectl -n "$NS" set image deployment/cpp-service cpp-service="${REGISTRY}/etelios-cpp-service:${TAG}"
kubectl -n "$NS" set image deployment/financial-service financial-service="${REGISTRY}/etelios-financial-service:${TAG}"
kubectl -n "$NS" set image deployment/realtime-service realtime-service="${REGISTRY}/etelios-realtime-service:${TAG}"
kubectl -n "$NS" set image deployment/prescription-service prescription-service="${REGISTRY}/etelios-prescription-service:${TAG}"
kubectl -n "$NS" set image deployment/service-management service-management="${REGISTRY}/etelios-service-management:${TAG}"
kubectl -n "$NS" set image deployment/purchase-service purchase-service="${REGISTRY}/etelios-purchase-service:${TAG}"
kubectl -n "$NS" set image deployment/monitoring-service monitoring-service="${REGISTRY}/etelios-monitoring-service:${TAG}"
kubectl -n "$NS" set image deployment/tenant-registry-service tenant-registry-service="${REGISTRY}/etelios-tenant-registry-service:${TAG}"
kubectl -n "$NS" set image deployment/document-service document-service="${REGISTRY}/etelios-document-service:${TAG}"

echo ""
echo "==> rollout status (timeout 400s each)"
for dep in auth-service hr-service attendance-service jts-service sales-service api-gateway \
  tenant-management-service inventory-service notification-service crm-service payroll-service \
  analytics-service cpp-service financial-service realtime-service prescription-service \
  service-management purchase-service monitoring-service tenant-registry-service document-service; do
  kubectl -n "$NS" rollout status "deployment/$dep" --timeout=400s || true
done

echo ""
echo "Done. RELEASE_TAG=$TAG"
echo "Sync git: update k8s/etelios-prod/* image fields to :$TAG"
