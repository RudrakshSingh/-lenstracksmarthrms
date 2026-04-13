#!/usr/bin/env bash
# Build API Gateway from repo ROOT Dockerfile, push to ECR, rollout api-gateway.
#
# Needed after changing src/config/services.config.js (e.g. /jts proxy) —
# kubectl rollout restart alone does NOT load new code; the image must be rebuilt.
#
# Usage (from repo root):
#   ./scripts/deploy-api-gateway-aws.sh
#   SKIP_KUBECTL=1 ./scripts/deploy-api-gateway-aws.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

AWS_REGION="${AWS_REGION:-ap-south-1}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-383234048604}"
ECR_REPO="${ECR_API_GATEWAY_REPO:-etelios-api-gateway}"
NAMESPACE="${K8S_NAMESPACE:-etelios-prod}"
DEPLOYMENT_FILE="${API_GATEWAY_DEPLOYMENT_FILE:-k8s/deployments/api-gateway.yaml}"

TAG="${TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo manual-$(date +%Y%m%d%H%M))}"
REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE="${REGISTRY}/${ECR_REPO}:${TAG}"
IMAGE_LATEST="${REGISTRY}/${ECR_REPO}:latest"

echo "==> API Gateway deploy: image=${IMAGE}"
echo "    (build context: repo root Dockerfile — includes src/server.js + src/config/)"

command -v docker >/dev/null || { echo "docker not found"; exit 1; }
command -v aws >/dev/null || { echo "aws CLI not found"; exit 1; }

aws sts get-caller-identity >/dev/null || { echo "AWS credentials failed"; exit 1; }

echo "==> ECR login"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$REGISTRY"

echo "==> docker build (root Dockerfile)"
docker build -t "$IMAGE" -t "$IMAGE_LATEST" -f "$ROOT/Dockerfile" "$ROOT"

echo "==> docker push"
docker push "$IMAGE"
docker push "$IMAGE_LATEST"

if [[ "${SKIP_KUBECTL:-}" == "1" ]]; then
  echo "==> SKIP_KUBECTL=1 — done. Run: kubectl -n $NAMESPACE rollout restart deployment/api-gateway"
  exit 0
fi

command -v kubectl >/dev/null || { echo "kubectl not found"; exit 1; }

echo "==> kubectl apply $DEPLOYMENT_FILE"
kubectl apply -f "$ROOT/$DEPLOYMENT_FILE"

echo "==> rollout restart (imagePullPolicy: Always pulls new :latest)"
kubectl -n "$NAMESPACE" rollout restart deployment/api-gateway
kubectl -n "$NAMESPACE" rollout status deployment/api-gateway --timeout=300s

echo "==> Test: curl should NOT show gateway 404 hint for /jts (wait ~30s if needed)"
echo "    curl -sS \"https://api.etelios.com/jts/tasks?page=1&limit=1\" | head -c 200"
