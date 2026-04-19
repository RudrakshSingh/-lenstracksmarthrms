const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { enforceTenantContext } = require('../middleware/tenantContext.middleware');
const { payrollRequestContext } = require('../middleware/payrollRequestContext.middleware');
const { requirePayrollAccess } = require('../middleware/payrollAccess.middleware');
const { evaluatePayrollValidationGate, evaluateAllGates } = require('../services/payrollGate.service');

router.use(authenticate, enforceTenantContext, payrollRequestContext);

/** GET /api/payroll/validation?month=&year= */
router.get(
  '/validation',
  requirePayrollAccess({ anyPermissions: ['payroll_gates_read', 'read_payroll'], anyRoles: ['admin', 'hr'] }),
  async (req, res) => {
    try {
      const month = Number(req.query.month);
      const year = Number(req.query.year);
      const validation = await evaluatePayrollValidationGate({}, { month, year });
      const ctx = {
        authorization: req.headers.authorization,
        tenantId: req.headers['x-tenant-id'] || req.user?.tenantId,
        companyId: req.headers['x-company-id'],
        requestId: req.headers['x-request-id']
      };
      const all = month && year ? await evaluateAllGates(ctx, { month, year }) : null;
      return res.status(200).json({ success: true, data: { validation, allGates: all } });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }
);

module.exports = router;
