const mongoose = require('mongoose');
const User = require('../models/User.model');
const Role = require('../models/Role.model');

const SKIP_ROLES = new Set(['superadmin', 'admin', 'hr', 'manager', 'store_manager']);

/**
 * Resolve auth User.role to a lowercase string (handles legacy ObjectId refs).
 */
async function resolveAuthRoleName(userDoc) {
  const r = userDoc?.role;
  if (!r) return 'employee';
  if (typeof r === 'string') return r.toLowerCase();
  if (typeof r === 'object' && r.name) return String(r.name).toLowerCase();
  if (mongoose.Types.ObjectId.isValid(r)) {
    const doc = await Role.findById(r).select('name').lean().maxTimeMS(3000);
    return doc?.name ? String(doc.name).toLowerCase() : 'employee';
  }
  return 'employee';
}

/**
 * When someone becomes another user's reporting manager, promote them from `employee` to `manager`
 * so JWT/login and attendance optional-GPS (MANAGER) behave correctly.
 * Does not downgrade or change admin/hr/manager/store_manager/superadmin.
 */
async function promotePeopleManagerById(managerId) {
  if (!managerId || !mongoose.Types.ObjectId.isValid(String(managerId))) {
    return { ok: false, reason: 'invalid_manager_id' };
  }
  const user = await User.findById(managerId).select('role tenantId');
  if (!user) return { ok: false, reason: 'not_found' };

  const roleName = await resolveAuthRoleName(user);
  if (SKIP_ROLES.has(roleName)) {
    return { ok: true, changed: false, role: roleName };
  }

  if (roleName !== 'employee') {
    return { ok: true, changed: false, role: roleName };
  }

  user.role = 'manager';
  await user.save();
  return { ok: true, changed: true, role: 'manager' };
}

module.exports = { promotePeopleManagerById, resolveAuthRoleName };
