const express = require('express');
const Tenant = require('../models/Tenant.model');
const databaseRouter = require('../utils/database.router');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const axios = require('axios');

const router = express.Router();

/**
 * Admin MFE Compatibility Routes
 * These endpoints exist to match Admin MFE documentation paths:
 * - GET /api/platform/metrics
 * - GET /api/system/alerts
 * - GET /api/activities
 * - GET /api/admin/system/health
 */

// Platform metrics
router.get('/platform/metrics', authenticate, requireRole(['superadmin', 'super-admin', 'admin']), async (req, res) => {
  const [totalTenants, activeTenants] = await Promise.all([
    Tenant.countDocuments({}),
    Tenant.countDocuments({ status: 'active' })
  ]);

  // Best-effort aggregate numbers from tenant usage/analytics (may be 0 for older tenants)
  const tenants = await Tenant.find({})
    .select('usage analytics')
    .lean()
    .limit(5000);

  const totalUsers = tenants.reduce((sum, t) => sum + (t.usage?.currentUsers || 0), 0);
  const apiCalls = tenants.reduce((sum, t) => sum + (t.analytics?.totalApiCalls || 0), 0);
  const storageUsed = tenants.reduce((sum, t) => sum + (t.analytics?.totalStorageUsed || 0), 0);

  res.json({
    success: true,
    data: {
      totalRevenue: 0,
      totalUsers,
      activeTenants,
      systemUptime: Math.floor(process.uptime()),
      apiCalls,
      storageUsed,
      securityIncidents: 0,
      performanceScore: 100,
      // Optional fields in Admin MFE doc
      revenueChange: 0,
      tenantsChange: 0,
      usersChange: 0
    },
    message: 'Platform metrics retrieved successfully'
  });
});

// System alerts (placeholder)
router.get('/system/alerts', authenticate, requireRole(['superadmin', 'super-admin', 'admin']), async (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'System alerts retrieved successfully'
  });
});

// Recent activities (best-effort from recent tenant changes)
router.get('/activities', authenticate, requireRole(['superadmin', 'super-admin', 'admin']), async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '10', 10) || 10, 50);

  const tenants = await Tenant.find({})
    .select('tenantId name email createdAt status')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const data = tenants.map((t) => ({
    id: `tenant-created-${t.tenantId}`,
    type: 'tenant',
    action: 'tenant_created',
    user: t.email || 'system',
    tenant: t.tenantId,
    timestamp: t.createdAt,
    status: 'success',
    details: `Tenant created: ${t.name || t.tenantId}`
  }));

  res.json({
    success: true,
    data,
    message: 'Activities retrieved successfully'
  });
});

// Admin system health
router.get('/admin/system/health', authenticate, requireRole(['superadmin', 'super-admin', 'admin']), async (req, res) => {
  const healthCheck = await databaseRouter.healthCheck();
  const connectionStatus = databaseRouter.getConnectionStatus();

  res.json({
    success: true,
    data: {
      status: (connectionStatus.registry === 1) ? 'healthy' : 'degraded',
      uptime: Math.floor(process.uptime()),
      services: [
        {
          name: 'tenant-registry-service',
          status: (connectionStatus.registry === 1) ? 'up' : 'down'
        }
      ],
      database: {
        registry: connectionStatus.registry === 1,
        tenants: Object.keys(connectionStatus.tenants).length
      },
      health: healthCheck
    },
    message: 'System health retrieved successfully'
  });
});

// ============================
// Admin MFE READ-ONLY APIs
// ============================

/**
 * Users list (READ-ONLY) - requires tenantId (Admin MFE doc)
 * GET /api/users?tenantId=...&page=...&limit=...&search=...&role=...&status=...
 */
router.get('/users', authenticate, requireRole(['superadmin', 'super-admin', 'admin']), async (req, res) => {
  const tenantId = (req.query.tenantId || req.query.tenant || req.get('X-Tenant-Id') || '').toString().trim();
  if (!tenantId) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'tenantId is required for platform admin user listing'
    });
  }

  const page = parseInt(req.query.page || '1', 10) || 1;
  const limit = Math.min(parseInt(req.query.limit || '10', 10) || 10, 100);
  const role = (req.query.role || '').toString().trim().toLowerCase();
  const status = (req.query.status || '').toString().trim().toLowerCase();
  const search = (req.query.search || '').toString().trim().toLowerCase();

  // Proxy to auth-service "users with permissions" endpoint and filter by tenantId
  // auth-service route: GET {AUTH_SERVICE_URL}/api/permission/users
  const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
  const authHeader = req.headers.authorization || req.headers.Authorization;

  let users = [];
  try {
    const resp = await axios.get(`${authServiceUrl}/api/permission/users`, {
      headers: authHeader ? { Authorization: authHeader } : {},
      timeout: 15000,
      params: { page: 1, limit: 5000 } // fetch-all then filter (platform view)
    });
    users = resp.data?.data || [];
  } catch (e) {
    return res.status(502).json({
      success: false,
      error: 'UPSTREAM_AUTH_SERVICE_ERROR',
      message: 'Failed to fetch users from auth-service',
      details: e.response?.data || e.message
    });
  }

  // Filter by tenantId (auth-service User has tenantId field)
  let filtered = users.filter((u) => (u.tenantId || u.tenant_id || '').toString().toLowerCase() === tenantId.toLowerCase());
  if (role) filtered = filtered.filter((u) => (u.role || '').toString().toLowerCase() === role);
  if (status) filtered = filtered.filter((u) => (u.status || (u.is_active ? 'active' : 'inactive')).toString().toLowerCase() === status);
  if (search) {
    filtered = filtered.filter((u) => {
      const name = (u.name || '').toString().toLowerCase();
      const email = (u.email || '').toString().toLowerCase();
      const employeeId = (u.employee_id || u.employeeId || '').toString().toLowerCase();
      return name.includes(search) || email.includes(search) || employeeId.includes(search);
    });
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const pageStart = (page - 1) * limit;
  const pageItems = filtered.slice(pageStart, pageStart + limit);

  const data = pageItems.map((u) => ({
    id: u._id?.toString?.() || u._id || u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status || (u.is_active ? 'active' : 'inactive'),
    tenantId: u.tenantId || tenantId
  }));

  return res.json({
    success: true,
    data,
    total,
    page,
    limit,
    totalPages,
    message: 'Users retrieved successfully'
  });
});

// Users stats (READ-ONLY)
router.get('/users/stats', authenticate, requireRole(['superadmin', 'super-admin', 'admin']), async (req, res) => {
  const tenantId = (req.query.tenantId || req.query.tenant || req.get('X-Tenant-Id') || '').toString().trim();
  if (!tenantId) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'tenantId is required for platform admin user stats'
    });
  }

  // Reuse /users logic by fetching from auth-service and filtering
  const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
  const authHeader = req.headers.authorization || req.headers.Authorization;
  let users = [];
  try {
    const resp = await axios.get(`${authServiceUrl}/api/permission/users`, {
      headers: authHeader ? { Authorization: authHeader } : {},
      timeout: 15000,
      params: { page: 1, limit: 5000 }
    });
    users = resp.data?.data || [];
  } catch (e) {
    return res.status(502).json({
      success: false,
      error: 'UPSTREAM_AUTH_SERVICE_ERROR',
      message: 'Failed to fetch users from auth-service',
      details: e.response?.data || e.message
    });
  }

  const filtered = users.filter((u) => (u.tenantId || u.tenant_id || '').toString().toLowerCase() === tenantId.toLowerCase());
  const total = filtered.length;
  const active = filtered.filter((u) => (u.status || (u.is_active ? 'active' : 'inactive')) === 'active').length;
  const inactive = filtered.filter((u) => (u.status || (u.is_active ? 'active' : 'inactive')) === 'inactive').length;
  const suspended = filtered.filter((u) => (u.status || '') === 'suspended').length;

  return res.json({
    success: true,
    data: { total, active, inactive, suspended }
  });
});

// Roles (READ-ONLY) - placeholder until a dedicated roles service is exposed
router.get('/roles', authenticate, requireRole(['superadmin', 'super-admin', 'admin']), async (req, res) => {
  const tenantId = (req.query.tenantId || req.query.tenant || req.get('X-Tenant-Id') || '').toString().trim() || null;
  const data = [
    { id: 'superadmin', name: 'superadmin', description: 'Super admin', permissions: [], tenantId },
    { id: 'admin', name: 'admin', description: 'Admin', permissions: [], tenantId },
    { id: 'hr', name: 'hr', description: 'HR', permissions: [], tenantId },
    { id: 'manager', name: 'manager', description: 'Manager', permissions: [], tenantId },
    { id: 'employee', name: 'employee', description: 'Employee', permissions: [], tenantId }
  ];
  return res.json({ success: true, data, message: 'Roles retrieved successfully' });
});

// Branches (READ-ONLY) - placeholder
router.get('/branches', authenticate, requireRole(['superadmin', 'super-admin', 'admin']), async (req, res) => {
  return res.json({ success: true, data: [], message: 'Branches retrieved successfully' });
});

// Organizations (READ-ONLY) - placeholder
router.get('/organizations', authenticate, requireRole(['superadmin', 'super-admin', 'admin']), async (req, res) => {
  return res.json({ success: true, data: [], message: 'Organizations retrieved successfully' });
});

// Forbidden write operations (Admin MFE doc)
const forbidden = (req, res) => res.status(403).json({
  success: false,
  error: 'FORBIDDEN',
  message: 'Platform Admin cannot modify tenant resources via Admin MFE APIs'
});

router.post('/users', forbidden);
router.put('/users/:id', forbidden);
router.delete('/users/:id', forbidden);
router.post('/roles', forbidden);
router.put('/roles/:id', forbidden);
router.delete('/roles/:id', forbidden);
router.post('/branches', forbidden);
router.put('/branches/:id', forbidden);
router.delete('/branches/:id', forbidden);
router.post('/organizations', forbidden);
router.put('/organizations/:id', forbidden);
router.delete('/organizations/:id', forbidden);

module.exports = router;

