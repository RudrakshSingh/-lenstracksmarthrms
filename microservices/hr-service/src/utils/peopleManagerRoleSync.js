const mongoose = require('mongoose');
const User = require('../models/User.model');
const Role = require('../models/Role.model');

const SKIP_NAMES = new Set(['superadmin', 'admin', 'hr', 'manager']);

/**
 * HR User.role is an ObjectId ref to Role. When an employee is assigned as someone's reporting manager,
 * promote role from `employee` → `manager` so auth/login (shared DB) and dashboards stay consistent.
 */
async function promotePeopleManagerById(managerId) {
  if (!managerId || !mongoose.Types.ObjectId.isValid(String(managerId))) {
    return { ok: false, reason: 'invalid_manager_id' };
  }

  const [managerRole, employeeRole, user] = await Promise.all([
    Role.findOne({ name: 'manager' }).select('_id name').lean(),
    Role.findOne({ name: 'employee' }).select('_id name').lean(),
    User.findById(managerId).select('role')
  ]);

  if (!user) return { ok: false, reason: 'not_found' };
  if (!managerRole) {
    return { ok: false, reason: 'manager_role_missing' };
  }

  const currentRoleId = user.role ? user.role.toString() : '';
  if (!currentRoleId) return { ok: true, changed: false, reason: 'no_role' };

  let currentName = '';
  const populated = await Role.findById(user.role).select('name').lean();
  if (populated?.name) currentName = String(populated.name).toLowerCase();

  if (SKIP_NAMES.has(currentName)) {
    return { ok: true, changed: false, role: currentName };
  }

  if (employeeRole && currentRoleId === employeeRole._id.toString()) {
    user.role = managerRole._id;
    await user.save();
    return { ok: true, changed: true, role: 'manager' };
  }

  if (!employeeRole && currentName === 'employee') {
    user.role = managerRole._id;
    await user.save();
    return { ok: true, changed: true, role: 'manager' };
  }

  return { ok: true, changed: false, role: currentName || 'unknown' };
}

module.exports = { promotePeopleManagerById };
