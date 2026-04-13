const User = require('../models/User.model');
const PermissionAudit = require('../models/PermissionAudit.model');
const { logger } = require('../config/logger');
const {
  PERMISSION_GROUPS,
  ALL_PERMISSION_CODES,
  PERMISSION_CODE_SET,
  PERMISSION_CATALOG_VERSION,
  filterValidCodes
} = require('../config/permissionCatalog');
const { resolveEffectivePermissionsForUser } = require('../utils/effectivePermissions');
const { assertNoPrivilegeEscalation, previewPrivilegeEscalation } = require('../utils/permissionEscalation');
const {
  invalidateUserPermissionCache,
  invalidateRolePermissionCache
} = require('../utils/permissionCache');
const permissionMetrics = require('../utils/permissionMetrics');

const MANAGER_ROLES = ['superadmin', 'admin', 'hr'];

function assertCanManageUserPermissions(req, targetUser) {
  const actor = req.user;
  if (!actor) {
    return { ok: false, status: 401, message: 'Authentication required' };
  }
  const ar = String(actor.role || '').toLowerCase();
  if (ar === 'superadmin') return { ok: true };
  if (!MANAGER_ROLES.includes(ar)) {
    return { ok: false, status: 403, message: 'Insufficient permissions' };
  }
  const at = String(actor.tenantId || '').toLowerCase();
  const tt = String(targetUser.tenantId || '').toLowerCase();
  if (!at || !tt || at !== tt) {
    return { ok: false, status: 403, message: 'Cannot manage users outside your tenant' };
  }
  return { ok: true };
}

function unknownCodes(arr) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map((p) => String(p).trim()).filter((p) => p && !PERMISSION_CODE_SET.has(p)))];
}

function parsePermissionsRevisionFromIfMatch(headerVal) {
  if (!headerVal || typeof headerVal !== 'string') return null;
  const s = headerVal.trim().replace(/^W\//i, '').replace(/^"|"$/g, '');
  const m = s.match(/permrev-(\d+)/i);
  if (m) return parseInt(m[1], 10);
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

async function writeAudit(entry) {
  try {
    await PermissionAudit.create(entry);
  } catch (e) {
    logger.error('Permission audit write failed', { error: e.message });
  }
}

const getPermissionCatalog = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        catalogVersion: PERMISSION_CATALOG_VERSION,
        groups: PERMISSION_GROUPS,
        flat: ALL_PERMISSION_CODES,
        count: ALL_PERMISSION_CODES.length
      }
    });
  } catch (error) {
    logger.error('Error getting permission catalog', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get permission catalog',
      error: error.message
    });
  }
};

const getAllPermissions = async (req, res) => {
  try {
    res.json({
      success: true,
      catalogVersion: PERMISSION_CATALOG_VERSION,
      data: ALL_PERMISSION_CODES,
      count: ALL_PERMISSION_CODES.length
    });
  } catch (error) {
    logger.error('Error getting permissions', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get permissions',
      error: error.message
    });
  }
};

const getDepartmentPermissions = async (req, res) => {
  try {
    const { department } = req.params;

    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Department is required'
      });
    }

    const permissions = User.getDepartmentPermissions(department.toUpperCase());

    res.json({
      success: true,
      data: {
        department: department.toUpperCase(),
        permissions,
        count: permissions.length
      }
    });
  } catch (error) {
    logger.error('Error getting department permissions', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get department permissions',
      error: error.message
    });
  }
};

const getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select(
      'custom_permissions permission_denials permissions department role tenantId employee_id email name permissionsRevision'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const gate = assertCanManageUserPermissions(req, user);
    if (!gate.ok) {
      return res.status(gate.status).json({ success: false, message: gate.message });
    }

    const resolved = await resolveEffectivePermissionsForUser(user);
    const departmentPermissions = User.getDepartmentPermissions(user.department);

    const rev = user.permissionsRevision != null ? user.permissionsRevision : 0;
    res.set('ETag', `W/"permrev-${rev}"`);

    res.json({
      success: true,
      data: {
        userId: String(user._id),
        tenantId: user.tenantId,
        department: user.department,
        role: user.role,
        permissionsRevision: rev,
        catalogVersion: PERMISSION_CATALOG_VERSION,
        unknownCustomInDb: unknownCodes(user.custom_permissions),
        unknownDenyInDb: unknownCodes(user.permission_denials),
        departmentPermissions,
        customPermissions: resolved.custom_permissions,
        permissionDenials: resolved.permission_denials,
        legacyUserPermissions: resolved.legacyUserPermissions,
        rolePermissions: resolved.rolePermissions,
        effectivePermissions: resolved.effectivePermissions,
        count: resolved.effectivePermissions.length,
        meta: resolved.meta
      }
    });
  } catch (error) {
    logger.error('Error getting user permissions', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get user permissions',
      error: error.message
    });
  }
};

const patchUserPermissionOverrides = async (req, res) => {
  try {
    const { userId } = req.params;
    const customIn = req.body.custom_permissions;
    const denyIn = req.body.permission_denials;

    if (!Array.isArray(customIn) || !Array.isArray(denyIn)) {
      return res.status(400).json({
        success: false,
        message: 'custom_permissions and permission_denials must be arrays'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const gate = assertCanManageUserPermissions(req, user);
    if (!gate.ok) {
      return res.status(gate.status).json({ success: false, message: gate.message });
    }

    const ifMatch = req.headers['if-match'];
    if (ifMatch) {
      const want = parsePermissionsRevisionFromIfMatch(ifMatch);
      const current = user.permissionsRevision != null ? user.permissionsRevision : 0;
      if (want != null && want !== current) {
        permissionMetrics.inc('permissionOptimisticLockConflict');
        return res.status(412).json({
          success: false,
          message: 'Permission revision mismatch — refresh and retry',
          code: 'PERMISSION_REVISION_CONFLICT',
          currentRevision: current
        });
      }
    }

    const prevCustom = [...(user.custom_permissions || [])];
    const prevDeny = [...(user.permission_denials || [])];
    const nextCustom = filterValidCodes(customIn);
    const nextDeny = filterValidCodes(denyIn);

    try {
      await assertNoPrivilegeEscalation({
        actorRole: req.user.role,
        actorEffectivePermissions: req.user.permissions,
        targetUserDoc: user,
        nextCustom,
        nextDeny
      });
    } catch (esc) {
      if (esc.statusCode === 403) {
        permissionMetrics.inc('permissionEscalationBlocked');
        return res.status(403).json({
          success: false,
          message: esc.message,
          code: esc.code || 'FORBIDDEN'
        });
      }
      throw esc;
    }

    const unknownCustomStripped = unknownCodes(customIn);
    const unknownDenyStripped = unknownCodes(denyIn);

    const revBefore = user.permissionsRevision != null ? user.permissionsRevision : 0;
    user.custom_permissions = nextCustom;
    user.permission_denials = nextDeny;
    user.permissionsRevision = revBefore + 1;
    await user.save();

    await invalidateUserPermissionCache(user._id);
    await invalidateRolePermissionCache(String(user.role || '').toLowerCase());
    permissionMetrics.inc('permissionApiWrites');

    await writeAudit({
      actorUserId: req.user._id || req.user.id,
      targetUserId: user._id,
      tenantId: user.tenantId,
      action: 'patch_overrides',
      previousCustom: prevCustom,
      previousDeny: prevDeny,
      nextCustom,
      nextDeny,
      catalogVersion: PERMISSION_CATALOG_VERSION,
      permissionsRevisionBefore: revBefore,
      permissionsRevisionAfter: user.permissionsRevision,
      unknownCustomStripped,
      unknownDenyStripped,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resolved = await resolveEffectivePermissionsForUser(user);

    logger.info('User permission overrides replaced', {
      userId: user._id,
      employeeId: user.employee_id,
      allowCount: user.custom_permissions.length,
      denyCount: user.permission_denials.length,
      revision: user.permissionsRevision
    });

    res.set('ETag', `W/"permrev-${user.permissionsRevision}"`);
    res.json({
      success: true,
      message: 'Permission overrides updated',
      data: {
        userId: user._id,
        employeeId: user.employee_id,
        customPermissions: user.custom_permissions,
        permissionDenials: user.permission_denials,
        effectivePermissions: resolved.effectivePermissions,
        permissionsRevision: user.permissionsRevision,
        unknownCustomStripped,
        unknownDenyStripped
      }
    });
  } catch (error) {
    logger.error('Error patching permission overrides', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update permission overrides',
      error: error.message
    });
  }
};

const updateUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissions, permission_denials, action } = req.body;

    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Permissions array is required'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const gate = assertCanManageUserPermissions(req, user);
    if (!gate.ok) {
      return res.status(gate.status).json({ success: false, message: gate.message });
    }

    const ifMatch = req.headers['if-match'];
    if (ifMatch) {
      const want = parsePermissionsRevisionFromIfMatch(ifMatch);
      const current = user.permissionsRevision != null ? user.permissionsRevision : 0;
      if (want != null && want !== current) {
        permissionMetrics.inc('permissionOptimisticLockConflict');
        return res.status(412).json({
          success: false,
          message: 'Permission revision mismatch — refresh and retry',
          code: 'PERMISSION_REVISION_CONFLICT',
          currentRevision: current
        });
      }
    }

    const prevCustom = [...(user.custom_permissions || [])];
    const prevDeny = [...(user.permission_denials || [])];
    const validPerms = filterValidCodes(permissions);

    let updatedPermissions = [...user.custom_permissions];

    switch (action) {
      case 'add':
        updatedPermissions = [...new Set([...updatedPermissions, ...validPerms])];
        break;
      case 'remove':
        updatedPermissions = updatedPermissions.filter((p) => !validPerms.includes(p));
        break;
      case 'replace':
        updatedPermissions = validPerms;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Use: add, remove, or replace'
        });
    }

    let nextDeny = [...(user.permission_denials || [])];
    if (Array.isArray(permission_denials)) {
      nextDeny = filterValidCodes(permission_denials);
    }

    try {
      await assertNoPrivilegeEscalation({
        actorRole: req.user.role,
        actorEffectivePermissions: req.user.permissions,
        targetUserDoc: user,
        nextCustom: updatedPermissions,
        nextDeny
      });
    } catch (esc) {
      if (esc.statusCode === 403) {
        permissionMetrics.inc('permissionEscalationBlocked');
        return res.status(403).json({
          success: false,
          message: esc.message,
          code: esc.code || 'FORBIDDEN'
        });
      }
      throw esc;
    }

    user.custom_permissions = updatedPermissions;
    user.permission_denials = nextDeny;
    const revBefore = user.permissionsRevision != null ? user.permissionsRevision : 0;
    user.permissionsRevision = revBefore + 1;
    await user.save();

    await invalidateUserPermissionCache(user._id);
    permissionMetrics.inc('permissionApiWrites');

    await writeAudit({
      actorUserId: req.user._id || req.user.id,
      targetUserId: user._id,
      tenantId: user.tenantId,
      action: 'put_permissions',
      previousCustom: prevCustom,
      previousDeny: prevDeny,
      nextCustom: user.custom_permissions,
      nextDeny: user.permission_denials,
      catalogVersion: PERMISSION_CATALOG_VERSION,
      permissionsRevisionBefore: revBefore,
      permissionsRevisionAfter: user.permissionsRevision,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resolved = await resolveEffectivePermissionsForUser(user);

    logger.info('User permissions updated', {
      userId: user._id,
      employeeId: user.employee_id,
      action,
      permissions: validPerms
    });

    res.set('ETag', `W/"permrev-${user.permissionsRevision}"`);
    res.json({
      success: true,
      message: 'Permissions updated successfully',
      data: {
        userId: user._id,
        employeeId: user.employee_id,
        customPermissions: user.custom_permissions,
        permissionDenials: user.permission_denials,
        effectivePermissions: resolved.effectivePermissions,
        permissionsRevision: user.permissionsRevision,
        count: user.custom_permissions.length
      }
    });
  } catch (error) {
    logger.error('Error updating user permissions', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update user permissions',
      error: error.message
    });
  }
};

const getAllUsersWithPermissions = async (req, res) => {
  try {
    const { page = 1, limit = 10, department, band_level } = req.query;

    const filter = {};
    if (department) filter.department = department.toUpperCase();
    if (band_level) filter.band_level = band_level;

    const actorRole = String(req.user.role || '').toLowerCase();
    if (actorRole !== 'superadmin') {
      filter.tenantId = String(req.user.tenantId || '').toLowerCase();
    }

    const users = await User.find(filter)
      .select(
        'name email employee_id department band_level hierarchy_level role custom_permissions permission_denials is_active status tenantId permissionsRevision'
      )
      .populate('stores', 'name code')
      .populate('reporting_manager', 'name employee_id')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    const usersWithPermissions = [];
    for (const u of users) {
      const resolved = await resolveEffectivePermissionsForUser(u);
      const departmentPermissions = User.getDepartmentPermissions(u.department);
      const plain = u.toObject();
      usersWithPermissions.push({
        ...plain,
        userId: String(plain._id || u._id),
        departmentPermissions,
        effectivePermissions: resolved.effectivePermissions,
        totalPermissions: resolved.effectivePermissions.length
      });
    }

    res.json({
      success: true,
      data: usersWithPermissions,
      pagination: {
        current: parseInt(page, 10),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    logger.error('Error getting users with permissions', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get users with permissions',
      error: error.message
    });
  }
};

const resetUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const gate = assertCanManageUserPermissions(req, user);
    if (!gate.ok) {
      return res.status(gate.status).json({ success: false, message: gate.message });
    }

    const ifMatch = req.headers['if-match'];
    if (ifMatch) {
      const want = parsePermissionsRevisionFromIfMatch(ifMatch);
      const current = user.permissionsRevision != null ? user.permissionsRevision : 0;
      if (want != null && want !== current) {
        permissionMetrics.inc('permissionOptimisticLockConflict');
        return res.status(412).json({
          success: false,
          message: 'Permission revision mismatch — refresh and retry',
          code: 'PERMISSION_REVISION_CONFLICT',
          currentRevision: current
        });
      }
    }

    const prevCustom = [...(user.custom_permissions || [])];
    const prevDeny = [...(user.permission_denials || [])];

    user.custom_permissions = [];
    user.permission_denials = [];
    const revBefore = user.permissionsRevision != null ? user.permissionsRevision : 0;
    user.permissionsRevision = revBefore + 1;
    await user.save();

    await invalidateUserPermissionCache(user._id);
    permissionMetrics.inc('permissionApiWrites');

    await writeAudit({
      actorUserId: req.user._id || req.user.id,
      targetUserId: user._id,
      tenantId: user.tenantId,
      action: 'reset',
      previousCustom: prevCustom,
      previousDeny: prevDeny,
      nextCustom: [],
      nextDeny: [],
      catalogVersion: PERMISSION_CATALOG_VERSION,
      permissionsRevisionBefore: revBefore,
      permissionsRevisionAfter: user.permissionsRevision,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    const resolved = await resolveEffectivePermissionsForUser(user);
    const departmentPermissions = User.getDepartmentPermissions(user.department);

    logger.info('User permission overrides cleared', {
      userId: user._id,
      employeeId: user.employee_id,
      department: user.department
    });

    res.set('ETag', `W/"permrev-${user.permissionsRevision}"`);
    res.json({
      success: true,
      message: 'Permission overrides cleared (role defaults only)',
      data: {
        userId: user._id,
        employeeId: user.employee_id,
        department: user.department,
        departmentPermissions,
        effectivePermissions: resolved.effectivePermissions,
        permissionsRevision: user.permissionsRevision,
        count: resolved.effectivePermissions.length
      }
    });
  } catch (error) {
    logger.error('Error resetting user permissions', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to reset user permissions',
      error: error.message
    });
  }
};

const getPermissionMetrics = async (req, res) => {
  try {
    res.json({ success: true, data: permissionMetrics.snapshot() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** POST body: optional custom_permissions[], permission_denials[] — omitted arrays keep target user's current values */
const previewUserPermissionEscalation = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select(
      'custom_permissions permission_denials permissions department role tenantId employee_id email name'
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const gate = assertCanManageUserPermissions(req, user);
    if (!gate.ok) {
      return res.status(gate.status).json({ success: false, message: gate.message });
    }

    const customIn = Array.isArray(req.body.custom_permissions)
      ? filterValidCodes(req.body.custom_permissions)
      : [...(user.custom_permissions || [])];
    const denyIn = Array.isArray(req.body.permission_denials)
      ? filterValidCodes(req.body.permission_denials)
      : [...(user.permission_denials || [])];

    const before = await resolveEffectivePermissionsForUser(user);
    const plain = typeof user.toObject === 'function' ? user.toObject() : { ...user };
    plain.custom_permissions = customIn;
    plain.permission_denials = denyIn;
    const after = await resolveEffectivePermissionsForUser(plain);

    const esc = await previewPrivilegeEscalation({
      actorRole: req.user.role,
      actorEffectivePermissions: req.user.permissions,
      targetUserDoc: user,
      nextCustom: customIn,
      nextDeny: denyIn
    });

    const beforeSet = new Set(before.effectivePermissions);
    const afterSet = new Set(after.effectivePermissions);
    const added = after.effectivePermissions.filter((p) => !beforeSet.has(p));
    const removed = [...beforeSet].filter((p) => !afterSet.has(p));

    res.json({
      success: true,
      data: {
        ...esc,
        effectiveBefore: before.effectivePermissions,
        effectiveAfter: after.effectivePermissions,
        added,
        removed,
        proposedCustomPermissions: customIn,
        proposedPermissionDenials: denyIn,
        catalogVersion: PERMISSION_CATALOG_VERSION,
        unknownCustomStripped: Array.isArray(req.body.custom_permissions)
          ? unknownCodes(req.body.custom_permissions)
          : [],
        unknownDenyStripped: Array.isArray(req.body.permission_denials)
          ? unknownCodes(req.body.permission_denials)
          : []
      }
    });
  } catch (error) {
    logger.error('Error previewing permission escalation', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to preview permission change',
      error: error.message
    });
  }
};

module.exports = {
  getPermissionCatalog,
  getAllPermissions,
  getDepartmentPermissions,
  getUserPermissions,
  patchUserPermissionOverrides,
  updateUserPermissions,
  getAllUsersWithPermissions,
  resetUserPermissions,
  previewUserPermissionEscalation,
  getPermissionMetrics
};
