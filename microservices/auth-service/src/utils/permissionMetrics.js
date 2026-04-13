/**
 * Lightweight in-process metrics (reset on restart). Logged on deny in RBAC.
 */
const counters = {
  rbacPermissionDenied: 0,
  rbacPermissionChecks: 0,
  permissionApiWrites: 0,
  permissionEscalationBlocked: 0,
  permissionOptimisticLockConflict: 0
};

function inc(key) {
  if (counters[key] === undefined) counters[key] = 0;
  counters[key] += 1;
}

function snapshot() {
  return { ...counters };
}

module.exports = { inc, snapshot, counters };
