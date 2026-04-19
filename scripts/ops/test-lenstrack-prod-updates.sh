#!/usr/bin/env bash
# Live prod smoke: lenstrack tenant + payroll/HR/auth/financial routes we shipped (read-heavy).
#
#   API_BASE=https://api.etelios.com \
#   LENSTRACK_EMAIL=admin@lenstrack.com \
#   LENSTRACK_PASSWORD='your-password' \
#   bash scripts/ops/test-lenstrack-prod-updates.sh
#
# Optional (if cluster enforces company header):
#   X_COMPANY_ID=your-company-uuid
#
set -euo pipefail

API_BASE="${API_BASE:-https://api.etelios.com}"
API_BASE="${API_BASE%/}"
TENANT_ID="${TENANT_ID:-lenstrack}"
LENSTRACK_EMAIL="${LENSTRACK_EMAIL:-admin@lenstrack.com}"

need_jq() {
  command -v jq >/dev/null 2>&1 || { echo "Install jq"; exit 1; }
}

hdr_json=(-H "Content-Type: application/json")
hdr_tenant=(-H "x-tenant-id: ${TENANT_ID}")
if [ -n "${X_COMPANY_ID:-}" ]; then
  hdr_tenant+=(-H "x-company-id: ${X_COMPANY_ID}")
fi

pass=0
fail=0
check() {
  local name="$1" code="$2" min="${3:-200}" max="${4:-399}"
  if [ "$code" -ge "$min" ] && [ "$code" -le "$max" ]; then
    echo "  OK  $name (HTTP $code)"
    pass=$((pass + 1))
  else
    echo "  FAIL $name (HTTP $code)"
    fail=$((fail + 1))
  fi
}

echo "==> API_BASE=$API_BASE  TENANT=$TENANT_ID"
echo "==> Public health (no auth)"
code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 25 "${API_BASE}/api/auth/health" || echo 0)
check "auth health" "$code"
code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 25 "${API_BASE}/api/hr/health" || echo 0)
check "hr health" "$code"
code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 25 "${API_BASE}/api/payroll/health" || echo 0)
check "payroll health" "$code"
code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 25 "${API_BASE}/api/financial/health" || echo 0)
if [ "$code" -ge 200 ] && [ "$code" -le 401 ]; then
  echo "  OK  financial health (HTTP $code)$([ "$code" = "401" ] && echo ' — gateway may require auth for body')"
  pass=$((pass + 1))
else
  check "financial health" "$code"
fi

if [ -z "${LENSTRACK_PASSWORD:-}" ]; then
  echo ""
  echo "Skip authenticated checks: set LENSTRACK_PASSWORD (and optionally X_COMPANY_ID)."
  echo "Summary: passed=$pass failed=$fail"
  [ "$fail" -eq 0 ] && exit 0 || exit 1
fi

need_jq
echo ""
echo "==> Login ($LENSTRACK_EMAIL)"
login_body=$(curl -sS --max-time 30 -X POST "${API_BASE}/api/auth/login" \
  "${hdr_json[@]}" \
  -d "$(jq -n --arg e "$LENSTRACK_EMAIL" --arg p "$LENSTRACK_PASSWORD" '{email:$e,password:$p}')") || true

TOKEN=$(echo "$login_body" | jq -r '.data.accessToken // .data.token // empty' 2>/dev/null || true)
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "  FAIL login: $(echo "$login_body" | jq -c '{success,message,code}' 2>/dev/null || echo "$login_body" | head -c 200)"
  exit 1
fi
echo "  OK  login (token received)"

hdr_auth=(-H "Authorization: Bearer ${TOKEN}")

echo ""
echo "==> Lenstrack data (real tenant headers)"
code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 30 -G "${API_BASE}/api/hr/employees" \
  "${hdr_auth[@]}" "${hdr_tenant[@]}" --data-urlencode "limit=5" || echo 0)
check "GET /api/hr/employees?limit=5" "$code"

SMOKE_MONTH="${SMOKE_MONTH:-$(date +%-m)}"
SMOKE_YEAR="${SMOKE_YEAR:-$(date +%Y)}"
code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 30 \
  "${API_BASE}/api/payroll-workflow/summary/${SMOKE_MONTH}/${SMOKE_YEAR}" \
  "${hdr_auth[@]}" "${hdr_tenant[@]}" || echo 0)
check "GET /api/payroll-workflow/summary/${SMOKE_MONTH}/${SMOKE_YEAR}" "$code"

code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 30 "${API_BASE}/api/financial/health" \
  "${hdr_auth[@]}" "${hdr_tenant[@]}" || echo 0)
check "GET /api/financial/health (authenticated)" "$code"

# Prefer HR proxy path (same as app); direct payroll-workflow may 404 if ingress only routes /api/hr → hr-service.
code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 30 "${API_BASE}/api/hr/gates/employee-master" \
  "${hdr_auth[@]}" "${hdr_tenant[@]}" || echo 0)
check "GET /api/hr/gates/employee-master (proxy → payroll)" "$code"

code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 30 "${API_BASE}/api/payroll/validation" \
  "${hdr_auth[@]}" "${hdr_tenant[@]}" || echo 0)
check "GET /api/payroll/validation" "$code"

echo ""
echo "==> Statutory lookup (sample codes from first employees page)"
emp_json=$(curl -sS --max-time 35 -G "${API_BASE}/api/hr/employees" \
  "${hdr_auth[@]}" "${hdr_tenant[@]}" --data-urlencode "limit=10" || echo '{}')
codes=$(echo "$emp_json" | jq -r '(.data // .employees // []) | map(.code // .employeeId // empty) | map(select(. != null and . != "")) | .[0:5] | @json' 2>/dev/null || echo '[]')
if [ "$codes" = "[]" ] || [ -z "$codes" ]; then
  echo "  SKIP statutory-lookup (no employee codes parsed)"
else
  code=$(curl -sS -o /tmp/stat-lookup.json -w "%{http_code}" --max-time 45 -X POST "${API_BASE}/api/hr/payroll/statutory-lookup" \
    "${hdr_auth[@]}" "${hdr_tenant[@]}" "${hdr_json[@]}" \
    -d "$(jq -n --argjson c "$codes" '{employee_codes:$c}')" || echo 0)
  check "POST /api/hr/payroll/statutory-lookup" "$code"
  if [ "$code" -ge 200 ] && [ "$code" -lt 400 ]; then
    echo "      resolved=$(jq -r '.meta.resolved // .data | if type == "object" then (.|length) else empty end' /tmp/stat-lookup.json 2>/dev/null || echo "?")"
  fi
fi

echo ""
echo "==> Optional: export reports (GET; may 403 if role lacks payroll_reports_export)"
for path in "reports/bank-advice" "reports/pf-ecr"; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 45 \
    "${API_BASE}/api/payroll/${path}?month=${SMOKE_MONTH}&year=${SMOKE_YEAR}" \
    "${hdr_auth[@]}" "${hdr_tenant[@]}" || echo 0)
  echo "  $( [ "$code" -ge 200 ] && [ "$code" -lt 400 ] && echo OK || echo INFO ) GET /api/payroll/${path} (HTTP $code) month=$SMOKE_MONTH year=$SMOKE_YEAR"
done

echo ""
echo "Done. Summary: passed=$pass failed=$fail"
[ "$fail" -eq 0 ] && exit 0 || exit 1
