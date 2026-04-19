const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { enforceTenantContext } = require('../middleware/tenantContext.middleware');
const { payrollRequestContext } = require('../middleware/payrollRequestContext.middleware');
const { requirePayrollAccess } = require('../middleware/payrollAccess.middleware');
const PayrollRecord = require('../models/PayrollRecord.model');

router.use(authenticate, enforceTenantContext, payrollRequestContext);

router.get(
  '/cycle/employees',
  requirePayrollAccess({ anyPermissions: ['read_payroll', 'read_payroll_summary'], anyRoles: ['admin', 'hr', 'accountant', 'finance'] }),
  async (req, res) => {
    try {
      const { month, year } = req.query;
      const q = {};
      if (month) q.month = Number(month);
      if (year) q.year = Number(year);
      const codes = await PayrollRecord.distinct('employee_code', q);
      return res.status(200).json({ success: true, data: { employeeCodes: codes, count: codes.length } });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }
);

router.get(
  '/cycle/payslips',
  requirePayrollAccess({ anyPermissions: ['read_payroll', 'payroll_payslip_manage'], anyRoles: ['admin', 'hr', 'accountant', 'finance'] }),
  async (req, res) => {
    try {
      const { month, year } = req.query;
      if (!month || !year) return res.status(400).json({ success: false, message: 'month and year required' });
      const rows = await PayrollRecord.find({ month: Number(month), year: Number(year) })
        .select('employee_code payslip_generated payslip_generated_at payslip_url status')
        .lean();
      return res.status(200).json({ success: true, data: rows });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }
);

module.exports = router;
