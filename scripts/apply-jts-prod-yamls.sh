#!/usr/bin/env bash
# Apply updated JTS + ALB ingress YAMLs to production (etelios-prod).
# Run from repo root with kubectl pointing at the prod cluster.
#
# For image build + push + this apply + rollout in one step, use:
#   ./scripts/deploy-jts-aws.sh
#
# Usage:
#   ./scripts/apply-jts-prod-yamls.sh
#   NAMESPACE=etelios-prod ./scripts/apply-jts-prod-yamls.sh
#
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NS="${NAMESPACE:-etelios-prod}"

echo "==> Context: $(kubectl config current-context)"
echo "==> Namespace: $NS"

echo "==> 1/2 JTS Deployment + Service"
kubectl apply -f "$ROOT/k8s/etelios-prod/jts-service-deployment.yaml"

echo "==> 2/2 ALB Ingress (etelios-ingress — /jts + /api/jts; catch-all / last)"
kubectl apply -f "$ROOT/k8s/ingress-alb-fixed.yaml"

echo "==> Rollout"
kubectl -n "$NS" rollout restart deployment/jts-service 2>/dev/null || true
kubectl -n "$NS" rollout status deployment/jts-service --timeout=300s || true

echo "==> Pods"
kubectl -n "$NS" get pods -l app=jts-service -o wide

echo ""
echo "Optional (second ingress object, if you use it):"
echo "  kubectl apply -f $ROOT/k8s/etelios-prod/api-gateway-ingress.yaml"
echo ""
echo "Smoke:"
echo "  kubectl -n $NS port-forward svc/jts-service 3018:3018"
echo "  curl -s http://127.0.0.1:3018/health"
echo "  curl -i \"https://api.etelios.com/jts/tasks?page=1&limit=1\" -H \"Authorization: Bearer \$TOKEN\" -H \"X-Tenant-Id: \$TENANT_ID\""
