#!/usr/bin/env bash
set -euo pipefail
trap 'echo "ERROR: Script failed at line $LINENO"; exit 1' ERR

NS="${NS:-etelios-prod}"
DOCDB_CLUSTER_ID="${DOCDB_CLUSTER_ID:-lenstrack-docdb-cluster}"
INGRESS_NAME="${INGRESS_NAME:-etelios-ingress}"
ALB_URL="${ALB_URL:-http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@upcapto.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-cnbxs2b9A1!}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
fail() { echo "ERROR: $*"; exit 1; }

b64dec() {
  if printf 'dGVzdA==' | base64 -d >/dev/null 2>&1; then
    base64 -d
  else
    base64 -D
  fi
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing command: $1"
}

retry_run() {
  local tries="$1"; shift
  local n=1
  local rc=0
  until "$@"; do
    rc=$?
    if [ "$n" -ge "$tries" ]; then
      return "$rc"
    fi
    n=$((n+1))
    sleep 2
  done
  return 0
}

retry_out() {
  local tries="$1"; shift
  local out=""
  local n=1
  while [ "$n" -le "$tries" ]; do
    out=$("$@" 2>/dev/null || true)
    if [ -n "$out" ]; then
      printf '%s' "$out"
      return 0
    fi
    n=$((n+1))
    sleep 2
  done
  return 1
}

get_secret_decoded() {
  local key="$1"
  local raw=""
  raw=$(retry_out 15 kubectl -n "$NS" get secret docdb-credentials -o "jsonpath={.data.${key}}" || true)
  [ -n "$raw" ] || fail "${key} missing from secret docdb-credentials"
  printf '%s' "$raw" | b64dec
}

wait_ready() {
  local max_tries="$1"
  local n=1
  while [ "$n" -le "$max_tries" ]; do
    local k=0 a=0
    kubectl get ns >/dev/null 2>&1 && k=1
    aws sts get-caller-identity --query Account --output text >/dev/null 2>&1 && a=1
    if [ "$k" = "1" ]; then
      log "Kubernetes API reachable"
      if [ "$a" = "1" ]; then
        log "AWS API reachable"
      else
        log "AWS API not reachable (will use fallback if needed)"
      fi
      return 0
    fi
    log "Waiting for connectivity... attempt $n/$max_tries"
    n=$((n+1))
    sleep 2
  done
  fail "Kubernetes API not reachable after retries"
}

need_cmd kubectl
need_cmd aws
need_cmd jq

log "[1/8] Connectivity precheck"
wait_ready 30

log "[2/8] Reading current docdb-credentials"
DOCDB_ENDPOINT=$(get_secret_decoded DOCDB_ENDPOINT)
DOCDB_PORT=$(get_secret_decoded DOCDB_PORT)
DOCDB_USERNAME=$(get_secret_decoded DOCDB_USERNAME)
CUR_PASS=$(get_secret_decoded DOCDB_PASSWORD)
DB_NAME=$(get_secret_decoded DB_NAME)

# Generate password safely with pipefail enabled (head can trigger SIGPIPE upstream).
set +o pipefail
NEW_PASS=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 40)
set -o pipefail
[ "${#NEW_PASS}" -eq 40 ] || fail "Failed to generate 40-char password"

log "[3/8] Rotating DocumentDB password"
if retry_run 3 aws docdb modify-db-cluster --db-cluster-identifier "$DOCDB_CLUSTER_ID" --master-user-password "$NEW_PASS" --apply-immediately >/tmp/docdb-rotate.json 2>/tmp/docdb-rotate.err; then
  log "Password rotation triggered via AWS API"
else
  log "AWS rotation failed, attempting in-DB fallback via auth-service pod"
  retry_run 8 kubectl -n "$NS" exec deploy/auth-service -- env \
    DOCDB_ENDPOINT="$DOCDB_ENDPOINT" \
    DOCDB_PORT="$DOCDB_PORT" \
    DOCDB_USERNAME="$DOCDB_USERNAME" \
    CUR_PASS="$CUR_PASS" \
    NEW_PASS="$NEW_PASS" \
    node -e '
      const { MongoClient } = require("mongodb");
      (async () => {
        const endpoint = process.env.DOCDB_ENDPOINT;
        const port = process.env.DOCDB_PORT || "27017";
        const user = process.env.DOCDB_USERNAME;
        const cur = process.env.CUR_PASS;
        const next = process.env.NEW_PASS;
        const mk = (pwd) => `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pwd)}@${endpoint}:${port}/admin?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false&tlsCAFile=/etc/ssl/certs/ca-cert.pem&authSource=admin&authMechanism=SCRAM-SHA-1`;
        let c = new MongoClient(mk(cur), { serverSelectionTimeoutMS: 15000 });
        await c.connect();
        await c.db("admin").command({ updateUser: user, pwd: next });
        await c.close();
        c = new MongoClient(mk(next), { serverSelectionTimeoutMS: 15000 });
        await c.connect();
        await c.db("admin").command({ ping: 1 });
        await c.close();
      })().catch((e)=>{ console.error(e.message || e); process.exit(1); });
    ' || fail "Both AWS and in-DB password rotation failed"
  log "Password rotated via in-DB fallback"
fi

MONGO_URI="mongodb://${DOCDB_USERNAME}:${NEW_PASS}@${DOCDB_ENDPOINT}:${DOCDB_PORT}/${DB_NAME}?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false&tlsCAFile=/etc/ssl/certs/ca-cert.pem&authSource=admin&authMechanism=SCRAM-SHA-1"

log "[4/8] Updating docdb-credentials secret"
retry_run 10 sh -lc "kubectl -n '$NS' create secret generic docdb-credentials \
  --from-literal=DOCDB_ENDPOINT='$DOCDB_ENDPOINT' \
  --from-literal=DOCDB_PORT='$DOCDB_PORT' \
  --from-literal=DOCDB_USERNAME='$DOCDB_USERNAME' \
  --from-literal=DOCDB_PASSWORD='$NEW_PASS' \
  --from-literal=DOCDB_TLS=true \
  --from-literal=DOCDB_TLS_CA_FILE=/etc/ssl/certs/ca-cert.pem \
  --from-literal=DB_NAME='$DB_NAME' \
  --from-literal=MONGO_DB_NAME='$DB_NAME' \
  --from-literal=MONGO_URI='$MONGO_URI' \
  --from-literal=MONGODB_URI='$MONGO_URI' \
  --dry-run=client -o yaml | kubectl apply -f -" || fail "Failed to update docdb-credentials"

log "[5/8] Patching ingress attendance backend to port 80 (dynamic)"
ING_JSON=$(retry_out 10 kubectl -n "$NS" get ingress "$INGRESS_NAME" -o json || true)
[ -n "$ING_JSON" ] || fail "Unable to read ingress $INGRESS_NAME"
PATCH_JSON=$(printf '%s' "$ING_JSON" | jq -c '
  [ .spec.rules as $rules
    | range(0; ($rules|length)) as $ri
    | ($rules[$ri].http.paths // []) as $paths
    | range(0; ($paths|length)) as $pi
    | select($paths[$pi].backend.service.name == "attendance-service")
    | select($paths[$pi].backend.service.port.number != 80)
    | {op:"replace", path:("/spec/rules/" + ($ri|tostring) + "/http/paths/" + ($pi|tostring) + "/backend/service/port/number"), value:80}
  ]')

if [ "$PATCH_JSON" = "[]" ]; then
  log "Ingress attendance port already correct"
else
  retry_run 10 kubectl -n "$NS" patch ingress "$INGRESS_NAME" --type='json' -p "$PATCH_JSON" || fail "Failed to patch ingress"
  log "Ingress attendance backend patched"
fi

log "[6/8] Restarting deployments that consume docdb-credentials"
DEPLOYS=$(retry_out 10 kubectl -n "$NS" get deploy -o json | jq -r '
  .items[]
  | select(
      ([.spec.template.spec.containers[].env[]?.valueFrom.secretKeyRef.name] | index("docdb-credentials"))
      or
      ([.spec.template.spec.containers[].envFrom[]?.secretRef.name] | index("docdb-credentials"))
    )
  | .metadata.name
' || true)
[ -n "$DEPLOYS" ] || fail "No deployments found consuming docdb-credentials"

for d in $DEPLOYS; do
  retry_run 8 kubectl -n "$NS" rollout restart deploy "$d" || fail "Restart failed for $d"
  retry_run 8 kubectl -n "$NS" rollout status deploy "$d" --timeout=300s || fail "Rollout failed for $d"
  log "restarted: $d"
done

log "[7/8] Verifying tenant-registry rollout image"
retry_run 8 kubectl -n "$NS" rollout status deploy/tenant-registry-service --timeout=300s || fail "tenant-registry rollout not healthy"

log "[8/8] Running API sweep through ingress"
cat <<'NODE' | retry_run 8 kubectl -n "$NS" exec -i deploy/auth-service -- env ALB_URL="$ALB_URL" ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" node
(async () => {
  const base = process.env.ALB_URL;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const out = [];
  const req = async (name, method, path, body, headers={}) => {
    try {
      const r = await fetch(base + path, { method, headers: { 'Content-Type':'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
      let j = null;
      try { j = await r.json(); } catch {}
      out.push({ name, method, path, status: r.status, success: j?.success ?? null, message: j?.message ?? null });
      return j;
    } catch (e) {
      out.push({ name, method, path, status: 0, success: null, message: e.message });
      return null;
    }
  };

  await req('health', 'GET', '/health');
  await req('auth_health', 'GET', '/api/auth/health');
  await req('hr_health', 'GET', '/api/hr/health');
  await req('attendance_health', 'GET', '/api/attendance/health');
  await req('payroll_health', 'GET', '/api/payroll/health');
  await req('tenant_health', 'GET', '/api/tenants/health');

  const login = await req('login', 'POST', '/api/auth/login', { email, password });
  const token = login?.data?.accessToken;
  if (token) {
    const suffix = Date.now();
    await req('create_tenant', 'POST', '/api/tenants', {
      name: `FinalSmoke ${suffix}`,
      email: `admin+${suffix}@finalsmoke.example.com`,
      domain: `finalsmoke${suffix}.example.com`,
      phone: '+91-9000000000', city: 'Mumbai', state: 'Maharashtra', country: 'India', plan: 'Professional'
    }, { Authorization: `Bearer ${token}`, 'x-tenant-id': 'upcapto' });
    await req('stores', 'GET', '/api/hr/stores', null, { Authorization: `Bearer ${token}`, 'x-tenant-id': 'upcapto' });
    await req('departments', 'GET', '/api/hr/departments', null, { Authorization: `Bearer ${token}`, 'x-tenant-id': 'upcapto' });
    await req('employees', 'GET', '/api/hr/employees', null, { Authorization: `Bearer ${token}`, 'x-tenant-id': 'upcapto' });
    await req('attendance_list', 'GET', '/api/attendance/list', null, { Authorization: `Bearer ${token}`, 'x-tenant-id': 'upcapto' });
    await req('time_tracking', 'GET', '/api/hr/time-tracking', null, { Authorization: `Bearer ${token}`, 'x-tenant-id': 'upcapto' });
    await req('payroll_summary', 'GET', '/api/payroll/summary', null, { Authorization: `Bearer ${token}`, 'x-tenant-id': 'upcapto' });
  }

  console.log(JSON.stringify(out, null, 2));
})();
NODE

log "Completed: password rotated, secrets updated, ingress patched, rollouts done, APIs checked"
