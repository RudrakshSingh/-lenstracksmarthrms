#!/usr/bin/env bash
# Build attendance-service → push to ECR → apply ALB ingress + deployment → rollout (EKS prod).
#
# Prerequisites: aws CLI (logged in), docker, kubectl (kubeconfig for EKS), ECR repo etelios-attendance-service.
#
# Usage (from repo root):
#   ./scripts/ops/deploy-attendance-service-eks.sh
# Optional:
#   IMAGE_TAG=v1.2.3 NS=etelios-prod AWS_REGION=ap-south-1 APPLY_INGRESS=true ./scripts/ops/deploy-attendance-service-eks.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${PROJECT_ROOT}"

AWS_REGION="${AWS_REGION:-ap-south-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-383234048604}"
ECR_REPO="${ECR_REPO:-etelios-attendance-service}"
NS="${NS:-etelios-prod}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d-%H%M%S)}"
APPLY_INGRESS="${APPLY_INGRESS:-true}"

REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
LOCAL_NAME="${ECR_REPO}:build"
IMAGE_URI_TAG="${REGISTRY}/${ECR_REPO}:${IMAGE_TAG}"
IMAGE_URI_LATEST="${REGISTRY}/${ECR_REPO}:latest"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "Project root: ${PROJECT_ROOT}"
log "Image: ${IMAGE_URI_TAG} (+ :latest)"

log "1/6 ECR login"
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${REGISTRY}"

log "2/6 Docker build (linux/amd64)"
DOCKER_BUILDKIT=1 docker build --platform linux/amd64 \
  -f microservices/attendance-service/Dockerfile \
  -t "${LOCAL_NAME}" \
  .

log "3/6 Tag & push"
docker tag "${LOCAL_NAME}" "${IMAGE_URI_TAG}"
docker tag "${LOCAL_NAME}" "${IMAGE_URI_LATEST}"
docker push "${IMAGE_URI_TAG}"
docker push "${IMAGE_URI_LATEST}"
docker rmi "${LOCAL_NAME}" 2>/dev/null || true

log "4/6 kubectl apply deployment (Service + Deployment)"
kubectl apply -f k8s/etelios-prod/attendance-service-deployment.yaml

if [[ "${APPLY_INGRESS}" == "true" ]]; then
  log "5/6 kubectl apply ALB ingress"
  kubectl apply -f k8s/ingress-alb-fixed.yaml
else
  log "5/6 Skip ingress (APPLY_INGRESS != true)"
fi

log "6/6 Rollout (unique tag forces pull)"
kubectl -n "${NS}" set image "deployment/attendance-service" "attendance-service=${IMAGE_URI_TAG}"
kubectl -n "${NS}" rollout status "deployment/attendance-service" --timeout=300s
kubectl -n "${NS}" get pods -l app=attendance-service -o wide

log "Done. Active image: ${IMAGE_URI_TAG}"
