// Helper function to add to attendance.service.js

const createAttendanceRecord = async (employee, latitude, longitude, selfieUrl, notes, user) => {
  const Attendance = require('../models/Attendance.model');
  const logger = require('../config/logger');

  try {
    // Create attendance record with fallback employee
    const employeeMongoId = employee._id || employee.id;
    
    // Check for existing attendance today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      employee: employeeMongoId,
      employee_id: employee.employeeId || employee.employee_id,
      check_in_time: { $gte: today, $lt: tomorrow },
      check_out_time: { $exists: false }
    });

    if (existingAttendance) {
      const error = new Error('Already clocked in today. Please clock out first.');
      error.statusCode = 400;
      throw error;
    }

    // Create new attendance record
    const attendanceData = {
      employee: employeeMongoId,
      employee_id: employee.employeeId || employee.employee_id,
      employeeName: employee.name || 'Unknown User',
      store: employee.store?._id || 'default-store-fallback',
      store_code: employee.store?.code || 'DEFAULT',
      date: new Date(),
      check_in_time: new Date(),
      check_in_location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: notes || 'Clock-in location'
      },
      check_in_selfie: selfieUrl ? {
        secure_url: selfieUrl,
        uploaded_at: new Date()
      } : null,
      status: 'present',
      geofence_status: 'valid', // Default to valid for fallback
      is_late: false,
      is_geofence_violation: false,
      total_hours: 0,
      notes: notes || ''
    };

    const attendance = await Attendance.create(attendanceData);
    
    logger.info('Attendance record created with fallback employee', {
      attendanceId: attendance._id,
      employeeId: employee.employeeId,
      checkInTime: attendance.check_in_time
    });

    return attendance;
    
  } catch (error) {
    logger.error('Error creating attendance record', {
      error: error.message,
      employeeId: employee.employeeId || employee.employee_id
    });
    throw error;
  }
};

module.exports = { createAttendanceRecord };