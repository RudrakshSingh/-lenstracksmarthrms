const express = require('express');
const router = express.Router();
const timerController = require('../controllers/timer.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

// Start timer
router.post(
  '/tasks/:id/timer/start',
  (req, res) => timerController.startTimer(req, res)
);

// Stop timer
router.post(
  '/tasks/:id/timer/stop',
  (req, res) => timerController.stopTimer(req, res)
);

// Get active timers
router.get(
  '/active',
  (req, res) => timerController.getActiveTimers(req, res)
);

module.exports = router;

