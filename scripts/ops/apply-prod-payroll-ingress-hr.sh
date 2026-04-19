#!/usr/bin/env bash
# Apply ingress so /api/payroll-workflow reaches payroll-service; then redeploy HR for statutory + gate proxy.
#
# Prerequisites: kubectl context = prod (etelios-prod), docker + aws for HR image push.
#
#   bash scripts/ops/apply-prod-payroll-ingress-hr.sh
#   SKIP_INGRESS=1 bash scripts/ops/apply-prod-payroll-ingress-hr.sh   # only HR rollout
#   SKIP_HR=1 bash scripts/ops/apply-prod-payroll-ingress-hr.sh       # only ingress
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

NS="${K8S_NAMESPACE:-etelios-prod}"

if [ "${SKIP_INGRESS:-0}" != "1" ]; then
  echo "==> kubectl apply ingress (adds /api/payroll-workflow → payroll-service)"
  # Primary ALB ingress used for api.etelios.com
  kubectl apply -f "$ROOT/k8s/ingress-alb-fixed.yaml"
  echo "==> Optional: cluster may also use k8s/etelios-prod/etelios-ingress.json — merge if you maintain JSON separately"
fi

if [ "${SKIP_HR:-0}" != "1" ]; then
  echo ""
  echo "==> Build + push + rollout hr-service (payrollWorkflowProxy + statutory-lookup)"
  IMAGE_TAG="${IMAGE_TAG:-hr-payroll-proxy-$(date +%Y%m%d%H%M)}"
  export IMAGE_TAG
  bash "$ROOT/scripts/deploy-hr-service-aws-prod.sh"
fi

echo ""
echo "Done. Verify:"
echo "  curl -sS -o /dev/null -w '%{http_code}' -H \"Authorization: Bearer \$TOKEN\" -H x-tenant-id:lenstrack \\"
echo "    https://api.etelios.com/api/payroll-workflow/gates/employee-master"
echo "  curl -sS -o /dev/null -w '%{http_code}' -X POST -H \"Authorization: Bearer \$TOKEN\" -H x-tenant-id:lenstrack \\"
echo "    -H Content-Type:application/json -d '{\"employee_codes\":[\"YOUR_CODE\"]}' \\"
echo "    https://api.etelios.com/api/hr/payroll/statutory-lookup"
