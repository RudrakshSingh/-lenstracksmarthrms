#!/usr/bin/env bash
# Push auth-service to AWS ECR and rollout deployment (same pattern as deploy-hr-service-aws-prod.sh).
#   IMAGE_TAG=my-tag bash scripts/deploy-auth-service-aws-prod.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REGION="${AWS_REGION:-ap-south-1}"
ECR_ACCOUNT="${ECR_ACCOUNT:-383234048604}"
ECR_REPO="etelios-auth-service"
IMAGE_TAG="${IMAGE_TAG:-latest}"
NAMESPACE="${K8S_NAMESPACE:-etelios-prod}"
DEPLOYMENT="auth-service"
CONTAINER="auth-service"

ECR_HOST="${ECR_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"
ECR_IMAGE="${ECR_HOST}/${ECR_REPO}:${IMAGE_TAG}"

echo "Build context: $ROOT"
echo "Image: $ECR_IMAGE"
echo "---"

DOCKER_BUILDKIT=1 docker build \
  --platform linux/amd64 \
  -f microservices/auth-service/Dockerfile \
  -t "${ECR_REPO}:${IMAGE_TAG}" \
  -t "${ECR_IMAGE}" \
  "$ROOT"

aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "$ECR_HOST"

docker push "$ECR_IMAGE"

kubectl -n "$NAMESPACE" set image "deployment/${DEPLOYMENT}" "${CONTAINER}=${ECR_IMAGE}"
kubectl -n "$NAMESPACE" rollout status "deployment/${DEPLOYMENT}" --timeout=300s

echo "OK — auth-service rolled out: $ECR_IMAGE"
