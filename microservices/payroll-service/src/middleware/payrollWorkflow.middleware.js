const { normalizeStatus, CANONICAL } = require('../utils/payrollStateMachine');

function userIsSuperAdmin(req) {
  const r = String(req.user?.role || '').toLowerCase();
  return r === 'superadmin' || r === 'super_admin';
}

/**
 * Approvals / freeze — require MFA when PAYROLL_APPROVAL_MFA_REQUIRED=true.
 * Client may send X-MFA-Verified: true after step-up auth, or JWT must include mfaVerified / amr.
 */
function requirePayrollMfa(req, res, next) {
  if (process.env.PAYROLL_APPROVAL_MFA_REQUIRED !== 'true') {
    return next();
  }
  const hdr = String(req.headers['x-mfa-verified'] || req.headers['X-MFA-Verified'] || '').toLowerCase();
  const jwtMfa = req.user?.mfaVerified === true || req.user?.mfa_verified === true;
  if (hdr === 'true' || hdr === '1' || jwtMfa) {
    return next();
  }
  return res.status(403).json({
    success: false,
    code: 'MFA_REQUIRED',
    message: 'Multi-factor verification required for this action',
    error: 'MFA_REQUIRED'
  });
}

function assertVersionMatch(cycle, body) {
  if (process.env.PAYROLL_STRICT_VERSION !== 'true') return null;
  const expected = body?.expectedVersion ?? body?.version;
  if (expected === undefined || expected === null) {
    return { status: 400, body: { success: false, code: 'VERSION_REQUIRED', message: 'expectedVersion is required', error: 'VERSION_REQUIRED' } };
  }
  if (Number(expected) !== Number(cycle?.workflow_version ?? 0)) {
    return {
      status: 409,
      body: {
        success: false,
        code: 'STALE_VERSION',
        message: 'Cycle was updated by another process; refresh and retry',
        error: 'STALE_VERSION',
        currentVersion: cycle?.workflow_version ?? 0
      }
    };
  }
  return null;
}

/** Block mutations when cycle is frozen/posted/reconciled (immutable payroll data). */
function rejectIfCycleImmutable(cycle) {
  const s = normalizeStatus(cycle?.status);
  const immutable = [CANONICAL.FROZEN, CANONICAL.POSTED, CANONICAL.RECONCILED].includes(s)
    || ['SLIP_FROZEN', 'POSTED_TO_FINANCE'].includes(cycle?.status);
  if (!immutable) return null;
  return {
    status: 423,
    body: {
      success: false,
      code: 'CYCLE_LOCKED',
      message: 'Payroll cycle is locked; no further edits allowed',
      error: 'CYCLE_LOCKED'
    }
  };
}

module.exports = {
  requirePayrollMfa,
  assertVersionMatch,
  rejectIfCycleImmutable,
  userIsSuperAdmin
};
