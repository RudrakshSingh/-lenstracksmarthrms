const express = require('express');
const router = express.Router();
const rosterController = require('../controllers/rosterController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { cacheMiddleware } = require('../middleware/cache.middleware');

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
 * @route   PUT /api/hr/roster/settings/:storeId
 * @desc    Update roster settings
 * @access  Private (HR, Admin, SuperAdmin)
 * @note    Frontend expects :storeId in path, not :id
 */
router.put(
  '/settings/:storeId',
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
 * @route   POST /api/hr/roster/sync-attendance
 * @desc    Sync roster with attendance for a date
 * @access  Private (HR, Admin, Manager)
 * @note    MUST come before /bulk to avoid route conflict
 */
router.post(
  '/sync-attendance',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager']),
  rosterController.syncAttendance
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
  cacheMiddleware(20000), // Cache for 20 seconds (roster changes frequently)
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
 * @route   PUT /api/hr/roster/:id
 * @desc    Update an existing roster entry
 * @access  Private (HR, Admin, Manager)
 * @note    Frontend sends PUT /api/roster with id in body, but backend expects :id in path
 */
router.put(
  '/',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager']),
  rosterController.updateRoster
);

router.put(
  '/:id',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager']),
  rosterController.updateRoster
);

/**
 * @route   DELETE /api/hr/roster/:id
 * @desc    Delete a roster entry
 * @access  Private (HR, Admin, Manager)
 * @note    Frontend sends DELETE /api/roster?id=..., but backend expects :id in path
 */
router.delete(
  '/',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager']),
  rosterController.deleteRoster
);

router.delete(
  '/:id',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager']),
  rosterController.deleteRoster
);

module.exports = router;
