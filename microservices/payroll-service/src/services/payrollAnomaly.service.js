const PayrollRecord = require('../models/PayrollRecord.model');
const logger = require('../config/logger');

function prevMonthYear(month, year) {
  let m = Number(month) - 1;
  let y = Number(year);
  if (m < 1) {
    m = 12;
    y -= 1;
  }
  return { month: m, year: y };
}

/**
 * Pre-run anomaly checks: large net pay jumps vs prior month, headcount spikes (heuristic).
 * Set PAYROLL_ANOMALY_BLOCK=true to hard-fail when any CRITICAL signal exists.
 */
async function evaluatePayrollAnomalies({ month, year }) {
  if (process.env.PAYROLL_ANOMALY_CHECK === 'false') {
    return { ok: true, signals: [], skipped: true };
  }

  const maxPct = Number(process.env.PAYROLL_ANOMALY_MAX_NET_JUMP_PCT || 50);
  const { month: pm, year: py } = prevMonthYear(month, year);

  const current = await PayrollRecord.find({ month: Number(month), year: Number(year) }).lean();
  const previous = await PayrollRecord.find({ month: pm, year: py }).lean();
  const prevByCode = new Map(previous.map((r) => [String(r.employee_code), r]));

  const signals = [];
  for (const r of current) {
    const prev = prevByCode.get(String(r.employee_code));
    if (!prev) continue;
    const curNet = Number(r.net_take_home || 0);
    const pNet = Number(prev.net_take_home || 0);
    if (pNet <= 0) continue;
    const pct = Math.abs((curNet - pNet) / pNet) * 100;
    if (pct >= maxPct) {
      signals.push({
        severity: 'WARN',
        code: 'NET_PAY_JUMP',
        employee_code: r.employee_code,
        priorNet: pNet,
        currentNet: curNet,
        changePct: Math.round(pct * 100) / 100
      });
    }
  }

  const headcount = current.length;
  const prevHc = previous.length;
  if (prevHc > 0) {
    const hcDeltaPct = Math.abs((headcount - prevHc) / prevHc) * 100;
    if (hcDeltaPct >= Number(process.env.PAYROLL_ANOMALY_HEADCOUNT_JUMP_PCT || 40)) {
      signals.push({
        severity: 'WARN',
        code: 'HEADCOUNT_SHIFT',
        currentCount: headcount,
        priorCount: prevHc,
        changePct: Math.round(hcDeltaPct * 100) / 100
      });
    }
  }

  /** When PAYROLL_ANOMALY_BLOCK=true, any WARN signal blocks final run completion */
  const block = process.env.PAYROLL_ANOMALY_BLOCK === 'true' && signals.length > 0;

  if (signals.length) {
    logger.warn('payroll anomaly signals', { month, year, count: signals.length, block });
  }

  return {
    ok: !block,
    signals,
    block,
    evaluatedAt: new Date().toISOString()
  };
}

module.exports = { evaluatePayrollAnomalies };
