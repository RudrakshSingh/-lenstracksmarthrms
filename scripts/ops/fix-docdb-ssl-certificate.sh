#!/usr/bin/env bash
set -euo pipefail

NS="${NS:-etelios-prod}"
DEPLOYS=(auth-service hr-service attendance-service tenant-registry-service)
CA_PATH="${CA_PATH:-/etc/ssl/certs/ca-cert.pem}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
fail() { echo "ERROR: $*"; exit 1; }

retry() {
  local tries="$1"; shift
  local n=1
  until "$@"; do
    if [ "$n" -ge "$tries" ]; then
      return 1
    fi
    n=$((n+1))
    sleep 2
  done
}

log "Checking required secrets"
retry 10 kubectl get ns >/dev/null || fail "Kubernetes API unreachable (DNS/network issue)"
retry 10 kubectl -n "$NS" get secret docdb-ca-cert >/dev/null || fail "secret/docdb-ca-cert missing"
retry 10 kubectl -n "$NS" get secret docdb-credentials >/dev/null || fail "secret/docdb-credentials missing"

for d in "${DEPLOYS[@]}"; do
  log "Applying SSL cert mount + env to deployment/$d"

  # Ensure env var is present
  retry 10 kubectl -n "$NS" set env deploy/"$d" DOCDB_TLS_CA_FILE="$CA_PATH" >/dev/null || fail "set env failed for $d"

  # Ensure secret volume mount is present on primary container (same name as deployment)
  retry 10 kubectl -n "$NS" set volume deploy/"$d" \
    --add \
    --overwrite \
    --name=docdb-ca-cert \
    --type=secret \
    --secret-name=docdb-ca-cert \
    --mount-path="$CA_PATH" \
    --sub-path=ca-cert.pem \
    --containers="$d" >/dev/null || fail "set volume failed for $d"

  retry 10 kubectl -n "$NS" rollout restart deploy/"$d" >/dev/null || fail "restart failed for $d"
  retry 10 kubectl -n "$NS" rollout status deploy/"$d" --timeout=300s >/dev/null || fail "rollout failed for $d"

  log "deployment/$d is healthy"
done

log "Verifying connection string contains tlsCAFile"
MONGO_URI=$(kubectl -n "$NS" get secret docdb-credentials -o jsonpath='{.data.MONGO_URI}' | base64 -d)
if [[ "$MONGO_URI" != *"tlsCAFile="* ]]; then
  fail "docdb-credentials MONGO_URI missing tlsCAFile"
fi

log "Scanning recent logs for SSL certificate errors"
FOUND_ERR=0
for d in "${DEPLOYS[@]}"; do
  if kubectl -n "$NS" logs deploy/"$d" --since=10m 2>/dev/null | rg -i "unable to get local issuer certificate|UNABLE_TO_GET_ISSUER_CERT|self signed certificate" >/dev/null; then
    echo "SSL error still present in $d logs"
    FOUND_ERR=1
  fi
done

if [ "$FOUND_ERR" -eq 1 ]; then
  fail "SSL certificate errors still detected in logs"
fi

log "SSL certificate fix applied successfully for DocumentDB-backed services"
