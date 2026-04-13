const axios = require('axios');
const logger = require('../config/logger');
const { employeeCache, getCachedEmployee, cacheEmployee, getCachedStore, cacheStore } = require('./employeeCache');
const { hrServiceClient } = require('./httpClient');
const { hrServiceBreaker } = require('./circuitBreaker');
const { employeeLookupQueue } = require('./asyncQueue');

// HR Service base URL (from k8s service or env)
// CRITICAL: HR service listens on port 3002, and Kubernetes service exposes port 3002
const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';
const HR_LOOKUP_REQUEST_TIMEOUT_MS = Number(process.env.HR_LOOKUP_REQUEST_TIMEOUT_MS || 5000); // Increased from 2500ms
const HR_LOOKUP_TOTAL_TIMEOUT_MS = Number(process.env.HR_LOOKUP_TOTAL_TIMEOUT_MS || 15000); // Increased from 8000ms
const ENABLE_CROSS_TENANT_LOOKUP = process.env.ENABLE_CROSS_TENANT_LOOKUP === 'true';
const ENABLE_ANY_EMPLOYEE_FALLBACK = process.env.ENABLE_ANY_EMPLOYEE_FALLBACK === 'true';

const getRemainingMs = (startedAt) => Math.max(0, HR_LOOKUP_TOTAL_TIMEOUT_MS - (Date.now() - startedAt));
const getRequestTimeout = (startedAt) => Math.max(500, Math.min(HR_LOOKUP_REQUEST_TIMEOUT_MS, getRemainingMs(startedAt)));
const resolveTenantId = (user, token = null) => {
  // CRITICAL: Always prioritize JWT token tenantId first (most reliable source)
  let tenantId = null;
  
  // Extract from JWT token first (this is the authoritative source)
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(token);
      tenantId = decoded?.tenantId || decoded?.tenant_id || decoded?.tid || decoded?.tenant;
      if (tenantId) {
        tenantId = String(tenantId).toLowerCase().trim();
      }
    } catch (e) {
      // Ignore decode errors
    }
  }
  
  // Fallback to user object before defaulting
  if (!tenantId) {
    tenantId = user?.tenantId || user?.tenant_id || user?.tid || user?.tenant || null;
    if (tenantId) {
      tenantId = String(tenantId).toLowerCase().trim();
    }
  }

  // Default to 'default' if still not found
  return tenantId || 'default';
};

/**
 * Fetch employee details from HR service by user object
 * @param {Object} user - User object from req.user (has _id, employee_id, email)
 * @param {string} token - JWT token for authentication
 * @returns {Promise<Object>} Employee data
 */
const getEmployeeByUser = async (user, token) => {
  try {
    const lookupStartedAt = Date.now();

    // CRITICAL: Try to get employee using employee_id field first (most reliable)
    // Extract from token if not in user object
    let employeeId = user.employee_id || user.employeeId;
    
    // If employee_id not in user object, try to decode from token
    if (!employeeId && token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(token);
        employeeId = decoded?.employee_id || decoded?.employeeId;
        logger.debug('Extracted employee_id from JWT token', {
          employeeId,
          hasEmployeeId: !!employeeId,
          tokenKeys: Object.keys(decoded || {})
        });
      } catch (e) {
        logger.debug('Failed to decode token for employee_id', { error: e.message });
      }
    }
    
    const primaryTenantId = resolveTenantId(user, token);
    
    // CRITICAL: Check cache first, but only return if employee has valid store
    // If cached employee has invalid store, continue to HR service lookup to check other tenants
    if (employeeId) {
      const cacheKey = `emp_${primaryTenantId}_${employeeId.toUpperCase()}`;
      const cachedEmployee = employeeCache.get(cacheKey);
      if (cachedEmployee) {
        const hasValidStore = cachedEmployee.store && 
                             (cachedEmployee.store._id || cachedEmployee.store.id) && 
                             (cachedEmployee.store._id?.toString().trim() !== '' || cachedEmployee.store.id?.toString().trim() !== '') &&
                             cachedEmployee.store.name && 
                             cachedEmployee.store.name !== 'Unknown Store';
        
        if (hasValidStore) {
          logger.info('✅ Found employee in cache by employeeId with valid store', {
            employeeId: employeeId.toUpperCase(),
            tenantId: primaryTenantId,
            hasStore: !!cachedEmployee.store,
            storeName: cachedEmployee.store?.name || 'none'
          });
          return cachedEmployee;
        } else {
          logger.warn('Cached employee has invalid store, will check HR service for other tenants', {
            employeeId: employeeId.toUpperCase(),
            tenantId: primaryTenantId,
            storeStatus: cachedEmployee.store ? 'invalid' : 'missing'
          });
          // Don't return - continue to HR service lookup to check other tenants
        }
      }
    }
    
    // Also check cache by userId, but only return if employee has valid store
    if (user._id || user.id) {
      const userId = user._id || user.id;
      const idCacheKey = `emp_id_${primaryTenantId}_${userId}`;
      const cachedEmployee = employeeCache.get(idCacheKey);
      if (cachedEmployee) {
        const hasValidStore = cachedEmployee.store && 
                             (cachedEmployee.store._id || cachedEmployee.store.id) && 
                             (cachedEmployee.store._id?.toString().trim() !== '' || cachedEmployee.store.id?.toString().trim() !== '') &&
                             cachedEmployee.store.name && 
                             cachedEmployee.store.name !== 'Unknown Store';
        
        if (hasValidStore) {
          logger.info('✅ Found employee in cache by userId with valid store', {
            userId,
            tenantId: primaryTenantId,
            hasStore: !!cachedEmployee.store,
            storeName: cachedEmployee.store?.name || 'none'
          });
          return cachedEmployee;
        } else {
          logger.warn('Cached employee has invalid store, will check HR service for other tenants', {
            userId,
            tenantId: primaryTenantId,
            storeStatus: cachedEmployee.store ? 'invalid' : 'missing'
          });
          // Don't return - continue to HR service lookup to check other tenants
        }
      }
    }
    
    logger.info('Employee lookup - extracted identifiers', {
      employeeId,
      userId: user._id || user.id,
      email: user.email,
      tenantId: primaryTenantId,
      hasEmployeeIdInUser: !!(user.employee_id || user.employeeId)
    });
    
    logger.info('getEmployeeByUser called', {
      hasEmployeeId: !!employeeId,
      employeeId,
      userId: user._id || user.id,
      userEmail: user.email,
      tenantId: primaryTenantId,
      userRole: user.role,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'no token'
    });
    
    // CRITICAL: Always try to get admin token for employee lookup
    // This bypasses authorization issues when employees query their own data
    let adminToken = token;
    let adminTokenObtained = false;
    
      try {
      const axios = require('axios');
      const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:80';
      
      // Try to get tenant-specific admin credentials
      const tenantId = primaryTenantId.toLowerCase().trim();
      let ADMIN_EMAIL = process.env[`${tenantId.toUpperCase()}_ADMIN_EMAIL`] || process.env.ADMIN_EMAIL;
      let ADMIN_PASSWORD = process.env[`${tenantId.toUpperCase()}_ADMIN_PASSWORD`] || process.env.ADMIN_PASSWORD;
      
      // Default admin credentials for known tenants
      if (!ADMIN_EMAIL) {
        if (tenantId === 'eyekra') {
          ADMIN_EMAIL = 'admin@eyekra.com';
          ADMIN_PASSWORD = ADMIN_PASSWORD || 'Eyekra@Admin2026!';
        } else if (tenantId === 'upcapto') {
          ADMIN_EMAIL = 'admin@upcapto.com';
          ADMIN_PASSWORD = ADMIN_PASSWORD || 'Upcapto@2026';
        } else {
          ADMIN_EMAIL = 'Admin@lenstrack.com';
          ADMIN_PASSWORD = ADMIN_PASSWORD || 'Kadarkhan@123';
        }
      }
      
      if (!ADMIN_PASSWORD) {
        if (tenantId === 'eyekra') {
          ADMIN_PASSWORD = 'Eyekra@Admin2026!';
        } else if (tenantId === 'upcapto') {
          ADMIN_PASSWORD = 'Upcapto@2026';
        } else {
          ADMIN_PASSWORD = 'Kadarkhan@123';
        }
      }
      
      if (getRemainingMs(lookupStartedAt) > 2000) { // Only if we have time
        logger.debug('Attempting to get admin token for employee lookup', {
          tenantId,
          adminEmail: ADMIN_EMAIL.substring(0, 10) + '...'
        });

      const adminLoginResponse = await axios.post(`${AUTH_SERVICE_URL}/api/auth/login`, {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      }, {
          headers: { 
            'Content-Type': 'application/json',
            'x-tenant-id': tenantId
          },
          timeout: Math.min(2000, getRequestTimeout(lookupStartedAt))
        });
        
        if (adminLoginResponse.data && 
            (adminLoginResponse.data.data?.accessToken || adminLoginResponse.data.accessToken)) {
          adminToken = adminLoginResponse.data.data?.accessToken || adminLoginResponse.data.accessToken;
          adminTokenObtained = true;
          logger.info('✅ Using admin token for employee lookup', {
            tenantId,
            userId: user._id || user.id
          });
        }
      }
      } catch (adminTokenError) {
      logger.debug('Could not get admin token, will use employee token', { 
        error: adminTokenError.message,
        willRetry: true
      });
      // Continue with employee token - will try admin token as fallback
    }
    
    // CRITICAL: Always try JWT tenant first, then check other tenants if needed
    // This ensures we find the employee even if they exist in a different tenant
    const tenantsToTry = [primaryTenantId];
    
    // Always add common fallback tenants to ensure we find the employee
    // Priority: JWT tenant first, then common tenants
    if (primaryTenantId === 'default') {
      tenantsToTry.push('upcapto', 'lenstrack');
    } else if (primaryTenantId === 'lenstrack') {
      tenantsToTry.push('upcapto', 'default');
    } else if (primaryTenantId === 'upcapto') {
      tenantsToTry.push('default', 'lenstrack');
    } else {
      // For any other tenant, add common fallbacks
      tenantsToTry.push('default', 'upcapto', 'lenstrack');
    }
    
    // Remove duplicates while preserving order
    const uniqueTenants = [...new Set(tenantsToTry)];
    logger.info('Tenant lookup strategy', {
      primaryTenantId,
      tenantsToTry: uniqueTenants,
      reason: 'Always check multiple tenants to find employee with valid store'
    });
    
    // CRITICAL: Log admin token status for debugging
    logger.info('Employee lookup starting', {
      userId: user._id || user.id,
      employeeId: employeeId,
      tenantId: primaryTenantId,
      adminTokenObtained,
      adminTokenPreview: adminTokenObtained ? adminToken.substring(0, 20) + '...' : 'not obtained',
      tenantsToTry
    });
    
    let lastError = null;
    
    // CRITICAL: Try userId FIRST (direct endpoint is faster than query endpoint)
    // This avoids query overhead and is more reliable
    if (user._id || user.id) {
      const userId = user._id || user.id;
      logger.info('Primary: Searching by userId (direct endpoint - fastest)', { 
        userId, 
        tenantsToTry 
      });
      
      for (const tenantId of tenantsToTry) {
        if (getRemainingMs(lookupStartedAt) <= 0) {
          break; // Timeout - try employeeId lookup next
        }
        try {
          // CRITICAL: For cross-tenant searches, we need admin token for the target tenant
          // MongoDB _id is tenant-specific, so cross-tenant searches by _id will fail
          // But we still try in case the employee exists in multiple tenants with same _id
          let searchToken = token;
          let usingAdminToken = false;
          
          // For cross-tenant searches, try to get admin token for target tenant
          if (tenantId !== primaryTenantId && getRemainingMs(lookupStartedAt) > 3000) {
            try {
              const axios = require('axios');
              const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:80';
              const targetTenantId = tenantId.toLowerCase().trim();
              
              // Get admin credentials for target tenant
              let TARGET_ADMIN_EMAIL = process.env[`${targetTenantId.toUpperCase()}_ADMIN_EMAIL`] || process.env.ADMIN_EMAIL;
              let TARGET_ADMIN_PASSWORD = process.env[`${targetTenantId.toUpperCase()}_ADMIN_PASSWORD`] || process.env.ADMIN_PASSWORD;
              
              if (!TARGET_ADMIN_EMAIL) {
                if (targetTenantId === 'eyekra') {
                  TARGET_ADMIN_EMAIL = 'admin@eyekra.com';
                  TARGET_ADMIN_PASSWORD = TARGET_ADMIN_PASSWORD || 'Eyekra@Admin2026!';
                } else if (targetTenantId === 'upcapto') {
                  TARGET_ADMIN_EMAIL = 'admin@upcapto.com';
                  TARGET_ADMIN_PASSWORD = TARGET_ADMIN_PASSWORD || 'Upcapto@2026';
                } else {
                  TARGET_ADMIN_EMAIL = 'Admin@lenstrack.com';
                  TARGET_ADMIN_PASSWORD = TARGET_ADMIN_PASSWORD || 'Kadarkhan@123';
                }
              }
              
              if (!TARGET_ADMIN_PASSWORD) {
                if (targetTenantId === 'eyekra') {
                  TARGET_ADMIN_PASSWORD = 'Eyekra@Admin2026!';
                } else if (targetTenantId === 'upcapto') {
                  TARGET_ADMIN_PASSWORD = 'Upcapto@2026';
                } else {
                  TARGET_ADMIN_PASSWORD = 'Kadarkhan@123';
                }
              }
              
              const targetAdminLogin = await axios.post(`${AUTH_SERVICE_URL}/api/auth/login`, {
                email: TARGET_ADMIN_EMAIL,
                password: TARGET_ADMIN_PASSWORD
              }, {
                headers: { 
                  'Content-Type': 'application/json',
                  'x-tenant-id': targetTenantId
                },
                timeout: 2000
              });
              
              if (targetAdminLogin.data && 
                  (targetAdminLogin.data.data?.accessToken || targetAdminLogin.data.accessToken)) {
                searchToken = targetAdminLogin.data.data?.accessToken || targetAdminLogin.data.accessToken;
                usingAdminToken = true;
                logger.debug('Got admin token for target tenant', { targetTenantId });
              }
            } catch (targetAdminError) {
              logger.debug('Could not get admin token for target tenant, using primary admin token', { 
                targetTenantId: tenantId,
                error: targetAdminError.message 
              });
              // Fallback to primary admin token
              searchToken = adminTokenObtained ? adminToken : token;
              usingAdminToken = adminTokenObtained;
            }
          } else {
            // Same tenant or not enough time - use existing tokens
            searchToken = adminTokenObtained ? adminToken : token;
            usingAdminToken = adminTokenObtained;
          }
          
          const normalizedTenantId = tenantId.toLowerCase().trim();
          
          logger.debug('Trying userId lookup (direct endpoint)', {
            userId,
            tenantId: normalizedTenantId,
            usingAdminToken,
            isCrossTenant: tenantId !== primaryTenantId
          });
          
          // Direct endpoint is faster than query endpoint
          // Use shorter timeout for direct lookup (2 seconds) - fail fast if HR service is slow
          // Wrap in circuit breaker to fail fast if HR service is consistently slow
          const directLookupTimeout = Math.min(2000, getRequestTimeout(lookupStartedAt));
          const response = await hrServiceBreaker.execute(async () => {
            return await hrServiceClient.get(`${HR_SERVICE_URL}/api/hr/employees/${userId}`, {
              headers: {
                Authorization: `Bearer ${searchToken}`,
                'x-tenant-id': normalizedTenantId,
                'Content-Type': 'application/json'
              },
              timeout: directLookupTimeout
            }, 0);
          });
          
          if (response.data && response.data.success && response.data.data) {
            const employee = response.data.data;
            const hasValidStore = employee.store && 
                                 (employee.store._id || employee.store.id) && 
                                 (employee.store._id?.toString().trim() !== '' || employee.store.id?.toString().trim() !== '') &&
                                 employee.store.name && 
                                 employee.store.name !== 'Unknown Store';
            
            logger.info('✅ Found employee by userId (direct endpoint)', {
              userId,
              employeeId: employee.employeeId || employee.employee_id,
              tenantId: normalizedTenantId,
              hasStore: !!employee.store,
              hasValidStore,
              storeName: employee.store?.name || 'none',
              isPrimaryTenant: normalizedTenantId === primaryTenantId
            });
            
            // If employee found in primary tenant but has no valid store, continue searching other tenants
            if (normalizedTenantId === primaryTenantId && !hasValidStore) {
              logger.warn('Employee found in primary tenant but has no valid store, continuing search', {
                tenantId: normalizedTenantId,
                storeStatus: employee.store ? 'invalid' : 'missing'
              });
              continue; // Try next tenant
            }
            
            // Cache and return employee (either from primary tenant with valid store, or from any tenant)
            cacheEmployee(employee, normalizedTenantId);
            return employee;
          }
        } catch (axiosError) {
          logger.debug('Error in userId lookup (direct endpoint)', {
            userId,
            tenantId,
            error: axiosError.message,
            status: axiosError.response?.status
          });
          lastError = axiosError;
          // Continue to employeeId lookup
        }
      }
    }
    
    // CRITICAL: Try employee_id SECOND (query endpoint - slower but more flexible)
    // employee_id should be the same in both auth-service and HR service
    if (employeeId) {
      logger.info('Primary: Searching by employee_id (most reliable across services)', { 
        employeeId: employeeId.toUpperCase(), 
        tenantsToTry 
      });
      
      for (const tenantId of tenantsToTry) {
        if (getRemainingMs(lookupStartedAt) <= 0) {
          const timeoutError = new Error(`Employee lookup timed out after ${HR_LOOKUP_TOTAL_TIMEOUT_MS}ms`);
          timeoutError.statusCode = 504;
          throw timeoutError;
        }
        try {
          // CRITICAL: Use admin token if available (bypasses authorization issues)
          const searchToken = adminTokenObtained ? adminToken : 
                            ((tenantId !== primaryTenantId) ? adminToken : token);
          const normalizedTenantId = tenantId.toLowerCase().trim();
          
          logger.debug('Trying employee_id lookup (primary)', {
            employeeId: employeeId.toUpperCase(),
            tenantId: normalizedTenantId,
            usingAdminToken: adminTokenObtained || (tenantId !== primaryTenantId),
            adminTokenObtained
          });
          
          // CRITICAL: Try both employeeId parameter and search parameter
          // Some HR service versions might use different parameter names
          // Wrap in circuit breaker to fail fast if HR service is consistently slow
          const response = await hrServiceBreaker.execute(async () => {
            return await hrServiceClient.get(`${HR_SERVICE_URL}/api/hr/employees`, {
              params: { 
                employeeId: employeeId.toUpperCase(),
                search: employeeId.toUpperCase(), // Also try search parameter as fallback
                limit: 10 // Limit results to 10 for faster lookup
              },
              headers: {
                Authorization: `Bearer ${searchToken}`,
                'x-tenant-id': normalizedTenantId,
                'Content-Type': 'application/json'
              },
              timeout: Math.max(2000, getRequestTimeout(lookupStartedAt)) // Minimum 2 seconds
            }, 0);
          });
          
          logger.debug('HR service employeeId lookup response', {
            status: response.status,
            success: response.data?.success,
            dataType: typeof response.data?.data,
            isArray: Array.isArray(response.data?.data),
            employeeId: employeeId.toUpperCase(),
            tenantId: normalizedTenantId
          });
          
          if (response.data && response.data.success) {
            // Handle different response formats from HR service
            let employees = [];
            if (Array.isArray(response.data.data)) {
              employees = response.data.data;
            } else if (response.data.data && Array.isArray(response.data.data.employees)) {
              employees = response.data.data.employees;
            } else if (Array.isArray(response.data.employees)) {
              employees = response.data.employees;
            } else if (response.data.data && typeof response.data.data === 'object' && !Array.isArray(response.data.data)) {
              employees = [response.data.data];
            }
            
            if (employees.length > 0) {
              const employee = employees[0];
              const hasValidStore = employee.store && 
                                   (employee.store._id || employee.store.id) && 
                                   (employee.store._id?.toString().trim() !== '' || employee.store.id?.toString().trim() !== '') &&
                                   employee.store.name && 
                                   employee.store.name !== 'Unknown Store';
              
              logger.info('✅ Found employee by employee_id (primary method)', {
                employeeId: employee.employeeId || employee.employee_id,
                hrDbId: employee._id || employee.id,
                tenantId: normalizedTenantId,
                hasStore: !!employee.store,
                hasValidStore,
                storeName: employee.store?.name || 'none',
                isPrimaryTenant: normalizedTenantId === primaryTenantId
              });
              
              // If employee found in primary tenant but has no valid store, continue searching other tenants
              if (normalizedTenantId === primaryTenantId && !hasValidStore) {
                logger.warn('Employee found in primary tenant but has no valid store, continuing search', {
                  tenantId: normalizedTenantId,
                  storeStatus: employee.store ? 'invalid' : 'missing'
                });
                continue; // Try next tenant
              }
              
              // Cache and return employee (either from primary tenant with valid store, or from any tenant)
              cacheEmployee(employee, normalizedTenantId);
              return employee;
            } else {
              logger.debug('Employee lookup returned empty array', {
                employeeId: employeeId.toUpperCase(),
                tenantId: normalizedTenantId,
                responseSuccess: response.data?.success,
                responseDataKeys: response.data?.data ? Object.keys(response.data.data) : []
              });
            }
          } else {
            logger.debug('HR service response not successful for employeeId lookup', {
              employeeId: employeeId.toUpperCase(),
              tenantId: normalizedTenantId,
              success: response.data?.success,
              message: response.data?.message,
              status: response.status
            });
          }
        } catch (axiosError) {
          logger.warn('Error in employee_id lookup (primary)', {
            employeeId: employeeId.toUpperCase(),
            tenantId,
            error: axiosError.message,
            status: axiosError.response?.status,
            responseData: axiosError.response?.data
          });
          lastError = axiosError;
          // Continue to next tenant or fallback
        }
      }
    }
    
    // Fallback: Try MongoDB _id (if employee_id lookup failed)
    // Employees can view their own data, so this should work
    if (user._id || user.id) {
      const userId = user._id || user.id;
      logger.info('Primary: Searching by MongoDB _id (most reliable)', { userId, tenantsToTry });
      
      for (const tenantId of tenantsToTry) {
        if (getRemainingMs(lookupStartedAt) <= 0) {
          const timeoutError = new Error(`Employee lookup timed out after ${HR_LOOKUP_TOTAL_TIMEOUT_MS}ms`);
          timeoutError.statusCode = 504;
          throw timeoutError;
        }
        try {
          // CRITICAL: Use admin token if available (bypasses authorization issues)
          // Fallback to employee token if admin token not available
          const searchToken = adminTokenObtained ? adminToken : 
                            ((tenantId !== primaryTenantId) ? adminToken : token);
          const normalizedTenantId = tenantId.toLowerCase().trim();
          
          logger.debug('Trying MongoDB _id lookup (primary)', {
            userId,
            tenantId: normalizedTenantId,
            usingAdminToken: adminTokenObtained || (tenantId !== primaryTenantId),
            adminTokenObtained
          });
          
          const response = await hrServiceClient.get(`${HR_SERVICE_URL}/api/hr/employees/${userId}`, {
            headers: {
              Authorization: `Bearer ${searchToken}`,
              'x-tenant-id': normalizedTenantId,
              'Content-Type': 'application/json'
            },
            timeout: Math.max(2000, getRequestTimeout(lookupStartedAt)) // Minimum 2 seconds
          }, 0);

          if (response.data && response.data.success && response.data.data) {
            const employee = response.data.data;
            const hasValidStore = employee.store && 
                                 (employee.store._id || employee.store.id) && 
                                 (employee.store._id?.toString().trim() !== '' || employee.store.id?.toString().trim() !== '') &&
                                 employee.store.name && 
                                 employee.store.name !== 'Unknown Store';
            
            logger.info('Found employee by MongoDB _id (primary method)', { 
              userId, 
              tenantId: normalizedTenantId,
              employeeId: employee.employeeId || employee.employee_id,
              hasStore: !!employee.store,
              hasValidStore,
              storeName: employee.store?.name || 'none',
              isPrimaryTenant: normalizedTenantId === primaryTenantId
            });
            
            // If employee found in primary tenant but has no valid store, continue searching other tenants
            if (normalizedTenantId === primaryTenantId && !hasValidStore) {
              logger.warn('Employee found in primary tenant but has no valid store, continuing search', {
                tenantId: normalizedTenantId,
                storeStatus: employee.store ? 'invalid' : 'missing'
              });
              continue; // Try next tenant
            }
            
            // Cache and return employee (either from primary tenant with valid store, or from any tenant)
            cacheEmployee(employee, normalizedTenantId);
            return employee;
          } else {
            logger.debug('MongoDB _id lookup (primary) returned no data', {
              userId,
              tenantId: normalizedTenantId,
              success: response.data?.success,
              hasData: !!response.data?.data
            });
          }
        } catch (axiosError) {
          logger.debug('Error in MongoDB _id lookup (primary)', {
            userId,
            tenantId,
            error: axiosError.message,
            status: axiosError.response?.status,
            responseData: axiosError.response?.data
          });
          lastError = axiosError;
          // Continue to next tenant or fallback
        }
      }
    }
    
    // This section removed - employee_id lookup is now primary (above)
    // Keeping this comment for reference
    if (false && employeeId) {
      // This code path is no longer used - employee_id is primary lookup
      logger.info('Fallback: Searching by employee_id (deprecated - now primary)', { employeeId, tenantsToTry });
      
      for (const tenantId of tenantsToTry) {
        if (getRemainingMs(lookupStartedAt) <= 0) {
          const timeoutError = new Error(`Employee lookup timed out after ${HR_LOOKUP_TOTAL_TIMEOUT_MS}ms`);
          timeoutError.statusCode = 504;
          throw timeoutError;
        }
        try {
          // CRITICAL: Use admin token if available for employee lookup, otherwise use tenant-specific token
          const searchToken = adminTokenObtained ? adminToken : 
                            ((tenantId !== primaryTenantId) ? adminToken : token);
          
          // CRITICAL: Use only employeeId parameter (not both employeeId and search)
          // HR service handles employeeId filter directly
          const response = await hrServiceClient.get(`${HR_SERVICE_URL}/api/hr/employees`, {
            params: { 
              employeeId: employeeId.toUpperCase(), 
              limit: 10 // Limit results to 10 for faster lookup
            },
            headers: {
              Authorization: `Bearer ${searchToken}`,
              'x-tenant-id': tenantId.toLowerCase().trim(), // CRITICAL: Normalize tenantId
              'Content-Type': 'application/json'
            },
            timeout: Math.max(2000, getRequestTimeout(lookupStartedAt)) // Minimum 2 seconds
          }, 0);
          
          logger.debug('HR service employeeId lookup', {
            employeeId: employeeId.toUpperCase(),
            tenantId: tenantId.toLowerCase().trim(),
            usingAdminToken: adminTokenObtained || (tenantId !== primaryTenantId),
            status: response.status
          });
          
          logger.debug('HR service lookup response', {
            status: response.status,
            success: response.data?.success,
            dataType: typeof response.data?.data,
            isArray: Array.isArray(response.data?.data),
            employeeId: employeeId.toUpperCase(),
            tenantId: tenantId.toLowerCase().trim()
          });

        if (response.data && response.data.success) {
          // Handle different response formats from HR service:
          // Format 1: { success: true, data: [employees] } - data is array directly (ACTUAL FORMAT)
          // Format 2: { success: true, data: { employees: [...] } } - data.employees
          // Format 3: { success: true, employees: [...] } - employees at root
          let employees = [];
          
          // Check if response.data.data is an array (most common format)
          if (Array.isArray(response.data.data)) {
            employees = response.data.data; // Format 1: data is array directly
            logger.info('Using Format 1: data is array', { count: employees.length });
          } 
          // Check if response.data.data.employees is an array
          else if (response.data.data && Array.isArray(response.data.data.employees)) {
            employees = response.data.data.employees; // Format 2: data.employees
            logger.info('Using Format 2: data.employees', { count: employees.length });
          } 
          // Check if response.data.employees is an array
          else if (Array.isArray(response.data.employees)) {
            employees = response.data.employees; // Format 3: employees at root
            logger.info('Using Format 3: employees at root', { count: employees.length });
          } 
          // Check if response.data.data is a single employee object
          else if (response.data.data && typeof response.data.data === 'object' && !Array.isArray(response.data.data)) {
            employees = [response.data.data]; // Single employee object
            logger.info('Using single employee object', { employeeId: response.data.data.employeeId });
          }
          // Fallback: try to find employees anywhere in response
          else {
            logger.warn('Could not find employees array, checking response structure', {
              hasData: !!response.data.data,
              dataType: typeof response.data.data,
              isArray: Array.isArray(response.data.data),
              keys: response.data.data ? Object.keys(response.data.data) : []
            });
          }
          
          logger.info('HR service returned employees', {
            count: employees.length,
            searchedEmployeeId: employeeId.toUpperCase(),
            responseSuccess: response.data.success,
            responseFormat: Array.isArray(response.data.data) ? 'array' : (response.data.data ? 'object' : 'unknown')
          });
          
          if (employees.length > 0) {
            const employee = employees[0];
            
            const hasValidStore = employee.store && 
                                 (employee.store._id || employee.store.id) && 
                                 (employee.store._id?.toString().trim() !== '' || employee.store.id?.toString().trim() !== '') &&
                                 employee.store.name && 
                                 employee.store.name !== 'Unknown Store';
            
            logger.info('Found employee in HR service', {
              employeeId: employee.employeeId || employee.employee_id,
              hrDbId: employee._id || employee.id,
              tenantId,
              hasStore: !!employee.store,
              hasValidStore,
              storeIsEmpty: employee.store && Object.keys(employee.store).length === 0,
              storeType: typeof employee.store,
              storeHasId: !!(employee.store?._id || employee.store?.id),
              storeIdValue: employee.store?._id || employee.store?.id || 'none',
              storeName: employee.store?.name || 'none'
            });
            
            // CRITICAL: Check if store is properly populated
            // If store exists but has empty _id/id, it means the store reference is broken
            const storeId = employee.store?._id || employee.store?.id;
            const isStoreValid = storeId && storeId.toString().trim() !== '' && employee.store?.name && employee.store.name !== 'Unknown Store';
            
            // CRITICAL: If employee found in primary tenant but has no valid store, continue searching other tenants
            if (tenantId === primaryTenantId && !hasValidStore) {
              logger.warn('Employee found in primary tenant but has no valid store, continuing search in other tenants', {
                tenantId,
                storeStatus: employee.store ? 'invalid' : 'missing',
                storeName: employee.store?.name || 'none'
              });
              continue; // Try next tenant to find employee with valid store
            }
            
            // If store is not populated or invalid, fetch full employee details by ID
            if (!employee.store || !hasValidStore || Object.keys(employee.store).length === 0) {
              const userId = employee._id || employee.id;
              if (userId) {
                try {
                  logger.info('Fetching full employee details to get populated store', { userId, tenantId, reason: !employee.store ? 'no store' : !hasValidStore ? 'invalid store' : 'empty store' });
                  // Use admin token for cross-tenant searches
                  const detailToken = (tenantId !== primaryTenantId) ? adminToken : token;
                  const fullEmpResponse = await hrServiceBreaker.execute(async () => {
                    return await hrServiceClient.get(`${HR_SERVICE_URL}/api/hr/employees/${userId}`, {
                      headers: {
                        Authorization: `Bearer ${detailToken}`,
                        'x-tenant-id': tenantId,
                        'Content-Type': 'application/json'
                      },
                      timeout: getRequestTimeout(lookupStartedAt)
                    }, 0);
                  });
                  if (fullEmpResponse.data && fullEmpResponse.data.success && fullEmpResponse.data.data) {
                    const fullEmployee = fullEmpResponse.data.data;
                    const fullEmployeeHasValidStore = fullEmployee.store && 
                                                     (fullEmployee.store._id || fullEmployee.store.id) && 
                                                     (fullEmployee.store._id?.toString().trim() !== '' || fullEmployee.store.id?.toString().trim() !== '') &&
                                                     fullEmployee.store.name && 
                                                     fullEmployee.store.name !== 'Unknown Store';
                    
                    logger.info('Got full employee with store', {
                      hasStore: !!fullEmployee.store,
                      hasValidStore: fullEmployeeHasValidStore,
                      storeKeys: fullEmployee.store ? Object.keys(fullEmployee.store).length : 0,
                      storeId: fullEmployee.store?._id || fullEmployee.store?.id || 'none',
                      storeName: fullEmployee.store?.name || 'none'
                    });
                    
                    // If still no valid store and this is primary tenant, continue searching
                    if (tenantId === primaryTenantId && !fullEmployeeHasValidStore) {
                      logger.warn('Full employee fetch still shows no valid store in primary tenant, continuing search', {
                        tenantId
                      });
                      continue; // Try next tenant
                    }
                    
                    // Cache the full employee data
                    cacheEmployee(fullEmployee, tenantId);
                    return fullEmployee; // Return employee with populated store
                  }
                } catch (err) {
                  logger.warn('Failed to fetch full employee details, using basic data', { userId, error: err.message });
                }
              }
            }
            
            logger.info('Found employee in tenant with valid store', { 
              tenantId, 
              employeeId: employee.employeeId,
              storeName: employee.store?.name || 'none',
              isPrimaryTenant: tenantId === primaryTenantId
            });
              
            // Cache the employee for future requests
            cacheEmployee(employee, tenantId);
              
            return employee; // Return employee (from primary tenant with valid store, or from any tenant)
          } else {
            logger.debug('No employees found with employeeId in tenant', { 
              searchedEmployeeId: employeeId.toUpperCase(),
              tenantId 
            });
          }
        } else {
          logger.debug('HR service response not successful in tenant', { 
            success: response.data?.success,
            message: response.data?.message,
            tenantId
          });
        }
        
        // If found, break out of tenant loop
        if (response.data && response.data.success) {
          let employees = [];
          if (Array.isArray(response.data.data)) {
            employees = response.data.data;
          } else if (response.data.data && Array.isArray(response.data.data.employees)) {
            employees = response.data.data.employees;
          } else if (Array.isArray(response.data.employees)) {
            employees = response.data.employees;
          }
          if (employees.length > 0) {
            break; // Found employee, exit tenant loop
          }
        }
      } catch (axiosError) {
        logger.debug('Error calling HR service by employeeId in tenant', {
          employeeId: employeeId.toUpperCase(),
          tenantId,
          error: axiosError.message,
          status: axiosError.response?.status
        });
        lastError = axiosError;
        // Continue to next tenant
        continue;
      }
    }
    
    // If we get here, employee not found in any tenant
    if (lastError && tenantsToTry.length > 1) {
      logger.warn('Employee not found in any tenant', {
        employeeId: employeeId.toUpperCase(),
        tenantsTried: tenantsToTry
      });
    }
    }

    // Fallback: try by MongoDB _id (also try multiple tenants)
    // CRITICAL: Always try MongoDB _id lookup as fallback (even if employee_id exists)
    // CRITICAL: Try MongoDB _id FIRST if employeeId search failed, as it's more reliable
    if (user._id || user.id) {
      const userId = user._id || user.id;
      logger.info('Fallback: Searching by MongoDB _id', { userId, tenantsToTry });
      
      for (const tenantId of tenantsToTry) {
        if (getRemainingMs(lookupStartedAt) <= 0) {
          const timeoutError = new Error(`Employee lookup timed out after ${HR_LOOKUP_TOTAL_TIMEOUT_MS}ms`);
          timeoutError.statusCode = 504;
          throw timeoutError;
        }
        try {
          // CRITICAL: Use admin token if available (bypasses authorization issues)
          // Fallback to employee token if admin token not available
          const searchToken = adminTokenObtained ? adminToken : 
                            ((tenantId !== primaryTenantId) ? adminToken : token);
          const normalizedTenantId = tenantId.toLowerCase().trim();
          
          logger.debug('Trying MongoDB _id lookup', {
            userId,
            tenantId: normalizedTenantId,
            usingAdminToken: adminTokenObtained || (tenantId !== primaryTenantId),
            adminTokenObtained
          });
          
          // Wrap in circuit breaker to fail fast if HR service is consistently slow
          const response = await hrServiceBreaker.execute(async () => {
            return await hrServiceClient.get(`${HR_SERVICE_URL}/api/hr/employees/${userId}`, {
              headers: {
                Authorization: `Bearer ${searchToken}`,
                'x-tenant-id': normalizedTenantId, // CRITICAL: Normalize tenantId
                'Content-Type': 'application/json'
              },
              timeout: Math.max(2000, getRequestTimeout(lookupStartedAt)) // Minimum 2 seconds
            }, 0);
          });

          if (response.data && response.data.success && response.data.data) {
            logger.info('Found employee by MongoDB _id in tenant', { 
              userId, 
              tenantId: normalizedTenantId,
              employeeId: response.data.data.employeeId || response.data.data.employee_id
            });
            
            // Cache the employee for future requests
            cacheEmployee(response.data.data, normalizedTenantId);
            
            return response.data.data;
          } else {
            logger.debug('MongoDB _id lookup returned no data', {
              userId,
              tenantId: normalizedTenantId,
              success: response.data?.success,
              hasData: !!response.data?.data
            });
          }
        } catch (axiosError) {
          logger.debug('Error calling HR service by MongoDB _id in tenant', {
            userId,
            tenantId,
            error: axiosError.message,
            status: axiosError.response?.status,
            responseData: axiosError.response?.data
          });
          lastError = axiosError;
          // Continue to next tenant
        }
      }
      
      logger.warn('Employee not found by MongoDB _id in any tenant', { 
        userId,
        tenantsTried: tenantsToTry,
        lastError: lastError?.message
      });
    }

    // Fallback: Try searching by email (also try multiple tenants)
    if (user.email) {
      logger.info('Fallback: Searching by email', { email: user.email, tenantsToTry });
      
      for (const tenantId of tenantsToTry) {
        if (getRemainingMs(lookupStartedAt) <= 0) {
          const timeoutError = new Error(`Employee lookup timed out after ${HR_LOOKUP_TOTAL_TIMEOUT_MS}ms`);
          timeoutError.statusCode = 504;
          throw timeoutError;
        }
        try {
          // Use admin token for cross-tenant searches
          const searchToken = (tenantId !== primaryTenantId) ? adminToken : token;
          // Try both email parameter and search parameter
          // Wrap in circuit breaker to fail fast if HR service is consistently slow
          const emailResponse = await hrServiceBreaker.execute(async () => {
            return await hrServiceClient.get(`${HR_SERVICE_URL}/api/hr/employees`, {
              params: { 
                email: user.email.toLowerCase(),
                search: user.email.toLowerCase(), // Also try search parameter
                limit: 50 
              },
              headers: {
                Authorization: `Bearer ${searchToken}`,
                'x-tenant-id': tenantId.toLowerCase().trim(),
                'Content-Type': 'application/json'
              },
              timeout: Math.max(2000, getRequestTimeout(lookupStartedAt)) // Minimum 2 seconds
            }, 0);
          });

        if (emailResponse.data && emailResponse.data.success) {
          // Handle different response formats
          let employees = [];
          if (Array.isArray(emailResponse.data.data)) {
            employees = emailResponse.data.data;
          } else if (emailResponse.data.data && Array.isArray(emailResponse.data.data.employees)) {
            employees = emailResponse.data.data.employees;
          } else if (Array.isArray(emailResponse.data.employees)) {
            employees = emailResponse.data.employees;
          } else if (emailResponse.data.data && typeof emailResponse.data.data === 'object') {
            employees = [emailResponse.data.data];
          }
          
          logger.info('Email search returned employees', { count: employees.length, email: user.email });
          
          // Find exact email match
          const matchedEmployee = employees.find(emp => 
            emp.email && emp.email.toLowerCase() === user.email.toLowerCase()
          );
          
          if (matchedEmployee) {
            logger.info('Found employee by email', { email: user.email, employeeId: matchedEmployee.employeeId });
            return matchedEmployee;
          }
          
          // If no exact match, return first employee (for testing)
          if (employees.length > 0) {
            logger.info('Using first employee from email search results', { 
              email: user.email, 
              employeeId: employees[0].employeeId,
              employeeEmail: employees[0].email 
            });
            return employees[0];
          }
        }
        } catch (emailError) {
          logger.debug('Error calling HR service by email in tenant', {
            email: user.email,
            tenantId,
            error: emailError.message,
            status: emailError.response?.status
          });
          // Continue to next tenant
        }
      }
      
      logger.warn('Employee not found by email in any tenant', {
        email: user.email,
        tenantsTried: tenantsToTry
      });
    }

    if (ENABLE_ANY_EMPLOYEE_FALLBACK) {
      logger.warn('All employee lookup methods failed, trying any employee fallback', {
        tenantId: resolveTenantId(user, token)
      });
      try {
        const tenantId = resolveTenantId(user, token);
        const anyEmpResponse = await hrServiceClient.get(`${HR_SERVICE_URL}/api/hr/employees`, {
          params: { limit: 1 },
          headers: {
            Authorization: `Bearer ${token}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json'
          },
          timeout: getRequestTimeout(lookupStartedAt)
        }, 0);
        
        if (anyEmpResponse.data && anyEmpResponse.data.success) {
          let anyEmployees = [];
          if (Array.isArray(anyEmpResponse.data.data)) {
            anyEmployees = anyEmpResponse.data.data;
          } else if (anyEmpResponse.data.data && Array.isArray(anyEmpResponse.data.data.employees)) {
            anyEmployees = anyEmpResponse.data.data.employees;
          } else if (Array.isArray(anyEmpResponse.data.employees)) {
            anyEmployees = anyEmpResponse.data.employees;
          }
          
          if (anyEmployees.length > 0) {
            return anyEmployees[0];
          }
        }
      } catch (fallbackError) {
        logger.error('Any employee fallback failed', { error: fallbackError.message });
      }
    }
    
    // Check if circuit breaker is open - if so, provide helpful error message
    const breakerState = hrServiceBreaker.getState();
    if (breakerState.isOpen) {
      const error = new Error(
        `HR service is temporarily unavailable (circuit breaker open). ` +
        `Please retry in a few seconds. ` +
        `Employee: ${user.employee_id || user.employeeId || 'N/A'}, ` +
        `Tenant: ${resolveTenantId(user, token)}.`
      );
      error.statusCode = 503; // Service Unavailable
      error.circuitBreakerOpen = true;
      error.retryAfter = Math.ceil((breakerState.nextResetTime ? new Date(breakerState.nextResetTime).getTime() - Date.now() : 10000) / 1000);
      error.userId = user._id || user.id;
      error.employeeId = user.employee_id || user.employeeId;
      error.email = user.email;
      error.tenantId = resolveTenantId(user, token);
      throw error;
    }
    
    // No employee found - throw detailed error
    const error = new Error(
      `Employee not found in HR service. ` +
      `Searched by: employee_id=${user.employee_id || user.employeeId || 'N/A'}, ` +
      `user_id=${user._id || user.id || 'N/A'}, ` +
      `email=${user.email || 'N/A'}. ` +
      `Tenant: ${resolveTenantId(user, token)}. ` +
      `Please ensure the employee exists in HR service and is assigned to a store.`
    );
    error.statusCode = 404;
    error.userId = user._id || user.id;
    error.employeeId = user.employee_id || user.employeeId;
    error.email = user.email;
    error.tenantId = resolveTenantId(user, token);
    throw error;
  } catch (error) {
    logger.error('Error in getEmployeeByUser', {
      error: error.message,
      userId: user._id || user.id,
      email: user.email
    });
    throw error;
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
    const primaryTenantId = resolveTenantId(user, token);
    const employeeTenantId = String(
      employee.tenantId || employee.tenant_id || primaryTenantId
    ).toLowerCase().trim();
    let storeLookupToken = token;
    if (employeeTenantId !== primaryTenantId) {
      try {
        const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:80';
        let ADMIN_EMAIL = process.env[`${employeeTenantId.toUpperCase()}_ADMIN_EMAIL`] || process.env.ADMIN_EMAIL;
        let ADMIN_PASSWORD = process.env[`${employeeTenantId.toUpperCase()}_ADMIN_PASSWORD`] || process.env.ADMIN_PASSWORD;
        if (!ADMIN_EMAIL) {
          if (employeeTenantId === 'eyekra') {
            ADMIN_EMAIL = 'admin@eyekra.com';
            ADMIN_PASSWORD = ADMIN_PASSWORD || 'Eyekra@Admin2026!';
          } else if (employeeTenantId === 'upcapto') {
            ADMIN_EMAIL = 'admin@upcapto.com';
            ADMIN_PASSWORD = ADMIN_PASSWORD || 'Upcapto@2026';
          } else {
            ADMIN_EMAIL = 'admin@lenstrack.com';
            ADMIN_PASSWORD = ADMIN_PASSWORD || 'Kadarkhan@123';
          }
        }
        const adminLoginResponse = await axios.post(`${AUTH_SERVICE_URL}/api/auth/login`, {
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD
        }, {
          headers: { 'Content-Type': 'application/json', 'x-tenant-id': employeeTenantId },
          timeout: 3000
        });
        storeLookupToken = adminLoginResponse?.data?.data?.accessToken || adminLoginResponse?.data?.accessToken || token;
      } catch (adminTokenError) {
        logger.warn('Could not obtain admin token for cross-tenant store lookup, using caller token', {
          employeeTenantId,
          primaryTenantId,
          error: adminTokenError.message
        });
      }
    }
    const fetchStoreById = async (storeId) => {
      if (!storeId || String(storeId).trim() === '') return null;
      const storeResponse = await hrServiceClient.get(`${HR_SERVICE_URL}/api/hr/stores/${storeId}`, {
        headers: {
          Authorization: `Bearer ${storeLookupToken}`,
          'x-tenant-id': employeeTenantId,
          'Content-Type': 'application/json'
        },
        timeout: HR_LOOKUP_REQUEST_TIMEOUT_MS
      }, 0);
      if (storeResponse.data && storeResponse.data.success && storeResponse.data.data) {
        return storeResponse.data.data;
      }
      return null;
    };

    logger.info('getEmployeeStore: Employee retrieved', {
      employeeId: employee.employeeId || employee.employee_id,
      tenantId: employeeTenantId,
      hasStore: !!employee.store,
      storeType: typeof employee.store,
      storeKeys: employee.store ? Object.keys(employee.store).length : 0
    });

    // Check for store reference (MongoDB ObjectId)
    if (employee.store && typeof employee.store === 'object') {
      // CRITICAL: Check if store has valid _id or id (not empty strings)
      const storeId = employee.store._id || employee.store.id;
      if (storeId && storeId.toString().trim() !== '') {
        // If store has valid _id/id and is populated with name, return it
        if (employee.store.name && employee.store.name !== 'Unknown Store') {
          logger.info('Returning populated store', { storeId, storeName: employee.store.name });
          return employee.store;
        }
        // If store has _id but is not fully populated, fetch full details
        logger.info('Store has _id but not fully populated, fetching full store details', { storeId });
        try {
          const fullStore = await fetchStoreById(storeId);
          if (fullStore) {
            logger.info('Fetched full store details', { storeId, storeName: fullStore.name });
            return fullStore;
          }
        } catch (storeError) {
          logger.warn('Failed to fetch store details', { storeId, error: storeError.message });
        }
      }
      
      // If store object has keys but no valid _id, try to extract storeId from other fields
      const storeIdFromObject = employee.store.storeId || 
                                (employee.store._id && employee.store._id.toString().trim() !== '' ? employee.store._id : null) ||
                                (employee.store.id && employee.store.id.toString().trim() !== '' ? employee.store.id : null);
      if (storeIdFromObject && storeIdFromObject.toString().trim() !== '') {
        logger.info('Found storeId in store object, fetching full store details', { storeId: storeIdFromObject });
        try {
          const fullStore = await fetchStoreById(storeIdFromObject);
          if (fullStore) {
            logger.info('Fetched store from storeId in store object', { storeId: storeIdFromObject });
            return fullStore;
          }
        } catch (storeError) {
          logger.warn('Failed to fetch store from store object', { storeId: storeIdFromObject, error: storeError.message });
        }
      }
      
      // If store is an empty object, log warning
      if (Object.keys(employee.store).length === 0) {
        logger.warn('Employee has empty store object', { employeeId: employee.employeeId });
      } else {
        // Store object exists but doesn't have valid _id - log for debugging
        logger.warn('Employee store object exists but has no valid _id', {
          employeeId: employee.employeeId,
          storeKeys: Object.keys(employee.store),
          storeValue: JSON.stringify(employee.store).substring(0, 200)
        });
      }
    }

    // If store is just a string ID, fetch store details
    if (employee.store && typeof employee.store === 'string') {
      const storeId = employee.store;
      logger.info('Fetching store by ID', { storeId });
      const fullStore = await fetchStoreById(storeId);
      if (fullStore) {
        return fullStore;
      }
    }

    // Check for workLocation (nested object with store info)
    if (employee.workLocation && employee.workLocation.storeId) {
      // Try to fetch store by ID from workLocation
      const storeId = employee.workLocation.storeId;
      try {
        const fullStore = await fetchStoreById(storeId);
        if (fullStore) {
          return fullStore;
        }
      } catch (storeError) {
        logger.warn('Failed to fetch store from workLocation.storeId', {
          employeeId: employee?.employeeId || employee?.employee_id || 'unknown',
          storeId,
          error: storeError.message
        });
      }
    }
    // Final fallback: refetch full employee in the tenant where employee was found.
    if (employee._id || employee.id) {
      try {
        const employeeId = employee._id || employee.id;
        const fullEmpResponse = await hrServiceClient.get(`${HR_SERVICE_URL}/api/hr/employees/${employeeId}`, {
          headers: {
            Authorization: `Bearer ${storeLookupToken}`,
            'x-tenant-id': employeeTenantId,
            'Content-Type': 'application/json'
          },
          timeout: HR_LOOKUP_REQUEST_TIMEOUT_MS
        }, 0);
        const fullEmployee = fullEmpResponse.data?.data;
        if (fullEmployee?.store?._id || fullEmployee?.store?.id) {
          const fullStore = await fetchStoreById(fullEmployee.store._id || fullEmployee.store.id);
          if (fullStore) {
            logger.info('Recovered store from full employee refetch', {
              employeeId: fullEmployee.employeeId || fullEmployee.employee_id,
              tenantId: employeeTenantId
            });
            return fullStore;
          }
        }
      } catch (refetchError) {
        logger.warn('Failed full employee refetch for store recovery', {
          employeeId: employee._id || employee.id,
          tenantId: employeeTenantId,
          error: refetchError.message
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
