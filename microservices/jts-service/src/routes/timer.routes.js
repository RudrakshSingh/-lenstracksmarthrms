const express = require('express');
const router = express.Router();
const timerController = require('../controllers/timer.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate, Joi } = require('../middleware/validate.middleware');

const taskIdParamSchema = Joi.object({
  id: Joi.string().length(24).hex().required()
});

// All routes require authentication
router.use(authenticate);

// Start timer
router.post(
  '/tasks/:id/timer/start',
  validate({ params: taskIdParamSchema }),
  (req, res) => timerController.startTimer(req, res)
);

// Stop timer
router.post(
  '/tasks/:id/timer/stop',
  validate({ params: taskIdParamSchema }),
  (req, res) => timerController.stopTimer(req, res)
);

// Pause = stop active segment (same as stop for current model)
router.post(
  '/tasks/:id/timer/pause',
  validate({ params: taskIdParamSchema }),
  (req, res) => timerController.pauseTimer(req, res)
);

// Current timer for this task (for logged-in employee)
router.get(
  '/tasks/:id/timer',
  validate({ params: taskIdParamSchema }),
  (req, res) => timerController.getTaskTimer(req, res)
);

router.get(
  '/tasks/:id/timer/sessions',
  validate({
    params: taskIdParamSchema,
    query: Joi.object({ limit: Joi.number().integer().min(1).max(500).optional() })
  }),
  (req, res) => timerController.getTaskTimerSessions(req, res)
);

// Get active timers
router.get(
  '/active',
  (req, res) => timerController.getActiveTimers(req, res)
);

// Alias that matches controller docs and existing client expectations.
router.get(
  '/timers/active',
  (req, res) => timerController.getActiveTimers(req, res)
);

module.exports = router;

