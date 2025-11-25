const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

// All routes require authentication
router.use(authenticate);

// Create task - requires manager role
router.post(
  '/',
  requireRole(['MANAGER', 'STORE_MANAGER', 'CLUSTER_MANAGER', 'COUNTRY_OPS', 'TENANT_ADMIN', 'HOD']),
  (req, res) => taskController.createTask(req, res)
);

// Get tasks
router.get(
  '/',
  (req, res) => taskController.getTasks(req, res)
);

// Get task by ID
router.get(
  '/:id',
  (req, res) => taskController.getTaskById(req, res)
);

// Change task status
router.patch(
  '/:id/status',
  (req, res) => taskController.changeStatus(req, res)
);

module.exports = router;

