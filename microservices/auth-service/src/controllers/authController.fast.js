/**
 * FAST Mock Login - No Database Operations
 * Returns hardcoded tokens for testing without any DB calls
 * Use this as a fallback if database is slow
 */

const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const logger = require('../config/logger');

/**
 * Fast mock login - returns tokens without database operations
 * This is a temporary solution until database performance is fixed
 */
const fastMockLogin = async (req, res, next) => {
  try {
    const { role = 'hr', email, employeeId, name } = req.body;
    
    // Validate role
    const validRoles = ['admin', 'hr', 'manager', 'employee', 'superadmin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    // Hardcoded user data (no database)
    const mockEmail = email || `mock.${role}@etelios.com`;
    const mockEmployeeId = employeeId || `MOCK${role.toUpperCase()}001`;
    const mockName = name || `Mock ${role.toUpperCase()} User`;

    const departmentMap = {
      'hr': 'HR',
      'admin': 'TECH',
      'manager': 'SALES',
      'employee': 'SALES',
      'superadmin': 'TECH'
    };

    // Create a mock user ID (consistent for same role)
    const mockUserId = `mock_${role}_${mockEmployeeId}`;

    // Generate tokens (synchronous - fast)
    const accessToken = generateAccessToken({ 
      userId: mockUserId, 
      role: role 
    });
    const refreshToken = generateRefreshToken({ 
      userId: mockUserId 
    });

    // Build user profile (no database)
    const userProfile = {
      _id: mockUserId,
      employee_id: mockEmployeeId,
      name: mockName,
      email: mockEmail,
      role: role,
      department: departmentMap[role] || 'SALES',
      designation: `${role.toUpperCase()} Manager`
    };

    if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
      logger.info('Fast mock login successful (no DB)', { role, email: mockEmail });
    }

    res.status(200).json({
      success: true,
      message: 'Mock login successful (fast mode - no database)',
      data: {
        user: userProfile,
        accessToken,
        refreshToken
      },
      mock: true,
      fastMode: true,
      note: 'This is a fast mode that skips database operations. For production, use pre-created users.'
    });
  } catch (error) {
    logger.error('Error in fastMockLogin controller', { error: error.message });
    next(error);
  }
};

module.exports = {
  fastMockLogin
};

