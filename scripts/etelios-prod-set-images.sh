#!/usr/bin/env bash
# Bump running deployments in etelios-prod to new ECR tags (no YAML edit required).
#
# Usage:
#   export ECR=383234048604.dkr.ecr.ap-south-1.amazonaws.com
#   export NS=etelios-prod
#   export AUTH_TAG=permrbac-202604031859
#   export CORE_TAG=permrbac-202604031900   # hr, attendance, jts, sales, api-gateway (JTS image)
#   ./scripts/etelios-prod-set-images.sh
#
# After this, sync Git YAML/JSON if you want manifests to match:
#   vim k8s/etelios-prod/*-deployment.yaml k8s/etelios-prod/api-gateway-deployment.json

set -euo pipefail
ECR="${ECR:-383234048604.dkr.ecr.ap-south-1.amazonaws.com}"
NS="${NS:-etelios-prod}"
AUTH_TAG="${AUTH_TAG:?Set AUTH_TAG (e.g. export AUTH_TAG=permrbac-...)}"
CORE_TAG="${CORE_TAG:-$AUTH_TAG}"

kubectl -n "$NS" set image deployment/auth-service auth-service="$ECR/etelios-auth-service:$AUTH_TAG"
kubectl -n "$NS" set image deployment/hr-service hr-service="$ECR/etelios-hr-service:$CORE_TAG"
kubectl -n "$NS" set image deployment/attendance-service attendance-service="$ECR/etelios-attendance-service:$CORE_TAG"
kubectl -n "$NS" set image deployment/jts-service jts-service="$ECR/etelios-jts-service:$CORE_TAG"
kubectl -n "$NS" set image deployment/sales-service sales-service="$ECR/etelios-sales-service:$CORE_TAG"
kubectl -n "$NS" set image deployment/api-gateway api-gateway="$ECR/etelios-jts-service:$CORE_TAG"

echo "Rollouts:"
for d in auth-service hr-service attendance-service jts-service sales-service api-gateway; do
  kubectl -n "$NS" rollout status "deployment/$d" --timeout=300s
done

echo "Done. Remember to update k8s/etelios-prod/*.yaml and api-gateway-deployment.json image fields when you commit."
