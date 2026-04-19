const Employee = require('../models/Employee.model');
const logger = require('../config/logger');

/**
 * POST /api/hr/payroll/statutory-lookup
 * Body: { employee_codes: string[] } (max 500)
 * Returns statutory + bank fields from Employee master for payroll statutory exports (PF ECR, bank advice, TDS).
 */
const postStatutoryLookup = async (req, res) => {
  try {
    const raw = req.body?.employee_codes;
    if (!Array.isArray(raw) || raw.length === 0) {
      return res.status(400).json({ success: false, message: 'employee_codes must be a non-empty array' });
    }
    const codes = [...new Set(raw.map((c) => String(c).trim()).filter(Boolean))].slice(0, 500);

    const employees = await Employee.find({ code: { $in: codes } })
      .select('code employeeId fullName uan panNumber esiNo bankAccount email phone status')
      .lean();

    const map = {};
    for (const e of employees) {
      map[e.code] = {
        code: e.code,
        employeeId: e.employeeId,
        fullName: e.fullName || '',
        uan: e.uan ? String(e.uan).replace(/\D/g, '').slice(0, 12) : '',
        panNumber: e.panNumber || '',
        esiNo: e.esiNo || '',
        bankAccount: {
          accountNumber: e.bankAccount?.accountNumber || '',
          ifscCode: e.bankAccount?.ifscCode || '',
          bankName: e.bankAccount?.bankName || '',
          branchName: e.bankAccount?.branchName || '',
          accountType: e.bankAccount?.accountType || ''
        },
        email: e.email || '',
        phone: e.phone || '',
        status: e.status || ''
      };
    }

    const missing = codes.filter((c) => !map[c]);

    return res.status(200).json({
      success: true,
      data: map,
      missing,
      meta: { requested: codes.length, resolved: Object.keys(map).length }
    });
  } catch (error) {
    logger.error('postStatutoryLookup', { error: error.message });
    return res.status(500).json({ success: false, message: 'Statutory lookup failed' });
  }
};

module.exports = { postStatutoryLookup };
