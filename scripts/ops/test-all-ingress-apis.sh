#!/usr/bin/env bash
set -euo pipefail

NS="${NS:-etelios-prod}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@upcapto.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Upcapto@2026}"
OUT_FILE="${OUT_FILE:-/tmp/all-ingress-api-report-$(date +%Y%m%d-%H%M%S).json}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
error() { echo "❌ [$(date '+%Y-%m-%d %H:%M:%S')] $*" >&2; }

# Function to get ALB URL dynamically from Kubernetes
get_alb_url() {
  local url=""
  
  # Try to get from ingress-nginx controller service (most common for backend APIs)
  if url=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null); then
    if [ -n "$url" ] && [ "$url" != "null" ] && [ "$url" != "" ]; then
      echo "http://$url"
      return 0
    fi
  fi
  
  # Try to get from any ingress in the namespace
  if url=$(kubectl get ingress -n "$NS" -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}' 2>/dev/null); then
    if [ -n "$url" ] && [ "$url" != "null" ] && [ "$url" != "" ]; then
      echo "http://$url"
      return 0
    fi
  fi
  
  # Fallback URLs from documentation (prioritize ingress controller URLs for backend APIs)
  local fallbacks=(
    "http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com"
    "http://k8s-ingressn-ingressn-3f8da1d2c3-bf10356d47b52801.elb.ap-south-1.amazonaws.com"
    "http://etelios-frontend-alb-557163772.ap-south-1.elb.amazonaws.com"
  )
  
  # Try fallback URLs and verify backend API is accessible
  for fallback in "${fallbacks[@]}"; do
    if curl -s --max-time 5 -X POST "$fallback/api/auth/login" -H "Content-Type: application/json" -d '{}' >/dev/null 2>&1; then
      echo "$fallback"
      return 0
    elif curl -s --max-time 5 --head "$fallback/api/health" >/dev/null 2>&1; then
      echo "$fallback"
      return 0
    fi
  done
  
  return 1
}

# Get ALB URL
if [ -n "${ALB_URL:-}" ]; then
  log "Using provided ALB_URL: $ALB_URL"
else
  if ALB_URL=$(get_alb_url); then
    log "✅ Found ALB URL: $ALB_URL"
  else
    error "Could not determine ALB URL. Please set ALB_URL environment variable."
    exit 1
  fi
fi

cat <<'NODE' | kubectl -n "$NS" exec -i deploy/auth-service -- env ALB_URL="$ALB_URL" ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" node > "$OUT_FILE"
(async () => {
  const base = process.env.ALB_URL;
  const checks = [];

  const call = async (name, method, path, { body, token, tenantId } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (tenantId) headers['x-tenant-id'] = tenantId;

    try {
      const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
      const txt = await res.text();
      let json = null;
      try { json = JSON.parse(txt); } catch {}
      checks.push({ name, method, path, status: res.status, success: json?.success ?? null, message: json?.message ?? null });
      return { json, status: res.status };
    } catch (e) {
      checks.push({ name, method, path, status: 0, success: null, message: e.message });
      return { json: null, status: 0 };
    }
  };

  await call('health_root', 'GET', '/health');
  await call('auth_health', 'GET', '/api/auth/health');
  await call('hr_health', 'GET', '/api/hr/health');
  await call('attendance_health', 'GET', '/api/attendance/health');
  await call('payroll_health', 'GET', '/api/payroll/health');
  await call('tenant_health', 'GET', '/api/tenants/health');
  await call('platform_health', 'GET', '/api/platform/health');

  const up = await call('login_upcapto', 'POST', '/api/auth/login', { body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } });
  const ls = await call('login_lenstrack', 'POST', '/api/auth/login', { body: { email: 'admin@lenstrack.com', password: 'cnbxs2b9A1!' } });
  const ey = await call('login_eyekra', 'POST', '/api/auth/login', { body: { email: 'admin@eyekra.com', password: 'cnbxs2b9A1!' } });

  const upToken = up.json?.data?.accessToken;
  const lsToken = ls.json?.data?.accessToken;
  const eyToken = ey.json?.data?.accessToken;

  if (upToken) {
    await call('auth_me', 'GET', '/api/auth/me', { token: upToken, tenantId: 'upcapto' });
    await call('hr_dashboard', 'GET', '/api/hr/dashboard', { token: upToken, tenantId: 'upcapto' });
    await call('hr_dashboard_stats', 'GET', '/api/hr/dashboard/stats', { token: upToken, tenantId: 'upcapto' });
    await call('hr_employees', 'GET', '/api/hr/employees?limit=10', { token: upToken, tenantId: 'upcapto' });
    await call('hr_departments', 'GET', '/api/hr/departments', { token: upToken, tenantId: 'upcapto' });
    await call('hr_stores', 'GET', '/api/hr/stores', { token: upToken, tenantId: 'upcapto' });
    await call('hr_time_tracking', 'GET', '/api/hr/time-tracking', { token: upToken, tenantId: 'upcapto' });
    await call('attendance_list', 'GET', '/api/attendance/list?limit=10', { token: upToken, tenantId: 'upcapto' });
    await call('attendance_summary', 'GET', '/api/attendance/summary?startDate=2026-02-01&endDate=2026-02-28', { token: upToken, tenantId: 'upcapto' });
    await call('payroll_root', 'GET', '/api/payroll', { token: upToken, tenantId: 'upcapto' });
    await call('payroll_summary', 'GET', '/api/payroll/summary', { token: upToken, tenantId: 'upcapto' });

    const suffix = Date.now();
    await call('create_tenant_smoke', 'POST', '/api/tenants', {
      token: upToken,
      tenantId: 'upcapto',
      body: {
        name: `AllApiSmoke ${suffix}`,
        email: `admin+${suffix}@allapismoke.example.com`,
        domain: `allapismoke${suffix}.example.com`,
        phone: '+91-9000000000',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        plan: 'Professional'
      }
    });
  }

  if (lsToken) {
    await call('lenstrack_employees', 'GET', '/api/hr/employees?limit=5', { token: lsToken, tenantId: 'lenstrack' });
    await call('lenstrack_attendance_summary', 'GET', '/api/attendance/summary?startDate=2026-02-01&endDate=2026-02-28', { token: lsToken, tenantId: 'lenstrack' });
  }

  if (eyToken) {
    await call('eyekra_employees', 'GET', '/api/hr/employees?limit=5', { token: eyToken, tenantId: 'eyekra' });
  }

  const passed = checks.filter(c => c.status >= 200 && c.status < 400).length;
  const failedChecks = checks.filter(c => !(c.status >= 200 && c.status < 400));

  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    base,
    summary: { total: checks.length, passed, failed: failedChecks.length },
    failedChecks,
    checks
  }, null, 2));
})();
NODE

echo "Report written: $OUT_FILE"
jq '.summary, .failedChecks' "$OUT_FILE"
