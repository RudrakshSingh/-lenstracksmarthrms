#!/usr/bin/env bash
# Fast prod rollout: auth + hr + attendance + jts + sales + api-gateway (JTS image).
# Builds 5 images in parallel, one shared tag on all repos.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
R="${ECR:-383234048604.dkr.ecr.ap-south-1.amazonaws.com}"
REGION="${AWS_REGION:-ap-south-1}"
NS="${NS:-etelios-prod}"
TAG="${RELEASE_TAG:-permrbac-$(date +%Y%m%d%H%M)}"

echo "TAG=$TAG"
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$R"

one() {
  local repo="$1" df="$2"
  local img="${R}/${repo}:${TAG}"
  echo "[$repo] start"
  DOCKER_BUILDKIT=1 docker build --platform linux/amd64 -f "$df" -t "$img" "$ROOT"
  docker push "$img"
  echo "[$repo] done"
}

one etelios-auth-service microservices/auth-service/Dockerfile &
one etelios-hr-service microservices/hr-service/Dockerfile &
one etelios-attendance-service microservices/attendance-service/Dockerfile &
one etelios-jts-service microservices/jts-service/Dockerfile &
one etelios-sales-service microservices/sales-service/Dockerfile &
wait

kubectl -n "$NS" set image deployment/auth-service auth-service="${R}/etelios-auth-service:${TAG}"
kubectl -n "$NS" set image deployment/hr-service hr-service="${R}/etelios-hr-service:${TAG}"
kubectl -n "$NS" set image deployment/attendance-service attendance-service="${R}/etelios-attendance-service:${TAG}"
kubectl -n "$NS" set image deployment/jts-service jts-service="${R}/etelios-jts-service:${TAG}"
kubectl -n "$NS" set image deployment/sales-service sales-service="${R}/etelios-sales-service:${TAG}"
kubectl -n "$NS" set image deployment/api-gateway api-gateway="${R}/etelios-jts-service:${TAG}"

for d in auth-service hr-service attendance-service jts-service sales-service api-gateway; do
  kubectl -n "$NS" rollout status "deployment/$d" --timeout=300s
done
echo "OK RELEASE_TAG=$TAG"
