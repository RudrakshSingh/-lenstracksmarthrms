const axios = require('axios');
const logger = require('../config/logger');

const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';

/**
 * Sync employee to HR service after registration
 * @param {Object} userData - User data from registration
 * @param {string} token - JWT token for authentication
 * @returns {Promise<Object|null>} HR employee record or null
 */
const syncEmployeeToHR = async (userData, token) => {
  try {
    const {
      employee_id,
      employeeId,
      firstName,
      lastName,
      name,
      email,
      phone,
      department,
      designation,
      jobTitle,
      doj,
      joining_date,
      status
    } = userData;

    // Prepare employee data for HR service
    const hrEmployeeData = {
      employeeId: employee_id || employeeId,
      firstName: firstName || (name ? name.split(' ')[0] : ''),
      lastName: lastName || (name ? name.split(' ').slice(1).join(' ') : ''),
      fullName: name || `${firstName || ''} ${lastName || ''}`.trim(),
      email,
      phone: phone || '',
      department: department || '',
      designation: designation || jobTitle || '',
      jobTitle: jobTitle || designation || '',
      doj: doj || joining_date || new Date(),
      status: (status || 'active').toLowerCase()
    };

    logger.info('Syncing employee to HR service', {
      employeeId: hrEmployeeData.employeeId,
      email: hrEmployeeData.email
    });

    const response = await axios.post(
      `${HR_SERVICE_URL}/api/hr/employees`,
      hrEmployeeData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.data && response.data.success) {
      logger.info('Employee synced to HR service successfully', {
        employeeId: hrEmployeeData.employeeId,
        hrId: response.data.data?.id
      });
      return response.data.data;
    }

    logger.warn('HR service returned unsuccessful response', {
      employeeId: hrEmployeeData.employeeId,
      response: response.data
    });
    return null;
  } catch (error) {
    logger.error('Failed to sync employee to HR service', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
      employeeId: userData.employee_id || userData.employeeId
    });
    // Don't throw - sync failure shouldn't block registration
    return null;
  }
};

module.exports = {
  syncEmployeeToHR
};

