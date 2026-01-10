const Attendance = require('../models/Attendance.model');
const User = require('../models/User.model');
const Store = require('../models/Store.model');
const { isWithinGeofence } = require('../utils/geoUtils');
const logger = require('../config/logger');
const { recordAuditLog } = require('../utils/audit');
const { getEmployeeByUser, getEmployeeStore } = require('../utils/hrServiceClient');

/**
 * Records employee clock-in with GPS location and selfie
 * @param {Object} user - User object from req.user (has _id, employee_id, email)
 * @param {number} latitude - GPS latitude
 * @param {number} longitude - GPS longitude
 * @param {string} selfieUrl - Selfie image URL
 * @param {string} notes - Optional notes
 * @param {string} token - JWT token for HR service API calls
 * @returns {Promise<Object>} Attendance record
 */
const clockIn = async (user, latitude, longitude, selfieUrl, notes = '', token = null) => {
  // Define employeeId outside try block for use in catch block
  const employeeId = user._id || user.id;
  
  try {
    // Fetch employee from HR service (microservice pattern)
    const employee = await getEmployeeByUser(user, token);
    if (!employee) {
      const error = new Error('Employee not found in HR system');
      error.statusCode = 404;
      throw error;
    }

    // Fetch employee's assigned store
    const store = await getEmployeeStore(user, token);
    if (!store) {
      const error = new Error('Employee not assigned to any store. Please contact HR.');
      error.statusCode = 400;
      throw error;
    }

    logger.info('Store retrieved for attendance', {
      storeId: store._id || store.id,
      storeName: store.name,
      hasCoordinates: !!(store.coordinates?.latitude || store.latitude),
      coordinates: store.coordinates,
      directLat: store.latitude,
      directLng: store.longitude
    });

    // Check if there's an open clock-in (not clocked out yet)
    // Allow multiple clock-ins per day, but not simultaneous ones
    const openAttendance = await Attendance.findOne({
      employee: employeeId,
      check_in_time: { $exists: true },
      check_out_time: { $exists: false }
    }).sort({ check_in_time: -1 });

    if (openAttendance) {
      const error = new Error('Please clock out from your current session before clocking in again');
      error.statusCode = 400;
      throw error;
    }

    // Extract coordinates - support both formats
    const storeLatitude = store.coordinates?.latitude || store.latitude;
    const storeLongitude = store.coordinates?.longitude || store.longitude;

    if (!storeLatitude || !storeLongitude) {
      logger.warn('Store has no coordinates configured', {
        storeId: store._id || store.id,
        storeName: store.name
      });
    }

    // Check geofence - using store coordinates
    let isWithinGeofenceArea = false;
    if (storeLatitude && storeLongitude) {
      isWithinGeofenceArea = isWithinGeofence(
        latitude,
        longitude,
        storeLatitude,
        storeLongitude,
        store.geofenceRadius || 100 // Default 100 meters
      );
    }

    const attendance = new Attendance({
      employee: employeeId,
      employee_id: employee.employeeId || employee.employee_id || 'UNKNOWN',
      store: store._id || store.id,
      store_code: store.code || 'UNKNOWN',
      date: new Date(),
      check_in_time: new Date(),
      check_in_location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: notes || ''
      },
      check_in_selfie: {
        secure_url: selfieUrl,
        public_id: `selfie_${employeeId}_${Date.now()}`,
        uploaded_at: new Date()
      },
      status: 'present',
      geofence_status: isWithinGeofenceArea ? 'valid' : 'invalid',
      notes
    });

    await attendance.save();
    await recordAuditLog(employeeId, 'CLOCK_IN', { 
      storeId: store._id || store.id, 
      isGeofenceValid: isWithinGeofenceArea 
    });

    logger.info('Employee clocked in successfully', { 
      employeeId, 
      storeId: store._id || store.id,
      isGeofenceValid: isWithinGeofenceArea 
    });

    return attendance;
  } catch (error) {
    logger.error('Error in clockIn service', { error: error.message, employeeId });
    throw error;
  }
};

/**
 * Records employee clock-out with GPS location and selfie
 * @param {string} employeeId - Employee ID
 * @param {number} latitude - GPS latitude
 * @param {number} longitude - GPS longitude
 * @param {string} selfieUrl - Selfie image URL
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>} Attendance record
 */
const clockOut = async (employeeId, latitude, longitude, selfieUrl, notes = '') => {
  try {
    const employee = await User.findById(employeeId).populate('store');
    if (!employee) {
      const error = new Error('Employee not found');
      error.statusCode = 404;
      throw error;
    }

    // Find the most recent open attendance record (not clocked out yet)
    const attendance = await Attendance.findOne({
      employee: employeeId,
      check_in_time: { $exists: true },
      check_out_time: { $exists: false }
    }).sort({ check_in_time: -1 });

    if (!attendance) {
      const error = new Error('No open clock-in session found. Please clock in first.');
      error.statusCode = 400;
      throw error;
    }

    // Check geofence - using store coordinates from the model
    let isWithinGeofenceArea = false;
    if (employee.store.coordinates && employee.store.coordinates.latitude && employee.store.coordinates.longitude) {
      isWithinGeofenceArea = isWithinGeofence(
        latitude,
        longitude,
        employee.store.coordinates.latitude,
        employee.store.coordinates.longitude,
        employee.store.geofenceRadius || 100 // Default 100 meters
      );
    }

    attendance.check_out_time = new Date();
    attendance.check_out_location = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address: notes || ''
    };
    attendance.check_out_selfie = {
      secure_url: selfieUrl,
      public_id: `selfie_out_${employeeId}_${Date.now()}`,
      uploaded_at: new Date()
    };

    await attendance.save();
    await recordAuditLog(employeeId, 'CLOCK_OUT', { 
      storeId: employee.store._id, 
      isGeofenceValid: isWithinGeofenceArea 
    });

    logger.info('Employee clocked out successfully', { 
      employeeId, 
      storeId: employee.store._id,
      isGeofenceValid: isWithinGeofenceArea 
    });

    return attendance;
  } catch (error) {
    logger.error('Error in clockOut service', { error: error.message, employeeId });
    throw error;
  }
};

/**
 * Gets attendance history for an employee
 * @param {string} employeeId - Employee ID
 * @param {Date} startDate - Start date for history
 * @param {Date} endDate - End date for history
 * @param {number} page - Page number
 * @param {number} limit - Records per page
 * @returns {Promise<Object>} Paginated attendance history
 */
const getAttendanceHistory = async (employeeId, startDate, endDate, page = 1, limit = 10) => {
  try {
    const query = { employee: employeeId };

    if (startDate && endDate) {
      query['check_in_time'] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const skip = (page - 1) * limit;

    const [attendances, total] = await Promise.all([
      Attendance.find(query)
        .populate('store', 'name address')
        .sort({ 'clockIn.time': -1 })
        .skip(skip)
        .limit(limit),
      Attendance.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      attendances,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  } catch (error) {
    logger.error('Error in getAttendanceHistory service', { error: error.message, employeeId });
    throw error;
  }
};

/**
 * Gets attendance summary for an employee
 * @param {string} employeeId - Employee ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} Attendance summary
 */
const getAttendanceSummary = async (employeeId, startDate, endDate) => {
  try {
    const query = { 
      employee: employeeId,
      'clockIn.time': {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    const attendances = await Attendance.find(query);

    const summary = {
      totalDays: attendances.length,
      presentDays: attendances.filter(a => a.status === 'present').length,
      absentDays: attendances.filter(a => a.status === 'absent').length,
      onLeaveDays: attendances.filter(a => a.status === 'on_leave').length,
      holidayDays: attendances.filter(a => a.status === 'holiday').length,
      averageWorkingHours: 0,
      totalWorkingHours: 0
    };

    // Calculate working hours
    let totalHours = 0;
    let workingDays = 0;

    attendances.forEach(attendance => {
      if (attendance.clockIn && attendance.clockOut) {
        const hours = (attendance.clockOut.time - attendance.clockIn.time) / (1000 * 60 * 60);
        totalHours += hours;
        workingDays++;
      }
    });

    summary.totalWorkingHours = totalHours;
    summary.averageWorkingHours = workingDays > 0 ? totalHours / workingDays : 0;
    summary.attendancePercentage = summary.totalDays > 0 ? (summary.presentDays / summary.totalDays) * 100 : 0;

    return summary;
  } catch (error) {
    logger.error('Error in getAttendanceSummary service', { error: error.message, employeeId });
    throw error;
  }
};

/**
 * Get all attendance records with filters
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Number of items per page
 * @returns {Promise<Object>} Paginated attendance records
 */
const getAttendanceRecords = async (filters = {}, page = 1, limit = 10) => {
  try {
    const query = {};

    if (filters.employee) {
      query.employee = filters.employee;
    }

    if (filters.date) {
      query.date = filters.date;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate('employee', 'name email employee_id')
        .populate('store', 'name code')
        .sort({ date: -1, clockIn: -1 })
        .skip(skip)
        .limit(limit),
      Attendance.countDocuments(query)
    ]);

    return {
      records,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    };
  } catch (error) {
    logger.error('Error in getAttendanceRecords service', { error: error.message, filters, page, limit });
    throw error;
  }
};

module.exports = {
  clockIn,
  clockOut,
  getAttendanceHistory,
  getAttendanceSummary,
  getAttendanceRecords
};