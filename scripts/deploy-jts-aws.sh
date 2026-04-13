#!/usr/bin/env bash
# Build JTS Docker image, push to AWS ECR, apply K8s manifest, restart rollout.
#
# Prerequisites: docker, aws CLI (configured), kubectl (kubeconfig → prod cluster)
#
# Usage (from repo root):
#   ./scripts/deploy-jts-aws.sh
#   TAG=v1.2.3 ./scripts/deploy-jts-aws.sh          # immutable tag + :latest
#   SKIP_KUBECTL=1 ./scripts/deploy-jts-aws.sh      # only ECR push
#   APPLY_INGRESS=0 ./scripts/deploy-jts-aws.sh     # image + deployment only (skip ALB ingress YAML)
#   DOCKER_PLATFORM=linux/arm64 ./scripts/deploy-jts-aws.sh   # only if your nodes are ARM (rare on EKS)
#
# ImagePullBackOff on EKS after pushing from Mac:
#   - "no match for platform in manifest" → build was arm64; default here is linux/amd64 for EKS.
#   - "403 Forbidden" on ECR → refresh pull secret in the namespace, e.g.:
#       kubectl -n etelios-prod delete secret ecr-registry-secret --ignore-not-found
#       kubectl -n etelios-prod create secret docker-registry ecr-registry-secret \
#         --docker-server=${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com \
#         --docker-username=AWS \
#         --docker-password=$(aws ecr get-login-password --region ${AWS_REGION})
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

AWS_REGION="${AWS_REGION:-ap-south-1}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-383234048604}"
ECR_REPO="${ECR_JTS_REPO:-etelios-jts-service}"
NAMESPACE="${K8S_NAMESPACE:-etelios-prod}"
DEPLOYMENT_FILE="${JTS_DEPLOYMENT_FILE:-k8s/etelios-prod/jts-service-deployment.yaml}"
# Ingress-only prod: apply ALB rules so /jts → jts-service (set 0 if you manage ingress elsewhere)
APPLY_INGRESS="${APPLY_INGRESS:-1}"
INGRESS_FILE="${JTS_INGRESS_FILE:-k8s/ingress-alb-fixed.yaml}"

TAG="${TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo manual-$(date +%Y%m%d%H%M))}"
REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE="${REGISTRY}/${ECR_REPO}:${TAG}"
IMAGE_LATEST="${REGISTRY}/${ECR_REPO}:latest"

echo "==> JTS deploy: region=${AWS_REGION} image=${IMAGE}"

command -v docker >/dev/null || { echo "docker not found"; exit 1; }
command -v aws >/dev/null || { echo "aws CLI not found"; exit 1; }

aws sts get-caller-identity >/dev/null || { echo "AWS credentials failed (aws sts get-caller-identity)"; exit 1; }

echo "==> ECR login"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$REGISTRY"

# EKS (x86) cannot run images built as linux/arm64 (Docker Desktop on Apple Silicon).
DOCKER_PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"
export DOCKER_BUILDKIT=1

echo "==> docker build (context=repo root, platform=${DOCKER_PLATFORM})"
docker build \
  --platform "$DOCKER_PLATFORM" \
  -f "$ROOT/microservices/jts-service/Dockerfile" \
  -t "$IMAGE" \
  -t "$IMAGE_LATEST" \
  "$ROOT"

echo "==> docker push"
docker push "$IMAGE"
docker push "$IMAGE_LATEST"

if [[ "${SKIP_KUBECTL:-}" == "1" ]]; then
  echo "==> SKIP_KUBECTL=1 — done after push. Update cluster image to: $IMAGE"
  exit 0
fi

command -v kubectl >/dev/null || { echo "kubectl not found (set SKIP_KUBECTL=1 to push only)"; exit 1; }
kubectl cluster-info >/dev/null 2>&1 || { echo "kubectl not connected to a cluster"; exit 1; }

echo "==> kubectl apply $DEPLOYMENT_FILE"
kubectl apply -f "$ROOT/$DEPLOYMENT_FILE"

if [[ "${APPLY_INGRESS}" == "1" ]]; then
  echo "==> kubectl apply $INGRESS_FILE (routes /jts and /api/jts → jts-service)"
  kubectl apply -f "$ROOT/$INGRESS_FILE"
else
  echo "==> APPLY_INGRESS=0 — skipped ingress; ensure live ALB sends /jts → jts-service:3018"
fi

echo "==> rollout restart (pulls new :latest with imagePullPolicy: Always)"
kubectl -n "$NAMESPACE" rollout restart deployment/jts-service
kubectl -n "$NAMESPACE" rollout status deployment/jts-service --timeout=300s

echo "==> Done. Pods:"
kubectl -n "$NAMESPACE" get pods -l app=jts-service

echo ""
echo "Verify (port-forward health): kubectl -n $NAMESPACE port-forward svc/jts-service 3018:3018"
echo "API (ingress): https://api.etelios.com/jts/tasks?page=1&limit=1  (+ Authorization + X-Tenant-Id)"
