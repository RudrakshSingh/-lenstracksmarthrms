const PayrollRecord = require('../models/PayrollRecord.model');
const { appendAudit } = require('../services/payrollAudit.service');
const { fetchPayrollStatutoryMap } = require('../utils/hrServiceClient');
const logger = require('../config/logger');

function buildCycleRef(month, year) {
  return `PAYROLL-${year}-${String(month).padStart(2, '0')}`;
}

function hrCtxFromReq(req) {
  const u = req.user || {};
  return {
    authorization: req.headers.authorization,
    tenantId:
      req.get('X-Tenant-Id') ||
      req.get('x-tenant-id') ||
      u.tenantId ||
      u.tenant_id,
    companyId:
      req.get('X-Company-Id') ||
      req.get('x-company-id') ||
      u.companyId ||
      u.company_id,
    requestId: req.requestId
  };
}

function statRow(map, code) {
  const k = String(code || '').trim();
  return map[k] || map[String(k).toUpperCase()] || null;
}

const EXPORT_DISCLAIMER =
  '# Structured export from payroll + HR master. Validate against bank / EPFO Unified Portal / TRACES before filing or transfers.\n';

/** GET /api/payroll/reports/bank-advice — CSV bank transfer list */
const getBankAdvice = async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    if (!month || !year) return res.status(400).json({ success: false, message: 'month and year required' });

    const rows = await PayrollRecord.find({ month, year }).sort({ employee_code: 1 }).lean();
    const codes = rows.map((r) => r.employee_code).filter(Boolean);
    const statutory = await fetchPayrollStatutoryMap(hrCtxFromReq(req), codes);

    const cycleRef = buildCycleRef(month, year);
    const header = 'employee_code,employee_name,net_pay,bank_ifsc,bank_account,reference\n';
    const lines = rows.map((r) => {
      const name = (r.employee_name || r.name || '').toString().replace(/,/g, ' ');
      const s = statRow(statutory, r.employee_code);
      const ifsc = s?.bankAccount?.ifscCode || r.bank_ifsc || '';
      const acct = s?.bankAccount?.accountNumber || r.bank_account || '';
      return [
        r.employee_code,
        name,
        Number(r.net_take_home || 0),
        ifsc,
        acct,
        cycleRef
      ].join(',');
    });
    const csv = EXPORT_DISCLAIMER + header + lines.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="bank-advice-${year}-${String(month).padStart(2, '0')}.csv"`);
    await appendAudit({
      cycleRef,
      action: 'EXPORT_BANK_ADVICE',
      req,
      payload: { month, year, rows: rows.length }
    });
    return res.status(200).send(csv);
  } catch (e) {
    logger.error('getBankAdvice', { error: e.message });
    return res.status(500).json({ success: false, message: 'Failed to generate bank advice' });
  }
};

/** GET /api/payroll/reports/pf-ecr — tab-separated EPF-style extract (simplified) */
const getPfEcr = async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    if (!month || !year) return res.status(400).json({ success: false, message: 'month and year required' });

    const rows = await PayrollRecord.find({ month, year }).sort({ employee_code: 1 }).lean();
    const codes = rows.map((r) => r.employee_code).filter(Boolean);
    const statutory = await fetchPayrollStatutoryMap(hrCtxFromReq(req), codes);

    const header = 'UAN\temployee_code\tname\tgross_wages\tepf_wages\tepf_employee\tepf_employer\n';
    const lines = rows.map((r) => {
      const s = statRow(statutory, r.employee_code);
      const uan = (s?.uan || r.uan || '').toString().replace(/\D/g, '').slice(0, 12);
      return [
        uan,
        r.employee_code,
        (s?.fullName || r.employee_name || '').toString().replace(/\t/g, ' '),
        r.adjusted_gross || 0,
        Math.min(Number(r.adjusted_gross || 0), 15000),
        r.epf_employee || 0,
        r.epf_employer || 0
      ].join('\t');
    });
    const text = EXPORT_DISCLAIMER + header + lines.join('\n');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pf-ecr-${year}-${String(month).padStart(2, '0')}.txt"`);
    await appendAudit({
      cycleRef: buildCycleRef(month, year),
      action: 'EXPORT_PF_ECR',
      req,
      payload: { month, year }
    });
    return res.status(200).send(text);
  } catch (e) {
    logger.error('getPfEcr', { error: e.message });
    return res.status(500).json({ success: false, message: 'Failed to generate PF ECR extract' });
  }
};

/** GET /api/payroll/reports/tds-form24q — monthly TDS lines (simplified; quarterly filing is downstream) */
const getTdsForm24q = async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    if (!month || !year) return res.status(400).json({ success: false, message: 'month and year required' });

    const rows = await PayrollRecord.find({ month, year }).sort({ employee_code: 1 }).lean();
    const codes = rows.map((r) => r.employee_code).filter(Boolean);
    const statutory = await fetchPayrollStatutoryMap(hrCtxFromReq(req), codes);

    const data = rows.map((r) => {
      const s = statRow(statutory, r.employee_code);
      const pan = (s?.panNumber || r.pan_number || '').toString().trim().toUpperCase();
      return {
        employee_code: r.employee_code,
        pan,
        name: (s?.fullName || r.employee_name || '').toString(),
        gross: Number(r.adjusted_gross || 0),
        tds: Number(r.tds || 0),
        net: Number(r.net_take_home || 0)
      };
    });
    await appendAudit({
      cycleRef: buildCycleRef(month, year),
      action: 'EXPORT_TDS_24Q',
      req,
      payload: { month, year }
    });
    return res.status(200).json({
      success: true,
      data: {
        month,
        year,
        period: `${year}-${String(month).padStart(2, '0')}`,
        disclaimer:
          'Structured extract from payroll + HR master. Reconcile with Form 24Q / TRACES before statutory filing.',
        lines: data
      }
    });
  } catch (e) {
    logger.error('getTdsForm24q', { error: e.message });
    return res.status(500).json({ success: false, message: 'Failed to build TDS extract' });
  }
};

/** GET /api/payroll/audit-log — list workflow audit entries (alias style for brief) */
const getPayrollAuditLog = async (req, res) => {
  try {
    const PayrollWorkflowAudit = require('../models/PayrollWorkflowAudit.model');
    const { cycleRef, from, to, limit = 200 } = req.query;
    const q = {};
    if (cycleRef) q.cycle_ref = cycleRef;
    if (from || to) {
      q.created_at = {};
      if (from) q.created_at.$gte = new Date(from);
      if (to) q.created_at.$lte = new Date(to);
    }
    const logs = await PayrollWorkflowAudit.find(q)
      .sort({ created_at: -1 })
      .limit(Math.min(Number(limit) || 200, 1000))
      .lean();
    return res.status(200).json({ success: true, data: logs });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { getBankAdvice, getPfEcr, getTdsForm24q, getPayrollAuditLog };
