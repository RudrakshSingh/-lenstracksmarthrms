const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/events.controller');

/**
 * Events Routes
 * REST API endpoints for other services to trigger real-time events
 */

/**
 * @route   POST /api/events/notification
 * @desc    Send notification to specific user
 * @access  Internal (Service-to-Service)
 * @body    { userId, notification: { id, title, message, type } }
 */
router.post('/notification', eventsController.sendNotification);

/**
 * @route   POST /api/events/dashboard
 * @desc    Broadcast dashboard stats update
 * @access  Internal (Service-to-Service)
 * @body    { tenantId, stats: { totalEmployees, activeEmployees, ... } }
 */
router.post('/dashboard', eventsController.broadcastDashboard);

/**
 * @route   POST /api/events/attendance
 * @desc    Broadcast attendance update
 * @access  Internal (Service-to-Service)
 * @body    { tenantId, attendanceData: { employeeId, action, timestamp, location } }
 */
router.post('/attendance', eventsController.broadcastAttendance);

/**
 * @route   POST /api/events/task
 * @desc    Send task assignment to user
 * @access  Internal (Service-to-Service)
 * @body    { userId, task: { taskId, title, deadline, priority } }
 */
router.post('/task', eventsController.sendTask);

/**
 * @route   POST /api/events/time-tracking
 * @desc    Send time tracking event to user
 * @access  Internal (Service-to-Service)
 * @body    { userId, timeTrackingData: { action, timestamp } }
 */
router.post('/time-tracking', eventsController.sendTimeTracking);

/**
 * @route   POST /api/events/workforce
 * @desc    Broadcast event to all workforce members
 * @access  Internal (Service-to-Service)
 * @body    { eventName, data }
 */
router.post('/workforce', eventsController.broadcastToWorkforce);

/**
 * @route   POST /api/events/user
 * @desc    Send custom event to specific user
 * @access  Internal (Service-to-Service)
 * @body    { userId, eventName, data }
 */
router.post('/user', eventsController.sendToUser);

/**
 * @route   POST /api/events/broadcast
 * @desc    Broadcast custom event to all connected clients
 * @access  Internal (Service-to-Service)
 * @body    { eventName, data }
 */
router.post('/broadcast', eventsController.broadcastToAll);

module.exports = router;

