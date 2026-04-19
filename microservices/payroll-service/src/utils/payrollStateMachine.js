/**
 * Payroll workflow — canonical states & transitions (Etelios payroll module brief).
 * Legacy status values are normalized for reads; prefer persisting canonical values on write.
 */

const CANONICAL = {
  DRAFT: 'DRAFT',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  HR_APPROVED: 'HR_APPROVED',
  FINANCE_APPROVED: 'FINANCE_APPROVED',
  FROZEN: 'FROZEN',
  POSTED: 'POSTED',
  RECONCILED: 'RECONCILED'
};

/** Stored in DB historically — mapped to canonical for logic */
const LEGACY_TO_CANONICAL = {
  DRAFT_HR: CANONICAL.DRAFT,
  FINANCE_REVIEW: CANONICAL.HR_APPROVED,
  SLIP_FROZEN: CANONICAL.FROZEN,
  POSTED_TO_FINANCE: CANONICAL.POSTED,
  SENT_BACK_TO_HR: CANONICAL.DRAFT
};

const TRANSITIONS = {
  [CANONICAL.DRAFT]: [CANONICAL.PROCESSING],
  [CANONICAL.PROCESSING]: [CANONICAL.COMPLETED, CANONICAL.DRAFT],
  [CANONICAL.COMPLETED]: [CANONICAL.HR_APPROVED],
  [CANONICAL.HR_APPROVED]: [CANONICAL.FINANCE_APPROVED, CANONICAL.DRAFT],
  [CANONICAL.FINANCE_APPROVED]: [CANONICAL.FROZEN],
  [CANONICAL.FROZEN]: [CANONICAL.POSTED],
  [CANONICAL.POSTED]: [CANONICAL.RECONCILED]
};

function normalizeStatus(raw) {
  if (!raw) return CANONICAL.DRAFT;
  if (LEGACY_TO_CANONICAL[raw]) return LEGACY_TO_CANONICAL[raw];
  if (Object.values(CANONICAL).includes(raw)) return raw;
  return String(raw);
}

function canTransition(fromRaw, toCanonical) {
  const from = normalizeStatus(fromRaw);
  const allowed = TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(toCanonical);
}

function allowedActions(cycle) {
  const raw = cycle?.status;
  const s = normalizeStatus(raw);
  const ver = Number(cycle?.workflow_version ?? 0);
  const locked = s === CANONICAL.FROZEN || s === CANONICAL.POSTED || s === CANONICAL.RECONCILED;

  const financePending = s === CANONICAL.HR_APPROVED || raw === 'FINANCE_REVIEW';

  return {
    version: ver,
    status: s,
    statusRaw: raw,
    canStartDryRun: s === CANONICAL.DRAFT,
    canStartFinalRun: s === CANONICAL.DRAFT,
    canHrSubmit: s === CANONICAL.COMPLETED,
    canFinanceDecision: financePending,
    canFreeze: s === CANONICAL.FINANCE_APPROVED,
    canPost: s === CANONICAL.FROZEN || raw === 'SLIP_FROZEN',
    canReconcile: s === CANONICAL.POSTED || raw === 'POSTED_TO_FINANCE',
    canUnlockFrozen: s === CANONICAL.FROZEN || raw === 'SLIP_FROZEN' || s === CANONICAL.POSTED,
    cycleLockedForEdits: locked,
    readOnly: s === CANONICAL.RECONCILED
  };
}

module.exports = {
  CANONICAL,
  LEGACY_TO_CANONICAL,
  normalizeStatus,
  canTransition,
  allowedActions,
  TRANSITIONS
};
