const Attendance = require('../models/Attendance.model');
const Store = require('../models/Store.model');
const { isWithinGeofence } = require('../utils/geoUtils');
const logger = require('../config/logger');
const { logAttendanceEvent } = require('../utils/audit'); // Changed from recordAuditLog
const { getEmployeeByUser, getEmployeeStore } = require('../utils/hrServiceClient');
const { computeShiftMetadata, getMinimumHoursForPresent } = require('../utils/rosterShift.utils');

const parseCoordinateValue = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveStoreCoordinates = (store) => {
  const latitude = parseCoordinateValue(store?.coordinates?.latitude ?? store?.latitude);
  const longitude = parseCoordinateValue(store?.coordinates?.longitude ?? store?.longitude);
  return { latitude, longitude };
};

const resolveGeofenceRadiusMeters = (rawRadius) => {
  const parsedRadius = Number.parseFloat(rawRadius);
  if (!Number.isFinite(parsedRadius) || parsedRadius <= 0) {
    return 200;
  }
  // Some prod configs keep radius in km (e.g., 0.2). Convert small decimal values to meters.
  if (parsedRadius > 0 && parsedRadius <= 10) {
    return Math.round(parsedRadius * 1000);
  }
  return parsedRadius;
};

const isRosterEnforcementActive = () => {
  // Emergency / rollout: set ROSTER_ENFORCEMENT_ENABLED=false to allow clock-in when
  // today's roster is missing (staff still use assigned store + geofence).
  const enabledFlag = String(process.env.ROSTER_ENFORCEMENT_ENABLED ?? '').toLowerCase().trim();
  if (enabledFlag === 'false' || enabledFlag === '0' || enabledFlag === 'no') {
    return false;
  }
  // Default rollout date requested: start strict roster enforcement from next day.
  // Can be overridden via env without code changes.
  const startDateStr = process.env.ROSTER_ENFORCEMENT_START_DATE || '2026-04-02';
  const startDate = new Date(`${startDateStr}T00:00:00.000Z`);
  if (Number.isNaN(startDate.getTime())) {
    return false;
  }
  return Date.now() >= startDate.getTime();
};

const getEmployeeAttendanceConfig = (employee = {}, jwtUser = {}) => {
  const workMode = String(employee.workMode || '').toUpperCase().trim() || 'STORE_BOUND';
  const attendancePolicy =
    String(employee.attendancePolicy || '').toUpperCase().trim() || 'STRICT_GEOFENCE';
  const workLocationStoreId = String(employee?.workLocation?.storeId || '')
    .toLowerCase()
    .trim();

  const isNonStoreBound =
    attendancePolicy === 'NO_GEOFENCE' ||
    workMode === 'BACKOFFICE' ||
    workMode === 'ROAMING' ||
    workLocationStoreId === 'backoffice' ||
    workLocationStoreId === 'office';

  const virtualStoreCode =
    workMode === 'BACKOFFICE' || workLocationStoreId === 'backoffice'
      ? 'BACKOFFICE'
      : workMode === 'ROAMING'
        ? 'ROAMING'
        : 'OFFICE';

  // Managers / HQ roles: allow clock-in without real GPS + skip heavy anti-spoof stack (browser/camera issues).
  // Set ATTENDANCE_OPTIONAL_GPS_ROLES="" to disable. Comma-separated role names (match JWT/HR role, case-insensitive).
  const optionalGpsRoles = String(process.env.ATTENDANCE_OPTIONAL_GPS_ROLES ?? 'MANAGER')
    .split(',')
    .map((r) => r.trim().toUpperCase())
    .filter(Boolean);
  const roleStr = String(employee.role || jwtUser.role || '').toUpperCase().trim();
  const roleAllowsOptionalGps = optionalGpsRoles.length > 0 && optionalGpsRoles.includes(roleStr);

  const relaxLocationForClockIn = isNonStoreBound || roleAllowsOptionalGps;

  return {
    workMode,
    attendancePolicy,
    isNonStoreBound,
    virtualStoreCode,
    relaxLocationForClockIn,
    roleAllowsOptionalGps
  };
};

/** YYYY-MM-DD in business timezone (default Asia/Kolkata) — matches HR roster `date` filter */
function getBusinessCalendarYmd() {
  const tz = process.env.ATTENDANCE_BUSINESS_TZ || 'Asia/Kolkata';
  return new Date().toLocaleDateString('en-CA', { timeZone: tz });
}

/** Interpret roster HH:MM on a calendar day in business TZ (IST = +05:30) */
function wallTimeToDate(ymd, hhmm) {
  const [h, m] = String(hhmm).split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return new Date(
    `${ymd}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+05:30`
  );
}

function addOneDayYmd(ymd) {
  const d = new Date(`${ymd}T12:00:00+05:30`);
  d.setTime(d.getTime() + 24 * 60 * 60 * 1000);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function rosterRowsFromHrAxiosResponse(rosterResponse) {
  const payload = rosterResponse?.data?.data;
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.roster)) return payload.roster;
  if (Array.isArray(rosterResponse?.data?.roster)) return rosterResponse.data.roster;
  return [];
}

/**
 * Calculate and push sales to Admin/HR dashboard
 * Called automatically on clock-out (manual or auto)
 * @param {string} employeeMongoId - Employee MongoDB _id
 * @param {string} employeeIdString - Employee ID string (e.g., EMP-2026-xxx)
 * @param {string} token - JWT token for API calls
 */
const calculateAndPushSalesToDashboard = async (employeeMongoId, employeeIdString, token = null) => {
  try {
    const axios = require('axios');
    const SALES_SERVICE_URL = process.env.SALES_SERVICE_URL || 'http://sales-service:80';
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Call sales service to get employee's today sales
    const salesResponse = await axios.get(
      `${SALES_SERVICE_URL}/api/sales/employee/today`,
      {
        headers: {
          'Authorization': token || '',
          'Content-Type': 'application/json'
        },
        timeout: 5000,
        validateStatus: (status) => status < 500
      }
    );
    
    if (salesResponse.data && salesResponse.data.success) {
      const salesData = salesResponse.data.data;
      
      logger.info('Sales auto-calculated and pushed to dashboard on clock-out', {
        employeeId: employeeIdString,
        totalSales: salesData.totalSales,
        totalOrders: salesData.totalOrders,
        date: today.toISOString().split('T')[0]
      });
      
      // Sales data is automatically available in dashboard
      // Dashboard service fetches it from sales service
      return {
        success: true,
        totalSales: salesData.totalSales,
        totalOrders: salesData.totalOrders,
        totalItems: salesData.totalItems
      };
    }
    
    return { success: false, message: 'Sales service returned no data' };
  } catch (error) {
    logger.warn('Failed to calculate/push sales to dashboard', { 
      error: error.message,
      employeeId: employeeIdString 
    });
    // Return success: false but don't throw - clock-out should still succeed
    return { success: false, error: error.message };
  }
};

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
    const employee = await getEmployeeByUser(user, token);

    // Create employee user object for store lookup
    const employeeUser = {
      ...user,
      _id: employee._id || employee.id,
      id: employee._id || employee.id,
      employee_id: employee.employeeId || employee.employee_id,
      employeeId: employee.employeeId || employee.employee_id,
      email: employee.email || user.email
    };

    const attendanceConfig = getEmployeeAttendanceConfig(employee, user);
    const strictRosterEnforcement =
      !attendanceConfig.isNonStoreBound &&
      !attendanceConfig.roleAllowsOptionalGps &&
      isRosterEnforcementActive();

    // CRITICAL: Get store from ROSTER first (employee is bound to roster store)
    // This ensures employee can only mark attendance at the store assigned in roster
    let store = null;
    let rosterStore = null;
    const tenantId = user.tenantId || employee.tenantId || employee.tenant_id || 'default';
    const employeeIdString = employee.employeeId || employee.employee_id;
    const todayDateStr = getBusinessCalendarYmd();
    
    if (!attendanceConfig.isNonStoreBound) {
      try {
      const axios = require('axios');
      const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';
      
      // Get admin token for roster lookup
      let rosterToken = token;
      try {
        const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:80';
        const normalizedTenantId = tenantId.toLowerCase().trim();
        let ADMIN_EMAIL = process.env[`${normalizedTenantId.toUpperCase()}_ADMIN_EMAIL`] || process.env.ADMIN_EMAIL;
        let ADMIN_PASSWORD = process.env[`${normalizedTenantId.toUpperCase()}_ADMIN_PASSWORD`] || process.env.ADMIN_PASSWORD;
        
        if (!ADMIN_EMAIL) {
          if (normalizedTenantId === 'eyekra') {
            ADMIN_EMAIL = 'admin@eyekra.com';
            ADMIN_PASSWORD = ADMIN_PASSWORD || 'Eyekra@Admin2026!';
          } else if (normalizedTenantId === 'upcapto') {
            ADMIN_EMAIL = 'admin@upcapto.com';
            ADMIN_PASSWORD = ADMIN_PASSWORD || 'Upcapto@2026';
          } else {
            ADMIN_EMAIL = 'admin@lenstrack.com';
            ADMIN_PASSWORD = ADMIN_PASSWORD || 'AdminPass123!';
          }
        }
        
        const adminLoginResponse = await axios.post(`${AUTH_SERVICE_URL}/api/auth/login`, {
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD
        }, {
          headers: { 
            'Content-Type': 'application/json',
            'x-tenant-id': normalizedTenantId
          },
          timeout: 2000
        });
        
        if (adminLoginResponse.data && 
            (adminLoginResponse.data.data?.accessToken || adminLoginResponse.data.accessToken)) {
          rosterToken = adminLoginResponse.data.data?.accessToken || adminLoginResponse.data.accessToken;
        }
      } catch (adminTokenError) {
        // Continue with employee token
      }
      
      // Get roster for today to get assigned store
      const rosterResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/roster`, {
        params: {
          employeeId: employeeIdString,
          date: todayDateStr,
          limit: 1
        },
        headers: {
          Authorization: `Bearer ${rosterToken}`,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json'
        },
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      
      if (rosterResponse.data && rosterResponse.data.success) {
        const rosterData = rosterRowsFromHrAxiosResponse(rosterResponse);
        const todayRoster = rosterData[0];
        
        if (todayRoster && todayRoster.storeId) {
          rosterStore = todayRoster;
          logger.info('Roster found for today - employee bound to roster store', {
            employeeId: employeeIdString,
            rosterStoreId: todayRoster.storeId,
            rosterStoreName: todayRoster.storeName,
            date: todayDateStr
          });
          
          // Fetch the store from roster's storeId
          try {
            const storeResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/stores/${todayRoster.storeId}`, {
              headers: {
                Authorization: `Bearer ${rosterToken}`,
                'x-tenant-id': tenantId,
                'Content-Type': 'application/json'
              },
              timeout: 5000,
              validateStatus: (status) => status < 500
            });
            
            if (storeResponse.data && storeResponse.data.success && storeResponse.data.data) {
              store = storeResponse.data.data;
              logger.info('Store fetched from roster', {
                rosterStoreId: todayRoster.storeId,
                storeId: store._id.toString(),
                storeName: store.name,
                storeCode: store.code
              });
            }
          } catch (storeError) {
            logger.warn('Failed to fetch store from roster storeId', {
              error: storeError.message,
              rosterStoreId: todayRoster.storeId
            });
          }
        }
      }
      } catch (rosterError) {
        logger.warn('Failed to get roster for store validation', {
          error: rosterError.message,
          employeeId: employeeIdString
        });
      }
    
      // Strict mode (from configured date): block clock-in if no roster store is mapped for today
      if (strictRosterEnforcement && !rosterStore) {
        const error = new Error('Clock-in is allowed only as per today\'s roster assignment. No roster store is assigned for today.');
        error.statusCode = 403;
        logger.warn('Clock-in blocked: strict roster enforcement enabled but no roster store found', {
          employeeId: employeeIdString,
          tenantId,
          todayDateStr
        });
        throw error;
      }

      // Fallback: If no roster store found (only in pre-enforcement mode), use employee's assigned store
      if (!store) {
        logger.info('No roster found for today, using employee assigned store', {
          employeeId: employeeIdString,
          strictRosterEnforcement
        });
        store = await getEmployeeStore(employeeUser, token);
      
      // If store not found, try to get it from employee object directly
      if (!store && employee.store) {
        if (typeof employee.store === 'object' && (employee.store._id || employee.store.id)) {
          store = employee.store;
          logger.info('Using store from employee object', { storeId: store._id || store.id });
        } else if (typeof employee.store === 'string') {
          // Store is just an ID, fetch it
          try {
            const axios = require('axios');
            const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';
            const employeeTenantId = (employee.tenantId || employee.tenant_id || user.tenantId || 'default');
            const storeResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/stores/${employee.store}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                'x-tenant-id': employeeTenantId,
                'Content-Type': 'application/json'
              },
              timeout: 5000
            });
            if (storeResponse.data && storeResponse.data.success && storeResponse.data.data) {
              store = storeResponse.data.data;
              logger.info('Fetched store by ID', { storeId: store._id || store.id });
            }
          } catch (storeError) {
            logger.warn('Failed to fetch store by ID', { error: storeError.message });
          }
        }
      }
      }
    }

    if (!store && attendanceConfig.relaxLocationForClockIn) {
      try {
        const axios = require('axios');
        const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';
        const fallbackStoreResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/stores`, {
          params: { page: 1, limit: 1 },
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });
        const storesPayload = fallbackStoreResponse?.data?.data;
        const stores = Array.isArray(storesPayload)
          ? storesPayload
          : storesPayload?.stores || [];
        if (stores.length > 0) {
          store = stores[0];
        }
      } catch (fallbackError) {
        logger.warn('No fallback store could be resolved for relaxed-attendance employee', {
          employeeId: employeeIdString,
          error: fallbackError.message
        });
      }
    }
    
    if (!store) {
      const error = new Error('Employee is not assigned to a store in this tenant. Please contact HR.');
      error.statusCode = 400;
      throw error;
    }
    
    // CRITICAL: If roster exists, validate that employee is checking in at the roster store location
    if (!attendanceConfig.relaxLocationForClockIn && rosterStore && rosterStore.storeId) {
      const rosterStoreId = rosterStore.storeId;
      const currentStoreId = store.code || store.store_id || store._id.toString();
      
      // Compare store IDs (handle both ObjectId and code formats)
      const rosterStoreIdStr = rosterStoreId.toString();
      const currentStoreIdStr = currentStoreId.toString();
      const storeMongoIdStr = store._id.toString();
      
      const isRosterStore = (
        rosterStoreIdStr === currentStoreIdStr ||
        rosterStoreIdStr === storeMongoIdStr ||
        currentStoreIdStr === rosterStoreIdStr ||
        storeMongoIdStr === rosterStoreIdStr
      );
      
      if (!isRosterStore) {
        logger.error('Employee trying to check-in at different store than roster', {
          employeeId: employeeIdString,
          rosterStoreId: rosterStoreIdStr,
          rosterStoreName: rosterStore.storeName,
          currentStoreId: currentStoreIdStr,
          currentStoreName: store.name,
          date: todayDateStr
        });
        const error = new Error(`You are assigned to ${rosterStore.storeName} (${rosterStoreIdStr}) for today. You can only mark attendance at your assigned store location.`);
        error.statusCode = 403;
        throw error;
      }
      
      logger.info('Store validation passed - employee checking in at roster store', {
        employeeId: employeeIdString,
        rosterStoreId: rosterStoreIdStr,
        storeName: store.name,
        date: todayDateStr
      });
    }

    logger.info('Store retrieved for attendance', {
      storeId: store._id || store.id,
      storeName: store.name,
      hasCoordinates: !!(store.coordinates?.latitude || store.latitude),
      coordinates: store.coordinates,
      directLat: store.latitude,
      directLng: store.longitude,
      isNonStoreBound: attendanceConfig.isNonStoreBound,
      attendancePolicy: attendanceConfig.attendancePolicy
    });

    // Check if there's an open clock-in (not clocked out yet) - only for TODAY
    // Allow multiple clock-ins per day, but not simultaneous ones
    // Use employee's MongoDB _id from HR service, not user _id
    // Get employeeMongoId - it should be declared earlier, but ensure it exists
    const employeeMongoId = employee._id || employee.id;
    
    // Local midnight window for "today" open-session check (must not reuse roster YMD string)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // CRITICAL FIX: Check for open attendance using the SAME logic as getTodayAttendance
    // The today endpoint uses: isClockedIn = !!check_in_time && !check_out_time
    // So we must only block if: check_in_time exists AND check_out_time is null/undefined
    // If check_out_time is a valid date, the record is CLOSED and we should ALLOW clock-in
    
    // Find ALL today's attendance records (not just "open" ones)
    // We'll check in code if they're actually open
    const todayAttendance = await Attendance.find({
      employee: employeeMongoId,
      employee_id: employee.employeeId || employee.employee_id,
      $or: [
        { date: { $gte: today, $lt: tomorrow } },
        { check_in_time: { $gte: today, $lt: tomorrow } }
      ],
      check_in_time: { $exists: true, $ne: null }
    })
    .select('_id check_in_time check_out_time date employee_id')
    .sort({ check_in_time: -1 }) // Get most recent first
    .lean();
    
    // Check if any record is actually open (matches isClockedIn logic)
    // isClockedIn = !!check_in_time && !check_out_time
    let openAttendance = null;
    for (const record of todayAttendance) {
      const hasCheckIn = !!(record.check_in_time && 
                           record.check_in_time !== null &&
                           record.check_in_time !== undefined);
      const hasCheckOut = !!(record.check_out_time && 
                            record.check_out_time !== null &&
                            record.check_out_time !== undefined);
      
      // Only consider it open if check_in exists AND check_out does NOT exist
      // This matches: !!check_in_time && !check_out_time
      if (hasCheckIn && !hasCheckOut) {
        openAttendance = record;
        break; // Found an open record, stop searching
      }
    }

    if (openAttendance) {
      // Found a truly open attendance record - block clock-in
      logger.warn('Found open attendance record, preventing clock-in', {
        attendanceId: openAttendance._id,
        checkInTime: openAttendance.check_in_time,
        checkOutTime: openAttendance.check_out_time,
        hasCheckOut: !!(openAttendance.check_out_time),
        date: openAttendance.date,
        employeeId: employee.employeeId || employee.employee_id
      });
      const error = new Error('Please clock out from your current session before clocking in again');
      error.statusCode = 400;
      throw error;
    } else {
      // No open attendance found - allow clock-in
      logger.debug('No open attendance found for today, allowing clock-in', {
        employeeId: employee.employeeId || employee.employee_id,
        todayRecords: todayAttendance.length,
        today: today.toISOString()
      });
    }

    // Extract coordinates - support both formats
    const { latitude: storeLatitude, longitude: storeLongitude } = resolveStoreCoordinates(store);

    if (!storeLatitude || !storeLongitude) {
      logger.warn('Store has no coordinates configured', {
        storeId: store._id || store.id,
        storeName: store.name
      });
    }

    // CRITICAL: Validate against roster shift times
    let rosterValidation = {
      hasRoster: false,
      isWithinShiftTime: true,
      rosterShift: null,
      rosterShiftStart: null,
      rosterShiftEnd: null,
      checkInTime: new Date(),
      warning: null
    };
    
    try {
      const axios = require('axios');
      const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';
      const tenantId = user.tenantId || employee.tenantId || employee.tenant_id || 'default';
      const employeeIdString = employee.employeeId || employee.employee_id;
      const todayDateStr = getBusinessCalendarYmd();
      
      // Try to get admin token for roster lookup (similar to employee lookup)
      let rosterToken = token;
      try {
        const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:80';
        const normalizedTenantId = tenantId.toLowerCase().trim();
        let ADMIN_EMAIL = process.env[`${normalizedTenantId.toUpperCase()}_ADMIN_EMAIL`] || process.env.ADMIN_EMAIL;
        let ADMIN_PASSWORD = process.env[`${normalizedTenantId.toUpperCase()}_ADMIN_PASSWORD`] || process.env.ADMIN_PASSWORD;
        
        if (!ADMIN_EMAIL) {
          if (normalizedTenantId === 'eyekra') {
            ADMIN_EMAIL = 'admin@eyekra.com';
            ADMIN_PASSWORD = ADMIN_PASSWORD || 'Eyekra@Admin2026!';
          } else if (normalizedTenantId === 'upcapto') {
            ADMIN_EMAIL = 'admin@upcapto.com';
            ADMIN_PASSWORD = ADMIN_PASSWORD || 'Upcapto@2026';
          } else {
            ADMIN_EMAIL = 'admin@lenstrack.com';
            ADMIN_PASSWORD = ADMIN_PASSWORD || 'AdminPass123!';
          }
        }
        
        const adminLoginResponse = await axios.post(`${AUTH_SERVICE_URL}/api/auth/login`, {
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD
        }, {
          headers: { 
            'Content-Type': 'application/json',
            'x-tenant-id': normalizedTenantId
          },
          timeout: 2000
        });
        
        if (adminLoginResponse.data && 
            (adminLoginResponse.data.data?.accessToken || adminLoginResponse.data.accessToken)) {
          rosterToken = adminLoginResponse.data.data?.accessToken || adminLoginResponse.data.accessToken;
          logger.debug('Using admin token for roster lookup', { tenantId: normalizedTenantId });
        }
      } catch (adminTokenError) {
        logger.debug('Could not get admin token for roster lookup, using employee token', { 
          error: adminTokenError.message 
        });
        // Continue with employee token
      }
      
      // Get roster for today
      const rosterResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/roster`, {
        params: {
          employeeId: employeeIdString,
          date: todayDateStr,
          limit: 1
        },
        headers: {
          Authorization: `Bearer ${rosterToken}`,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json'
        },
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      
      if (rosterResponse.data && rosterResponse.data.success) {
        const rosterData = rosterRowsFromHrAxiosResponse(rosterResponse);
        const todayRoster = rosterData[0];
        
        if (todayRoster && todayRoster.shiftStart && todayRoster.shiftEnd) {
          rosterValidation.hasRoster = true;
          rosterValidation.rosterShift = todayRoster.shift;
          rosterValidation.rosterShiftStart = todayRoster.shiftStart;
          rosterValidation.rosterShiftEnd = todayRoster.shiftEnd;
          
          const ymd = todayDateStr;
          let shiftStartTime = wallTimeToDate(ymd, todayRoster.shiftStart);
          let shiftEndTime = wallTimeToDate(ymd, todayRoster.shiftEnd);
          if (!shiftStartTime || !shiftEndTime) {
            shiftStartTime = null;
            shiftEndTime = null;
          } else if (shiftEndTime.getTime() <= shiftStartTime.getTime()) {
            shiftEndTime = wallTimeToDate(addOneDayYmd(ymd), todayRoster.shiftEnd);
          }
          
          if (shiftStartTime && shiftEndTime) {
            // Allow 30 minutes grace period before shift start
            const gracePeriodStart = new Date(shiftStartTime);
            gracePeriodStart.setMinutes(gracePeriodStart.getMinutes() - 30);
            
            // Allow 30 minutes grace period after shift end
            const gracePeriodEnd = new Date(shiftEndTime);
            gracePeriodEnd.setMinutes(gracePeriodEnd.getMinutes() + 30);
            
            const checkInTime = new Date();
            
            if (checkInTime < gracePeriodStart || checkInTime > gracePeriodEnd) {
              rosterValidation.isWithinShiftTime = false;
              const minutesEarly = Math.round((gracePeriodStart - checkInTime) / (1000 * 60));
              const minutesLate = Math.round((checkInTime - gracePeriodEnd) / (1000 * 60));
              
              if (checkInTime < gracePeriodStart) {
                rosterValidation.warning = `Check-in is ${minutesEarly} minutes before shift start (${todayRoster.shiftStart}). Grace period: 30 minutes before shift.`;
              } else {
                rosterValidation.warning = `Check-in is ${minutesLate} minutes after shift end (${todayRoster.shiftEnd}). Grace period: 30 minutes after shift.`;
              }
              
              logger.warn('Check-in outside roster shift time', {
                employeeId: employeeIdString,
                checkInTime: checkInTime.toISOString(),
                shiftStart: todayRoster.shiftStart,
                shiftEnd: todayRoster.shiftEnd,
                warning: rosterValidation.warning
              });
            } else {
              logger.info('Check-in within roster shift time', {
                employeeId: employeeIdString,
                checkInTime: checkInTime.toISOString(),
                shiftStart: todayRoster.shiftStart,
                shiftEnd: todayRoster.shiftEnd
              });
            }
          }
        }
      }
    } catch (rosterError) {
      // Don't block attendance if roster check fails - just log warning
      logger.warn('Failed to validate against roster (non-blocking)', {
        error: rosterError.message,
        employeeId: employee.employeeId || employee.employee_id
      });
    }

    // Check geofence - using store coordinates (skip for NO_GEOFENCE / roaming / optional-GPS roles)
    let isWithinGeofenceArea = true;
    if (attendanceConfig.relaxLocationForClockIn) {
      isWithinGeofenceArea = true;
    } else if (storeLatitude !== null && storeLongitude !== null) {
      const geofenceRadiusMeters = resolveGeofenceRadiusMeters(store.geofenceRadius);
      isWithinGeofenceArea = isWithinGeofence(
        latitude,
        longitude,
        storeLatitude,
        storeLongitude,
        geofenceRadiusMeters
      );
    } else {
      logger.warn('Skipping geofence check due to missing/invalid store coordinates', {
        storeId: store._id || store.id,
        storeName: store.name,
        storeCoordinates: store.coordinates,
        directLatitude: store.latitude,
        directLongitude: store.longitude
      });
    }

    // Use employee's MongoDB _id from HR service for attendance record
    // Note: employeeMongoId is already declared above at line 192
    // Get store code from multiple possible field names - prioritize actual code field
    // Also check employee.workLocation.storeId as it might contain the code
    let storeCode = store.code || store.storeCode || store.store_code;
    
    // If store code is empty or missing, try to get from employee's workLocation
    if ((!storeCode || storeCode === '' || storeCode === 'UNKNOWN') && employee) {
      if (employee.workLocation && employee.workLocation.storeId) {
        const workLocationStoreId = employee.workLocation.storeId;
        // If it looks like a code (not an ObjectId), use it
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(workLocationStoreId)) {
          storeCode = workLocationStoreId;
          logger.info('Using store code from employee workLocation', { storeCode });
        }
      }
    }
    
    // Ensure store._id is a valid ObjectId (not a string code)
    let storeObjectId = null;
    if (store._id) {
      // Check if _id is a valid ObjectId
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(store._id)) {
        storeObjectId = store._id;
        // If we have a valid ObjectId but no code, try to get code from populated store
        if (!storeCode && store.code) {
          storeCode = store.code;
        }
      } else {
        // _id is not a valid ObjectId, might be a code string
        const potentialCode = store._id;
        logger.warn('Store _id is not a valid ObjectId, trying to find store by code', {
          storeId: store._id,
          potentialCode
        });
        
        // Try to find store by code
        try {
          const axios = require('axios');
          const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';
          const tenantId = user.tenantId || 'default';
          
          // First try with the potential code
          let storesResponse = null;
          try {
            storesResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/stores`, {
              params: { code: potentialCode, limit: 1 },
              headers: {
                Authorization: `Bearer ${token}`,
                'x-tenant-id': tenantId,
                'Content-Type': 'application/json'
              },
              timeout: 5000
            });
          } catch (codeError) {
            // If code search fails, try to get all stores and find by code
            logger.debug('Code search failed, trying to get all stores', { error: codeError.message });
          }
          
          // If code search didn't work, try getting store by ID endpoint
          if (!storesResponse || !storesResponse.data?.success) {
            try {
              storesResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/stores/${potentialCode}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'x-tenant-id': tenantId,
                  'Content-Type': 'application/json'
                },
                timeout: 5000
              });
              if (storesResponse.data && storesResponse.data.success && storesResponse.data.data) {
                const foundStore = storesResponse.data.data;
                if (foundStore._id && mongoose.Types.ObjectId.isValid(foundStore._id)) {
                  storeObjectId = foundStore._id;
                  storeCode = foundStore.code || foundStore.storeCode || foundStore.store_code || potentialCode;
                  logger.info('Found store by ID endpoint, using ObjectId', { storeCode, storeObjectId });
                }
              }
            } catch (idError) {
              logger.warn('Failed to get store by ID endpoint', { error: idError.message });
            }
          } else {
            // Parse stores from code search
            if (storesResponse.data && storesResponse.data.success) {
              let stores = [];
              if (Array.isArray(storesResponse.data.data)) {
                stores = storesResponse.data.data;
              } else if (storesResponse.data.data && Array.isArray(storesResponse.data.data.stores)) {
                stores = storesResponse.data.data.stores;
              }
              if (stores.length > 0 && stores[0]._id && mongoose.Types.ObjectId.isValid(stores[0]._id)) {
                storeObjectId = stores[0]._id;
                storeCode = stores[0].code || stores[0].storeCode || stores[0].store_code || potentialCode;
                logger.info('Found store by code, using ObjectId', { storeCode, storeObjectId });
              }
            }
          }
        } catch (storeLookupError) {
          logger.warn('Failed to lookup store by code', { error: storeLookupError.message });
        }
      }
    }
    
    // If still no valid ObjectId, use store.id if it's a valid ObjectId
    if (!storeObjectId && store.id) {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(store.id)) {
        storeObjectId = store.id;
        // Try to get code from store object if not already set
        if (!storeCode) {
          storeCode = store.code || store.storeCode || store.store_code;
        }
      }
    }
    
    // Final validation: ensure we have a valid ObjectId
    if (!storeObjectId) {
      const error = new Error('Store ID is invalid. Please ensure employee is assigned to a valid store.');
      error.statusCode = 400;
      throw error;
    }
    
    // Ensure we have a store code (fallback to extracting from store object or using a default)
    if (!storeCode || storeCode === 'UNKNOWN') {
      // Try to get code from the store object one more time
      storeCode = store.code || store.storeCode || store.store_code;
      
      // If still no code, try to fetch it from HR service
      if (!storeCode || storeCode === 'UNKNOWN') {
        try {
          const axios = require('axios');
          const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';
          const tenantId = user.tenantId || 'default';
          const storeResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/stores/${storeObjectId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'x-tenant-id': tenantId,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          });
          if (storeResponse.data && storeResponse.data.success && storeResponse.data.data) {
            storeCode = storeResponse.data.data.code || storeResponse.data.data.storeCode || storeResponse.data.data.store_code;
            logger.info('Fetched store code from HR service', { storeCode, storeObjectId });
          }
        } catch (codeFetchError) {
          logger.warn('Failed to fetch store code, will use UNKNOWN', { error: codeFetchError.message });
        }
      }
    }
    
    // Final fallback: use 'UNKNOWN' if still no code
    if (!storeCode) {
      storeCode = attendanceConfig.isNonStoreBound ? attendanceConfig.virtualStoreCode : 'UNKNOWN';
      logger.warn('Store code not found, using UNKNOWN', { storeObjectId });
    }
    
    // Log final store code for debugging
    logger.info('Store code extracted for attendance', {
      storeCode,
      storeObjectId,
      hasStoreCode: !!storeCode && storeCode !== 'UNKNOWN'
    });
    
    // Extract employee name - try multiple sources
    let employeeName = null;
    
    // 1. Try employee object from HR service
    if (employee) {
      employeeName = employee.fullName || 
                     employee.name || 
                     employee.firstName || 
                     employee.lastName ||
                     (employee.firstName && employee.lastName 
                       ? `${employee.firstName} ${employee.lastName}`.trim()
                       : null);
    }
    
    // 2. Fallback to user object
    if (!employeeName && user) {
      employeeName = user.name || 
                     user.fullName ||
                     user.firstName ||
                     user.lastName ||
                     (user.firstName && user.lastName 
                       ? `${user.firstName} ${user.lastName}`.trim()
                       : null);
    }
    
    // 3. Final fallback: use email username or employee ID
    if (!employeeName) {
      if (user?.email) {
        employeeName = user.email.split('@')[0];
      } else if (employee?.employeeId || employee?.employee_id) {
        employeeName = employee.employeeId || employee.employee_id;
      } else if (user?.employee_id || user?.employeeId) {
        employeeName = user.employee_id || user.employeeId;
      } else {
        employeeName = 'Unknown'; // Last resort
      }
    }
    
    // CRITICAL: Ensure employeeName is never null/undefined
    if (!employeeName || employeeName === null || employeeName === undefined) {
      employeeName = employee?.employeeId || employee?.employee_id || user?.employee_id || user?.employeeId || 'Unknown';
    }
    
    // Log for debugging
    logger.info('Employee name extraction result', {
      employeeName,
      hasEmployee: !!employee,
      hasUser: !!user,
      userEmail: user?.email
    });
    
    const resolvedTenantForRow = (
      user.tenantId ||
      employee.tenantId ||
      employee.tenant_id ||
      'default'
    );
    const normalizedTenantForRow =
      typeof resolvedTenantForRow === 'string'
        ? resolvedTenantForRow.toLowerCase().trim()
        : String(resolvedTenantForRow || 'default');

    // Store roster information in attendance record
    const attendanceData = {
      tenantId: normalizedTenantForRow,
      employee: employeeMongoId, // Reuse employeeMongoId from line 192
      employee_id: employee.employeeId || employee.employee_id || 'UNKNOWN',
      employeeName: employeeName, // Store employee name directly
      store: storeObjectId, // Use validated ObjectId
      store_code: storeCode,
      date: new Date(),
      check_in_time: new Date(),
      check_in_location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: notes || ''
      },
      // Only store selfie if URL is provided (not null/empty)
      ...(selfieUrl ? {
      check_in_selfie: {
        secure_url: selfieUrl,
          url: selfieUrl, // Also store as url for compatibility
          blobUrl: selfieUrl, // Also store as blobUrl for compatibility
        public_id: `selfie_${employeeId}_${Date.now()}`,
        uploaded_at: new Date()
        }
      } : {}),
      geofence_status: isWithinGeofenceArea ? 'valid' : 'invalid',
      attendance_policy: attendanceConfig.attendancePolicy,
      notes: notes || ''
    };
    
    // Add roster information if available
    if (rosterValidation.hasRoster) {
      attendanceData.shift = rosterValidation.rosterShift;
      attendanceData.shiftStart = rosterValidation.rosterShiftStart;
      attendanceData.shiftEnd = rosterValidation.rosterShiftEnd;
      const shiftMeta = computeShiftMetadata(
        attendanceData.date,
        rosterValidation.rosterShiftStart,
        rosterValidation.rosterShiftEnd
      );
      if (shiftMeta) {
        attendanceData.required_shift_hours = shiftMeta.required_shift_hours;
        attendanceData.expected_shift_end_at = shiftMeta.expected_shift_end_at;
      }

      // Set status based on roster validation
      if (rosterValidation.isWithinShiftTime) {
        attendanceData.status = 'present';
      } else {
        // Mark as present but with warning in notes
        attendanceData.status = 'present';
        attendanceData.notes = (attendanceData.notes ? attendanceData.notes + ' | ' : '') + rosterValidation.warning;
        attendanceData.is_roster_violation = true;
      }
    } else {
      attendanceData.status = 'present';
    }

    const attendance = new Attendance(attendanceData);

    await attendance.save();
    
    // Log audit event (non-blocking)
    try {
      logAttendanceEvent({
        action: 'CLOCK_IN',
        userId: employeeId,
        resource: 'attendance',
        details: {
          attendanceId: attendance._id,
          storeId: store._id || store.id,
          isGeofenceValid: isWithinGeofenceArea
        }
      });
    } catch (auditError) {
      logger.warn('Failed to log audit event for clock-in', { error: auditError.message });
    }

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
/**
 * Clocks out an employee
 * @param {Object} user - User object from authentication
 * @param {number} latitude - Checkout location latitude
 * @param {number} longitude - Checkout location longitude
 * @param {string} selfieUrl - Selfie image URL
 * @param {string} notes - Optional notes
 * @param {string} token - JWT token for HR service API calls
 * @returns {Promise<Object>} Updated attendance record
 */
const clockOut = async (user, latitude, longitude, selfieUrl, notes = '', token = null) => {
  const employeeId = user._id || user.id;
  
  try {
    const employee = await getEmployeeByUser(user, token);

    // Create employee user object for store lookup
    const employeeUser = {
      ...user,
      _id: employee._id || employee.id,
      id: employee._id || employee.id,
      employee_id: employee.employeeId || employee.employee_id,
      employeeId: employee.employeeId || employee.employee_id,
      email: employee.email || user.email
    };
    const attendanceConfig = getEmployeeAttendanceConfig(employee, user);
    
    // Fetch employee's assigned store using employee data
    let store = await getEmployeeStore(employeeUser, token);
    
    // If store not found, try to get it from employee object directly
    if (!store && employee.store) {
      if (typeof employee.store === 'object' && (employee.store._id || employee.store.id)) {
        store = employee.store;
        logger.info('Using store from employee object in clockOut', { storeId: store._id || store.id });
      } else if (typeof employee.store === 'string') {
        // Store is just an ID, fetch it
        try {
          const axios = require('axios');
          const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';
          const employeeTenantId = (employee.tenantId || employee.tenant_id || user.tenantId || 'default');
          const storeResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/stores/${employee.store}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'x-tenant-id': employeeTenantId,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          });
          if (storeResponse.data && storeResponse.data.success && storeResponse.data.data) {
            store = storeResponse.data.data;
            logger.info('Fetched store by ID in clockOut', { storeId: store._id || store.id });
          }
        } catch (storeError) {
          logger.warn('Failed to fetch store by ID in clockOut', { error: storeError.message });
        }
      }
    }
    if (!store && attendanceConfig.relaxLocationForClockIn) {
      try {
        const axios = require('axios');
        const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';
        const tenantId = user.tenantId || employee.tenantId || employee.tenant_id || 'default';
        const fallbackStoreResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/stores`, {
          params: { page: 1, limit: 1 },
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });
        const storesPayload = fallbackStoreResponse?.data?.data;
        const stores = Array.isArray(storesPayload)
          ? storesPayload
          : storesPayload?.stores || [];
        if (stores.length > 0) {
          store = stores[0];
        }
      } catch (fallbackError) {
        logger.warn('No fallback store could be resolved for relaxed-attendance clock-out', {
          employeeId: employee.employeeId || employee.employee_id,
          error: fallbackError.message
        });
      }
    }

    if (!store) {
      const error = new Error('Employee is not assigned to a store in this tenant. Please contact HR.');
      error.statusCode = 400;
      throw error;
    }

    // Use employee's MongoDB _id from HR service for attendance lookup
    const employeeMongoId = employee._id || employee.id;
    const employeeIdString = employee.employeeId || employee.employee_id;
    
    // Get today's date range for efficient query (same as check-in)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Find the most recent open attendance record (not clocked out yet) - TODAY ONLY
    // IMPORTANT: Match check-in logic - filter by today's date and check both employee and employee_id
    // This ensures we find the correct open session from today
    const attendance = await Attendance.findOne({
      $and: [
        {
          $or: [
            { employee: employeeMongoId }, // Use employee's MongoDB _id from HR service
            { employee_id: employeeIdString } // Also check by employee_id string
          ]
        },
        {
          $or: [
            { date: { $gte: today, $lt: tomorrow } },
            { check_in_time: { $gte: today, $lt: tomorrow } }
          ]
        },
        {
          check_in_time: { $exists: true, $ne: null }
        },
        {
          $or: [
            { check_out_time: { $exists: false } },
            { check_out_time: null }
          ]
        }
      ]
    }).sort({ check_in_time: -1 });

    if (!attendance) {
      const error = new Error('No open clock-in session found. Please clock in first.');
      error.statusCode = 400;
      throw error;
    }

    // Check geofence - using store coordinates (skip for relaxed / optional-GPS employees)
    const { latitude: storeLatitude, longitude: storeLongitude } = resolveStoreCoordinates(store);
    
    let isWithinGeofenceArea = true;
    if (attendanceConfig.relaxLocationForClockIn) {
      isWithinGeofenceArea = true;
    } else if (storeLatitude !== null && storeLongitude !== null) {
      const geofenceRadiusMeters = resolveGeofenceRadiusMeters(store.geofenceRadius);
      isWithinGeofenceArea = isWithinGeofence(
        latitude,
        longitude,
        storeLatitude,
        storeLongitude,
        geofenceRadiusMeters
      );
    } else {
      logger.warn('Skipping geofence check during clock-out due to missing/invalid store coordinates', {
        storeId: store._id || store.id,
        storeName: store.name,
        storeCoordinates: store.coordinates,
        directLatitude: store.latitude,
        directLongitude: store.longitude
      });
    }

    // Update employee name if missing (for old records)
    if (!attendance.employeeName) {
      const employeeName = employee.fullName || 
                          employee.name || 
                          (employee.firstName && employee.lastName 
                            ? `${employee.firstName} ${employee.lastName}`.trim()
                            : employee.firstName || employee.lastName || null);
      if (employeeName) {
        attendance.employeeName = employeeName;
      }
    }

    attendance.check_out_time = new Date();
    attendance.check_out_location = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address: notes || ''
    };
    
    if (selfieUrl) {
      attendance.check_out_selfie = {
        secure_url: selfieUrl,
        url: selfieUrl, // Also store as url for compatibility
        blobUrl: selfieUrl, // Also store as blobUrl for compatibility
        public_id: `selfie_out_${employeeId}_${Date.now()}`,
        uploaded_at: new Date()
      };
    }

    // Calculate total hours before saving
    const checkInTime = new Date(attendance.check_in_time);
    const checkOutTime = new Date(attendance.check_out_time);
    const diffTime = checkOutTime - checkInTime;
    const totalHours = diffTime / (1000 * 60 * 60); // Convert milliseconds to hours
    
    const minimumHours = getMinimumHoursForPresent(attendance);

    if (totalHours < minimumHours) {
      attendance.status = 'absent';
      attendance.notes = (attendance.notes || '') +
        ` | Clock-out: Total hours ${totalHours.toFixed(2)} is less than required ${minimumHours} hours (roster shift length). Marked as absent.`;

      logger.warn('Attendance marked as absent due to insufficient hours', {
        attendanceId: attendance._id,
        employeeId: employeeId,
        totalHours: totalHours.toFixed(2),
        minimumHours,
        checkInTime: checkInTime.toISOString(),
        checkOutTime: checkOutTime.toISOString()
      });
    } else {
      if (attendance.status !== 'present') {
        attendance.status = 'present';
      }
    }
    
    attendance.total_hours = Math.round(totalHours * 100) / 100; // Round to 2 decimal places

    await attendance.save();
    
    // Auto-calculate and push sales to dashboard (non-blocking)
    // This happens on every clock-out (manual or auto)
    try {
      await calculateAndPushSalesToDashboard(employeeMongoId, employeeIdString, token);
    } catch (salesError) {
      logger.warn('Failed to calculate/push sales on clock-out', { 
        error: salesError.message,
        employeeId: employeeIdString 
      });
      // Don't fail clock-out if sales calculation fails
    }
    
    // Log audit event (non-blocking)
    try {
      await logAttendanceEvent(employeeId, 'CLOCK_OUT', {
        storeId: store._id || store.id,
        isGeofenceValid: isWithinGeofenceArea,
        location: { latitude, longitude },
        selfieUrl: selfieUrl
      });
    } catch (auditError) {
      logger.warn('Failed to log audit event for clock-out', { error: auditError.message });
    }

    logger.info('Employee clocked out successfully', { 
      employeeId, 
      storeId: store._id || store.id,
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
        .sort({ 'check_in_time': -1 })
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
    const mongoose = require('mongoose');
    
    // CRITICAL: Handle both employeeId string (like "EMP-2026-969954") and ObjectId
    // Attendance model has both 'employee' (ObjectId) and 'employee_id' (String)
    const query = {};
    
    // Check if employeeId is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(employeeId) && employeeId.toString().length === 24) {
      // It's an ObjectId - use 'employee' field
      query.employee = employeeId;
    } else {
      // It's a string (like "EMP-2026-969954") - use 'employee_id' field
      query.employee_id = employeeId.toUpperCase().trim();
    }
    
    // Add date range filter - OPTIMIZED: Use both check_in_time and date fields
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    endDateObj.setHours(23, 59, 59, 999); // Include full end date
    
    query.$or = [
      { check_in_time: { $gte: startDateObj, $lte: endDateObj } },
      { date: { $gte: startDateObj, $lte: endDateObj } }
    ];

    // OPTIMIZED: Use aggregation pipeline for better performance
    const summaryPipeline = [
      { $match: query },
      {
        $group: {
          _id: null,
          totalDays: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absentDays: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          onLeaveDays: { $sum: { $cond: [{ $eq: ['$status', 'on_leave'] }, 1, 0] } },
          holidayDays: { $sum: { $cond: [{ $eq: ['$status', 'holiday'] }, 1, 0] } },
          totalHours: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$check_in_time', null] }, { $ne: ['$check_out_time', null] }] },
                { $divide: [{ $subtract: ['$check_out_time', '$check_in_time'] }, 1000 * 60 * 60] },
                0
              ]
            }
          },
          workingDays: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$check_in_time', null] }, { $ne: ['$check_out_time', null] }] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalDays: 1,
          presentDays: 1,
          absentDays: 1,
          onLeaveDays: 1,
          holidayDays: 1,
          totalWorkingHours: { $round: ['$totalHours', 2] },
          averageWorkingHours: {
            $cond: [
              { $gt: ['$workingDays', 0] },
              { $round: [{ $divide: ['$totalHours', '$workingDays'] }, 2] },
              0
            ]
          },
          attendancePercentage: {
            $cond: [
              { $gt: ['$totalDays', 0] },
              { $round: [{ $multiply: [{ $divide: ['$presentDays', '$totalDays'] }, 100] }, 2] },
              0
            ]
          }
        }
      }
    ];

    const summaryResult = await Attendance.aggregate(summaryPipeline);
    
    const summary = summaryResult[0] || {
      totalDays: 0,
      presentDays: 0,
      absentDays: 0,
      onLeaveDays: 0,
      holidayDays: 0,
      totalWorkingHours: 0,
      averageWorkingHours: 0,
      attendancePercentage: 0
    };

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

    // CRITICAL: Add tenantId filter for tenant isolation
    // Handle both cases: records with tenantId and records without tenantId (backward compatibility)
    if (filters.tenantId) {
      // Query for records with matching tenantId OR records without tenantId (for backward compatibility)
      // This ensures old records without tenantId are still accessible
      query.$or = [
        { tenantId: filters.tenantId },
        { tenantId: { $exists: false } },
        { tenantId: null }
      ];
      // Also ensure employee_id matches (additional tenant isolation via employee)
    }

    // Handle employee filter - frontend sends employeeId as string (e.g., "EMP-2026-969954")
    // Attendance model has both 'employee' (ObjectId) and 'employee_id' (String)
    if (filters.employeeId) {
      // Query by employee_id string field (frontend sends this)
      query.employee_id = filters.employeeId.toUpperCase().trim();
    } else if (filters.employee) {
      // If employee ObjectId is provided, use it
      query.employee = filters.employee;
    }
    
    // Handle store filter (for Admin/HR viewing store-wise attendance)
    if (filters.storeId) {
      query.store = filters.storeId;
    }

    // Handle date filter - support both single date and date range
    // CRITICAL: Check both 'date' and 'check_in_time' fields for compatibility
    // CRITICAL: When using $or with tenantId, we need to combine with $and
    if (filters.date) {
      // Single date - get records for that specific day
      const date = new Date(filters.date);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Query both date and check_in_time fields
      // CRITICAL: Combine with $and if tenantId exists
      const dateQuery = {
        $or: [
          { date: { $gte: startOfDay, $lte: endOfDay } },
          { check_in_time: { $gte: startOfDay, $lte: endOfDay } }
        ]
      };
      
      if (query.$or && query.$or.some(cond => cond.tenantId)) {
        // tenantId is already in $or, combine dateQuery with $and
        query.$and = [
          ...(query.$and || []),
          dateQuery
        ];
      } else if (filters.tenantId) {
        // If tenantId filter exists, combine with $and (handle missing tenantId for backward compatibility)
        query.$and = [
          { $or: [
            { tenantId: filters.tenantId },
            { tenantId: { $exists: false } },
            { tenantId: null }
          ]},
          dateQuery
        ];
      } else {
        query.$or = dateQuery.$or;
      }
    } else if (filters.startDate || filters.endDate) {
      // Date range - check both date and check_in_time fields
      const dateRangeQuery = [];
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        dateRangeQuery.push(
          { date: { $gte: startDate } },
          { check_in_time: { $gte: startDate } }
        );
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (dateRangeQuery.length > 0) {
          // Combine with existing date range
          const dateRangeConditions = [
            { $or: dateRangeQuery },
            { $or: [
              { date: { $lte: endDate } },
              { check_in_time: { $lte: endDate } }
            ]}
          ];
          
          // CRITICAL: Combine with tenantId using $and if tenantId exists
          if (query.tenantId) {
            query.$and = [
              { tenantId: query.tenantId },
              ...dateRangeConditions
            ];
            delete query.tenantId;
          } else {
            query.$and = dateRangeConditions;
          }
        } else {
          const endDateOr = [
            { date: { $lte: endDate } },
            { check_in_time: { $lte: endDate } }
          ];
          
          // CRITICAL: Combine with tenantId using $and if tenantId exists
          if (query.$or && query.$or.some(cond => cond.tenantId)) {
            // tenantId is already in $or, combine endDateOr with $and
            query.$and = [
              ...(query.$and || []),
              { $or: endDateOr }
            ];
          } else if (filters.tenantId) {
            query.$and = [
              { $or: [
                { tenantId: filters.tenantId },
                { tenantId: { $exists: false } },
                { tenantId: null }
              ]},
              { $or: endDateOr }
            ];
          } else {
            query.$or = endDateOr;
          }
        }
      } else if (filters.startDate) {
        // CRITICAL: Combine with tenantId using $and if tenantId exists
        if (query.$or && query.$or.some(cond => cond.tenantId)) {
          // tenantId is already in $or, combine dateRangeQuery with $and
          query.$and = [
            ...(query.$and || []),
            { $or: dateRangeQuery }
          ];
        } else if (filters.tenantId) {
          query.$and = [
            { $or: [
              { tenantId: filters.tenantId },
              { tenantId: { $exists: false } },
              { tenantId: null }
            ]},
            { $or: dateRangeQuery }
          ];
        } else {
          query.$or = dateRangeQuery;
        }
      }
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const skip = (page - 1) * limit;

    // Add timeout protection for database queries
    const queryTimeout = 5000; // 5 seconds
    
    let records, total;
    try {
      [records, total] = await Promise.race([
        Promise.all([
          Attendance.find(query)
            .populate('employee', 'name fullName firstName lastName email employee_id employeeId')
            .populate('store', 'name code')
            .sort({ date: -1, check_in_time: -1 })
            .skip(skip)
            .limit(limit)
            .lean(), // Use lean() for better performance
          Attendance.countDocuments(query)
        ]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), queryTimeout)
        )
      ]);
    } catch (error) {
      // On timeout or error, return empty result instead of throwing
      logger.warn('Attendance query timeout or error, returning empty result', {
        error: error.message,
        filters,
        query
      });
      records = [];
      total = 0;
    }

    return {
      data: records, // Changed from 'records' to 'data' for consistency
      records: records, // Keep for backward compatibility
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

/**
 * Get attendance records by multiple employee IDs (for department-wise view)
 */
const getAttendanceRecordsByEmployeeIds = async (employeeIds = [], dateFilters = {}, page = 1, limit = 10) => {
  try {
    const query = {
      employee_id: { $in: employeeIds.map(id => id.toUpperCase().trim()) }
    };
    
    // Handle date filters
    if (dateFilters.date) {
      const date = new Date(dateFilters.date);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.check_in_time = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    } else if (dateFilters.startDate || dateFilters.endDate) {
      if (dateFilters.startDate) {
        query.check_in_time = { ...query.check_in_time, $gte: new Date(dateFilters.startDate) };
      }
      if (dateFilters.endDate) {
        query.check_in_time = { ...query.check_in_time, $lte: new Date(dateFilters.endDate) };
      }
    }
    
    const skip = (page - 1) * limit;
    const queryTimeout = 5000;
    
    let records, total;
    try {
      [records, total] = await Promise.race([
        Promise.all([
          Attendance.find(query)
            .populate('employee', 'name fullName firstName lastName email employee_id employeeId')
            .populate('store', 'name code')
            .sort({ date: -1, check_in_time: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          Attendance.countDocuments(query)
        ]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), queryTimeout)
        )
      ]);
    } catch (error) {
      logger.warn('Attendance query timeout or error', { error: error.message });
      records = [];
      total = 0;
    }
    
    return {
      data: records,
      records: records,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    };
  } catch (error) {
    logger.error('Error in getAttendanceRecordsByEmployeeIds', { error: error.message });
    throw error;
  }
};

/**
 * Sync attendance from roster data
 * Creates or updates attendance record based on roster entry
 * @param {Object} rosterData - Roster data with employeeId, date, storeId, shift, shiftStart, shiftEnd, source, rosterId
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object>} Attendance record
 */
const syncAttendanceFromRoster = async (rosterData, tenantId = 'default') => {
  try {
    const {
      employeeId,
      date,
      storeId,
      shift,
      shiftStart,
      shiftEnd,
      source = 'roster_sync',
      rosterId
    } = rosterData;

    if (!employeeId || !date) {
      throw new Error('employeeId and date are required');
    }

    logger.info('Syncing attendance from roster', {
      employeeId,
      date,
      storeId,
      shift,
      tenantId
    });

    // Get employee from HR service
    const axios = require('axios');
    const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';
    
    // Find employee
    let employee = null;
    try {
      const employeeResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/employees/${employeeId}`, {
        headers: {
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (employeeResponse.data && employeeResponse.data.success) {
        employee = employeeResponse.data.data;
      }
    } catch (employeeError) {
      logger.warn('Failed to fetch employee', { error: employeeError.message, employeeId });
      throw new Error(`Employee not found: ${employeeId}`);
    }

    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    // Get store
    let store = null;
    if (storeId) {
      try {
        const storeResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/stores/${storeId}`, {
          headers: {
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        if (storeResponse.data && storeResponse.data.success) {
          store = storeResponse.data.data;
        }
      } catch (storeError) {
        logger.warn('Failed to fetch store', { error: storeError.message, storeId });
        // Try to get store from employee's workLocation
        if (employee.store) {
          store = employee.store;
        } else if (employee.workLocation && employee.workLocation.storeId) {
          // Store ID might be in workLocation
          const workStoreId = employee.workLocation.storeId;
          try {
            const storeResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/stores/${workStoreId}`, {
              headers: {
                'x-tenant-id': tenantId,
                'Content-Type': 'application/json'
              },
              timeout: 5000
            });
            if (storeResponse.data && storeResponse.data.success) {
              store = storeResponse.data.data;
            }
          } catch (err) {
            logger.warn('Failed to fetch store from workLocation', { error: err.message });
          }
        }
      }
    } else {
      // No storeId provided, try to get from employee
      if (employee.store) {
        store = employee.store;
      }
    }

    if (!store) {
      throw new Error(`Store not found for employee ${employeeId}`);
    }

    // Parse date
    const dateObj = new Date(date);
    const startOfDay = new Date(dateObj);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateObj);
    endOfDay.setHours(23, 59, 59, 999);

    // Find existing attendance record for this date
    const employeeMongoId = employee._id || employee.id;
    const employeeIdString = employee.employeeId || employee.employee_id || employeeId;
    const storeObjectId = store._id || store.id;
    const storeCode = store.code || store.storeCode || store.store_code || 'UNKNOWN';

    const existingAttendance = await Attendance.findOne({
      employee: employeeMongoId,
      employee_id: employeeIdString.toUpperCase(),
      $or: [
        { date: { $gte: startOfDay, $lte: endOfDay } },
        { check_in_time: { $gte: startOfDay, $lte: endOfDay } }
      ]
    });

    // Prepare attendance data
    const attendanceUpdate = {
      employee: employeeMongoId,
      employee_id: employeeIdString.toUpperCase(),
      employeeName: employee.name || employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
      store: storeObjectId,
      store_code: storeCode,
      date: dateObj,
      source: source,
      rosterId: rosterId || null
    };

    // Add shift information if provided
    if (shift) {
      attendanceUpdate.shift = shift;
    }
    if (shiftStart) {
      attendanceUpdate.shiftStart = shiftStart;
    }
    if (shiftEnd) {
      attendanceUpdate.shiftEnd = shiftEnd;
    }
    if (shiftStart && shiftEnd) {
      const shiftMeta = computeShiftMetadata(dateObj, shiftStart, shiftEnd);
      if (shiftMeta) {
        attendanceUpdate.required_shift_hours = shiftMeta.required_shift_hours;
        attendanceUpdate.expected_shift_end_at = shiftMeta.expected_shift_end_at;
      }
    }

    // If no existing attendance, set default status
    if (!existingAttendance) {
      attendanceUpdate.status = 'scheduled'; // Default status for roster-synced attendance
    } else {
      // Update existing attendance with roster data
      // Don't overwrite check_in_time/check_out_time if they exist
      if (!existingAttendance.check_in_time) {
        // If no check-in yet, we can set expected times but not actual check-in
        // Leave check_in_time as null until actual clock-in
      }
    }

    // Upsert attendance
    const attendance = await Attendance.findOneAndUpdate(
      existingAttendance ? { _id: existingAttendance._id } : {
        employee: employeeMongoId,
        employee_id: employeeIdString.toUpperCase(),
        date: { $gte: startOfDay, $lte: endOfDay }
      },
      { $set: attendanceUpdate },
      { 
        new: true, 
        upsert: !existingAttendance,
        runValidators: true
      }
    );

    logger.info('Attendance synced from roster', {
      attendanceId: attendance._id,
      employeeId: employeeIdString,
      date,
      storeId: storeObjectId,
      isNew: !existingAttendance
    });

    return attendance;
  } catch (error) {
    logger.error('Error in syncAttendanceFromRoster', { 
      error: error.message,
      rosterData,
      tenantId
    });
    throw error;
  }
};

module.exports = {
  clockIn,
  clockOut,
  getAttendanceHistory,
  getAttendanceSummary,
  getAttendanceRecords,
  getAttendanceRecordsByEmployeeIds,
  calculateAndPushSalesToDashboard,
  syncAttendanceFromRoster,
  getEmployeeAttendanceConfig
};
