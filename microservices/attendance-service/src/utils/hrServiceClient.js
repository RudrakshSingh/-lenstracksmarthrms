const axios = require('axios');
const logger = require('../config/logger');

// HR Service base URL (from k8s service or env)
const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';

/**
 * Fetch employee details from HR service by user object
 * @param {Object} user - User object from req.user (has _id, employee_id, email)
 * @param {string} token - JWT token for authentication
 * @returns {Promise<Object>} Employee data
 */
const getEmployeeByUser = async (user, token) => {
  try {
    // Try to get employee using employee_id field first (most reliable)
    const employeeId = user.employee_id || user.employeeId;
    
    if (employeeId) {
      // Search by employee_id field (e.g., "EMP-TEST-001")
      const response = await axios.get(`${HR_SERVICE_URL}/api/hr/employees`, {
        params: { employeeId },
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (response.data && response.data.success) {
        const employees = response.data.data || response.data.employees || [];
        if (employees.length > 0) {
          const employee = employees[0];
          
          // If store is not populated (empty object), fetch full employee details by ID
          if (!employee.store || Object.keys(employee.store).length === 0) {
            const userId = employee._id || employee.id;
            if (userId) {
              try {
                const fullEmpResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/employees/${userId}`, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  timeout: 5000
                });
                if (fullEmpResponse.data && fullEmpResponse.data.success && fullEmpResponse.data.data) {
                  return fullEmpResponse.data.data; // Return employee with populated store
                }
              } catch (err) {
                logger.warn('Failed to fetch full employee details, using basic data', { userId });
              }
            }
          }
          
          return employee; // Return first match
        }
      }
    }

    // Fallback: try by MongoDB _id
    if (user._id || user.id) {
      const userId = user._id || user.id;
      const response = await axios.get(`${HR_SERVICE_URL}/api/hr/employees/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (response.data && response.data.success && response.data.data) {
        return response.data.data;
      }
    }

    logger.warn('Employee not found in HR service', {
      employeeId: employeeId || 'unknown',
      userId: user._id || user.id
    });
    return null;
  } catch (error) {
    if (error.response) {
      logger.error('HR service API error', {
        status: error.response.status,
        message: error.response.data?.message || error.message
      });
    } else if (error.code === 'ECONNABORTED') {
      logger.error('HR service request timeout');
    } else {
      logger.error('Failed to fetch employee from HR service', {
        error: error.message
      });
    }
    return null;
  }
};

/**
 * Get employee's assigned store from HR service
 * @param {Object} user - User object from req.user
 * @param {string} token - JWT token for authentication
 * @returns {Promise<Object|null>} Store data or null
 */
const getEmployeeStore = async (user, token) => {
  try {
    const employee = await getEmployeeByUser(user, token);
    if (!employee) {
      return null;
    }

    // Check for store reference (MongoDB ObjectId)
    if (employee.store) {
      // If store is populated (object), return it
      if (typeof employee.store === 'object' && employee.store._id) {
        return employee.store;
      }

      // If store is just an ID, fetch store details
      const storeId = employee.store;
      const storeResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/stores/${storeId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (storeResponse.data && storeResponse.data.success && storeResponse.data.data) {
        return storeResponse.data.data;
      }
    }

    // Check for workLocation (nested object with store info)
    if (employee.workLocation && employee.workLocation.storeId) {
      // Try to fetch store by ID from workLocation
      const storeId = employee.workLocation.storeId;
      try {
        const storeResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/stores/${storeId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        if (storeResponse.data && storeResponse.data.success && storeResponse.data.data) {
          return storeResponse.data.data;
        }
      } catch (storeError) {
        logger.warn('Failed to fetch store from workLocation.storeId', {
          employeeId,
          storeId,
          error: storeError.message
        });
      }
    }

    logger.warn('Employee has no store assigned');
    return null;
  } catch (error) {
    logger.error('Failed to get employee store', {
      error: error.message
    });
    return null;
  }
};

module.exports = {
  getEmployeeByUser,
  getEmployeeStore
};

