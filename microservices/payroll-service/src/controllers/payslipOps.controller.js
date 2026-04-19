const PDFDocument = require('pdfkit');
const PayrollRecord = require('../models/PayrollRecord.model');
const { appendAudit } = require('../services/payrollAudit.service');
const { hasAnyPermission, normalizeRole } = require('../middleware/payrollAccess.middleware');
const logger = require('../config/logger');

function viewerMayAccessAnyPayslipPdf(user) {
  if (!user) return false;
  const nr = normalizeRole(user.role);
  if (nr === 'admin' || nr === 'superadmin') return true;
  if (hasAnyPermission(user, ['payroll_payslip_manage'])) return true;
  if (hasAnyPermission(user, ['read_payroll']) && ['hr', 'accountant', 'finance'].includes(nr)) return true;
  return false;
}

function requesterEmployeeCode(user) {
  return (user.employee_id || user.employeeId || user.employee_code || '')
    .toString()
    .trim()
    .toUpperCase();
}

function buildCycleRef(month, year) {
  return `PAYROLL-${year}-${String(month).padStart(2, '0')}`;
}

/** POST /api/payroll/generate-payslips */
const generatePayslips = async (req, res) => {
  try {
    const { month, year, employee_codes } = req.body;
    if (!month || !year) return res.status(400).json({ success: false, message: 'month and year required' });

    const q = { month: Number(month), year: Number(year) };
    if (Array.isArray(employee_codes) && employee_codes.length) {
      q.employee_code = { $in: employee_codes };
    }

    const result = await PayrollRecord.updateMany(q, {
      $set: { payslip_generated: true, payslip_generated_at: new Date() }
    });

    const cycleRef = buildCycleRef(month, year);
    await appendAudit({ cycleRef, action: 'PAYSLIP_GENERATE_BATCH', req, payload: { matched: result.modifiedCount } });

    return res.status(200).json({
      success: true,
      message: 'Payslip flags updated',
      data: { matched: result.matchedCount, modified: result.modifiedCount }
    });
  } catch (e) {
    logger.error('generatePayslips', { error: e.message });
    return res.status(500).json({ success: false, message: e.message });
  }
};

/** POST /api/payroll/payslips/send — body.email_overrides: { "EMP001": "a@b.com" } when payroll rows lack email */
const sendPayslips = async (req, res) => {
  try {
    const { month, year, employee_codes, email_overrides = {} } = req.body;
    if (!month || !year) return res.status(400).json({ success: false, message: 'month and year required' });

    let emailService;
    try {
      emailService = require('../utils/email');
    } catch (_) {
      emailService = null;
    }

    const q = { month: Number(month), year: Number(year), payslip_generated: true };
    if (Array.isArray(employee_codes) && employee_codes.length) {
      q.employee_code = { $in: employee_codes };
    }

    const rows = await PayrollRecord.find(q).lean();
    const cycleRef = buildCycleRef(month, year);

    const sent = [];
    const failed = [];

    for (const r of rows) {
      const email = email_overrides[r.employee_code] || email_overrides[String(r.employee_code)];
      if (!email) {
        failed.push({ employee_code: r.employee_code, reason: 'NO_EMAIL_USE_EMAIL_OVERRIDES' });
        continue;
      }
      if (emailService && typeof emailService.sendEmail === 'function') {
        try {
          await emailService.sendEmail({
            to: email,
            subject: `Payslip ${year}-${String(month).padStart(2, '0')} — ${r.employee_code}`,
            text: `Your payslip for ${month}/${year} is available. Employee: ${r.employee_code}.`
          });
          sent.push(r.employee_code);
        } catch (err) {
          failed.push({ employee_code: r.employee_code, reason: err.message });
        }
      } else {
        failed.push({ employee_code: r.employee_code, reason: 'EMAIL_SERVICE_UNAVAILABLE' });
      }
    }

    await appendAudit({
      cycleRef,
      action: 'PAYSLIP_SEND_BATCH',
      req,
      payload: { sent: sent.length, failed: failed.length }
    });

    return res.status(200).json({
      success: true,
      data: { sent, failed }
    });
  } catch (e) {
    logger.error('sendPayslips', { error: e.message });
    return res.status(500).json({ success: false, message: e.message });
  }
};

/** GET /api/payroll/payslips/:id/pdf — id = PayrollRecord _id */
const getPayslipPdf = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const record = await PayrollRecord.findById(req.params.id).lean();
    if (!record) return res.status(404).json({ success: false, message: 'Payroll record not found' });

    if (!viewerMayAccessAnyPayslipPdf(req.user)) {
      if (!hasAnyPermission(req.user, ['payroll_payslip_self'])) {
        return res.status(403).json({
          success: false,
          code: 'INSUFFICIENT_PERMISSION',
          message: 'Access denied for payslip PDF'
        });
      }
      const recCode = (record.employee_code || '').toString().trim().toUpperCase();
      const uCode = requesterEmployeeCode(req.user);
      if (!uCode || uCode !== recCode) {
        return res.status(403).json({
          success: false,
          code: 'PAYSLIP_NOT_OWNED',
          message: 'You may only download your own payslip'
        });
      }
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="payslip-${record.employee_code}-${record.year}-${record.month}.pdf"`);
    doc.pipe(res);

    doc.fontSize(16).text('Payslip', { underline: true });
    doc.moveDown();
    doc.fontSize(10).text(`Employee: ${record.employee_code}`);
    doc.text(`Period: ${record.month}/${record.year}`);
    doc.text(`Gross: ${record.adjusted_gross || 0}`);
    doc.text(`Deductions: ${record.total_employee_deductions || 0}`);
    doc.text(`Net pay: ${record.net_take_home || 0}`);
    doc.text(`Generated: ${new Date().toISOString()}`);
    doc.end();

    await appendAudit({
      cycleRef: buildCycleRef(record.month, record.year),
      action: 'PAYSLIP_PDF_DOWNLOAD',
      req,
      payload: { recordId: String(record._id) }
    });
  } catch (e) {
    logger.error('getPayslipPdf', { error: e.message });
    if (!res.headersSent) return res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { generatePayslips, sendPayslips, getPayslipPdf };
