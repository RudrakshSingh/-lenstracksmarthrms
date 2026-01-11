const express = require('express');
const router = express.Router();
const rosterController = require('../controllers/rosterController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

/**
 * @route   GET /api/hr/roster/weekly-enhanced
 * @desc    Get enhanced weekly roster with staffing summary
 * @access  Private (HR, Admin, Manager)
 * @note    MUST come before /weekly to avoid route conflict
 */
router.get(
  '/weekly-enhanced',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager']),
  rosterController.getEnhancedWeeklyRoster
);

/**
 * @route   GET /api/hr/roster/weekly
 * @desc    Get weekly roster for a store
 * @access  Private (HR, Admin, Manager)
 */
router.get(
  '/weekly',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager']),
  rosterController.getWeeklyRoster
);

/**
 * @route   GET /api/hr/roster/settings
 * @desc    Get roster settings for a store (or all stores)
 * @access  Private (HR, Admin, Manager)
 */
router.get(
  '/settings',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager']),
  rosterController.getRosterSettings
);

/**
 * @route   POST /api/hr/roster/settings
 * @desc    Create or update roster settings
 * @access  Private (HR, Admin, SuperAdmin)
 */
router.post(
  '/settings',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin']),
  rosterController.upsertRosterSettings
);

/**
 * @route   PUT /api/hr/roster/settings/:id
 * @desc    Update roster settings
 * @access  Private (HR, Admin, SuperAdmin)
 */
router.put(
  '/settings/:id',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin']),
  rosterController.upsertRosterSettings
);

/**
 * @route   POST /api/hr/roster/ai-generate
 * @desc    Generate AI-based optimal roster
 * @access  Private (HR, Admin, Manager)
 */
router.post(
  '/ai-generate',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager']),
  rosterController.generateAIRoster
);

/**
 * @route   POST /api/hr/roster/bulk
 * @desc    Bulk create roster entries
 * @access  Private (HR, Admin, Manager)
 * @note    MUST come before POST / to avoid route conflict
 */
router.post(
  '/bulk',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager']),
  rosterController.bulkCreateRoster
);

/**
 * @route   GET /api/hr/roster
 * @desc    Get roster entries with filters
 * @access  Private (HR, Admin, Manager, Employee)
 */
router.get(
  '/',
  authenticate,
  rosterController.getRoster
);

/**
 * @route   POST /api/hr/roster
 * @desc    Create a new roster entry
 * @access  Private (HR, Admin, Manager)
 */
router.post(
  '/',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager']),
  rosterController.createRoster
);

/**
 * @route   PUT /api/hr/roster
 * @desc    Update an existing roster entry
 * @access  Private (HR, Admin, Manager)
 */
router.put(
  '/',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager']),
  rosterController.updateRoster
);

/**
 * @route   DELETE /api/hr/roster
 * @desc    Delete a roster entry
 * @access  Private (HR, Admin, Manager)
 */
router.delete(
  '/',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager']),
  rosterController.deleteRoster
);

module.exports = router;
