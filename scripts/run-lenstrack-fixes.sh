#!/usr/bin/env bash
# Run Lenstrack fixes in order: (1) DocumentDB tenant repair (2) roster apply.
# From repo root:
#
#   # Dry-run tenant repair only (needs DocumentDB URI)
#   MONGODB_URI='mongodb://...' ./scripts/run-lenstrack-fixes.sh
#
#   # Apply tenant repair + roster (use single-quoted password if it contains !)
#   MONGODB_URI='...' APPLY_REPAIR=1 \
#   ROSTER_API_BASE='https://api.etelios.com' ROSTER_LOGIN_EMAIL='admin@lenstrack.com' \
#   ROSTER_LOGIN_PASSWORD='yourpass' HR_TENANT_ID=lenstrack APPLY_ROSTER=1 \
#   ./scripts/run-lenstrack-fixes.sh
#
# Optional: DOCDB_TLS_CA_FILE=/path/to/global-bundle.pem

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=========================================="
echo "Lenstrack fixes (DocumentDB + roster)"
echo "=========================================="

if [[ -n "${MONGODB_URI:-}" ]]; then
  echo ""
  echo ">>> Tenant repair (users default -> lenstrack)"
  export APPLY="${APPLY_REPAIR:-}"
  node scripts/repair-lenstrack-tenant-users.js
else
  echo ""
  echo ">>> Skip tenant repair (set MONGODB_URI to run; APPLY_REPAIR=1 to write)"
fi

if [[ "${APPLY_ROSTER:-}" == "1" || "${APPLY_ROSTER:-}" == "true" ]]; then
  echo ""
  echo ">>> Apply JTS daily roster"
  export APPLY=1
  node scripts/apply-jts-daily-roster.js
else
  echo ""
  echo ">>> Skip roster (set APPLY_ROSTER=1 plus ROSTER_API_BASE and login or HR_ACCESS_TOKEN)"
fi

echo ""
echo "Done. Users should re-login so JWT tenantId matches lenstrack."
