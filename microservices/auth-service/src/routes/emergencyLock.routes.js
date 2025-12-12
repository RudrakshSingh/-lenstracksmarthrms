const express = require('express');
const router = express.Router();
const EmergencyLockController = require('../controllers/emergencyLock.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { sosLockMiddleware, recoveryKeyMiddleware } = require('../middleware/emergencyLock.middleware');

/**
 * @route   POST /api/auth/emergency/sos
 * @desc    Trigger emergency lock (SOS button)
 * @access  Private (Admin, Store Manager only)
 */
router.post('/sos', authenticate, sosLockMiddleware, EmergencyLockController.triggerEmergencyLock);

/**
 * @route   GET /api/auth/emergency/status
 * @desc    Get current lock status
 * @access  Public
 */
router.get('/status', EmergencyLockController.getLockStatus);

/**
 * @route   POST /api/auth/emergency/unlock
 * @desc    Unlock system with recovery keys
 * @access  Public
 */
router.post('/unlock', recoveryKeyMiddleware, EmergencyLockController.unlockSystem);

/**
 * @route   POST /api/auth/emergency/verify-keys
 * @desc    Verify recovery keys without unlocking
 * @access  Public
 */
router.post('/verify-keys', EmergencyLockController.verifyRecoveryKeys);

/**
 * @route   GET /api/auth/emergency/instructions/:lockId
 * @desc    Get recovery instructions for a specific lock
 * @access  Public
 */
router.get('/instructions/:lockId', EmergencyLockController.getRecoveryInstructions);

/**
 * @route   POST /api/auth/emergency/contact
 * @desc    Contact emergency support
 * @access  Public
 */
router.post('/contact', EmergencyLockController.contactEmergencySupport);

module.exports = router;
