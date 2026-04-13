const { resolveEffectivePermissionsForUser } = require('./effectivePermissions');

function normalizeRole(role) {
  if (!role) return 'employee';
  if (typeof role === 'object' && role.name) return String(role.name).toLowerCase();
  return String(role).toLowerCase();
}

/**
 * Superadmin: no checks.
 * Others: cannot manage target superadmin; any NEW effective permission must already be in actor's effective set (from JWT/middleware).
 */
async function assertNoPrivilegeEscalation({
  actorRole,
  actorEffectivePermissions,
  targetUserDoc,
  nextCustom,
  nextDeny
}) {
  const ar = normalizeRole(actorRole);
  if (ar === 'superadmin') return;

  const targetRole = normalizeRole(targetUserDoc.role);
  if (targetRole === 'superadmin') {
    const err = new Error('Only superadmin can change permissions for superadmin users');
    err.statusCode = 403;
    throw err;
  }

  const actorSet = new Set(actorEffectivePermissions || []);

  const before = await resolveEffectivePermissionsForUser(targetUserDoc);
  const oldEff = new Set(before.effectivePermissions);

  const plain =
    typeof targetUserDoc.toObject === 'function'
      ? targetUserDoc.toObject()
      : { ...targetUserDoc };
  plain.custom_permissions = nextCustom;
  plain.permission_denials = nextDeny;
  const after = await resolveEffectivePermissionsForUser(plain);
  const newEff = new Set(after.effectivePermissions);

  for (const p of newEff) {
    if (!oldEff.has(p) && !actorSet.has(p)) {
      const err = new Error(
        `Cannot grant permission "${p}" — not in your effective access. Ask superadmin.`
      );
      err.statusCode = 403;
      err.code = 'PERMISSION_ESCALATION';
      err.blockingPermission = p;
      throw err;
    }
  }
}

/**
 * Dry-run for UI: same rules as assertNoPrivilegeEscalation but returns JSON (no throw on denial).
 */
async function previewPrivilegeEscalation({
  actorRole,
  actorEffectivePermissions,
  targetUserDoc,
  nextCustom,
  nextDeny
}) {
  try {
    await assertNoPrivilegeEscalation({
      actorRole,
      actorEffectivePermissions,
      targetUserDoc,
      nextCustom,
      nextDeny
    });
    return { allowed: true, code: 'OK' };
  } catch (e) {
    if (e.statusCode === 403) {
      return {
        allowed: false,
        code: e.code || 'FORBIDDEN',
        message: e.message,
        blockingPermission: e.blockingPermission
      };
    }
    throw e;
  }
}

module.exports = { assertNoPrivilegeEscalation, previewPrivilegeEscalation, normalizeRole };
