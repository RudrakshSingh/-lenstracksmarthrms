const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const payrollRunLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.PAYROLL_RUN_RATE_LIMIT || 40),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMIT', message: 'Too many payroll run requests' }
});
const { authenticate } = require('../middleware/auth.middleware');
const { enforceTenantContext } = require('../middleware/tenantContext.middleware');
const { requirePayrollMfa } = require('../middleware/payrollWorkflow.middleware');
const { payrollRequestContext } = require('../middleware/payrollRequestContext.middleware');
const { requirePayrollAccess } = require('../middleware/payrollAccess.middleware');
const workflow = require('../controllers/payrollWorkflowController');
const {
  validateBody,
  initiateCycleBody,
  startRunBody,
  financeDecisionBody,
  freezeBody,
  hrSubmitBody,
  postBody,
  unlockBody
} = require('../validation/payrollWorkflow.joi');

router.use(authenticate, enforceTenantContext, payrollRequestContext);

router.get(
  '/attendance-preview',
  requirePayrollAccess({ anyPermissions: ['payroll_gates_read', 'read_payroll'], anyRoles: ['admin', 'hr'] }),
  workflow.getAttendancePreview
);
router.get(
  '/month-salary-preview',
  requirePayrollAccess({ anyPermissions: ['payroll_gates_read', 'read_payroll'], anyRoles: ['admin', 'hr'] }),
  workflow.getMonthSalaryPreview
);

router.get(
  '/cycle/:cycleRef',
  requirePayrollAccess({
    anyPermissions: ['payroll_gates_read', 'read_payroll', 'read_payroll_summary'],
    anyRoles: ['admin', 'hr', 'accountant', 'finance', 'auditor']
  }),
  workflow.getCycleByRef
);
router.get(
  '/cycle/:cycleRef/audit-trail',
  requirePayrollAccess({
    anyPermissions: ['payroll_audit_read', 'audit_logs', 'read_payroll'],
    anyRoles: ['admin', 'hr', 'accountant', 'finance', 'auditor']
  }),
  workflow.getAuditTrail
);
router.post(
  '/cycle/:cycleRef/unlock',
  validateBody(unlockBody),
  requirePayrollAccess({
    allowAdminBypass: false,
    anyPermissions: ['payroll_cycle_unlock'],
    anyRoles: ['superadmin']
  }),
  workflow.unlockFrozenCycle
);

router.get(
  '/summary/:month/:year',
  requirePayrollAccess({
    anyPermissions: ['read_payroll_summary', 'read_payroll'],
    anyRoles: ['admin', 'hr', 'accountant', 'finance', 'auditor']
  }),
  workflow.getPayrollSummaryMY
);

router.post(
  '/runs',
  payrollRunLimiter,
  validateBody(startRunBody),
  requirePayrollAccess({ anyPermissions: ['payroll_run_execute', 'write_payroll'], anyRoles: ['admin', 'hr'] }),
  workflow.startPayrollRun
);
router.get(
  '/runs/:id',
  requirePayrollAccess({
    anyPermissions: ['payroll_run_execute', 'read_payroll'],
    anyRoles: ['admin', 'hr', 'accountant', 'finance']
  }),
  workflow.getPayrollRunById
);

router.get(
  '/gates/employee-master',
  requirePayrollAccess({ anyPermissions: ['payroll_gates_read', 'read_payroll'], anyRoles: ['admin', 'hr'] }),
  workflow.gateEmployeeMaster
);
router.get(
  '/gates/attendance-leave',
  requirePayrollAccess({ anyPermissions: ['payroll_gates_read', 'read_payroll'], anyRoles: ['admin', 'hr'] }),
  workflow.gateAttendanceLeave
);
router.get(
  '/gates/payroll-validation',
  requirePayrollAccess({ anyPermissions: ['payroll_gates_read', 'read_payroll'], anyRoles: ['admin', 'hr'] }),
  workflow.gatePayrollValidation
);

router.post(
  '/cycle/initiate',
  validateBody(initiateCycleBody),
  requirePayrollAccess({ anyPermissions: ['payroll_cycle_manage', 'write_payroll'], anyRoles: ['admin', 'hr'] }),
  workflow.initiateCycle
);
router.post(
  '/cycle/:cycleRef/hr-submit',
  validateBody(hrSubmitBody),
  requirePayrollAccess({ anyPermissions: ['payroll_hr_submit', 'write_payroll'], anyRoles: ['admin', 'hr'] }),
  requirePayrollMfa,
  workflow.submitHrApproval
);
router.post(
  '/cycle/:cycleRef/finance-review',
  requirePayrollAccess({ anyPermissions: ['payroll_finance_approve', 'read_payroll'], anyRoles: ['admin', 'accountant', 'finance'] }),
  workflow.moveToFinanceReview
);
router.post(
  '/cycle/:cycleRef/finance-decision',
  validateBody(financeDecisionBody),
  requirePayrollAccess({ anyPermissions: ['payroll_finance_approve'], anyRoles: ['admin', 'accountant', 'finance'] }),
  requirePayrollMfa,
  workflow.financeCycleDecision
);
router.post(
  '/cycle/:cycleRef/freeze',
  validateBody(freezeBody),
  requirePayrollAccess({ anyPermissions: ['payroll_freeze', 'lock_payroll', 'write_payroll'], anyRoles: ['admin', 'hr', 'accountant', 'finance'] }),
  requirePayrollMfa,
  workflow.freezeCycle
);
router.post(
  '/cycle/:cycleRef/post',
  validateBody(postBody),
  requirePayrollAccess({ anyPermissions: ['payroll_post_finance', 'write_payroll'], anyRoles: ['admin', 'accountant', 'finance'] }),
  workflow.postCycleToFinance
);
router.get(
  '/cycle/:cycleRef/reconcile',
  requirePayrollAccess({ anyPermissions: ['payroll_reconcile', 'read_payroll'], anyRoles: ['admin', 'hr', 'accountant', 'finance'] }),
  workflow.reconcileCycle
);
router.post(
  '/cycle/:cycleRef/replay',
  requirePayrollAccess({ anyPermissions: ['payroll_post_finance'], anyRoles: ['admin', 'accountant', 'finance'] }),
  workflow.replayPosting
);
router.get(
  '/reconciliation/report',
  requirePayrollAccess({ anyPermissions: ['payroll_reconcile', 'read_payroll'], anyRoles: ['admin', 'hr', 'accountant', 'finance'] }),
  workflow.reconciliationReport
);

router.post(
  '/adjustments',
  requirePayrollAccess({ anyPermissions: ['write_payroll'], anyRoles: ['admin', 'hr'] }),
  workflow.createAdjustment
);
router.post(
  '/adjustments/:id/authority-decision',
  requirePayrollAccess({ anyRoles: ['admin', 'manager', 'hr'] }),
  workflow.authorityDecision
);
router.post(
  '/adjustments/:id/finance-decision',
  requirePayrollAccess({ anyRoles: ['admin', 'accountant', 'finance'] }),
  workflow.financeAdjustmentDecision
);

module.exports = router;
