/**
 * Shared path tweaks for live ALB tests (health mirrors, employee-role DELETE query).
 */
function urlPathForRemote(entry) {
  let p = entry.path;
  if (entry.group === 'health') {
    if (p === '/health') return '/jts/health';
    if (p === '/api/v1/health') return '/api/jts/health';
  }
  if (entry.method === 'DELETE' && p.includes('/employee-roles/') && !p.includes('?')) {
    return `${p}?role=MANAGER`;
  }
  return p;
}

module.exports = { urlPathForRemote };
