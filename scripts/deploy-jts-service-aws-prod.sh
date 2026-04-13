#!/usr/bin/env bash
# Build jts-service, push to ECR, rollout (no git). Same pattern as deploy-hr-service-aws-prod.sh.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
REGION="${AWS_REGION:-ap-south-1}"
ECR_ACCOUNT="${ECR_ACCOUNT:-383234048604}"
ECR_REPO="etelios-jts-service"
IMAGE_TAG="${IMAGE_TAG:-latest}"
NAMESPACE="${K8S_NAMESPACE:-etelios-prod}"
ECR_HOST="${ECR_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"
ECR_IMAGE="${ECR_HOST}/${ECR_REPO}:${IMAGE_TAG}"

echo "Image: $ECR_IMAGE"
DOCKER_BUILDKIT=1 docker build \
  --platform linux/amd64 \
  -f microservices/jts-service/Dockerfile \
  -t "${ECR_REPO}:${IMAGE_TAG}" \
  -t "${ECR_IMAGE}" \
  "$ROOT"
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR_HOST"
docker push "$ECR_IMAGE"
kubectl -n "$NAMESPACE" set image deployment/jts-service jts-service="$ECR_IMAGE"
kubectl -n "$NAMESPACE" rollout status deployment/jts-service --timeout=300s
echo "OK — jts-service rolled out: $ECR_IMAGE"
