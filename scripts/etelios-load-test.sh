#!/usr/bin/env bash
#
# Etelios API load smoke + stress (autocannon).
# Run on YOUR machine (not Cursor sandbox) where DNS reaches api.etelios.com.
#
# Usage:
#   export ETELIOS_TOKEN='eyJ...'   # from POST /api/auth/login
#   export ETELIOS_TENANT=lenstrack
#   ./scripts/etelios-load-test.sh
#
# Optional:
#   ETELIOS_BASE=https://api.etelios.com   (default)
#   CONNECTIONS=50   DURATION_SEC=30      (defaults below)
#   LOAD_TEST_ALLOW_POST=1              # enables POST clock-in (DANGEROUS on prod — real punches)
#
set -euo pipefail

BASE="${ETELIOS_BASE:-https://api.etelios.com}"
TENANT="${ETELIOS_TENANT:-lenstrack}"
C="${CONNECTIONS:-50}"
D="${DURATION_SEC:-30}"

if ! command -v autocannon >/dev/null 2>&1; then
  echo "Install: npm i -g autocannon"
  exit 1
fi

if [[ -z "${ETELIOS_TOKEN:-}" ]]; then
  echo "ERROR: Set ETELIOS_TOKEN (Bearer from /api/auth/login)."
  echo "  export ETELIOS_TOKEN='...'"
  exit 1
fi

HDR_AUTH=( -H "Authorization=Bearer ${ETELIOS_TOKEN}" -H "X-Tenant-Id=${TENANT}" )

run() {
  local name="$1"
  shift
  echo ""
  echo "========== ${name} =========="
  autocannon "$@"
}

echo "Base: ${BASE}"
echo "Connections: ${C}  Duration: ${D}s  Tenant header: ${TENANT}"

# --- Public / semi-public (no token where noted) ---
run "GET /api/auth/health (no auth)" \
  -c 20 -d "$D" -m GET "${BASE}/api/auth/health"

run "GET /api/auth/status (no auth)" \
  -c 20 -d "$D" -m GET "${BASE}/api/auth/status"

# --- HR leave (read-heavy) ---
run "GET /api/hr/leave" \
  -c "$C" -d "$D" -m GET "${BASE}/api/hr/leave" "${HDR_AUTH[@]}"

run "GET /api/hr/leave-requests" \
  -c "$C" -d "$D" -m GET "${BASE}/api/hr/leave-requests" "${HDR_AUTH[@]}"

run "GET /api/hr/policies/leave" \
  -c 30 -d "$D" -m GET "${BASE}/api/hr/policies/leave" "${HDR_AUTH[@]}"

run "GET /api/hr/leave/balances" \
  -c 30 -d "$D" -m GET "${BASE}/api/hr/leave/balances" "${HDR_AUTH[@]}"

# --- Attendance reads ---
run "GET /api/attendance/today" \
  -c "$C" -d "$D" -m GET "${BASE}/api/attendance/today" "${HDR_AUTH[@]}"

run "GET /api/attendance/current" \
  -c "$C" -d "$D" -m GET "${BASE}/api/attendance/current" "${HDR_AUTH[@]}"

run "GET /api/attendance/check-status" \
  -c "$C" -d "$D" -m GET "${BASE}/api/attendance/check-status" "${HDR_AUTH[@]}"

# --- JTS ---
run "GET /api/jts/tasks/summary/me" \
  -c 40 -d "$D" -m GET "${BASE}/api/jts/tasks/summary/me" "${HDR_AUTH[@]}"

run "GET /api/jts/tasks (list)" \
  -c 30 -d "$D" -m GET "${BASE}/api/jts/tasks" "${HDR_AUTH[@]}"

# --- Mixed burst: alternate two hot paths (single worker pattern via shell loop is crude; use second autocannon) ---
run "GET /api/hr/leave (burst c=100)" \
  -c 100 -d 15 -m GET "${BASE}/api/hr/leave" "${HDR_AUTH[@]}"

# --- Optional mutation (OFF by default) ---
if [[ "${LOAD_TEST_ALLOW_POST:-}" == "1" ]]; then
  echo ""
  echo "WARNING: POST /api/attendance/clock-in — real attendance side effects!"
  run "POST /api/attendance/clock-in (body {})" \
    -c 5 -d 10 -m POST "${BASE}/api/attendance/clock-in" \
    "${HDR_AUTH[@]}" \
    -H "Content-Type=application/json" \
    -b '{}'
else
  echo ""
  echo "Skipping POST clock-in (set LOAD_TEST_ALLOW_POST=1 to enable — not recommended on production)."
fi

echo ""
echo "Done. Read autocannon output: Req/Sec, Latency p50/p99, errors/timeouts = load profile."
