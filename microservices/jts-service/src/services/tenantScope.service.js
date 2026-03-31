const Tenant = require('../models/Tenant.model');

/** Roles that may list all tenants (cross-tenant read visibility). */
const CROSS_TENANT_LIST_ROLES = new Set(['SUPERADMIN', 'ADMIN', 'COUNTRY_OPS']);

/** Roles that may create/update Tenant records globally. */
const PLATFORM_TENANT_MUTATION_ROLES = new Set(['SUPERADMIN', 'ADMIN']);

/**
 * List tenants visible to the caller.
 * Default: only the JWT tenant. Platform roles may list all tenants for admin UIs.
 */
async function listTenantsVisible(tenantId, role) {
  const r = (role || '').toUpperCase();
  if (CROSS_TENANT_LIST_ROLES.has(r)) {
    return Tenant.find().sort({ code: 1 });
  }
  if (!tenantId) {
    return [];
  }
  return Tenant.find({ _id: tenantId }).sort({ code: 1 });
}

function canMutateAnyTenant(role) {
  return PLATFORM_TENANT_MUTATION_ROLES.has((role || '').toUpperCase());
}

module.exports = { listTenantsVisible, canMutateAnyTenant };
