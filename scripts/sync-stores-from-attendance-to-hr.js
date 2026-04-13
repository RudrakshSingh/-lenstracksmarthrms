#!/usr/bin/env node
/**
 * Sync Store Assignments from Attendance to HR Service
 * 
 * This script updates all employee records in HR service with store information
 * from their attendance records. It works across all tenants.
 * 
 * Usage:
 *   BACKEND_URL=http://your-api.com ADMIN_EMAIL=admin@upcapto.com ADMIN_PASSWORD=pass node scripts/sync-stores-from-attendance-to-hr.js
 */

const rawBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000'
const BASE = rawBase.replace(/\/+$/, '')
const API_BASE = BASE.endsWith('/api') ? BASE : `${BASE}/api`

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@upcapto.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Upcapto@2026'

// Tenant-specific admin credentials
const TENANT_ADMINS = {
  upcapto: { email: 'admin@upcapto.com', password: 'Upcapto@2026' },
  lenstrack: { email: 'admin@lenstrack.com', password: 'AdminPass123!' },
  eyekra: { email: 'admin@eyekra.com', password: 'Eyekra@Admin2026!' },
  default: { email: 'admin@upcapto.com', password: 'Upcapto@2026' } // Fallback to upcapto
}

// For default tenant, we can also try employee credentials if admin doesn't work
const DEFAULT_TENANT_EMPLOYEES = [
  { email: 'Aditya@gmail.com', password: 'yrv0s48mA1!', employeeId: 'EMP-2026-853999' }
]

async function fetchResp(url, options = {}) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...options.headers },
    })
    
    clearTimeout(timeoutId)
    const text = await res.text()
    let data
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { _raw: text.slice(0, 500) }
    }
    return { ok: res.ok, status: res.status, data }
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timeout: ${url}`)
    }
    if (err.code === 'ENOTFOUND' || err.cause?.code === 'ENOTFOUND') {
      throw new Error(`DNS resolution failed for ${url}`)
    }
    throw err
  }
}

async function login(email, password) {
  const url = `${API_BASE}/auth/login`
  const { ok, status, data } = await fetchResp(url, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (!ok) {
    throw new Error(`Login failed: ${status} ${JSON.stringify(data)}`)
  }
  
  const responseData = data.data || data
  const token = responseData.accessToken || data.accessToken
  const user = responseData.user || data.user
  
  if (!token) {
    throw new Error('No token in response')
  }
  
  let tenantId = null
  try {
    const jwt = require('jsonwebtoken')
    const decoded = jwt.decode(token)
    tenantId = decoded?.tenantId || decoded?.tenant_id
    if (tenantId) {
      tenantId = String(tenantId).toLowerCase().trim()
    }
  } catch (e) {
    // Ignore
  }
  
  if (!tenantId) {
    tenantId = user?.tenantId || user?.tenant_id || responseData.user?.tenantId
    if (tenantId) {
      tenantId = String(tenantId).toLowerCase().trim()
    }
  }
  
  return { token, tenantId, user, employeeId: user?.employee_id || user?.employeeId, userId: user?._id || user?.id }
}

function authHeaders(token, tenantId) {
  const h = { 'Content-Type': 'application/json', Accept: 'application/json' }
  h.Authorization = `Bearer ${token}`
  if (tenantId) {
    h['x-tenant-id'] = String(tenantId).toLowerCase().trim()
  }
  return h
}

async function getAllEmployees(token, tenantId, page = 1, limit = 100) {
  const url = `${API_BASE}/hr/employees?page=${page}&limit=${limit}`
  const { ok, status, data } = await fetchResp(url, {
    method: 'GET',
    headers: authHeaders(token, tenantId),
  })
  
  if (!ok) {
    return { employees: [], total: 0, hasMore: false }
  }
  
  const employees = data.data?.employees || data.employees || data.data || []
  const total = data.pagination?.total || data.total || employees.length
  const currentPage = data.pagination?.current || page
  const totalPages = data.pagination?.pages || Math.ceil(total / limit)
  
  return {
    employees,
    total,
    currentPage,
    totalPages,
    hasMore: currentPage < totalPages
  }
}

async function getEmployeeAttendanceStore(token, tenantId, employeeId, employeeMongoId) {
  try {
    // Try multiple approaches to get attendance store
    
    // Approach 1: Try with employeeId (string like EMP-2026-853999)
    let url = `${API_BASE}/attendance/today?employeeId=${employeeId}`
    let { ok, status, data } = await fetchResp(url, {
      method: 'GET',
      headers: authHeaders(token, tenantId),
    })
    
    if (ok && data.data) {
      const storeId = data.data.storeId || data.data.store?._id || data.data.store?.id
      if (storeId) {
        return { storeId: storeId.toString(), found: true, source: 'today-employeeId' }
      }
    }
    
    // Approach 2: Try with MongoDB _id if available
    if (employeeMongoId) {
      url = `${API_BASE}/attendance/today?employeeId=${employeeMongoId}`
      const mongoRes = await fetchResp(url, {
        method: 'GET',
        headers: authHeaders(token, tenantId),
      })
      
      if (mongoRes.ok && mongoRes.data.data) {
        const storeId = mongoRes.data.data.storeId || mongoRes.data.data.store?._id || mongoRes.data.data.store?.id
        if (storeId) {
          return { storeId: storeId.toString(), found: true, source: 'today-mongoId' }
        }
      }
    }
    
    // Approach 3: Try to get recent attendance records with employeeId
    const historyUrl = `${API_BASE}/attendance/history?employeeId=${employeeId}&limit=20`
    const historyRes = await fetchResp(historyUrl, {
      method: 'GET',
      headers: authHeaders(token, tenantId),
    })
    
    if (historyRes.ok && historyRes.data.data) {
      const records = Array.isArray(historyRes.data.data) ? historyRes.data.data : [historyRes.data.data]
      for (const record of records) {
        const storeId = record.storeId || record.store?._id || record.store?.id
        if (storeId) {
          return { storeId: storeId.toString(), found: true, source: 'history' }
        }
      }
    }
    
    // Approach 4: Try with MongoDB _id for history
    if (employeeMongoId) {
      const mongoHistoryUrl = `${API_BASE}/attendance/history?employeeId=${employeeMongoId}&limit=20`
      const mongoHistoryRes = await fetchResp(mongoHistoryUrl, {
        method: 'GET',
        headers: authHeaders(token, tenantId),
      })
      
      if (mongoHistoryRes.ok && mongoHistoryRes.data.data) {
        const records = Array.isArray(mongoHistoryRes.data.data) ? mongoHistoryRes.data.data : [mongoHistoryRes.data.data]
        for (const record of records) {
          const storeId = record.storeId || record.store?._id || record.store?.id
          if (storeId) {
            return { storeId: storeId.toString(), found: true, source: 'history-mongoId' }
          }
        }
      }
    }
    
    return { storeId: null, found: false }
  } catch (error) {
    return { storeId: null, found: false, error: error.message }
  }
}

async function updateEmployeeStore(token, tenantId, employeeId, storeId) {
  const url = `${API_BASE}/hr/employees/${employeeId}`
  const { ok, status, data } = await fetchResp(url, {
    method: 'PUT',
    headers: authHeaders(token, tenantId),
    body: JSON.stringify({ storeId: storeId }),
  })
  
  if (ok) {
    return { success: true, employee: data.data || data }
  } else {
    return { success: false, error: data?.error || data?.message, status, response: data }
  }
}

async function processTenant(adminToken, tenantId) {
  console.log(`\n📋 Processing tenant: ${tenantId}`)
  console.log('='.repeat(60))
  
  // First, get total count to show progress
  const initialCheck = await getAllEmployees(adminToken, tenantId, 1, 1)
  const totalInTenant = initialCheck.total || 0
  if (totalInTenant === 0) {
    console.log(`  ℹ️  No employees found in tenant "${tenantId}"`)
    return {
      tenantId,
      totalProcessed: 0,
      totalUpdated: 0,
      totalSkipped: 0,
      totalErrors: 0
    }
  }
  console.log(`  📊 Total employees in ${tenantId}: ${totalInTenant}`)
  
  let page = 1
  let totalProcessed = 0
  let totalUpdated = 0
  let totalSkipped = 0
  let totalErrors = 0
  
  while (true) {
    const result = await getAllEmployees(adminToken, tenantId, page, 100)
    const employees = result.employees || []
    
    if (employees.length === 0) {
      break
    }
    
    console.log(`\n  Page ${page}/${result.totalPages || 1}: Found ${employees.length} employees`)
    
    for (const employee of employees) {
      totalProcessed++
      const empId = employee._id || employee.id
      const empEmployeeId = employee.employeeId || employee.employee_id
      
      // Check if employee already has a valid store
      const currentStore = employee.store
      const hasValidStore = currentStore && 
                          (currentStore._id || currentStore.id) &&
                          currentStore.name &&
                          currentStore.name !== 'Unknown Store' &&
                          currentStore.name !== ''
      
      if (hasValidStore) {
        console.log(`  ✓ ${empEmployeeId}: Already has store "${currentStore.name}"`)
        totalSkipped++
        continue
      }
      
      // Get employee's actual tenant (they might be in a different tenant)
      const employeeTenantId = (employee.tenantId || employee.tenant_id || tenantId).toLowerCase().trim()
      
      // Get store from attendance (try both employeeId and MongoDB _id, using employee's tenant)
      const attendanceStore = await getEmployeeAttendanceStore(adminToken, employeeTenantId, empEmployeeId || empId, empId)
      
      if (!attendanceStore.found || !attendanceStore.storeId) {
        console.log(`  ⚠ ${empEmployeeId}: No store found in attendance records`)
        totalSkipped++
        continue
      }
      
      // Update employee with store (try employee's tenant first, then fallback to admin tenant)
      console.log(`  🔄 ${empEmployeeId}: Updating with store ${attendanceStore.storeId} (from ${attendanceStore.source})`)
      let updateResult = await updateEmployeeStore(adminToken, employeeTenantId, empId, attendanceStore.storeId)
      
      // If update failed due to tenant mismatch, try with admin's tenant
      if (!updateResult.success && (updateResult.status === 403 || updateResult.status === 404)) {
        console.log(`  ⚠ ${empEmployeeId}: Retrying with admin tenant...`)
        updateResult = await updateEmployeeStore(adminToken, tenantId, empId, attendanceStore.storeId)
      }
      
      if (updateResult.success) {
        console.log(`  ✅ ${empEmployeeId}: Store updated successfully`)
        totalUpdated++
      } else {
        console.log(`  ❌ ${empEmployeeId}: Failed to update - ${updateResult.error || updateResult.status}`)
        // If it's a 404, the employee might be in a different tenant - log for manual review
        if (updateResult.status === 404) {
          console.log(`     Note: Employee might be in tenant "${employeeTenantId}" but admin can't access it`)
        }
        totalErrors++
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    if (!result.hasMore) {
      break
    }
    
    page++
  }
  
  return {
    tenantId,
    totalProcessed,
    totalUpdated,
    totalSkipped,
    totalErrors
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('Sync Store Assignments from Attendance to HR Service')
  console.log('='.repeat(60))
  console.log(`Backend API: ${API_BASE}`)
  console.log(`Admin Email: ${ADMIN_EMAIL}`)
  console.log('')
  
  // Step 1: Login as admin
  console.log('🔐 Logging in as admin...')
  const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD)
  console.log(`✅ Logged in - Tenant: ${adminLogin.tenantId}, User ID: ${adminLogin.userId}`)
  
  // Step 2: Get list of tenants and login as admin for each tenant
  console.log(`\n📋 Discovering tenants and logging in as admin for each...`)
  
  const tenantsToCheck = ['upcapto', 'lenstrack', 'eyekra', 'default']
  const tenantLogins = []
  
  // Login as admin for each tenant to access their employees
  for (const tenantId of tenantsToCheck) {
    try {
      const tenantAdmin = TENANT_ADMINS[tenantId] || TENANT_ADMINS.default
      console.log(`  🔐 Logging in for ${tenantId}...`)
      let tenantLogin
      
      try {
        tenantLogin = await login(tenantAdmin.email, tenantAdmin.password)
      } catch (loginError) {
        // For default tenant, try employee credentials as fallback
        if (tenantId === 'default' && DEFAULT_TENANT_EMPLOYEES.length > 0) {
          console.log(`  ⚠ ${tenantId}: Admin login failed, trying employee credentials...`)
          const empCreds = DEFAULT_TENANT_EMPLOYEES[0]
          tenantLogin = await login(empCreds.email, empCreds.password)
          console.log(`  ✅ ${tenantId}: Logged in as employee ${empCreds.employeeId}`)
        } else {
          throw loginError
        }
      }
      
      // Check if this tenant has employees (use the tenant from login, not the requested one)
      const actualTenantId = tenantLogin.tenantId || tenantId
      const testResult = await getAllEmployees(tenantLogin.token, actualTenantId, 1, 1)
      const totalEmployees = testResult.total || 0
      
      if (totalEmployees > 0 || testResult.employees.length > 0) {
        tenantLogins.push({
          tenantId: actualTenantId,
          token: tenantLogin.token,
          totalEmployees: totalEmployees
        })
        console.log(`  ✅ ${actualTenantId}: ${totalEmployees} employees found`)
      } else {
        console.log(`  ⚠ ${actualTenantId}: No employees found`)
      }
    } catch (error) {
      console.log(`  ❌ ${tenantId}: Failed to login or check - ${error.message}`)
    }
  }
  
  if (tenantLogins.length === 0) {
    console.log('\n⚠️  No tenants with employees found. Using main admin token...')
    tenantLogins.push({
      tenantId: adminLogin.tenantId,
      token: adminLogin.token,
      totalEmployees: 0
    })
  }
  
  console.log(`\n📋 Will process ${tenantLogins.length} tenant(s): ${tenantLogins.map(t => `${t.tenantId} (${t.totalEmployees})`).join(', ')}`)
  
  const results = []
  
  // Step 3: Process each tenant with its own admin token
  for (const tenantInfo of tenantLogins) {
    const tenantId = tenantInfo.tenantId
    const tenantToken = tenantInfo.token
    try {
      const result = await processTenant(tenantToken, tenantId)
      results.push(result)
    } catch (error) {
      console.error(`❌ Error processing tenant ${tenantId}:`, error.message)
      results.push({
        tenantId,
        totalProcessed: 0,
        totalUpdated: 0,
        totalSkipped: 0,
        totalErrors: 1,
        error: error.message
      })
    }
  }
  
  // Step 4: Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  
  let grandTotalProcessed = 0
  let grandTotalUpdated = 0
  let grandTotalSkipped = 0
  let grandTotalErrors = 0
  
  for (const result of results) {
    console.log(`\n${result.tenantId}:`)
    console.log(`  Processed: ${result.totalProcessed}`)
    console.log(`  Updated: ${result.totalUpdated}`)
    console.log(`  Skipped: ${result.totalSkipped}`)
    console.log(`  Errors: ${result.totalErrors}`)
    
    grandTotalProcessed += result.totalProcessed
    grandTotalUpdated += result.totalUpdated
    grandTotalSkipped += result.totalSkipped
    grandTotalErrors += result.totalErrors
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('GRAND TOTAL:')
  console.log(`  Processed: ${grandTotalProcessed}`)
  console.log(`  Updated: ${grandTotalUpdated}`)
  console.log(`  Skipped: ${grandTotalSkipped}`)
  console.log(`  Errors: ${grandTotalErrors}`)
  console.log('='.repeat(60))
  
  if (grandTotalUpdated > 0) {
    console.log('\n✅ Store assignments synced successfully!')
  } else {
    console.log('\n⚠️  No employees were updated. This might be normal if all employees already have stores.')
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err)
  if (err.stack) {
    console.error('Stack:', err.stack)
  }
  process.exit(1)
})
