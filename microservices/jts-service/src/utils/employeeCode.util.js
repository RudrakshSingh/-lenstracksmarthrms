/**
 * Normalize HR/auth employee_id for comparison and storage (matches attendance-service style).
 * @param {string|undefined|null} raw
 * @returns {string}
 */
function normalizeAuthEmployeeCode(raw) {
  if (raw === undefined || raw === null) return '';
  return String(raw).trim().toUpperCase();
}

module.exports = { normalizeAuthEmployeeCode };
