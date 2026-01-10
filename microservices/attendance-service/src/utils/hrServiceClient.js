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
    
    logger.info('getEmployeeByUser called', {
      hasEmployeeId: !!employeeId,
      employeeId,
      userId: user._id || user.id,
      userEmail: user.email
    });
    
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
        logger.info('HR service returned employees', {
          count: employees.length,
          searchedEmployeeId: employeeId
        });
        
        if (employees.length > 0) {
          const employee = employees[0];
          
          logger.info('Found employee in HR service', {
            employeeId: employee.employeeId,
            hrDbId: employee._id || employee.id,
            hasStore: !!employee.store,
            storeIsEmpty: employee.store && Object.keys(employee.store).length === 0
          });
          
          // If store is not populated (empty object), fetch full employee details by ID
          if (!employee.store || Object.keys(employee.store).length === 0) {
            const userId = employee._id || employee.id;
            if (userId) {
              try {
                logger.info('Fetching full employee details to get populated store', { userId });
                const fullEmpResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/employees/${userId}`, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  timeout: 5000
                });
                if (fullEmpResponse.data && fullEmpResponse.data.success && fullEmpResponse.data.data) {
                  logger.info('Got full employee with store', {
                    hasStore: !!fullEmpResponse.data.data.store,
                    storeKeys: fullEmpResponse.data.data.store ? Object.keys(fullEmpResponse.data.data.store).length : 0
                  });
                  return fullEmpResponse.data.data; // Return employee with populated store
                }
              } catch (err) {
                logger.warn('Failed to fetch full employee details, using basic data', { userId, error: err.message });
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
      logger.info('Fallback: Searching by MongoDB _id', { userId });
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
      logger.warn('getEmployeeStore: Employee not found');
      return null;
    }

    logger.info('getEmployeeStore: Employee retrieved', {
      employeeId: employee.employeeId || employee.employee_id,
      hasStore: !!employee.store,
      storeType: typeof employee.store,
      storeKeys: employee.store ? Object.keys(employee.store).length : 0
    });

    // Check for store reference (MongoDB ObjectId)
    if (employee.store && typeof employee.store === 'object') {
      // If store has _id, it's populated - return it
      if (employee.store._id || employee.store.id) {
        logger.info('Returning populated store', { storeId: employee.store._id || employee.store.id });
        return employee.store;
      }
      
      // If store is an empty object, log warning
      if (Object.keys(employee.store).length === 0) {
        logger.warn('Employee has empty store object', { employeeId: employee.employeeId });
      }
    }

    // If store is just a string ID, fetch store details
    if (employee.store && typeof employee.store === 'string') {
      const storeId = employee.store;
      logger.info('Fetching store by ID', { storeId });
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

