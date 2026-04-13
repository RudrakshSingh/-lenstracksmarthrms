#!/usr/bin/env bash
# Push hr-service to AWS ECR and rollout AKS/EKS deployment (no git required).
# Prerequisites: docker, aws CLI (configured), kubectl (configured for etelios-prod).
#
#   From repo root:
#     bash scripts/deploy-hr-service-aws-prod.sh
#
# Optional:
#   IMAGE_TAG=perf-fix-20260409 bash scripts/deploy-hr-service-aws-prod.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REGION="${AWS_REGION:-ap-south-1}"
ECR_ACCOUNT="${ECR_ACCOUNT:-383234048604}"
ECR_REPO="etelios-hr-service"
IMAGE_TAG="${IMAGE_TAG:-latest}"
NAMESPACE="${K8S_NAMESPACE:-etelios-prod}"
DEPLOYMENT="hr-service"
CONTAINER="hr-service"

ECR_HOST="${ECR_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"
ECR_IMAGE="${ECR_HOST}/${ECR_REPO}:${IMAGE_TAG}"

echo "Build context: $ROOT"
echo "Image: $ECR_IMAGE"
echo "---"

DOCKER_BUILDKIT=1 docker build \
  --platform linux/amd64 \
  -f microservices/hr-service/Dockerfile \
  -t "${ECR_REPO}:${IMAGE_TAG}" \
  -t "${ECR_IMAGE}" \
  "$ROOT"

aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "$ECR_HOST"

docker push "$ECR_IMAGE"

kubectl -n "$NAMESPACE" set image "deployment/${DEPLOYMENT}" "${CONTAINER}=${ECR_IMAGE}"
kubectl -n "$NAMESPACE" rollout status "deployment/${DEPLOYMENT}" --timeout=300s

echo "OK — hr-service rolled out: $ECR_IMAGE"
