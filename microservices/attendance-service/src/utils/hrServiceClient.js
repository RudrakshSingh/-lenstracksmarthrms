const axios = require('axios');
const logger = require('../config/logger');

// HR Service base URL (from k8s service or env)
const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';

/**
 * Fetch employee details from HR service
 * @param {string} employeeId - MongoDB _id of the employee
 * @param {string} token - JWT token for authentication
 * @returns {Promise<Object>} Employee data
 */
const getEmployeeById = async (employeeId, token) => {
  try {
    const response = await axios.get(`${HR_SERVICE_URL}/api/hr/employees/${employeeId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000 // 5 second timeout
    });

    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    }

    logger.warn('HR service returned unexpected response format', {
      employeeId,
      status: response.status
    });
    return null;
  } catch (error) {
    if (error.response) {
      logger.error('HR service API error', {
        employeeId,
        status: error.response.status,
        message: error.response.data?.message || error.message
      });
    } else if (error.code === 'ECONNABORTED') {
      logger.error('HR service request timeout', { employeeId });
    } else {
      logger.error('Failed to fetch employee from HR service', {
        employeeId,
        error: error.message
      });
    }
    return null;
  }
};

/**
 * Get employee's assigned store from HR service
 * @param {string} employeeId - MongoDB _id of the employee
 * @param {string} token - JWT token for authentication
 * @returns {Promise<Object|null>} Store data or null
 */
const getEmployeeStore = async (employeeId, token) => {
  try {
    const employee = await getEmployeeById(employeeId, token);
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

    logger.warn('Employee has no store assigned', { employeeId });
    return null;
  } catch (error) {
    logger.error('Failed to get employee store', {
      employeeId,
      error: error.message
    });
    return null;
  }
};

module.exports = {
  getEmployeeById,
  getEmployeeStore
};

