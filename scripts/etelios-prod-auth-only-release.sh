#!/usr/bin/env bash
# Prod: sirf auth-service — Docker build → ECR push → kubectl rollout (ingress touch nahi).
# Repo root se chalao. Git zaroori nahi; bas local code + AWS creds + kubectl context.
#
# Usage:
#   cd /path/to/lenstracksmarthrms
#   chmod +x scripts/etelios-prod-auth-only-release.sh
#   ./scripts/etelios-prod-auth-only-release.sh
# Optional:
#   RELEASE_TAG=userid-202604101200 ./scripts/etelios-prod-auth-only-release.sh
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
R="${ECR:-383234048604.dkr.ecr.ap-south-1.amazonaws.com}"
REGION="${AWS_REGION:-ap-south-1}"
NS="${NS:-etelios-prod}"
TAG="${RELEASE_TAG:-auth-$(date +%Y%m%d%H%M)}"
IMG="${R}/etelios-auth-service:${TAG}"

echo "Building & pushing: $IMG"
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$R"

DOCKER_BUILDKIT=1 docker build --platform linux/amd64 \
  -f microservices/auth-service/Dockerfile -t "$IMG" "$ROOT"
docker push "$IMG"

echo "Updating deployment auth-service in namespace $NS"
kubectl -n "$NS" set image deployment/auth-service auth-service="$IMG"
kubectl -n "$NS" rollout status deployment/auth-service --timeout=300s

echo "OK auth-service now runs: $IMG"
echo "Tip: k8s/etelios-prod/auth-service-deployment.yaml mein image tag update karo taaki baad mein apply se purana tag wapas na aa jaye."
