#!/usr/bin/env bash
# Build & push payroll-related images to ECR, rollout etelios-prod (RBAC + statutory + payroll workflow).
# Git not required — run from repo root on a machine with: docker, aws CLI, kubectl (prod context).
#
#   IMAGE_TAG=payroll-live-20260418 bash scripts/deploy-payroll-stack-aws-prod.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REGION="${AWS_REGION:-ap-south-1}"
ECR_ACCOUNT="${ECR_ACCOUNT:-383234048604}"
NAMESPACE="${K8S_NAMESPACE:-etelios-prod}"
IMAGE_TAG="${IMAGE_TAG:-payroll-live-$(date +%Y%m%d%H%M)}"

ECR_HOST="${ECR_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"

ROWS=(
  "auth-service|etelios-auth-service|microservices/auth-service/Dockerfile|auth-service|auth-service"
  "hr-service|etelios-hr-service|microservices/hr-service/Dockerfile|hr-service|hr-service"
  "payroll-service|etelios-payroll-service|microservices/payroll-service/Dockerfile|payroll-service|payroll-service"
  "financial-service|etelios-financial-service|microservices/financial-service/Dockerfile|financial-service|financial-service"
)

echo "==> IMAGE_TAG=$IMAGE_TAG"
echo "==> Namespace: $NAMESPACE"
echo "==> ECR: $ECR_HOST"
echo ""

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR_HOST"

for row in "${ROWS[@]}"; do
  IFS='|' read -r label repo dockerfile deployment container <<<"$row"
  ECR_IMAGE="${ECR_HOST}/${repo}:${IMAGE_TAG}"
  echo ">>> [$label] build $dockerfile"
  DOCKER_BUILDKIT=1 docker build \
    --platform linux/amd64 \
    -f "$dockerfile" \
    -t "$ECR_IMAGE" \
    "$ROOT"
  echo ">>> [$label] push $ECR_IMAGE"
  docker push "$ECR_IMAGE"
done

echo ""
echo "==> kubectl set image"
for row in "${ROWS[@]}"; do
  IFS='|' read -r _ repo _ deployment container <<<"$row"
  ECR_IMAGE="${ECR_HOST}/${repo}:${IMAGE_TAG}"
  kubectl -n "$NAMESPACE" set image "deployment/${deployment}" "${container}=${ECR_IMAGE}"
done

echo ""
echo "==> rollout status"
for row in "${ROWS[@]}"; do
  IFS='|' read -r _ _ _ deployment _ <<<"$row"
  kubectl -n "$NAMESPACE" rollout status "deployment/${deployment}" --timeout=400s
done

echo ""
echo "OK — payroll stack live: $IMAGE_TAG"
echo "Post-deploy (prod DocDB): kubectl exec into auth pod or run sync script with prod MONGO_URI:"
echo "  APPLY=1 npm run sync:payroll-roles   # in auth-service, against prod DB"
