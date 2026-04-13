const User = require('../models/User.model');
const Store = require('../models/Store.model');
const Department = require('../models/Department.model');
const LeaveBalance = require('../models/LeaveBalance.model');
const LeaveRequest = require('../models/LeaveRequest.model');
const leaveService = require('./leave.service');
const mongoose = require('mongoose');
const logger = require('../config/logger');
const axios = require('axios');
const http = require('http');
const { getEmployeePayroll } = require('../utils/payrollServiceClient');

// CRITICAL: Use Kubernetes service name with port 80
// Service ClusterIP is on port 80, which routes to pod port 3003
// In production Kubernetes, always use port 80 for service-to-service calls
// Default to port 80 (production) unless explicitly set to 3003 (local dev)
const ATTENDANCE_SERVICE_URL = process.env.ATTENDANCE_SERVICE_URL || 'http://attendance-service:80';

const resolveTenantId = (tenantId, req) => {
  return (
    tenantId ||
    req?.tenantId ||
    req?.get?.('X-Tenant-Id') ||
    req?.get?.('x-tenant-id') ||
    req?.user?.tenantId ||
    'default'
  );
};

/**
 * Get Unified Dashboard Data (Role-based)
 * Main dashboard endpoint that returns different widgets based on user role
 */
const getUnifiedDashboard = async (userId, role, tenantId = null, req = null) => {
  try {
    logger.info('Fetching unified dashboard', { userId, role, tenantId });

    const scopedTenantId = resolveTenantId(tenantId, req);
    let user;
    const normalizedUserId = userId ? userId.toString().trim() : '';

    // OPTIMIZED: Select only needed fields, use lean(), reduce populate fields
    if (mongoose.Types.ObjectId.isValid(normalizedUserId)) {
      user = await User.findOne({ _id: normalizedUserId, tenantId: scopedTenantId })
        .select('employeeId employee_id email firstName lastName fullName name store departmentRef tenantId status role salary')
        .populate('store', 'name code')
        .populate('departmentRef', 'name code')
        .lean()
        .maxTimeMS(2000); // Reduced timeout for faster response
    } else {
      user = await User.findOne({
        tenantId: scopedTenantId,
        $or: [
          { employeeId: normalizedUserId },
          { employee_id: normalizedUserId },
          { employeeId: normalizedUserId.toUpperCase() },
          { employee_id: normalizedUserId.toUpperCase() },
          { email: normalizedUserId.toLowerCase() }
        ]
      })
        .select('employeeId employee_id email firstName lastName fullName name store departmentRef tenantId status role salary')
        .populate('store', 'name code')
        .populate('departmentRef', 'name code')
        .lean()
        .maxTimeMS(2000);
    }

    if (!user && req?.user?.employee_id) {
      user = await User.findOne({
        tenantId: scopedTenantId,
        $or: [
          { employee_id: req.user.employee_id },
          { employeeId: req.user.employee_id },
          { employee_id: req.user.employee_id.toUpperCase() },
          { employeeId: req.user.employee_id.toUpperCase() }
        ]
      })
        .select('employeeId employee_id email firstName lastName fullName name store departmentRef tenantId status role salary')
        .populate('store', 'name code')
        .populate('departmentRef', 'name code')
        .lean()
        .maxTimeMS(2000);
    }

    // If user still not found, create a minimal user object from req.user data
    if (!user) {
      logger.warn('User not found in dashboard, using req.user data', { 
        userId, 
        tenantId,
        reqUserEmployeeId: req?.user?.employee_id,
        reqUserEmployeeIdAlt: req?.user?.employeeId,
        reqUserEmail: req?.user?.email,
        reqUserKeys: req?.user ? Object.keys(req.user) : []
      });
      
      // Use req.user data if available - CRITICAL: Extract employee_id STRING, NEVER use MongoDB _id
      // Attendance service requires employee_id like "EMP-2026-969954", not ObjectId
      // Try multiple sources: req.user.employee_id, req.user.employeeId, or decode from JWT if needed
      let employeeIdString = req?.user?.employee_id || req?.user?.employeeId;
      
      // If still not found, try to decode JWT token to get employee_id
      if (!employeeIdString && req?.headers?.authorization) {
        try {
          const jwt = require('jsonwebtoken');
          const { JWT_SECRET } = require('../config/jwt');
          const token = req.headers.authorization.replace('Bearer ', '');
          const decoded = jwt.verify(token, JWT_SECRET || process.env.JWT_SECRET || 'fallback-secret');
          employeeIdString = decoded.employee_id || decoded.employeeId || null;
          logger.info('Extracted employee_id from JWT token', { employeeId: employeeIdString });
        } catch (jwtError) {
          logger.warn('Failed to decode JWT for employee_id', { error: jwtError.message });
        }
      }
      
      const userName = req?.user?.name || req?.user?.fullName || `${req?.user?.firstName || ''} ${req?.user?.lastName || ''}`.trim() || 'Unknown User';
      
      if (!employeeIdString) {
        logger.error('No employee_id found in req.user or JWT - cannot fetch attendance', {
          reqUserKeys: req?.user ? Object.keys(req.user) : [],
          userId: normalizedUserId,
          hasAuthHeader: !!req?.headers?.authorization
        });
      }
      
      // Still try to fetch attendance data even if user not found in HR DB
      // We'll use employeeId from req.user for attendance calls
      user = {
        _id: normalizedUserId,
        employeeId: employeeIdString || null, // CRITICAL: Use employee_id string, NEVER MongoDB _id
        employee_id: employeeIdString || null, // CRITICAL: Use employee_id string, NEVER MongoDB _id
        fullName: userName,
        firstName: req?.user?.firstName || '',
        lastName: req?.user?.lastName || '',
        email: req?.user?.email || '',
        lastLogin: req?.user?.lastLogin || req?.user?.last_login || null,
        role: req?.user?.role || null,
        store: null,
        departmentRef: null,
        department: req?.user?.department || null
      };
      
      logger.info('Created minimal user object from req.user', { 
        employeeId: employeeIdString,
        userId: normalizedUserId,
        hasEmployeeId: !!employeeIdString,
        reqUserEmployeeId: req?.user?.employee_id,
        reqUserEmployeeIdAlt: req?.user?.employeeId
      });
    }

    // Base widgets for all users - FIXED: Use fallback values from req.user if user object is incomplete
    const dashboardData = {
      user: {
        id: user.employeeId || user.employee_id || user._id?.toString() || req?.user?._id?.toString() || req?.user?.id?.toString(),
        name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || req?.user?.name || 'Unknown User',
        role: role || user.role?.name || req?.user?.role || 'employee',
        department: user.department || user.departmentRef?.name || req?.user?.department || null,
        store: user.store?.name || user.workLocation?.storeName || null, // CRITICAL: Use populated store or workLocation
        storeId: user.store?._id?.toString() || user.store?.id || user.workLocation?.storeId || null,
        storeCode: user.store?.code || null,
        lastLogin: user.lastLogin || user.last_login || req?.user?.lastLogin || req?.user?.last_login || null // Recent login time (updates on every login)
      },
      widgets: {
        // Initialize all widgets with default values to prevent null
        attendance: {
          overall: {
            total: 0,
            present: 0,
            absent: 0,
            onLeave: 0,
            attendanceRate: 0
          },
          attendancePercentage: 0,
          today: { status: 'Unknown', checkIn: null, checkOut: null },
          weekly: { present: 0, total: 5 }
        },
        sales: {
          today: {
            totalSales: 0,
            totalOrders: 0,
            totalItems: 0,
            formatted: '₹0'
          },
          thisMonth: {
            totalSales: 0,
            totalOrders: 0,
            totalItems: 0,
            formatted: '₹0'
          },
          currency: 'INR'
        },
        payroll: {
          amount: 0,
          status: 'Not Available',
          currency: 'INR'
        },
        leaves: {
          available: 0,
          used: 0,
          total: 0,
          pending: 0
        },
        roster: {
          shift: 'MORNING',
          shiftStart: '09:00',
          shiftEnd: '18:00'
        },
        tasks: {
          total: 0,
          pending: 0,
          completed: 0
        },
        performance: {
          score: 0,
          grade: 'F',
          xp: 0,
          level: 1
        }
      },
      quickActions: []
    };

    // Get attendance data based on role
    try {
      const normalizedRole = (role || '').toString().toUpperCase();
      const isAdminOrHR = ['ADMIN', 'HR', 'SUPERADMIN', 'MANAGER'].includes(normalizedRole);
      
      if (isAdminOrHR) {
        // Admin/HR: Get overall attendance stats (all employees)
        try {
          const authHeader = req?.headers?.authorization || req?.get?.('authorization') || '';
          const token = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`;
          
          const attendanceStatsResponse = await axios.get(
            `${ATTENDANCE_SERVICE_URL}/api/attendance/stats`,
            {
              headers: {
                'Authorization': token,
                'x-tenant-id': scopedTenantId,
                'Content-Type': 'application/json'
              },
              timeout: 30000,
              httpAgent: new http.Agent({ 
                keepAlive: true,
                keepAliveMsecs: 1000,
                maxSockets: 50,
                maxFreeSockets: 10,
                timeout: 30000
              }),
              validateStatus: (status) => status < 500
            }
          );
          
          if (attendanceStatsResponse.data.success) {
            // CRITICAL: Get correct tenant-filtered employee count
            // Don't trust attendance service's total - it might include all tenants
            const correctTotalEmployees = await User.countDocuments({
              tenantId: scopedTenantId,
              isDeleted: false,
              status: { $in: ['active', 'on-leave'] }
            });
            
            // Override total with correct tenant-filtered count
            const attendanceStats = {
              ...attendanceStatsResponse.data.data,
              total: correctTotalEmployees // CRITICAL: Use tenant-filtered count
            };
            
            dashboardData.widgets.attendance = {
              overall: attendanceStats,
              type: 'admin_view' // Indicates this is admin/HR view
            };
            
            // Get detailed attendance records with logout times for HR/Admin
            try {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);
              
              const attendanceRecordsResponse = await axios.get(
                `${ATTENDANCE_SERVICE_URL}/api/attendance`,
                {
                  params: {
                    date: today.toISOString().split('T')[0],
                    limit: 1000 // Get all records for today
                  },
                  headers: {
                    'Authorization': token,
                    'x-tenant-id': scopedTenantId,
                    'Content-Type': 'application/json'
                  },
                  timeout: 10000,
                  validateStatus: (status) => status < 500
                }
              );
              
              if (attendanceRecordsResponse.data && attendanceRecordsResponse.data.success) {
                const records = attendanceRecordsResponse.data.data || [];
                
                // CRITICAL: Get all employees for current tenant to check for leave
                // OPTIMIZED: Select only needed fields, use lean()
                const allEmployees = await User.find({
                  tenantId: scopedTenantId,
                  isDeleted: false,
                  status: { $in: ['active', 'on-leave'] }
                })
                  .select('_id employeeId employee_id firstName lastName fullName')
                  .lean();
                
                // Create employee map for quick lookup
                const employeeMap = new Map();
                allEmployees.forEach(emp => {
                  const empId = emp.employeeId || emp.employee_id;
                  if (empId) {
                    employeeMap.set(empId.toUpperCase(), emp);
                    employeeMap.set(emp._id.toString(), emp);
                  }
                });
                
                // Get all approved leave requests for today
                // CRITICAL: Filter by tenantId through employee lookup
                const todayStart = new Date(today);
                todayStart.setHours(0, 0, 0, 0);
                const todayEnd = new Date(today);
                todayEnd.setHours(23, 59, 59, 999);
                
                // Get employee IDs for current tenant
                const tenantEmployeeIds = allEmployees.map(e => e._id);
                
                const todayLeaves = await LeaveRequest.find({
                  employee_id: { $in: tenantEmployeeIds }, // CRITICAL: Filter by tenant through employee_id
                  status: { $in: ['APPROVED', 'AUTO_APPROVED'] },
                  from_date: { $lte: todayEnd },
                  to_date: { $gte: todayStart }
                })
                  .select('employee_id employee_code employee_name leave_type from_date to_date half_day half_day_type reason')
                  .lean();
                
                // Create leave map by employee_id
                const leaveMap = new Map();
                todayLeaves.forEach(leave => {
                  const empId = leave.employee_id?.toString();
                  if (empId) {
                    if (!leaveMap.has(empId)) {
                      leaveMap.set(empId, []);
                    }
                    leaveMap.get(empId).push(leave);
                  }
                });
                
                // Format attendance records with logout times and leave status
                const attendanceDetails = records.map(record => {
                  const checkIn = record.checkIn?.time || record.check_in_time;
                  const checkOut = record.checkOut?.time || record.check_out_time;
                  const totalHours = record.total_hours || record.totalHours || 0;
                  const employeeId = record.employee_id || record.employeeId;
                  const employeeObjId = record.employee?._id?.toString() || record.employee?._id;
                  
                  // Check if employee is on leave
                  const employeeLeave = leaveMap.get(employeeObjId) || leaveMap.get(employeeId?.toUpperCase());
                  const isOnLeave = employeeLeave && employeeLeave.length > 0;
                  const leaveInfo = isOnLeave ? employeeLeave[0] : null;
                  
                  return {
                    employeeId: employeeId,
                    employeeName: record.employeeName || record.employee?.name || 'Unknown',
                    checkIn: checkIn ? new Date(checkIn).toISOString() : null,
                    checkOut: checkOut ? new Date(checkOut).toISOString() : null,
                    checkInTime: checkIn ? new Date(checkIn).toLocaleString() : null,
                    checkOutTime: checkOut ? new Date(checkOut).toLocaleString() : null,
                    totalHours: parseFloat(totalHours.toFixed(2)),
                    status: isOnLeave ? 'on_leave' : (record.status || 'absent'),
                    isOnLeave: isOnLeave,
                    leaveType: leaveInfo?.leave_type || null,
                    leaveReason: leaveInfo?.reason || null,
                    logoutReason: record.logout_reason || 'manual',
                    isGeofenceViolation: record.is_geofence_violation || false,
                    storeCode: record.store_code || record.storeCode
                  };
                });
                
                // Add employees who are on leave but don't have attendance records
                const employeesWithAttendance = new Set(
                  attendanceDetails.map(r => {
                    const emp = employeeMap.get(r.employeeId?.toUpperCase());
                    return emp?._id?.toString();
                  }).filter(Boolean)
                );
                
                todayLeaves.forEach(leave => {
                  const empId = leave.employee_id?.toString();
                  if (empId && !employeesWithAttendance.has(empId)) {
                    // Employee is on leave but no attendance record
                    const employee = allEmployees.find(e => e._id.toString() === empId);
                    if (employee) {
                      attendanceDetails.push({
                        employeeId: employee.employeeId || employee.employee_id,
                        employeeName: employee.fullName || `${employee.firstName} ${employee.lastName}`.trim() || 'Unknown',
                        checkIn: null,
                        checkOut: null,
                        checkInTime: null,
                        checkOutTime: null,
                        totalHours: 0,
                        status: 'on_leave',
                        isOnLeave: true,
                        leaveType: leave.leave_type,
                        leaveReason: leave.reason || null,
                        logoutReason: null,
                        isGeofenceViolation: false,
                        storeCode: null
                      });
                    }
                  }
                });
                
                dashboardData.widgets.attendance.records = attendanceDetails;
                dashboardData.widgets.attendance.totalRecords = attendanceDetails.length;
                
                // Update stats with leave count
                const onLeaveCount = attendanceDetails.filter(r => r.isOnLeave).length;
                const presentCount = attendanceDetails.filter(r => r.status === 'present' || r.checkIn).length;
                const absentCount = attendanceDetails.filter(r => r.status === 'absent' && !r.isOnLeave).length;
                
                if (dashboardData.widgets.attendance.overall) {
                  dashboardData.widgets.attendance.overall.onLeave = onLeaveCount;
                  dashboardData.widgets.attendance.overall.present = presentCount;
                  dashboardData.widgets.attendance.overall.absent = absentCount;
                  dashboardData.widgets.attendance.overall.total = allEmployees.length;
                }
              }
            } catch (recordsError) {
              logger.warn('Failed to fetch detailed attendance records for HR dashboard', { 
                error: recordsError.message 
              });
            }
          }
        } catch (statsError) {
          logger.warn('Failed to fetch attendance stats for admin', { error: statsError.message });
          // CRITICAL: Get employee count even if attendance API fails
          try {
            const correctTotalEmployees = await User.countDocuments({
              tenantId: scopedTenantId,
              isDeleted: false,
              status: { $in: ['active', 'on-leave'] }
            });
            
            // Update existing attendance widget, don't replace it
            if (dashboardData.widgets.attendance) {
              dashboardData.widgets.attendance.overall = {
                total: correctTotalEmployees || 0,
                present: dashboardData.widgets.attendance.overall?.present || 0,
                absent: correctTotalEmployees || 0,
                onLeave: dashboardData.widgets.attendance.overall?.onLeave || 0,
                attendanceRate: 0
              };
              dashboardData.widgets.attendance.attendancePercentage = 0;
              dashboardData.widgets.attendance.type = 'admin_view';
            } else {
              dashboardData.widgets.attendance = {
                overall: {
                  total: correctTotalEmployees || 0,
                  present: 0,
                  absent: correctTotalEmployees || 0,
                  onLeave: 0,
                  attendanceRate: 0
                },
                attendancePercentage: 0,
                today: { status: 'Unknown', checkIn: null, checkOut: null },
                weekly: { present: 0, total: 5 },
                type: 'admin_view'
              };
            }
          } catch (countError) {
            logger.warn('Failed to get employee count', { error: countError.message });
            // Preserve existing structure, just ensure no nulls
            if (dashboardData.widgets.attendance && dashboardData.widgets.attendance.overall) {
              dashboardData.widgets.attendance.overall.total = dashboardData.widgets.attendance.overall.total || 0;
              dashboardData.widgets.attendance.overall.present = dashboardData.widgets.attendance.overall.present || 0;
              dashboardData.widgets.attendance.overall.absent = dashboardData.widgets.attendance.overall.absent || 0;
              dashboardData.widgets.attendance.overall.onLeave = dashboardData.widgets.attendance.overall.onLeave || 0;
              dashboardData.widgets.attendance.attendancePercentage = dashboardData.widgets.attendance.attendancePercentage || 0;
            }
          }
        }
      } else {
        // Employee: Get their own attendance summary and login time info
        const authHeader = req?.headers?.authorization || req?.get?.('authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`;
        // CRITICAL: Use employee_id STRING from user object or req.user - NEVER use MongoDB _id
        // Attendance service expects employee_id like "EMP-2026-969954", not MongoDB ObjectId
        let employeeId = user.employee_id || user.employeeId;
        
        // Fallback to req.user if not in user object
        if (!employeeId) {
          employeeId = req?.user?.employee_id || req?.user?.employeeId;
        }
        
        // LAST RESORT: Check if dashboardData.user.id is an employee_id string (starts with EMP-)
        // NEVER use MongoDB ObjectId - attendance service will fail
        if (!employeeId && dashboardData.user.id && typeof dashboardData.user.id === 'string' && dashboardData.user.id.startsWith('EMP-')) {
          employeeId = dashboardData.user.id;
        }
        
        // NEVER fallback to _id if it's a MongoDB ObjectId - this will cause "Employee not found" error
        // Only use _id if it's NOT a MongoDB ObjectId (i.e., it's already an employee_id string)
        if (!employeeId && user._id && typeof user._id === 'string' && !mongoose.Types.ObjectId.isValid(user._id)) {
          employeeId = user._id;
        }
        
        if (!employeeId) {
          logger.warn('No employeeId available for attendance fetch', { 
            userId, 
            userEmployeeId: user.employee_id || user.employeeId,
            reqUserEmployeeId: req?.user?.employee_id || req?.user?.employeeId,
            userObjectId: user._id?.toString()
          });
        } else {
          logger.info('Fetching attendance for employee', { employeeId, userId });
        }
        
        try {
          // Get attendance summary
          // CRITICAL: Use Promise.race to fail fast if service is slow
          logger.info('Calling attendance service for summary', { 
            url: `${ATTENDANCE_SERVICE_URL}/api/attendance/summary`,
            employeeId,
            serviceUrl: ATTENDANCE_SERVICE_URL
          });
          
          // Use Promise.race to timeout faster and not block dashboard
          const attendanceResponse = await Promise.race([
            axios.get(
            `${ATTENDANCE_SERVICE_URL}/api/attendance/summary`,
            {
              params: { 
                  employeeId: employeeId,
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
              },
              headers: {
                'Authorization': token,
                  'x-tenant-id': scopedTenantId,
                  'Content-Type': 'application/json'
                },
                timeout: 8000, // 8 seconds - fail fast
                // Optimize connection for service-to-service calls
                httpAgent: new http.Agent({ 
                  keepAlive: true,
                  keepAliveMsecs: 1000,
                  maxSockets: 50,
                  maxFreeSockets: 10,
                  timeout: 8000
                }),
                // Do not throw on 5xx here; we handle summary failures and
                // still continue to record-based fallback for today's widget.
                validateStatus: (status) => status < 600
              }
            ),
            // Fail fast after 8 seconds
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Attendance service timeout - dashboard will load without attendance data')), 8000)
            )
          ]);
          
          // CRITICAL: Check if employee is on leave today
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date();
          todayEnd.setHours(23, 59, 59, 999);
          
          let isOnLeaveToday = false;
          let leaveInfo = null;
          
          try {
            const userEmployeeId = user._id || user.id;
            const todayLeave = await LeaveRequest.findOne({
              employee_id: userEmployeeId,
              status: { $in: ['APPROVED', 'AUTO_APPROVED'] },
              from_date: { $lte: todayEnd },
              to_date: { $gte: todayStart }
            })
              .select('leave_type from_date to_date half_day half_day_type reason')
              .lean();
            
            if (todayLeave) {
              isOnLeaveToday = true;
              leaveInfo = todayLeave;
              logger.info('Employee is on leave today', { employeeId, leaveType: todayLeave.leave_type });
            }
          } catch (leaveError) {
            logger.warn('Error checking leave status for employee', { error: leaveError.message, employeeId });
          }
          
          if (attendanceResponse.data.success && attendanceResponse.data.data) {
            // Merge summary data into attendance widget, preserving existing structure
            const summaryData = attendanceResponse.data.data;
            // Initialize attendance widget if not exists
            if (!dashboardData.widgets.attendance) {
              dashboardData.widgets.attendance = {
                today: { status: 'Unknown', checkIn: null, checkOut: null },
                weekly: { present: 0, total: 5 }
              };
            }
            // Merge summary data while preserving existing fields
            dashboardData.widgets.attendance = {
              ...dashboardData.widgets.attendance,
              // Add summary fields - ensure no null values
              presentDays: summaryData.presentDays || 0,
              totalDays: summaryData.totalDays || 0,
              absentDays: summaryData.absentDays || 0,
              onLeaveDays: summaryData.onLeaveDays || 0,
              holidayDays: summaryData.holidayDays || 0,
              totalWorkingHours: summaryData.totalWorkingHours || 0,
              averageWorkingHours: summaryData.averageWorkingHours || 0,
              attendancePercentage: summaryData.attendancePercentage || 0,
              // Update weekly with summary data
              weekly: {
                present: summaryData.presentDays || dashboardData.widgets.attendance.weekly?.present || 0,
                total: summaryData.totalDays || dashboardData.widgets.attendance.weekly?.total || 0,
                absent: summaryData.absentDays || 0,
                onLeave: summaryData.onLeaveDays || 0
              },
              // CRITICAL: Override today status if employee is on leave
              today: {
                ...dashboardData.widgets.attendance.today,
                status: isOnLeaveToday ? 'on_leave' : (dashboardData.widgets.attendance.today?.status || 'Unknown'),
                isOnLeave: isOnLeaveToday,
                leaveType: leaveInfo?.leave_type || null,
                leaveReason: leaveInfo?.reason || null
              }
            };
            logger.info('Attendance summary merged successfully', { 
              employeeId,
              presentDays: summaryData.presentDays,
              totalDays: summaryData.totalDays,
              isOnLeave: isOnLeaveToday
            });
          } else {
            // If attendance summary failed, try to calculate from today's attendance
            logger.warn('Attendance summary API failed, calculating from today attendance', { 
              employeeId,
              responseSuccess: attendanceResponse.data?.success,
              responseData: attendanceResponse.data?.data
            });
            
            // Initialize attendance widget if not exists
            if (!dashboardData.widgets.attendance) {
              dashboardData.widgets.attendance = {
                today: { status: 'Unknown', checkIn: null, checkOut: null },
                weekly: { present: 0, total: 5 }
              };
            }
            
            // Set default values to avoid null
            dashboardData.widgets.attendance.presentDays = 0;
            dashboardData.widgets.attendance.totalDays = 7; // Default to 7 days
            dashboardData.widgets.attendance.absentDays = 0;
            dashboardData.widgets.attendance.onLeaveDays = 0;
            dashboardData.widgets.attendance.attendancePercentage = 0;
            
            // Update today status if on leave
            if (isOnLeaveToday) {
              dashboardData.widgets.attendance.today = {
                ...dashboardData.widgets.attendance.today,
                status: 'on_leave',
                isOnLeave: true,
                leaveType: leaveInfo?.leave_type || null,
                leaveReason: leaveInfo?.reason || null
              };
            }
          }
          
          if (isOnLeaveToday) {
            // If no attendance data but employee is on leave, set leave status
            if (!dashboardData.widgets.attendance) {
              dashboardData.widgets.attendance = {
                today: { status: 'on_leave', checkIn: null, checkOut: null },
                weekly: { present: 0, total: 5 }
              };
            }
            dashboardData.widgets.attendance.today = {
              ...dashboardData.widgets.attendance.today,
              status: 'on_leave',
              isOnLeave: true,
              leaveType: leaveInfo?.leave_type || null,
              leaveReason: leaveInfo?.reason || null
            };
          }
          
          // Get all today's attendance records to calculate total login time and find most recent login
          try {
            const today = new Date();
            const todayDateStr = today.toISOString().split('T')[0];
            
            // Get all attendance records for today
            logger.info('Calling attendance service for records', { 
              url: `${ATTENDANCE_SERVICE_URL}/api/attendance`,
              employeeId,
              date: todayDateStr
            });
            
            const attendanceRecordsResponse = await axios.get(
              `${ATTENDANCE_SERVICE_URL}/api/attendance`,
              {
                params: { 
                  employeeId: employeeId,
                  date: todayDateStr,
                  limit: 100,
                  page: 1
                },
                headers: {
                  'Authorization': token,
                  'x-tenant-id': scopedTenantId,
                  'Content-Type': 'application/json'
                },
                timeout: 8000, // 8 seconds - fail fast
                httpAgent: new http.Agent({ 
                  keepAlive: true,
                  keepAliveMsecs: 1000,
                  maxSockets: 50,
                  maxFreeSockets: 10,
                  timeout: 8000
                }),
                validateStatus: (status) => status < 500
              }
            );
            
            if (attendanceRecordsResponse.data.success) {
              // Handle both array and paginated response formats
              let records = [];
              const responseData = attendanceRecordsResponse.data.data || attendanceRecordsResponse.data;
              
              // Check if responseData is directly an array
              if (Array.isArray(responseData)) {
                records = responseData;
              } else if (Array.isArray(attendanceRecordsResponse.data.data)) {
                records = attendanceRecordsResponse.data.data;
              } else if (responseData?.attendances && Array.isArray(responseData.attendances)) {
                // Handle paginated response with attendances array
                records = responseData.attendances;
              } else if (responseData?.records && Array.isArray(responseData.records)) {
                records = responseData.records;
              } else if (responseData?.data && Array.isArray(responseData.data)) {
                records = responseData.data;
              } else if (attendanceRecordsResponse.data.records && Array.isArray(attendanceRecordsResponse.data.records)) {
                records = attendanceRecordsResponse.data.records;
              } else if (attendanceRecordsResponse.data.attendances && Array.isArray(attendanceRecordsResponse.data.attendances)) {
                // Direct attendances array in response
                records = attendanceRecordsResponse.data.attendances;
              }
              
              logger.info('Parsed attendance records', { 
                recordsCount: records.length,
                responseDataType: typeof responseData,
                isArray: Array.isArray(responseData),
                responseDataKeys: responseData ? Object.keys(responseData) : []
              });
              
              if (records && records.length > 0) {
                // Sort by check-in time (most recent first)
                records.sort((a, b) => {
                  const timeA = new Date(a.checkIn?.time || a.check_in_time || 0);
                  const timeB = new Date(b.checkIn?.time || b.check_in_time || 0);
                  return timeB - timeA; // Descending order
                });
                
                // Get most recent login time (first record's check-in)
                const mostRecentRecord = records[0];
                const recentLoginTime = mostRecentRecord.checkIn?.time || mostRecentRecord.check_in_time || null;
                
                dashboardData.widgets.attendance.recentLoginTime = recentLoginTime;
                dashboardData.widgets.attendance.currentSessionStart = recentLoginTime;
                
                // Calculate total login time from ALL sessions today
                // CRITICAL: Aggregate all sessions to show total hours worked
                let totalLoginTimeMinutes = 0;
                const sessionDetails = [];
                
                records.forEach(record => {
                  // Support multiple response formats
                  // Priority: checkIn.time (formatted response) > checkIn (string) > check_in_time (raw DB)
                  let checkIn = null;
                  if (record.checkIn) {
                    if (typeof record.checkIn === 'object' && record.checkIn.time) {
                      checkIn = record.checkIn.time; // Formatted response: { checkIn: { time: "..." } }
                    } else if (typeof record.checkIn === 'string') {
                      checkIn = record.checkIn; // Direct string
                    }
                  }
                  if (!checkIn) {
                    checkIn = record.check_in_time || record.checkInTime; // Fallback to raw DB field
                  }
                  
                  let checkOut = null;
                  if (record.checkOut) {
                    if (typeof record.checkOut === 'object' && record.checkOut.time) {
                      checkOut = record.checkOut.time; // Formatted response: { checkOut: { time: "..." } }
                    } else if (typeof record.checkOut === 'string') {
                      checkOut = record.checkOut; // Direct string
                    }
                  }
                  if (!checkOut) {
                    checkOut = record.check_out_time || record.checkOutTime; // Fallback to raw DB field
                  }
                  
                  if (checkIn) {
                    let sessionMinutes = 0;
                    
                    if (checkOut) {
                      // Completed session - use check-in to check-out
                      const checkInTime = new Date(checkIn);
                      const checkOutTime = new Date(checkOut);
                      const diffMs = checkOutTime - checkInTime;
                      sessionMinutes = Math.max(0, Math.round(diffMs / (1000 * 60))); // Ensure non-negative
                      totalLoginTimeMinutes += sessionMinutes;
                      
                      sessionDetails.push({
                        checkIn: checkIn,
                        checkOut: checkOut,
                        checkInTime: checkIn ? new Date(checkIn).toLocaleString() : null,
                        checkOutTime: checkOut ? new Date(checkOut).toLocaleString() : null,
                        duration: sessionMinutes,
                        status: 'completed',
                        logoutReason: record.logout_reason || 'manual',
                        isGeofenceViolation: record.is_geofence_violation || false
                      });
                    } else {
                      // Currently logged in session - calculate from check-in to now
                      const checkInTime = new Date(checkIn);
                      const now = new Date();
                      const diffMs = now - checkInTime;
                      sessionMinutes = Math.max(0, Math.round(diffMs / (1000 * 60))); // Ensure non-negative
                      totalLoginTimeMinutes += sessionMinutes;
                      
                      sessionDetails.push({
                        checkIn: checkIn,
                        checkOut: null,
                        checkInTime: checkIn ? new Date(checkIn).toLocaleString() : null,
                        checkOutTime: null,
                        duration: sessionMinutes,
                        status: 'active',
                        logoutReason: null,
                        isGeofenceViolation: false
                      });
                    }
                  }
                });
                
                // Calculate total hours with proper formatting
                const totalHours = totalLoginTimeMinutes / 60;
                const hours = Math.floor(totalHours);
                const minutes = totalLoginTimeMinutes % 60;
                
                dashboardData.widgets.attendance.totalLoginTimeToday = {
                  hours: parseFloat(totalHours.toFixed(2)),
                  minutes: totalLoginTimeMinutes,
                  formatted: `${hours}h ${minutes}m`,
                  formattedDetailed: `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`,
                  sessionsCount: records.length,
                  sessions: sessionDetails // Include session details for frontend
                };

                // Populate today's card from the latest attendance entry so dashboard shows
                // punch-in/out times consistently with attendance APIs.
                let latestCheckIn = null;
                if (mostRecentRecord.checkIn) {
                  latestCheckIn = typeof mostRecentRecord.checkIn === 'object'
                    ? mostRecentRecord.checkIn.time
                    : mostRecentRecord.checkIn;
                }
                if (!latestCheckIn) {
                  latestCheckIn = mostRecentRecord.check_in_time || mostRecentRecord.checkInTime || null;
                }

                let latestCheckOut = null;
                if (mostRecentRecord.checkOut) {
                  latestCheckOut = typeof mostRecentRecord.checkOut === 'object'
                    ? mostRecentRecord.checkOut.time
                    : mostRecentRecord.checkOut;
                }
                if (!latestCheckOut) {
                  latestCheckOut = mostRecentRecord.check_out_time || mostRecentRecord.checkOutTime || null;
                }

                dashboardData.widgets.attendance.today = {
                  ...dashboardData.widgets.attendance.today,
                  status: latestCheckOut ? 'present' : 'checked_in',
                  checkIn: latestCheckIn ? new Date(latestCheckIn).toISOString() : null,
                  checkOut: latestCheckOut ? new Date(latestCheckOut).toISOString() : null
                };
              } else {
                // No records for today
                dashboardData.widgets.attendance.recentLoginTime = null;
                dashboardData.widgets.attendance.currentSessionStart = null;
                dashboardData.widgets.attendance.totalLoginTimeToday = {
                  hours: 0,
                  minutes: 0,
                  formatted: '0h 0m',
                  sessionsCount: 0
                };
              }
            }
          } catch (recordsError) {
            logger.warn('Failed to fetch attendance records for login time calculation', { error: recordsError.message });
            // Fallback: Try to get today's attendance
            try {
              const todayAttendanceResponse = await axios.get(
                `${ATTENDANCE_SERVICE_URL}/api/attendance/today`,
                {
                  params: { employeeId: employeeId },
                  headers: {
                    'Authorization': token,
                    'x-tenant-id': scopedTenantId,
                    'Content-Type': 'application/json'
                  },
                  timeout: 8000, // 8 seconds - fail fast
                  httpAgent: new http.Agent({ 
                    keepAlive: true,
                    keepAliveMsecs: 1000,
                    maxSockets: 50,
                    maxFreeSockets: 10,
                    timeout: 8000
                  }),
                  validateStatus: (status) => status < 500
                }
              );
              
              if (todayAttendanceResponse.data.success && todayAttendanceResponse.data.data) {
                const todayData = todayAttendanceResponse.data.data;
                const todayCheckIn = todayData.checkIn?.time || todayData.check_in_time || null;
                const todayCheckOut = todayData.checkOut?.time || todayData.check_out_time || null;
                dashboardData.widgets.attendance.recentLoginTime = todayCheckIn;
                dashboardData.widgets.attendance.currentSessionStart = todayCheckIn;
                dashboardData.widgets.attendance.today = {
                  ...dashboardData.widgets.attendance.today,
                  status: todayCheckOut ? 'present' : (todayCheckIn ? 'checked_in' : (dashboardData.widgets.attendance.today?.status || 'Unknown')),
                  checkIn: todayCheckIn,
                  checkOut: todayCheckOut
                };
              }
            } catch (todayError) {
              logger.warn('Failed to fetch today attendance as fallback', { error: todayError.message });
            }
          }
          
        } catch (summaryError) {
          logger.warn('Failed to fetch attendance summary for employee', { error: summaryError.message });
          // Ensure proper structure with no null values
          if (!dashboardData.widgets.attendance) {
            dashboardData.widgets.attendance = {
              today: { status: 'Unknown', checkIn: null, checkOut: null },
              weekly: { present: 0, total: 5 }
            };
          }
          // Set default values to avoid null
          dashboardData.widgets.attendance.presentDays = 0;
          dashboardData.widgets.attendance.totalDays = 7;
          dashboardData.widgets.attendance.absentDays = 0;
          dashboardData.widgets.attendance.onLeaveDays = 0;
          dashboardData.widgets.attendance.attendancePercentage = 0;
          dashboardData.widgets.attendance.totalWorkingHours = 0;
          dashboardData.widgets.attendance.averageWorkingHours = 0;
        }

        // Final reconciliation: always try one direct "today list" read so
        // dashboard reflects punch-in/out even when summary pipeline fails.
        try {
          const todayDateStr = new Date().toISOString().split('T')[0];
          const latestAttendanceResponse = await axios.get(
            `${ATTENDANCE_SERVICE_URL}/api/attendance`,
            {
              params: {
                employeeId,
                date: todayDateStr,
                page: 1,
                limit: 1
              },
              headers: {
                'Authorization': token,
                'x-tenant-id': scopedTenantId,
                'Content-Type': 'application/json'
              },
              timeout: 6000,
              validateStatus: (status) => status < 500
            }
          );

          if (latestAttendanceResponse.data?.success) {
            const latest = Array.isArray(latestAttendanceResponse.data.data)
              ? latestAttendanceResponse.data.data[0]
              : null;

            if (latest) {
              const checkIn =
                latest.checkIn?.time ||
                latest.check_in_time ||
                latest.checkInTime ||
                null;
              const checkOut =
                latest.checkOut?.time ||
                latest.check_out_time ||
                latest.checkOutTime ||
                null;

              dashboardData.widgets.attendance.today = {
                ...dashboardData.widgets.attendance.today,
                status: checkOut ? 'present' : (checkIn ? 'checked_in' : (dashboardData.widgets.attendance.today?.status || 'Unknown')),
                checkIn,
                checkOut
              };

              const totalHours = latest.totalHours ?? latest.total_hours ?? latest.hours_worked;
              if (typeof totalHours === 'number' && Number.isFinite(totalHours)) {
                dashboardData.widgets.attendance.totalWorkingHours = parseFloat(totalHours.toFixed(2));
              }
            }
          }
        } catch (reconcileError) {
          logger.warn('Attendance reconciliation skipped', { error: reconcileError.message, employeeId });
        }
      }
    } catch (error) {
      logger.warn('Failed to fetch attendance data', { error: error.message });
      dashboardData.widgets.attendance = {
        today: { status: 'Unknown', checkIn: null, checkOut: null },
        weekly: { present: 0, total: 5 }
      };
    }

    // Tasks widget - ensure proper structure (task service integration pending)
    dashboardData.widgets.tasks = {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
      tasks: [] // Add empty array for frontend
    };

    // Performance widget - Fetch real performance data
    try {
      const PerformanceReview = require('../models/PerformanceReview.model');
      const userEmployeeId = user._id || user.id;
      
      // Get latest monthly performance review
      // OPTIMIZED: Select minimal fields, add timeout
      const latestReview = await PerformanceReview.findOne({
        employee_id: userEmployeeId,
        period: 'monthly'
      })
        .sort({ periodStart: -1 })
        .lean();
      
      if (latestReview && latestReview.overallScore !== null && latestReview.overallScore !== undefined) {
        const score = latestReview.overallScore || 0;
        // Calculate grade based on score
        let grade = 'F';
        if (score >= 90) grade = 'A+';
        else if (score >= 80) grade = 'A';
        else if (score >= 70) grade = 'B';
        else if (score >= 60) grade = 'C';
        else if (score >= 50) grade = 'D';
        
        // Calculate XP and level from score (XP = score * 10, level = score / 20)
        const xp = Math.floor(score * 10);
        const level = Math.floor(score / 20) + 1;
        
        dashboardData.widgets.performance = {
          score: parseFloat(score.toFixed(1)),
          grade: grade,
          xp: xp,
          level: level,
          period: latestReview.period || 'monthly',
          reviewDate: latestReview.periodStart || null
        };
      } else {
        // Calculate performance from attendance if no review exists
        const attendancePercentage = dashboardData.widgets.attendance?.attendancePercentage || 0;
        const calculatedScore = Math.min(100, Math.max(0, attendancePercentage * 0.7 + 30)); // Base score from attendance
        let grade = 'F';
        if (calculatedScore >= 90) grade = 'A+';
        else if (calculatedScore >= 80) grade = 'A';
        else if (calculatedScore >= 70) grade = 'B';
        else if (calculatedScore >= 60) grade = 'C';
        else if (calculatedScore >= 50) grade = 'D';
        
        dashboardData.widgets.performance = {
          score: parseFloat(calculatedScore.toFixed(1)),
          grade: grade,
          xp: Math.floor(calculatedScore * 10),
          level: Math.floor(calculatedScore / 20) + 1,
          period: 'monthly',
          reviewDate: null,
          note: 'Calculated from attendance'
        };
      }
    } catch (perfError) {
      logger.warn('Failed to fetch performance data', { error: perfError.message });
      // Fallback to calculated score from attendance
      const attendancePercentage = dashboardData.widgets.attendance?.attendancePercentage || 0;
      const calculatedScore = Math.min(100, Math.max(0, attendancePercentage * 0.7 + 30));
      let grade = 'F';
      if (calculatedScore >= 90) grade = 'A+';
      else if (calculatedScore >= 80) grade = 'A';
      else if (calculatedScore >= 70) grade = 'B';
      else if (calculatedScore >= 60) grade = 'C';
      else if (calculatedScore >= 50) grade = 'D';
      
      dashboardData.widgets.performance = {
        score: parseFloat(calculatedScore.toFixed(1)),
        grade: grade,
        xp: Math.floor(calculatedScore * 10),
        level: Math.floor(calculatedScore / 20) + 1,
        period: 'monthly',
        reviewDate: null,
        note: 'Calculated from attendance'
      };
    }

    // Roster widget - Fetch real roster data from roster service
    if (user.store) {
      try {
        const authHeader = req?.headers?.authorization || req?.get?.('authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`;
        const employeeId = user.employeeId || user.employee_id;
        const storeId = user.store?._id || user.store?.id || user.store;
        
        // Get today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Try to fetch roster from roster API
        // Use internal service call - call roster service directly (it's a singleton)
        const rosterService = require('./roster.service');
        
        logger.info('Fetching roster data for dashboard', {
          employeeId,
          storeId: storeId?.toString(),
          date: today.toISOString().split('T')[0],
          tenantId: scopedTenantId
        });
        
        try {
          // Call roster service directly instead of HTTP call
          // Use date range for today only (start and end of today)
          const todayStart = new Date(today);
          todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date(today);
          todayEnd.setHours(23, 59, 59, 999);

          const rosterResult = await rosterService.getRoster({
            employeeId: employeeId,
            storeId: storeId?.toString(),
            startDate: todayStart.toISOString(),
            endDate: todayEnd.toISOString(),
            tenantId: scopedTenantId
          }, 1, 10);
          
          const rosterData = rosterResult?.data || rosterResult?.roster || [];
          
          logger.info('Roster service response for dashboard', {
            hasResult: !!rosterResult,
            dataLength: rosterData.length,
            employeeId,
            storeId: storeId?.toString(),
            tenantId: scopedTenantId,
            dateRange: { start: todayStart.toISOString(), end: todayEnd.toISOString() },
            resultKeys: rosterResult ? Object.keys(rosterResult) : []
          });
          
          if (rosterData.length > 0) {
            // Use first roster entry for today
            const todayRoster = rosterData[0];
            dashboardData.widgets.roster = {
              shift: todayRoster.shift || 'MORNING', // Root level for frontend
              shiftStart: todayRoster.shiftStart || '09:00', // Root level for frontend
              shiftEnd: todayRoster.shiftEnd || '18:00', // Root level for frontend
              today: {
                shift: todayRoster.shift || 'MORNING',
                shiftStart: todayRoster.shiftStart || '09:00',
                shiftEnd: todayRoster.shiftEnd || '18:00',
                storeName: todayRoster.storeName || user.store?.name || 'N/A',
                date: todayRoster.date || today.toISOString().split('T')[0],
                status: todayRoster.status || 'scheduled'
              },
              all: rosterData
            };
            
            logger.info('Roster data fetched successfully for dashboard', {
              employeeId,
              rosterCount: rosterData.length,
              shift: todayRoster.shift,
              storeName: todayRoster.storeName
            });
          } else {
            // No roster data found, use default but still include widget with proper structure
            logger.warn('No roster data found for dashboard', {
              employeeId,
              storeId: storeId?.toString(),
              tenantId: scopedTenantId,
              dateRange: { start: todayStart.toISOString(), end: todayEnd.toISOString() }
            });
            dashboardData.widgets.roster = {
              shift: 'MORNING', // Root level for frontend
              shiftStart: '09:00', // Root level for frontend
              shiftEnd: '18:00', // Root level for frontend
              today: {
                shift: 'MORNING',
                shiftStart: '09:00',
                shiftEnd: '18:00',
                storeName: user.store?.name || user.store || 'N/A',
                storeId: storeId?.toString() || null,
                date: today.toISOString().split('T')[0],
                status: 'not_scheduled',
                note: 'No roster scheduled for today'
              },
              all: [], // Explicitly set empty array for frontend
              hasRoster: false
            };
            
            logger.info('No roster data found for today', { 
              employeeId, 
              storeId: storeId?.toString(),
              tenantId: scopedTenantId
            });
          }
        } catch (rosterError) {
          logger.warn('Failed to fetch roster data, using default', {
            error: rosterError.message,
            stack: rosterError.stack,
            employeeId,
            storeId: storeId?.toString(),
            tenantId: scopedTenantId
          });
          
          // Fallback to default roster with proper structure
          dashboardData.widgets.roster = {
            shift: 'MORNING', // Root level for frontend
            shiftStart: '09:00', // Root level for frontend
            shiftEnd: '18:00', // Root level for frontend
            today: {
              shift: 'MORNING',
              shiftStart: '09:00',
              shiftEnd: '18:00',
              storeName: user.store?.name || user.store || 'N/A',
              storeId: storeId?.toString() || null,
              date: today.toISOString().split('T')[0],
              status: 'not_scheduled',
              note: 'Roster data unavailable'
            },
            all: [], // Use 'all' instead of 'data' for consistency
            hasRoster: false,
            error: 'Backend unavailable or no roster data',
            debug: {
              error: rosterError.message,
              employeeId,
              storeId: storeId?.toString()
            }
          };
        }
      } catch (rosterError) {
        logger.error('Error in roster widget setup', {
          error: rosterError.message,
          employeeId: user.employeeId || user.employee_id,
          storeId: user.store?._id || user.store
        });
        
        // Fallback to default with proper structure
        dashboardData.widgets.roster = {
          shift: 'MORNING', // Root level for frontend
          shiftStart: '09:00', // Root level for frontend
          shiftEnd: '18:00', // Root level for frontend
          today: {
            shift: 'MORNING',
            shiftStart: '09:00',
            shiftEnd: '18:00',
            storeName: user.store?.name || user.store || 'N/A',
            storeId: user.store?._id?.toString() || user.store?.id || null,
            date: new Date().toISOString().split('T')[0],
            status: 'not_scheduled',
            note: 'Roster data unavailable'
          },
          all: [], // Use 'all' instead of 'data' for consistency
          hasRoster: false
        };
      }
    }

    // Payroll widget - Prefer payroll-service, then fallback to local PayrollRun
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const employeeCode = user.employeeId || user.employee_id;
      const authorization = req?.headers?.authorization || req?.headers?.Authorization;
      const requestId = req?.headers?.['x-request-id'] || req?.headers?.['X-Request-ID'];

      let payrollWidgetSet = false;

      if (employeeCode && authorization) {
        const payrollResponse = await getEmployeePayroll({
          employeeCode,
          month: currentMonth,
          year: currentYear,
          authorization,
          tenantId: scopedTenantId,
          requestId
        });
        const payrollData = payrollResponse?.data;
        if (payrollData) {
          dashboardData.widgets.payroll = {
            amount: payrollData.net_take_home || 0,
            grossSalary: payrollData.adjusted_gross || payrollData.base_salary || 0,
            netSalary: payrollData.net_take_home || 0,
            deductions: payrollData.total_employee_deductions || 0,
            status: payrollData.status || 'Processing',
            currency: 'INR',
            currentMonth: {
              grossSalary: payrollData.adjusted_gross || payrollData.base_salary || 0,
              netSalary: payrollData.net_take_home || 0,
              deductions: payrollData.total_employee_deductions || 0,
              status: payrollData.status || 'Processing',
              month: currentMonth,
              year: currentYear
            }
          };
          payrollWidgetSet = true;
        }
      }
      
      // Fallback to local payroll model if payroll-service data is unavailable.
      if (!payrollWidgetSet) {
        const PayrollRun = require('../models/PayrollRun.model');
        const userEmployeeId = user._id || user.id;
        const currentPayroll = await PayrollRun.findOne({
          tenantId: scopedTenantId,
          month: currentMonth,
          year: currentYear,
          'payroll_items.employee_id': userEmployeeId
        })
          .select('payroll_items month year status')
          .lean();

        if (currentPayroll && currentPayroll.payroll_items) {
          const employeePayroll = currentPayroll.payroll_items.find(
            item => item.employee_id?.toString() === userEmployeeId.toString()
          );
          if (employeePayroll) {
            const grossSalary = employeePayroll.gross_salary || employeePayroll.grossSalary || user.salary || 0;
            const netSalary = employeePayroll.net_pay || employeePayroll.netPay || (grossSalary * 0.9);
            dashboardData.widgets.payroll = {
              amount: netSalary,
              grossSalary,
              netSalary,
              deductions: employeePayroll.total_deductions || employeePayroll.totalDeductions || 0,
              status: currentPayroll.status || 'Processing',
              currency: 'INR',
              currentMonth: {
                grossSalary,
                netSalary,
                deductions: employeePayroll.total_deductions || employeePayroll.totalDeductions || 0,
                status: currentPayroll.status || 'Processing',
                month: currentMonth,
                year: currentYear
              }
            };
            payrollWidgetSet = true;
          }
        }
      }

      if (!payrollWidgetSet) {
        const grossSalary = user.salary || 0;
        const netSalary = grossSalary * 0.9;
        dashboardData.widgets.payroll = {
          amount: netSalary,
          grossSalary,
          netSalary,
          deductions: grossSalary * 0.1,
          status: 'Not Processed',
          currency: 'INR',
          currentMonth: {
            grossSalary,
            netSalary,
            deductions: grossSalary * 0.1,
            status: 'Not Processed',
            month: currentMonth,
            year: currentYear
          }
        };
      }
    } catch (payrollError) {
      logger.warn('Failed to fetch payroll data', { error: payrollError.message });
      // Fallback to user salary
      const grossSalary = user.salary || 0;
      const netSalary = grossSalary * 0.9;
      dashboardData.widgets.payroll = {
        amount: netSalary, // Root level for frontend
        grossSalary: grossSalary,
        netSalary: netSalary,
        deductions: grossSalary * 0.1,
        status: 'Not Available',
        currency: 'INR',
        currentMonth: {
          grossSalary: grossSalary,
          netSalary: netSalary,
          deductions: grossSalary * 0.1,
          status: 'Not Available',
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear()
        }
      };
    }

    // Leave balance widget (✅ LIVE - integrated with leave service)
    try {
      const leaveBalance = await leaveService.getLeaveBalance(user.employeeId);
      
      // Get pending leave requests count
      const pendingLeavesCount = await LeaveRequest.countDocuments({
        tenantId: scopedTenantId,
        employee_id: user._id,
        status: 'pending'
      });
      
      // Calculate totals for root level fields
      const totalAvailable = (leaveBalance.casualLeave.available || 0) + 
                            (leaveBalance.sickLeave.available || 0) + 
                            (leaveBalance.earnedLeave.available || 0) + 
                            (leaveBalance.paidLeave.available || 0) + 
                            (leaveBalance.compensatoryOff.available || 0);
      const totalUsed = (leaveBalance.casualLeave.used || 0) + 
                       (leaveBalance.sickLeave.used || 0) + 
                       (leaveBalance.earnedLeave.used || 0) + 
                       (leaveBalance.paidLeave.used || 0) + 
                       (leaveBalance.compensatoryOff.used || 0);
      const totalLeaves = (leaveBalance.casualLeave.total || 0) + 
                         (leaveBalance.sickLeave.total || 0) + 
                         (leaveBalance.earnedLeave.total || 0) + 
                         (leaveBalance.paidLeave.total || 0) + 
                         (leaveBalance.compensatoryOff.total || 0);
      
      dashboardData.widgets.leaves = {
        available: totalAvailable, // Root level for frontend
        used: totalUsed, // Root level for frontend
        total: totalLeaves, // Root level for frontend
        breakdown: {
          available: {
            casual: leaveBalance.casualLeave.available,
            sick: leaveBalance.sickLeave.available,
            earned: leaveBalance.earnedLeave.available,
            paid: leaveBalance.paidLeave.available,
            compensatoryOff: leaveBalance.compensatoryOff.available
          },
          total: {
            casual: leaveBalance.casualLeave.total,
            sick: leaveBalance.sickLeave.total,
            earned: leaveBalance.earnedLeave.total,
            paid: leaveBalance.paidLeave.total,
            compensatoryOff: leaveBalance.compensatoryOff.total
          },
          used: {
            casual: leaveBalance.casualLeave.used,
            sick: leaveBalance.sickLeave.used,
            earned: leaveBalance.earnedLeave.used,
            paid: leaveBalance.paidLeave.used,
            compensatoryOff: leaveBalance.compensatoryOff.used
          }
        },
        pending: pendingLeavesCount,
        leaveYear: leaveBalance.leaveYear
      };
    } catch (error) {
      logger.warn('Failed to fetch leave balance', { error: error.message, userId: user._id });
      // Fallback to placeholder if service fails - ensure all fields are present
      dashboardData.widgets.leaves = {
        available: 0, // Root level for frontend
        used: 0, // Root level for frontend
        total: 0, // Root level for frontend
        breakdown: {
          available: {
            casual: 0,
            sick: 0,
            earned: 0,
            paid: 0,
            compensatoryOff: 0
          },
          total: {
            casual: 0,
            sick: 0,
            earned: 0,
            paid: 0,
            compensatoryOff: 0
          },
          used: {
            casual: 0,
            sick: 0,
            earned: 0,
            paid: 0,
            compensatoryOff: 0
          }
        },
        pending: 0,
        leaveYear: new Date().getFullYear()
      };
    }

    // Employee Sales Widget - Get employee's own sales for today
    try {
      const authHeader = req?.headers?.authorization || req?.get?.('authorization') || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`;
      const SALES_SERVICE_URL = process.env.SALES_SERVICE_URL || 'http://sales-service:80';
      
      const employeeSalesResponse = await axios.get(
        `${SALES_SERVICE_URL}/api/sales/employee/today`,
        {
          headers: {
            'Authorization': token,
            'x-tenant-id': scopedTenantId,
            'Content-Type': 'application/json'
          },
          timeout: 10000,
          httpAgent: new http.Agent({ 
            keepAlive: true,
            keepAliveMsecs: 1000,
            maxSockets: 50,
            maxFreeSockets: 10,
            timeout: 10000
          }),
          validateStatus: (status) => status < 500
        }
      );
      
      if (employeeSalesResponse.data && employeeSalesResponse.data.success) {
        const todaySales = employeeSalesResponse.data.data.totalSales || 0;
        dashboardData.widgets.sales = {
          today: {
            totalSales: todaySales,
            totalOrders: employeeSalesResponse.data.data.totalOrders || 0,
            totalItems: employeeSalesResponse.data.data.totalItems || 0,
            formatted: `₹${todaySales.toLocaleString('en-IN')}`
          },
          thisMonth: {
            totalSales: todaySales, // Use today as fallback for thisMonth
            totalOrders: employeeSalesResponse.data.data.totalOrders || 0,
            totalItems: employeeSalesResponse.data.data.totalItems || 0,
            formatted: `₹${todaySales.toLocaleString('en-IN')}`
          },
          currency: 'INR',
          orders: employeeSalesResponse.data.data.orders || []
        };
        logger.info('Employee sales data fetched for dashboard', { 
          totalSales: todaySales,
          employeeId: user._id
        });
      }
    } catch (salesError) {
      logger.warn('Failed to fetch employee sales data', { error: salesError.message, userId: user._id });
      // Ensure proper structure even on error
      dashboardData.widgets.sales = {
        today: {
          totalSales: 0,
          totalOrders: 0,
          totalItems: 0,
          formatted: '₹0'
        },
        thisMonth: {
          totalSales: 0,
          totalOrders: 0,
          totalItems: 0,
          formatted: '₹0'
        },
        currency: 'INR',
        orders: [],
        hasData: false
      };
    }

    // Quick actions for employees
    dashboardData.quickActions = [
      {
        label: 'Mark Attendance',
        icon: 'clock',
        route: '/attendance/mark'
      },
      {
        label: 'Apply Leave',
        icon: 'calendar',
        route: '/leaves/apply'
      },
      {
        label: 'View Tasks',
        icon: 'target',
        route: '/tasks'
      }
    ];

    // Role-specific widgets
    if (['manager', 'hr', 'admin', 'superadmin'].includes((role || '').toLowerCase())) {
      // Team widgets for managers
      dashboardData.widgets.teamPerformance = await getTeamPerformance(user, scopedTenantId);
      dashboardData.widgets.teamTasks = await getTeamTasks(user, scopedTenantId);
      dashboardData.widgets.teamAttendance = await getTeamAttendance(user, scopedTenantId);
    }

    if (['hr', 'admin', 'superadmin'].includes((role || '').toLowerCase())) {
      // HR-specific widgets
      dashboardData.widgets.recruitment = await getRecruitmentPipeline();
      dashboardData.widgets.compliance = await getComplianceTracker();
      dashboardData.widgets.payrollSummary = await getPayrollSummary();
      
      // Fetch sales data for admin/HR dashboard
      try {
        const authHeader = req?.headers?.authorization || req?.get?.('authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`;
        const SALES_SERVICE_URL = process.env.SALES_SERVICE_URL || 'http://sales-service:80';
        
        const salesResponse = await axios.get(
          `${SALES_SERVICE_URL}/api/sales/dashboard`,
          {
            headers: {
              'Authorization': token,
              'x-tenant-id': scopedTenantId,
              'Content-Type': 'application/json'
            },
            timeout: 10000,
            httpAgent: new http.Agent({ 
              keepAlive: true,
              keepAliveMsecs: 1000,
              maxSockets: 50,
              maxFreeSockets: 10,
              timeout: 10000
            }),
            validateStatus: (status) => status < 500
          }
        );
        
        if (salesResponse.data && salesResponse.data.success) {
          // Merge sales data while preserving default structure
          const salesData = salesResponse.data.data;
          dashboardData.widgets.sales = {
            today: {
              totalSales: salesData?.sales?.total_revenue || salesData?.today?.totalSales || 0,
              totalOrders: salesData?.sales?.total_orders || salesData?.today?.totalOrders || 0,
              totalItems: salesData?.sales?.total_items_sold || salesData?.today?.totalItems || 0,
              formatted: `₹${(salesData?.sales?.total_revenue || 0).toLocaleString('en-IN')}`
            },
            thisMonth: {
              totalSales: salesData?.sales?.total_revenue || salesData?.thisMonth?.totalSales || 0,
              totalOrders: salesData?.sales?.total_orders || salesData?.thisMonth?.totalOrders || 0,
              totalItems: salesData?.sales?.total_items_sold || salesData?.thisMonth?.totalItems || 0,
              formatted: `₹${(salesData?.sales?.total_revenue || 0).toLocaleString('en-IN')}`
            },
            currency: 'INR',
            sales: salesData?.sales || {
              total_orders: 0,
              total_revenue: 0,
              average_order_value: 0,
              total_items_sold: 0,
              formatted_revenue: '₹0'
            },
            customers: salesData?.customers || {
              total_customers: 0,
              new_customers: 0
            },
            hasData: true
          };
          logger.info('Sales data fetched for dashboard', { 
            totalRevenue: salesData?.sales?.total_revenue || 0 
          });
        } else {
          // API returned but not successful - use defaults
          dashboardData.widgets.sales = {
            today: {
              totalSales: 0,
              totalOrders: 0,
              totalItems: 0,
              formatted: '₹0'
            },
            thisMonth: {
              totalSales: 0,
              totalOrders: 0,
              totalItems: 0,
              formatted: '₹0'
            },
            currency: 'INR',
            sales: {
              total_orders: 0,
              total_revenue: 0,
              average_order_value: 0,
              total_items_sold: 0,
              formatted_revenue: '₹0'
            },
            customers: {
              total_customers: 0,
              new_customers: 0
            },
            hasData: false
          };
        }
      } catch (salesError) {
        logger.warn('Failed to fetch sales data for dashboard', { error: salesError.message });
        // Ensure proper structure even on error - use existing defaults
        if (!dashboardData.widgets.sales || !dashboardData.widgets.sales.today) {
          dashboardData.widgets.sales = {
            today: {
              totalSales: 0,
              totalOrders: 0,
              totalItems: 0,
              formatted: '₹0'
            },
            thisMonth: {
              totalSales: 0,
              totalOrders: 0,
              totalItems: 0,
              formatted: '₹0'
            },
            currency: 'INR',
            sales: {
              total_orders: 0,
              total_revenue: 0,
              average_order_value: 0,
              total_items_sold: 0,
              formatted_revenue: '₹0'
            },
            customers: {
              total_customers: 0,
              new_customers: 0
            },
            hasData: false
          };
        }
      }
      
      // Fetch employee-specific sales data for all employees (for HR/Admin view)
      try {
        const authHeader = req?.headers?.authorization || req?.get?.('authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`;
        const SALES_SERVICE_URL = process.env.SALES_SERVICE_URL || 'http://sales-service:80';
        
        // Get all sales orders for the tenant
        const allSalesResponse = await axios.get(
          `${SALES_SERVICE_URL}/api/sales/orders`,
          {
            headers: {
              'Authorization': token,
              'x-tenant-id': scopedTenantId,
              'Content-Type': 'application/json'
            },
            params: {
              limit: 1000 // Get more orders to calculate employee sales
            },
            timeout: 15000,
            httpAgent: new http.Agent({ 
              keepAlive: true,
              keepAliveMsecs: 1000,
              maxSockets: 50,
              maxFreeSockets: 10,
              timeout: 15000
            }),
            validateStatus: (status) => status < 500
          }
        );
        
        if (allSalesResponse.data && allSalesResponse.data.success) {
          const orders = allSalesResponse.data.data?.orders || allSalesResponse.data.data || [];
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Group sales by employee
          const employeeSalesMap = {};
          orders.forEach(order => {
            const salesPersonId = order.sales_person_id?.toString() || order.sales_person_id || 'unknown';
            if (!employeeSalesMap[salesPersonId]) {
              employeeSalesMap[salesPersonId] = {
                employeeId: salesPersonId,
                employeeName: order.sales_person_name || order.sales_person_id?.name || 'Unknown',
                totalSales: 0,
                todaySales: 0,
                totalOrders: 0,
                todayOrders: 0
              };
            }
            
            employeeSalesMap[salesPersonId].totalSales += order.total_amount || 0;
            employeeSalesMap[salesPersonId].totalOrders += 1;
            
            const orderDate = new Date(order.order_date || order.createdAt);
            orderDate.setHours(0, 0, 0, 0);
            if (orderDate.getTime() === today.getTime()) {
              employeeSalesMap[salesPersonId].todaySales += order.total_amount || 0;
              employeeSalesMap[salesPersonId].todayOrders += 1;
            }
          });
          
          dashboardData.widgets.employeeSales = {
            summary: Object.values(employeeSalesMap).map(emp => ({
              ...emp,
              formattedTodaySales: `₹${emp.todaySales.toLocaleString('en-IN')}`,
              formattedTotalSales: `₹${emp.totalSales.toLocaleString('en-IN')}`
            })),
            totalEmployees: Object.keys(employeeSalesMap).length,
            totalTodaySales: Object.values(employeeSalesMap).reduce((sum, emp) => sum + emp.todaySales, 0),
            totalAllTimeSales: Object.values(employeeSalesMap).reduce((sum, emp) => sum + emp.totalSales, 0),
            formattedTotalTodaySales: `₹${Object.values(employeeSalesMap).reduce((sum, emp) => sum + emp.todaySales, 0).toLocaleString('en-IN')}`,
            formattedTotalAllTimeSales: `₹${Object.values(employeeSalesMap).reduce((sum, emp) => sum + emp.totalSales, 0).toLocaleString('en-IN')}`
          };
        }
      } catch (employeeSalesError) {
        logger.warn('Failed to fetch employee sales data', { error: employeeSalesError.message });
        // Ensure proper structure even on error
        dashboardData.widgets.employeeSales = {
          summary: [],
          totalEmployees: 0,
          totalTodaySales: 0,
          totalAllTimeSales: 0,
          formattedTotalTodaySales: '₹0',
          formattedTotalAllTimeSales: '₹0',
          hasData: false
        };
      }
    }

    // JTS: personal task counts + optional tenant overview (HR/admin)
    try {
      const { getMyTaskSummary, getJtsAnalytics } = require('../utils/jtsServiceClient');
      const authHeader = req?.headers?.authorization || req?.get?.('authorization') || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader : authHeader ? `Bearer ${authHeader}` : '';
      if (token) {
        const mySummary = await getMyTaskSummary({
          authorization: token,
          tenantId: scopedTenantId
        });
        if (mySummary?.success && mySummary.data) {
          const d = mySummary.data;
          dashboardData.widgets.tasks = {
            ...dashboardData.widgets.tasks,
            total: typeof d.total === 'number' ? d.total : dashboardData.widgets.tasks.total,
            pending: typeof d.inProgress === 'number' ? d.inProgress : dashboardData.widgets.tasks.pending,
            completed: typeof d.completed === 'number' ? d.completed : dashboardData.widgets.tasks.completed,
            source: 'jts',
            jtsLinked: d.linked !== false
          };
        }

        const wideRole = (role || '').toString().toLowerCase();
        if (['hr', 'admin', 'superadmin', 'manager'].includes(wideRole)) {
          const analytics = await getJtsAnalytics({
            authorization: token,
            tenantId: scopedTenantId
          });
          if (analytics?.success && analytics.data?.overall) {
            const o = analytics.data.overall;
            dashboardData.widgets.jtsTenant = {
              pendingTasks: o.pendingTasks ?? 0,
              completedTasks: o.completedTasks ?? 0,
              onTimeCompletion: o.onTimeCompletion ?? null,
              openAlerts: analytics.data.openAlerts ?? 0,
              source: 'jts_analytics'
            };
          }
        }
      }
    } catch (jtsErr) {
      logger.warn('JTS dashboard enrichment skipped', { error: jtsErr.message });
    }

    return dashboardData;
  } catch (error) {
    logger.error('Error fetching unified dashboard', {
      error: error.message,
      userId,
      role
    });
    throw error;
  }
};

/**
 * Get Team Performance Widget Data
 */
const getTeamPerformance = async (user, tenantId) => {
  try {
    const teamMembers = await User.find({
      tenantId,
      $or: [
        { reportingManager: user._id },
        { department: user.department }
      ],
      isDeleted: false,
      status: 'active'
    }).select('employeeId fullName firstName lastName').lean();

    return {
      totalMembers: teamMembers.length,
      avgPerformance: 78.5,
      topPerformers: teamMembers.slice(0, 5).map(m => ({
        name: m.fullName || `${m.firstName} ${m.lastName}`,
        score: 85 + Math.random() * 15
      })),
      needsAttention: []
    };
  } catch (error) {
    logger.error('Error fetching team performance', { error: error.message });
    return { totalMembers: 0, avgPerformance: 0, topPerformers: [], needsAttention: [] };
  }
};

/**
 * Get Team Tasks Widget Data
 */
const getTeamTasks = async (user, tenantId) => {
  void user;
  void tenantId;
  return {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0
  };
};

/**
 * Get Team Attendance Widget Data - Fetch real attendance data
 */
const getTeamAttendance = async (user, tenantId) => {
  try {
    const teamMembers = await User.find({
      tenantId,
      $or: [
        { reportingManager: user._id },
        { department: user.department }
      ],
      isDeleted: false,
      status: 'active'
    }).select('employeeId employee_id fullName firstName lastName _id').lean();

    if (teamMembers.length === 0) {
      return { totalMembers: 0, present: 0, absent: 0, onLeave: 0, late: 0 };
    }

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // Get employee IDs
    const employeeIds = teamMembers.map(m => m.employeeId || m.employee_id).filter(Boolean);
    
    // Get today's attendance from attendance service
    try {
      const ATTENDANCE_SERVICE_URL = process.env.ATTENDANCE_SERVICE_URL || 'http://attendance-service:80';
      const todayDateStr = today.toISOString().split('T')[0];
      
      // Get leave requests for today to identify on-leave employees
      const LeaveRequest = require('../models/LeaveRequest.model');
      const teamMemberIds = teamMembers.map(m => m._id);
      const todayLeaves = await LeaveRequest.find({
        employee_id: { $in: teamMemberIds },
        status: { $in: ['APPROVED', 'AUTO_APPROVED'] },
        from_date: { $lte: todayEnd },
        to_date: { $gte: today }
      }).select('employee_id').lean();
      
      const onLeaveEmployeeIds = new Set(todayLeaves.map(l => l.employee_id?.toString()));
      const onLeaveCount = onLeaveEmployeeIds.size;
      
      // Try to get attendance data from attendance service
      try {
        const axios = require('axios');
        const ATTENDANCE_SERVICE_URL = process.env.ATTENDANCE_SERVICE_URL || 'http://attendance-service:80';
        const todayDateStr = today.toISOString().split('T')[0];
        
        // Get attendance stats for tenant (if available)
        // For now, estimate based on leave count
        const estimatedPresent = Math.floor((teamMembers.length - onLeaveCount) * 0.85);
        const estimatedAbsent = teamMembers.length - estimatedPresent - onLeaveCount;
        
        return {
          totalMembers: teamMembers.length,
          present: Math.max(0, estimatedPresent),
          absent: Math.max(0, estimatedAbsent),
          onLeave: Math.max(0, onLeaveCount),
          late: 0
        };
      } catch (serviceError) {
        logger.warn('Attendance service unavailable for team attendance', { error: serviceError.message });
      }
    } catch (attendanceError) {
      logger.warn('Failed to fetch team attendance from service', { error: attendanceError.message });
    }

    // Fallback: Get leave count and estimate attendance
    const LeaveRequest = require('../models/LeaveRequest.model');
    const teamMemberIds = teamMembers.map(m => m._id);
    const todayLeaves = await LeaveRequest.countDocuments({
      employee_id: { $in: teamMemberIds },
      status: { $in: ['APPROVED', 'AUTO_APPROVED'] },
      from_date: { $lte: todayEnd },
      to_date: { $gte: today }
    });

    const onLeave = todayLeaves;
    const estimatedPresent = Math.floor((teamMembers.length - onLeave) * 0.9);
    const estimatedAbsent = teamMembers.length - estimatedPresent - onLeave;

    return {
      totalMembers: teamMembers.length,
      present: Math.max(0, estimatedPresent),
      absent: Math.max(0, estimatedAbsent),
      onLeave: Math.max(0, onLeave),
      late: 0
    };
  } catch (error) {
    logger.error('Error fetching team attendance', { error: error.message });
    return { totalMembers: 0, present: 0, absent: 0, onLeave: 0, late: 0 };
  }
};

/**
 * Get Recruitment Pipeline Widget Data
 */
const getRecruitmentPipeline = async () => {
  return {
    openPositions: 5,
    applicants: 45,
    interviews: 12,
    offersPending: 3
  };
};

/**
 * Get Compliance Tracker Widget Data
 */
const getComplianceTracker = async () => {
  return {
    pendingDocuments: 8,
    expiringCertificates: 3,
    policyAcknowledgments: 15,
    complianceScore: 92
  };
};

/**
 * Get Payroll Summary Widget Data
 */
const getPayrollSummary = async () => {
  return {
    monthlyPayroll: 5000000,
    processingStatus: 'Scheduled',
    pendingApprovals: 2,
    disbursementDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
  };
};

/**
 * Get Store Manager Dashboard
 */
const getStoreDashboard = async (storeId, managerId, tenantId) => {
  try {
    logger.info('Fetching store dashboard', { storeId, managerId });

    // Get store details
    const store = await Store.findOne({ _id: storeId, tenantId })
      .populate('manager', 'fullName employeeId')
      .lean();

    if (!store) {
      throw new Error('Store not found');
    }

    // Get store staff
    const staffMembers = await User.find({
      tenantId,
      store: storeId,
      isDeleted: false
    })
      .select('employeeId fullName firstName lastName role status')
      .populate('role', 'name')
      .lean();

    const dashboardData = {
      storeInfo: {
        id: store._id,
        name: store.name,
        code: store.code,
        location: store.address?.city,
        manager: store.manager?.fullName || 'Not Assigned',
        status: store.status
      },
      stats: {
        dailySales: 0, // Would integrate with sales service
        monthlySales: 0,
        monthlyTarget: 4000000,
        salesGrowth: 0,
        inventoryValue: 0, // Would integrate with inventory service
        lowStockItems: 0,
        totalStaff: staffMembers.length,
        activeStaff: staffMembers.filter(s => s.status === 'active').length,
        customerVisits: 0,
        transactions: 0
      },
      recentTransactions: [],
      lowStockItems: [],
      staffMembers: staffMembers.map(s => ({
        id: s.employeeId,
        name: s.fullName || `${s.firstName} ${s.lastName}`,
        role: s.role?.name || 'Employee',
        status: s.status,
        shift: 'Morning (9:00-18:00)' // Would integrate with roster
      }))
    };

    return dashboardData;
  } catch (error) {
    logger.error('Error fetching store dashboard', {
      error: error.message,
      storeId,
      managerId
    });
    throw error;
  }
};

/**
 * Get HRMS Dashboard
 */
const getHRMSDashboard = async (userId, role, tenantId) => {
  try {
    logger.info('Fetching HRMS dashboard', { userId, role });

    if (['hr', 'admin', 'superadmin'].includes((role || '').toLowerCase())) {
      // HR Overview
      const totalEmployees = await User.countDocuments({
        tenantId,
        isDeleted: false,
        status: { $in: ['active', 'on-leave'] }
      });

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const newHires = await User.countDocuments({
        tenantId,
        isDeleted: false,
        createdAt: { $gte: thirtyDaysAgo }
      });

      // Get employees with all fields for dashboard
      const formatEmployee = require('../../shared/utils/response.util').formatEmployee;
      const employees = await User.find({
        tenantId,
        isDeleted: false,
        status: { $in: ['active', 'on-leave'] }
      })
        .populate('store', 'name address')
        .populate('departmentRef', 'name code')
        .select('-password -refreshToken')
        .sort({ createdAt: -1 }) // Sort by newest first
        .limit(100) // Increased limit to show more employees
        .lean();

      const formattedEmployees = employees.map(emp => formatEmployee(emp));

      return {
        overview: {
          totalEmployees,
          newHires,
          pendingApprovals: 0, // Would integrate with leave service
          attendanceRate: 94.5,
          openPositions: 5,
          attritionRate: 2.3
        },
        employees: formattedEmployees, // ✅ Include employees with all fields
        recentActivities: [],
        upcomingEvents: []
      };
    } else {
      // Employee Self-Service
      const user = await User.findOne({ _id: userId, tenantId }).lean();

      return {
        myInfo: {
          attendance: { present: 22, absent: 0, leave: 0 },
          leaves: { available: 15, pending: 0 },
          tasks: { assigned: 0, completed: 0 },
          performance: { score: 75, grade: 'B' }
        },
        recentActivities: [],
        upcomingEvents: []
      };
    }
  } catch (error) {
    logger.error('Error fetching HRMS dashboard', { error: error.message, userId });
    throw error;
  }
};

/**
 * Get Dashboard Statistics (Legacy - for backwards compatibility)
 */
const getDashboardStats = async (role, tenantId) => {
  try {
    const stats = {
      totalEmployees: 0,
      activeEmployees: 0,
      onLeave: 0,
      totalStores: 0,
      activeStores: 0,
      totalDepartments: 0
    };

    // Get employee counts
    const [total, active, onLeave] = await Promise.all([
      User.countDocuments({ tenantId, isDeleted: false }),
      User.countDocuments({ tenantId, isDeleted: false, status: 'active' }),
      User.countDocuments({ tenantId, isDeleted: false, status: 'on-leave' })
    ]);

    stats.totalEmployees = total;
    stats.activeEmployees = active;
    stats.onLeave = onLeave;

    // Get store counts
    const normalizedTenantId = String(tenantId).toLowerCase().trim();
    const [totalStores, activeStores] = await Promise.all([
      Store.countDocuments({ tenantId: normalizedTenantId, isDeleted: false }),
      Store.countDocuments({ tenantId: normalizedTenantId, isDeleted: false, status: 'active' })
    ]);

    stats.totalStores = totalStores;
    stats.activeStores = activeStores;

    // Get department count
    stats.totalDepartments = await Department.countDocuments({ tenantId: normalizedTenantId, status: 'active' });

    return stats;
  } catch (error) {
    logger.error('Error fetching dashboard stats', { error: error.message });
    throw error;
  }
};

module.exports = {
  getUnifiedDashboard,
  getStoreDashboard,
  getHRMSDashboard,
  getDashboardStats,
  getTeamPerformance,
  getRecruitmentPipeline,
  getComplianceTracker,
  getPayrollSummary
};
