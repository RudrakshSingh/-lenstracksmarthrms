const express = require('express');
const router = express.Router();
const selfTaskController = require('../controllers/selfTask.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

// Create self-task
router.post(
  '/',
  (req, res) => selfTaskController.createSelfTask(req, res)
);

module.exports = router;

