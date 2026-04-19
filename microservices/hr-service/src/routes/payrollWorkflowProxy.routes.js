/**
 * Proxies Etelios payroll workflow + gates to payroll-service (single source of truth).
 * Matches brief paths: /api/hr/gates/*, /api/hr/payroll/runs, /api/hr/payroll/validation
 */
const express = require('express');
const axios = require('axios');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { postStatutoryLookup } = require('../controllers/payrollStatutoryController');

const router = express.Router();

function payrollBase() {
  return (process.env.PAYROLL_SERVICE_URL || 'http://payroll-service:3004').replace(/\/$/, '');
}

function fwdHeaders(req) {
  const h = {
    Authorization: req.headers.authorization,
    'Content-Type': 'application/json'
  };
  const tid = req.get('X-Tenant-Id') || req.get('x-tenant-id');
  if (tid) h['X-Tenant-Id'] = tid;
  const rid = req.get('X-Request-Id') || req.get('x-request-id');
  if (rid) h['X-Request-ID'] = rid;
  const mfa = req.get('X-MFA-Verified') || req.get('x-mfa-verified');
  if (mfa) h['X-MFA-Verified'] = mfa;
  return h;
}

router.use(authenticate);

/** Employee master statutory + bank fields for payroll exports (PF ECR, bank advice, TDS). */
router.post(
  '/payroll/statutory-lookup',
  requireRole(['hr', 'admin', 'superadmin', 'accountant', 'finance'], []),
  postStatutoryLookup
);

router.get('/gates/employee-master', async (req, res) => {
  try {
    const r = await axios.get(`${payrollBase()}/api/payroll-workflow/gates/employee-master`, {
      headers: fwdHeaders(req),
      validateStatus: () => true
    });
    return res.status(r.status).json(r.data);
  } catch (e) {
    return res.status(502).json({ success: false, message: e.message || 'payroll-service unreachable' });
  }
});

router.get('/gates/attendance-leave', async (req, res) => {
  try {
    const r = await axios.get(`${payrollBase()}/api/payroll-workflow/gates/attendance-leave`, {
      params: req.query,
      headers: fwdHeaders(req),
      validateStatus: () => true
    });
    return res.status(r.status).json(r.data);
  } catch (e) {
    return res.status(502).json({ success: false, message: e.message || 'payroll-service unreachable' });
  }
});

router.get('/payroll/validation', async (req, res) => {
  try {
    const r = await axios.get(`${payrollBase()}/api/payroll/validation`, {
      params: req.query,
      headers: fwdHeaders(req),
      validateStatus: () => true
    });
    return res.status(r.status).json(r.data);
  } catch (e) {
    return res.status(502).json({ success: false, message: e.message || 'payroll-service unreachable' });
  }
});

router.post('/payroll/runs', async (req, res) => {
  try {
    const r = await axios.post(`${payrollBase()}/api/payroll-workflow/runs`, req.body || {}, {
      headers: fwdHeaders(req),
      validateStatus: () => true
    });
    return res.status(r.status).json(r.data);
  } catch (e) {
    return res.status(502).json({ success: false, message: e.message || 'payroll-service unreachable' });
  }
});

router.get('/payroll/runs/:id', async (req, res) => {
  try {
    const r = await axios.get(`${payrollBase()}/api/payroll-workflow/runs/${encodeURIComponent(req.params.id)}`, {
      headers: fwdHeaders(req),
      validateStatus: () => true
    });
    return res.status(r.status).json(r.data);
  } catch (e) {
    return res.status(502).json({ success: false, message: e.message || 'payroll-service unreachable' });
  }
});

router.get('/payroll/reports/bank-advice', async (req, res) => {
  try {
    const r = await axios.get(`${payrollBase()}/api/payroll/reports/bank-advice`, {
      params: req.query,
      headers: fwdHeaders(req),
      validateStatus: () => true,
      responseType: 'text'
    });
    res.status(r.status);
    if (r.headers['content-type']) res.setHeader('Content-Type', r.headers['content-type']);
    if (r.headers['content-disposition']) res.setHeader('Content-Disposition', r.headers['content-disposition']);
    return res.send(r.data);
  } catch (e) {
    return res.status(502).json({ success: false, message: e.message || 'payroll-service unreachable' });
  }
});

router.get('/payroll/reports/pf-ecr', async (req, res) => {
  try {
    const r = await axios.get(`${payrollBase()}/api/payroll/reports/pf-ecr`, {
      params: req.query,
      headers: fwdHeaders(req),
      validateStatus: () => true,
      responseType: 'text'
    });
    res.status(r.status);
    if (r.headers['content-type']) res.setHeader('Content-Type', r.headers['content-type']);
    if (r.headers['content-disposition']) res.setHeader('Content-Disposition', r.headers['content-disposition']);
    return res.send(r.data);
  } catch (e) {
    return res.status(502).json({ success: false, message: e.message || 'payroll-service unreachable' });
  }
});

router.get('/payroll/reports/tds-form24q', async (req, res) => {
  try {
    const r = await axios.get(`${payrollBase()}/api/payroll/reports/tds-form24q`, {
      params: req.query,
      headers: fwdHeaders(req),
      validateStatus: () => true
    });
    return res.status(r.status).json(r.data);
  } catch (e) {
    return res.status(502).json({ success: false, message: e.message || 'payroll-service unreachable' });
  }
});

router.post('/payroll/generate-payslips', async (req, res) => {
  try {
    const r = await axios.post(`${payrollBase()}/api/payroll/generate-payslips`, req.body || {}, {
      headers: fwdHeaders(req),
      validateStatus: () => true
    });
    return res.status(r.status).json(r.data);
  } catch (e) {
    return res.status(502).json({ success: false, message: e.message || 'payroll-service unreachable' });
  }
});

router.post('/payroll/payslips/send', async (req, res) => {
  try {
    const r = await axios.post(`${payrollBase()}/api/payroll/payslips/send`, req.body || {}, {
      headers: fwdHeaders(req),
      validateStatus: () => true
    });
    return res.status(r.status).json(r.data);
  } catch (e) {
    return res.status(502).json({ success: false, message: e.message || 'payroll-service unreachable' });
  }
});

router.get('/payroll/payslips/:id/pdf', async (req, res) => {
  try {
    const r = await axios.get(`${payrollBase()}/api/payroll/payslips/${encodeURIComponent(req.params.id)}/pdf`, {
      headers: fwdHeaders(req),
      validateStatus: () => true,
      responseType: 'stream'
    });
    res.status(r.status);
    if (r.headers['content-type']) res.setHeader('Content-Type', r.headers['content-type']);
    if (r.headers['content-disposition']) res.setHeader('Content-Disposition', r.headers['content-disposition']);
    if (r.status >= 400) {
      const chunks = [];
      for await (const chunk of r.data) chunks.push(chunk);
      const buf = Buffer.concat(chunks);
      try {
        return res.status(r.status).json(JSON.parse(buf.toString('utf8')));
      } catch (_) {
        return res.status(r.status).send(buf.length ? buf : r.statusText);
      }
    }
    r.data.pipe(res);
  } catch (e) {
    return res.status(502).json({ success: false, message: e.message || 'payroll-service unreachable' });
  }
});

module.exports = router;
