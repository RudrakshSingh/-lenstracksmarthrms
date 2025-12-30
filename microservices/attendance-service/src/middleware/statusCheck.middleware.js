const logger = require('../config/logger');

/**
 * Middleware to check employee status before allowing certain operations
 * @param {Array} allowedStatuses - Array of allowed employee statuses
 */
const checkEmployeeStatus = (allowedStatuses = ['active']) => {
  return async (req, res, next) => {
    try {
      // If no user, skip (auth middleware will handle)
      if (!req.user) {
        return next();
      }

      // Get employee status from user object or database
      const employeeStatus = req.user.status || req.user.employeeStatus || 'active';

      // Check if status is allowed
      if (!allowedStatuses.includes(employeeStatus)) {
        logger.warn('Access denied - employee status not allowed', {
          userId: req.user.id,
          employeeStatus,
          allowedStatuses
        });

        return res.status(403).json({
          success: false,
          message: `Access denied. Employee status '${employeeStatus}' is not allowed for this operation.`,
          code: 'INVALID_EMPLOYEE_STATUS',
          allowedStatuses
        });
      }

      next();
    } catch (error) {
      logger.error('Status check middleware error', { error: error.message });
      
      // Continue anyway (don't block on middleware errors)
      next();
    }
  };
};

module.exports = checkEmployeeStatus;

