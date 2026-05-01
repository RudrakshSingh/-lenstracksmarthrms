/**
 * First path after login (path only, no origin). Align with hr-service getRedirectUrlForRole route segment.
 * Superadmin vs tenant admin must land on different shells — FE should prefer this over guessing from permissions.
 */
function getDefaultLandingPathForRole(roleName) {
  const role = String(roleName || 'employee').toLowerCase();
  const paths = {
    superadmin: '/admin/super-admin',
    'super-admin': '/admin/super-admin',
    admin: '/tenant-admin',
    'tenant-admin': '/tenant-admin',
    hr: '/dashboard/hr-head',
    'hr-head': '/dashboard/hr-head',
    manager: '/dashboard',
    employee: '/dashboard',
    accountant: '/dashboard',
    finance: '/dashboard',
    store_manager: '/dashboard',
    sales: '/dashboard',
    optometrist: '/dashboard'
  };
  return paths[role] || '/dashboard';
}

module.exports = { getDefaultLandingPathForRole };
