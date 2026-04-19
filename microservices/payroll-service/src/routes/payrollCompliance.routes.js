const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { enforceTenantContext } = require('../middleware/tenantContext.middleware');
const { payrollRequestContext } = require('../middleware/payrollRequestContext.middleware');
const { requirePayrollAccess } = require('../middleware/payrollAccess.middleware');
const reports = require('../controllers/payrollReports.controller');
const payslip = require('../controllers/payslipOps.controller');

router.use(authenticate, enforceTenantContext, payrollRequestContext);

router.get(
  '/reports/bank-advice',
  requirePayrollAccess({ anyPermissions: ['payroll_reports_export', 'read_payroll'], anyRoles: ['admin', 'accountant', 'finance', 'hr'] }),
  reports.getBankAdvice
);
router.get(
  '/reports/pf-ecr',
  requirePayrollAccess({ anyPermissions: ['payroll_reports_export', 'read_payroll'], anyRoles: ['admin', 'accountant', 'finance', 'hr'] }),
  reports.getPfEcr
);
router.get(
  '/reports/tds-form24q',
  requirePayrollAccess({ anyPermissions: ['payroll_reports_export', 'read_payroll'], anyRoles: ['admin', 'accountant', 'finance', 'hr'] }),
  reports.getTdsForm24q
);
router.get(
  '/audit-log',
  requirePayrollAccess({
    anyPermissions: ['payroll_audit_read', 'audit_logs', 'read_payroll'],
    anyRoles: ['admin', 'accountant', 'finance', 'hr', 'auditor']
  }),
  reports.getPayrollAuditLog
);

router.post(
  '/generate-payslips',
  requirePayrollAccess({ anyPermissions: ['payroll_payslip_manage', 'write_payroll'], anyRoles: ['admin', 'hr'] }),
  payslip.generatePayslips
);
router.post(
  '/payslips/send',
  requirePayrollAccess({ anyPermissions: ['payroll_payslip_manage', 'write_payroll'], anyRoles: ['admin', 'hr'] }),
  payslip.sendPayslips
);
router.get(
  '/payslips/:id/pdf',
  requirePayrollAccess({
    anyPermissions: ['payroll_payslip_manage', 'read_payroll', 'payroll_payslip_self'],
    anyRoles: ['admin', 'hr', 'accountant', 'finance']
  }),
  payslip.getPayslipPdf
);

module.exports = router;
