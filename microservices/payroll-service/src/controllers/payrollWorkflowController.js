const PayrollCycle = require('../models/PayrollCycle.model');
const PayrollRecord = require('../models/PayrollRecord.model');
const PayrollAdjustment = require('../models/PayrollAdjustment.model');
const SalarySlipSnapshot = require('../models/SalarySlipSnapshot.model');
const logger = require('../config/logger');
const {
  reflectSalaryExpense,
  postPayrollLedger,
  getExpenseBySource
} = require('../utils/financialServiceClient');
const { buildPayrollAttendancePreview } = require('../services/payrollAttendancePreview.service');
const { buildMonthSalaryPreview } = require('../services/payrollMonthSalaryPreview.service');
const { normalizeStatus, allowedActions, CANONICAL } = require('../utils/payrollStateMachine');
const { appendAudit } = require('../services/payrollAudit.service');
const {
  evaluateAllGates,
  evaluateEmployeeMasterGate,
  evaluateAttendanceLeaveGate,
  evaluatePayrollValidationGate
} = require('../services/payrollGate.service');
const { generateMonthlyRecordsFromSalaries } = require('../services/payrollRunEngine.service');
const PayrollWorkflowRun = require('../models/PayrollWorkflowRun.model');
const PayrollWorkflowAudit = require('../models/PayrollWorkflowAudit.model');
const {
  assertVersionMatch,
  rejectIfCycleImmutable
} = require('../middleware/payrollWorkflow.middleware');
const { acquirePayrollLock } = require('../utils/payrollDistributedLock');
const { evaluatePayrollAnomalies } = require('../services/payrollAnomaly.service');

function buildCycleRef(month, year) {
  return `PAYROLL-${year}-${String(month).padStart(2, '0')}`;
}

async function recomputeCycleTotals(cycleRef) {
  const cycle = await PayrollCycle.findOne({ cycle_ref: cycleRef });
  if (!cycle) return null;

  const records = await PayrollRecord.find({ external_ref_id: cycleRef }).lean();
  const adjustments = await PayrollAdjustment.find({
    cycle_ref: cycleRef,
    status: { $in: ['FINANCE_APPROVED', 'APPLIED'] }
  }).lean();

  const totalGross = records.reduce((sum, r) => sum + Number(r.adjusted_gross || 0), 0);
  const baseNet = records.reduce((sum, r) => sum + Number(r.net_take_home || 0), 0);
  const totalAdjustments = adjustments.reduce((sum, a) => (
    sum + (a.adjustment_type === 'INCREMENT_CREDIT' ? Number(a.amount || 0) : -Number(a.amount || 0))
  ), 0);

  cycle.employee_count = records.length;
  cycle.total_gross = totalGross;
  cycle.total_net = baseNet;
  cycle.total_adjustments = totalAdjustments;
  cycle.total_final_payable = baseNet + totalAdjustments;
  await cycle.save();
  return cycle;
}

async function bumpWorkflowVersion(cycle) {
  cycle.workflow_version = (cycle.workflow_version || 0) + 1;
  await cycle.save();
  return cycle;
}

const initiateCycle = async (req, res) => {
  try {
    const { month, year, company_id, brand_id, branch_id, department_id } = req.body;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'month and year are required' });
    }

    const cycleRef = buildCycleRef(Number(month), Number(year));
    const cycle = await PayrollCycle.findOneAndUpdate(
      { cycle_ref: cycleRef },
      {
        $setOnInsert: {
          cycle_ref: cycleRef,
          month: Number(month),
          year: Number(year),
          created_by: req.user.id
        },
        $set: {
          updated_by: req.user.id,
          company_id: company_id || null,
          brand_id: brand_id || null,
          branch_id: branch_id || null,
          department_id: department_id || null,
          tenant_id: req.headers['x-tenant-id'] || null
        }
      },
      { upsert: true, new: true }
    );

    await PayrollRecord.updateMany(
      { month: Number(month), year: Number(year) },
      {
        $set: {
          external_ref_id: cycleRef,
          status: 'DRAFT',
          company_id: company_id || null,
          brand_id: brand_id || null,
          branch_id: branch_id || null,
          department_id: department_id || null
        }
      }
    );

    const refreshed = await recomputeCycleTotals(cycleRef);
    return res.status(200).json({ success: true, message: 'Payroll cycle initiated', data: refreshed || cycle });
  } catch (error) {
    logger.error('initiateCycle error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to initiate cycle' });
  }
};

const submitHrApproval = async (req, res) => {
  try {
    const { cycleRef } = req.params;
    const cycle = await PayrollCycle.findOne({ cycle_ref: cycleRef });
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });

    const verr = assertVersionMatch(cycle, req.body);
    if (verr) return res.status(verr.status).json(verr.body);

    const raw = cycle.status;
    const legacyOk =
      raw === CANONICAL.COMPLETED ||
      (raw === 'DRAFT_HR' && (cycle.employee_count || 0) > 0);
    if (!legacyOk) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_TRANSITION',
        message: `HR submit allowed only after payroll run completed (current: ${raw})`
      });
    }

    cycle.status = CANONICAL.HR_APPROVED;
    cycle.hr_submitted_by = req.user.id;
    cycle.hr_submitted_at = new Date();
    cycle.updated_by = req.user.id;
    await bumpWorkflowVersion(cycle);
    await PayrollRecord.updateMany({ external_ref_id: cycleRef }, { $set: { status: 'HR_APPROVED' } });
    await appendAudit({ cycleRef, action: 'HR_SUBMIT', req, payload: { cycleRef } });

    return res.status(200).json({ success: true, message: 'HR approval submitted', data: cycle, version: cycle.workflow_version });
  } catch (error) {
    logger.error('submitHrApproval error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to submit HR approval' });
  }
};

const createAdjustment = async (req, res) => {
  try {
    const { cycle_ref, employee_code, adjustment_type, amount, reason, is_post_freeze_request = false } = req.body;
    if (!cycle_ref || !employee_code || !adjustment_type || !amount || !reason) {
      return res.status(400).json({ success: false, message: 'cycle_ref, employee_code, adjustment_type, amount, reason are required' });
    }

    const c = await PayrollCycle.findOne({ cycle_ref });
    const imm = c && rejectIfCycleImmutable(c);
    if (imm && !is_post_freeze_request) {
      return res.status(imm.status).json(imm.body);
    }

    const adjustment = await PayrollAdjustment.create({
      cycle_ref,
      employee_code,
      adjustment_type,
      amount,
      reason,
      is_post_freeze_request,
      requested_by: req.user.id,
      logs: [{ event: 'adjustment_created', actor_id: req.user.id, details: req.body }]
    });

    return res.status(201).json({ success: true, message: 'Adjustment created', data: adjustment });
  } catch (error) {
    logger.error('createAdjustment error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to create adjustment' });
  }
};

const authorityDecision = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, comment } = req.body;
    const adjustment = await PayrollAdjustment.findById(id);
    if (!adjustment) return res.status(404).json({ success: false, message: 'Adjustment not found' });
    if (adjustment.status !== 'PENDING_AUTHORITY_APPROVAL') {
      return res.status(400).json({ success: false, message: `Cannot review from ${adjustment.status}` });
    }

    if (decision === 'approve') {
      adjustment.status = 'AUTHORITY_APPROVED';
      adjustment.authority_approved_by = req.user.id;
      adjustment.authority_approved_at = new Date();
      adjustment.authority_comment = comment || null;
    } else {
      adjustment.status = 'AUTHORITY_REJECTED';
      adjustment.authority_comment = comment || null;
    }
    adjustment.logs.push({ event: `authority_${decision}`, actor_id: req.user.id, details: { comment } });
    await adjustment.save();

    return res.status(200).json({ success: true, message: `Authority ${decision}d adjustment`, data: adjustment });
  } catch (error) {
    logger.error('authorityDecision error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed authority review' });
  }
};

/** @deprecated No-op — workflow uses HR_APPROVED → finance-decision directly */
const moveToFinanceReview = async (req, res) => {
  try {
    const { cycleRef } = req.params;
    const cycle = await PayrollCycle.findOne({ cycle_ref: cycleRef });
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });
    return res.status(200).json({
      success: true,
      message: 'Deprecated: cycle stays in HR_APPROVED until finance-decision',
      data: cycle,
      deprecated: true
    });
  } catch (error) {
    logger.error('moveToFinanceReview error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to move cycle' });
  }
};

const financeAdjustmentDecision = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, comment } = req.body;
    const adjustment = await PayrollAdjustment.findById(id);
    if (!adjustment) return res.status(404).json({ success: false, message: 'Adjustment not found' });
    if (adjustment.status !== 'AUTHORITY_APPROVED') {
      return res.status(400).json({ success: false, message: `Cannot finance review from ${adjustment.status}` });
    }

    adjustment.status = decision === 'approve' ? 'FINANCE_APPROVED' : 'FINANCE_REJECTED';
    adjustment.finance_reviewed_by = req.user.id;
    adjustment.finance_reviewed_at = new Date();
    adjustment.finance_comment = comment || null;
    adjustment.logs.push({ event: `finance_${decision}`, actor_id: req.user.id, details: { comment } });
    await adjustment.save();
    await recomputeCycleTotals(adjustment.cycle_ref);

    return res.status(200).json({ success: true, message: `Finance ${decision}d adjustment`, data: adjustment });
  } catch (error) {
    logger.error('financeAdjustmentDecision error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed finance review' });
  }
};

const financeCycleDecision = async (req, res) => {
  try {
    const { cycleRef } = req.params;
    const { decision, comment } = req.body;
    const cycle = await PayrollCycle.findOne({ cycle_ref: cycleRef });
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });

    const verr = assertVersionMatch(cycle, req.body);
    if (verr) return res.status(verr.status).json(verr.body);

    const raw = cycle.status;
    if (raw !== CANONICAL.HR_APPROVED && raw !== 'FINANCE_REVIEW') {
      return res.status(400).json({ success: false, message: `Cannot decide from ${raw}` });
    }

    if (decision === 'approve') {
      if (cycle.hr_submitted_by && String(cycle.hr_submitted_by) === String(req.user.id)) {
        return res.status(403).json({
          success: false,
          code: 'SAME_USER_FINANCE_APPROVAL',
          message: 'Finance approver cannot be the same user as HR submitter (4-eyes)',
          error: 'SAME_USER_FINANCE_APPROVAL'
        });
      }
      cycle.status = CANONICAL.FINANCE_APPROVED;
      cycle.finance_approved_by = req.user.id;
      cycle.finance_approved_at = new Date();
      await PayrollRecord.updateMany({ external_ref_id: cycleRef }, { $set: { status: 'FINANCE_APPROVED' } });
    } else {
      cycle.status = 'SENT_BACK_TO_HR';
      await PayrollRecord.updateMany({ external_ref_id: cycleRef }, { $set: { status: 'DRAFT' } });
    }

    cycle.updated_by = req.user.id;
    await bumpWorkflowVersion(cycle);
    await appendAudit({
      cycleRef,
      action: decision === 'approve' ? 'FINANCE_APPROVE' : 'FINANCE_REJECT',
      req,
      payload: { decision, comment: comment || null }
    });

    return res.status(200).json({
      success: true,
      message: decision === 'approve' ? 'Cycle finance-approved' : 'Cycle sent back to HR',
      data: { cycle, comment: comment || null },
      version: cycle.workflow_version
    });
  } catch (error) {
    logger.error('financeCycleDecision error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed finance cycle decision' });
  }
};

const freezeCycle = async (req, res) => {
  try {
    const { cycleRef } = req.params;
    const cycle = await PayrollCycle.findOne({ cycle_ref: cycleRef });
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });

    const verr = assertVersionMatch(cycle, req.body);
    if (verr) return res.status(verr.status).json(verr.body);

    if (cycle.status !== CANONICAL.FINANCE_APPROVED) {
      return res.status(400).json({ success: false, message: `Cannot freeze from ${cycle.status}` });
    }

    const records = await PayrollRecord.find({ external_ref_id: cycleRef }).lean();
    for (const record of records) {
      await SalarySlipSnapshot.findOneAndUpdate(
        { cycle_ref: cycleRef, employee_code: record.employee_code },
        {
          $set: {
            month: record.month,
            year: record.year,
            payload: record,
            frozen_by: req.user.id,
            frozen_at: new Date()
          }
        },
        { upsert: true, new: true }
      );
    }

    cycle.status = CANONICAL.FROZEN;
    cycle.frozen_at = new Date();
    cycle.updated_by = req.user.id;
    await bumpWorkflowVersion(cycle);
    await PayrollRecord.updateMany({ external_ref_id: cycleRef }, { $set: { status: CANONICAL.FROZEN } });
    await appendAudit({ cycleRef, action: 'FREEZE', req, payload: { cycleRef } });

    return res.status(200).json({ success: true, message: 'Payroll frozen', data: cycle, version: cycle.workflow_version });
  } catch (error) {
    logger.error('freezeCycle error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to freeze cycle' });
  }
};

const postCycleToFinance = async (req, res) => {
  try {
    const { cycleRef } = req.params;
    const cycle = await PayrollCycle.findOne({ cycle_ref: cycleRef });
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });
    const frozen = cycle.status === CANONICAL.FROZEN || cycle.status === 'SLIP_FROZEN';
    if (!frozen) {
      return res.status(400).json({ success: false, message: `Cannot post from ${cycle.status}` });
    }

    const context = {
      authorization: req.headers.authorization,
      tenantId: req.headers['x-tenant-id'] || req.user?.tenantId,
      companyId: req.headers['x-company-id'] || req.user?.companyId,
      requestId: req.headers['x-request-id']
    };
    const [_, year, month] = cycleRef.split('-');

    const reflectResponse = await reflectSalaryExpense({
      month: Number(month),
      year: Number(year),
      store_id: req.body.store_id,
      payment_method: req.body.payment_method || 'BANK_TRANSFER',
      employee_count: cycle.employee_count,
      total_gross_salary: cycle.total_gross,
      total_net_salary: cycle.total_final_payable || cycle.total_net
    }, context);

    const ledgerResponse = await postPayrollLedger({
      payrollRunId: cycleRef,
      period: `${year}-${month}`,
      month: Number(month),
      year: Number(year),
      amountBreakdown: {
        grossSalary: cycle.total_gross,
        netSalary: cycle.total_final_payable || cycle.total_net,
        employerCost: 0
      },
      metadata: {
        sourceModule: 'payroll-service',
        idempotencyKey: `payroll-cycle-${cycleRef}`
      }
    }, context);

    cycle.status = CANONICAL.POSTED;
    cycle.external_ref_id = cycleRef;
    cycle.finance_record_id = reflectResponse?.data?._id || null;
    cycle.updated_by = req.user.id;
    await bumpWorkflowVersion(cycle);
    await PayrollRecord.updateMany(
      { external_ref_id: cycleRef },
      { $set: { status: CANONICAL.POSTED, finance_record_id: cycle.finance_record_id } }
    );
    await appendAudit({ cycleRef, action: 'POST_TO_FINANCE', req, payload: { cycleRef } });

    return res.status(200).json({
      success: true,
      message: 'Cycle posted to finance',
      data: { cycle, reflectResponse: reflectResponse?.data || reflectResponse, ledgerResponse: ledgerResponse?.data || ledgerResponse },
      version: cycle.workflow_version
    });
  } catch (error) {
    logger.error('postCycleToFinance error', { error: error.response?.data?.message || error.message });
    return res.status(error.response?.status || 500).json({ success: false, message: error.response?.data?.message || 'Failed to post cycle' });
  }
};

const reconcileCycle = async (req, res) => {
  try {
    const { cycleRef } = req.params;
    const cycle = await PayrollCycle.findOne({ cycle_ref: cycleRef });
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });
    if (normalizeStatus(cycle.status) === CANONICAL.RECONCILED) {
      return res.status(200).json({
        success: true,
        idempotent: true,
        data: cycle.last_reconciliation,
        cycle,
        version: cycle.workflow_version
      });
    }

    const context = {
      authorization: req.headers.authorization,
      tenantId: req.headers['x-tenant-id'] || req.user?.tenantId,
      companyId: req.headers['x-company-id'] || req.user?.companyId,
      requestId: req.headers['x-request-id']
    };
    const expenseResp = await getExpenseBySource(cycleRef, context);
    const expense = expenseResp?.data || null;

    const matched = Boolean(expense && Number(expense.total_amount || 0) === Number(cycle.total_final_payable || cycle.total_net || 0));
    cycle.last_reconciliation = {
      matched,
      details: {
        cycle_payable: cycle.total_final_payable || cycle.total_net,
        finance_expense_total: expense?.total_amount || 0,
        finance_expense_id: expense?._id || null
      },
      at: new Date()
    };
    if (normalizeStatus(cycle.status) === CANONICAL.POSTED || cycle.status === 'POSTED_TO_FINANCE') {
      cycle.status = CANONICAL.RECONCILED;
      await bumpWorkflowVersion(cycle);
      await PayrollRecord.updateMany({ external_ref_id: cycleRef }, { $set: { status: CANONICAL.RECONCILED } });
    } else {
      await cycle.save();
    }
    await appendAudit({ cycleRef, action: 'RECONCILE', req, payload: { matched } });
    return res.status(200).json({ success: true, data: cycle.last_reconciliation, cycle, version: cycle.workflow_version });
  } catch (error) {
    logger.error('reconcileCycle error', { error: error.response?.data?.message || error.message });
    return res.status(error.response?.status || 500).json({ success: false, message: 'Failed to reconcile cycle' });
  }
};

const replayPosting = async (req, res) => {
  try {
    const { cycleRef } = req.params;
    const cycle = await PayrollCycle.findOne({ cycle_ref: cycleRef });
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });
    cycle.status = CANONICAL.FROZEN;
    await cycle.save();
    req.params.cycleRef = cycleRef;
    return postCycleToFinance(req, res);
  } catch (error) {
    logger.error('replayPosting error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to replay posting' });
  }
};

/**
 * Payroll step 1 — attendance preview for a calendar month (attendance-service + optional HR roster).
 * GET /api/payroll-workflow/attendance-preview?month=4&year=2026&include_roster=true
 */
/**
 * Month salary + attendance preview (present/leave days + pro-rata net after deductions).
 * GET /api/payroll-workflow/month-salary-preview?month=4&year=2026&employee_code=EMP001
 */
const getMonthSalaryPreview = async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'month and year query parameters are required' });
    }

    const storeId = req.query.storeId || req.query.store_id || '';
    const departmentId = req.query.departmentId || req.query.department_id || '';
    const employee_code = req.query.employee_code || req.query.employee_id || '';

    const ctx = {
      authorization: req.headers.authorization,
      tenantId: req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'] || req.user?.tenantId,
      companyId: req.headers['x-company-id'] || req.headers['X-Company-Id'],
      requestId: req.headers['x-request-id'] || req.headers['X-Request-Id']
    };

    if (!ctx.authorization) {
      return res.status(401).json({ success: false, message: 'Authorization required' });
    }

    const data = await buildMonthSalaryPreview(ctx, {
      month,
      year,
      storeId: storeId || undefined,
      departmentId: departmentId || undefined,
      employee_code: employee_code || undefined
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.isAxiosError) {
      const st = error.response?.status;
      if (st === 401 || st === 403) {
        return res.status(st).json({
          success: false,
          message: error.response?.data?.message || 'Upstream service denied access',
          code: 'UPSTREAM_AUTH'
        });
      }
      return res.status(502).json({
        success: false,
        message: error.response?.data?.message || error.message || 'Upstream service unreachable',
        code: 'UPSTREAM_ERROR'
      });
    }
    logger.error('getMonthSalaryPreview error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to build month salary preview' });
  }
};

const getAttendancePreview = async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'month and year query parameters are required' });
    }

    const storeId = req.query.storeId || req.query.store_id || '';
    const departmentId = req.query.departmentId || req.query.department_id || '';
    const includeRoster = ['1', 'true', 'yes'].includes(String(req.query.include_roster || '').toLowerCase());

    const ctx = {
      authorization: req.headers.authorization,
      tenantId: req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'] || req.user?.tenantId,
      companyId: req.headers['x-company-id'] || req.headers['X-Company-Id'],
      requestId: req.headers['x-request-id'] || req.headers['X-Request-Id']
    };

    if (!ctx.authorization) {
      return res.status(401).json({ success: false, message: 'Authorization required' });
    }

    const data = await buildPayrollAttendancePreview(ctx, {
      month,
      year,
      storeId: storeId || undefined,
      departmentId: departmentId || undefined,
      includeRoster
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.code === 'ATTENDANCE_UPSTREAM') {
      return res.status(502).json({ success: false, message: error.message, code: error.code });
    }
    if (error.isAxiosError) {
      const st = error.response?.status;
      if (st === 401 || st === 403) {
        return res.status(st).json({
          success: false,
          message: error.response?.data?.message || 'Attendance service denied access',
          code: 'ATTENDANCE_AUTH'
        });
      }
      return res.status(502).json({
        success: false,
        message: error.response?.data?.message || error.message || 'Attendance service unreachable',
        code: 'ATTENDANCE_UPSTREAM'
      });
    }
    logger.error('getAttendancePreview error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to build attendance preview' });
  }
};

const reconciliationReport = async (req, res) => {
  try {
    const { month, year, status } = req.query;
    const query = {};
    if (month) query.month = Number(month);
    if (year) query.year = Number(year);
    if (status) query.status = status;

    const cycles = await PayrollCycle.find(query).sort({ year: -1, month: -1 }).lean();
    return res.status(200).json({
      success: true,
      data: cycles.map(c => ({
        cycle_ref: c.cycle_ref,
        month: c.month,
        year: c.year,
        status: c.status,
        total_final_payable: c.total_final_payable || c.total_net,
        reconciliation: c.last_reconciliation || null,
        finance_record_id: c.finance_record_id || null
      }))
    });
  } catch (error) {
    logger.error('reconciliationReport error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to fetch reconciliation report' });
  }
};

const getCycleByRef = async (req, res) => {
  try {
    const { cycleRef } = req.params;
    const cycle = await PayrollCycle.findOne({ cycle_ref: cycleRef }).lean();
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });

    const ctx = {
      authorization: req.headers.authorization,
      tenantId: req.headers['x-tenant-id'] || req.user?.tenantId,
      companyId: req.headers['x-company-id'],
      requestId: req.headers['x-request-id']
    };
    const gates = req.query.includeGates === '1' || req.query.includeGates === 'true'
      ? await evaluateAllGates(ctx, { month: cycle.month, year: cycle.year })
      : null;

    return res.status(200).json({
      success: true,
      data: {
        cycle,
        allowedActions: allowedActions(cycle),
        gates
      }
    });
  } catch (error) {
    logger.error('getCycleByRef error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to load cycle' });
  }
};

const unlockFrozenCycle = async (req, res) => {
  try {
    const { cycleRef } = req.params;
    const cycle = await PayrollCycle.findOne({ cycle_ref: cycleRef });
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });
    const frozen = cycle.status === CANONICAL.FROZEN || cycle.status === 'SLIP_FROZEN';
    if (!frozen) {
      return res.status(400).json({ success: false, message: `Cycle is not frozen (${cycle.status})` });
    }
    cycle.status = CANONICAL.FINANCE_APPROVED;
    cycle.unlocked_by = req.user.id;
    cycle.unlocked_at = new Date();
    cycle.unlock_reason = req.body?.reason || 'admin_unlock';
    cycle.updated_by = req.user.id;
    await bumpWorkflowVersion(cycle);
    await PayrollRecord.updateMany({ external_ref_id: cycleRef }, { $set: { status: 'FINANCE_APPROVED' } });
    await appendAudit({ cycleRef, action: 'UNLOCK_FROZEN', req, payload: req.body || {} });
    return res.status(200).json({ success: true, data: cycle, version: cycle.workflow_version });
  } catch (error) {
    logger.error('unlockFrozenCycle error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to unlock cycle' });
  }
};

const gateEmployeeMaster = async (req, res) => {
  try {
    const g = await evaluateEmployeeMasterGate({});
    return res.status(200).json({ success: true, data: g });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const gateAttendanceLeave = async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    if (!month || !year) return res.status(400).json({ success: false, message: 'month and year required' });
    const ctx = {
      authorization: req.headers.authorization,
      tenantId: req.headers['x-tenant-id'] || req.user?.tenantId,
      companyId: req.headers['x-company-id'],
      requestId: req.headers['x-request-id']
    };
    const g = await evaluateAttendanceLeaveGate(ctx, { month, year });
    return res.status(200).json({ success: true, data: g });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const gatePayrollValidation = async (req, res) => {
  try {
    const g = await evaluatePayrollValidationGate({}, {});
    return res.status(200).json({ success: true, data: g });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const startPayrollRun = async (req, res) => {
  try {
    const { month, year, dryRun = false, idempotencyKey } = req.body;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'month and year are required' });
    }
    const cycleRef = buildCycleRef(Number(month), Number(year));
    const ctx = {
      authorization: req.headers.authorization,
      tenantId: req.headers['x-tenant-id'] || req.user?.tenantId,
      companyId: req.headers['x-company-id'],
      requestId: req.headers['x-request-id']
    };

    const gateResult = await evaluateAllGates(ctx, { month: Number(month), year: Number(year) });
    if (dryRun) {
      return res.status(200).json({
        success: true,
        dryRun: true,
        data: { gates: gateResult, cycleRef }
      });
    }

    if (!gateResult.allOk) {
      return res.status(400).json({
        success: false,
        code: 'GATES_FAILED',
        message: 'One or more payroll gates failed — resolve blockers before final run',
        data: gateResult
      });
    }

    if (idempotencyKey) {
      const existing = await PayrollWorkflowRun.findOne({ idempotency_key: idempotencyKey });
      if (existing) {
        return res.status(200).json({ success: true, data: { idempotent: true, run: existing }, message: 'Idempotent replay' });
      }
    }

    const active = await PayrollWorkflowRun.findOne({
      cycle_ref: cycleRef,
      status: { $in: ['QUEUED', 'PROCESSING'] }
    });
    if (active) {
      return res.status(409).json({
        success: false,
        code: 'CONCURRENT_RUN_IN_PROGRESS',
        message: 'A payroll run is already in progress for this cycle',
        error: 'CONCURRENT_RUN_IN_PROGRESS',
        runId: active._id
      });
    }

    let cycle = await PayrollCycle.findOne({ cycle_ref: cycleRef });
    if (!cycle) {
      await PayrollCycle.findOneAndUpdate(
        { cycle_ref: cycleRef },
        {
          $setOnInsert: {
            cycle_ref: cycleRef,
            month: Number(month),
            year: Number(year),
            status: CANONICAL.DRAFT,
            created_by: req.user.id,
            tenant_id: req.headers['x-tenant-id'] || null
          },
          $set: { updated_by: req.user.id }
        },
        { upsert: true, new: true }
      );
      cycle = await PayrollCycle.findOne({ cycle_ref: cycleRef });
    }

    const ns = normalizeStatus(cycle.status);
    if (ns !== CANONICAL.DRAFT && cycle.status !== 'DRAFT_HR') {
      return res.status(400).json({
        success: false,
        message: `Final run allowed only from DRAFT (current: ${cycle.status})`
      });
    }

    const releaseLock = await acquirePayrollLock(`run:${cycleRef}`, 900);
    if (!releaseLock) {
      return res.status(409).json({
        success: false,
        code: 'LOCK_NOT_ACQUIRED',
        message: 'Could not acquire distributed payroll lock — retry shortly',
        error: 'LOCK_NOT_ACQUIRED'
      });
    }

    try {
      const run = await PayrollWorkflowRun.create({
        cycle_ref: cycleRef,
        month: Number(month),
        year: Number(year),
        dry_run: false,
        status: 'PROCESSING',
        progress: 10,
        idempotency_key: idempotencyKey || undefined,
        started_by: req.user.id,
        started_at: new Date(),
        tenant_id: req.headers['x-tenant-id'] || null
      });

      cycle.status = CANONICAL.PROCESSING;
      cycle.updated_by = req.user.id;
      await cycle.save();

      try {
        await generateMonthlyRecordsFromSalaries({
          month: Number(month),
          year: Number(year),
          userId: req.user.id,
          cycleRef
        });
        await recomputeCycleTotals(cycleRef);

        const anomaly = await evaluatePayrollAnomalies({ month: Number(month), year: Number(year) });
        if (!anomaly.ok) {
          run.status = 'FAILED';
          run.failure_reason = 'ANOMALY_BLOCK';
          run.completed_at = new Date();
          await run.save();
          cycle = await PayrollCycle.findOne({ cycle_ref: cycleRef });
          if (cycle) {
            cycle.status = CANONICAL.DRAFT;
            await cycle.save();
          }
          return res.status(400).json({
            success: false,
            code: 'ANOMALY_BLOCK',
            message: 'Payroll anomaly checks failed — review signals or adjust thresholds',
            data: anomaly
          });
        }

        cycle = await PayrollCycle.findOne({ cycle_ref: cycleRef });
        cycle.status = CANONICAL.COMPLETED;
        await bumpWorkflowVersion(cycle);
        run.status = 'COMPLETED';
        run.progress = 100;
        run.completed_at = new Date();
        await run.save();
        await PayrollRecord.updateMany({ external_ref_id: cycleRef }, { $set: { status: CANONICAL.COMPLETED } });
        await appendAudit({
          cycleRef,
          action: 'PAYROLL_RUN_COMPLETED',
          req,
          payload: { runId: String(run._id), anomalySignals: anomaly.signals?.length || 0 }
        });
        return res.status(200).json({
          success: true,
          message: 'Payroll run completed',
          data: { cycle, run, anomalies: anomaly },
          version: cycle.workflow_version
        });
      } catch (err) {
        run.status = 'FAILED';
        run.failure_reason = err.message;
        run.completed_at = new Date();
        await run.save();
        cycle = await PayrollCycle.findOne({ cycle_ref: cycleRef });
        if (cycle) {
          cycle.status = CANONICAL.DRAFT;
          await cycle.save();
        }
        logger.error('startPayrollRun failed', { error: err.message });
        return res.status(500).json({
          success: false,
          code: err.code || 'RUN_FAILED',
          message: err.message || 'Payroll run failed'
        });
      }
    } finally {
      try {
        await releaseLock();
      } catch (e) {
        logger.warn('releaseLock', { message: e.message });
      }
    }
  } catch (error) {
    logger.error('startPayrollRun error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to start payroll run' });
  }
};

const getPayrollRunById = async (req, res) => {
  try {
    const run = await PayrollWorkflowRun.findById(req.params.id).lean();
    if (!run) return res.status(404).json({ success: false, message: 'Run not found' });
    return res.status(200).json({ success: true, data: run });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load run' });
  }
};

const getAuditTrail = async (req, res) => {
  try {
    const { cycleRef } = req.params;
    const logs = await PayrollWorkflowAudit.find({ cycle_ref: cycleRef })
      .sort({ created_at: -1 })
      .limit(500)
      .lean();
    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load audit trail' });
  }
};

const getPayrollSummaryMY = async (req, res) => {
  try {
    const month = Number(req.params.month);
    const year = Number(req.params.year);
    const cycleRef = buildCycleRef(month, year);
    const cycle = await PayrollCycle.findOne({ cycle_ref: cycleRef }).lean();
    const records = await PayrollRecord.find({ month, year }).lean();
    return res.status(200).json({
      success: true,
      data: {
        cycle,
        employeeCount: records.length,
        totals: {
          gross: cycle?.total_gross || 0,
          net: cycle?.total_net || 0,
          finalPayable: cycle?.total_final_payable || cycle?.total_net || 0
        },
        recordsSample: records.slice(0, 50)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to build summary' });
  }
};

module.exports = {
  initiateCycle,
  submitHrApproval,
  createAdjustment,
  authorityDecision,
  moveToFinanceReview,
  financeAdjustmentDecision,
  financeCycleDecision,
  freezeCycle,
  postCycleToFinance,
  reconcileCycle,
  replayPosting,
  reconciliationReport,
  getAttendancePreview,
  getMonthSalaryPreview,
  getCycleByRef,
  unlockFrozenCycle,
  gateEmployeeMaster,
  gateAttendanceLeave,
  gatePayrollValidation,
  startPayrollRun,
  getPayrollRunById,
  getAuditTrail,
  getPayrollSummaryMY
};
