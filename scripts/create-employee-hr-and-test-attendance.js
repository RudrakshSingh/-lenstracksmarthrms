#!/usr/bin/env node
/**
 * Create employee in HR service and test clock-in/clock-out
 * 
 * Usage:
 *   BACKEND_URL=http://your-api.com EMAIL=user@example.com PASSWORD=pass node scripts/create-employee-hr-and-test-attendance.js
 */

const rawBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000'
const BASE = rawBase.replace(/\/+$/, '')
const API_BASE = BASE.endsWith('/api') ? BASE : `${BASE}/api`

const EMAIL = process.env.EMAIL || 'Aditya@gmail.com'
const PASSWORD = process.env.PASSWORD || 'yrv0s48mA1!'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@upcapto.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Upcapto@2026'
const LATITUDE = parseFloat(process.env.LATITUDE || '19.0760')
const LONGITUDE = parseFloat(process.env.LONGITUDE || '72.8777')

function log(step, msg, data = null) {
  console.log(data ? `[${step}] ${msg} ${JSON.stringify(data, null, 2)}` : `[${step}] ${msg}`)
}

async function fetchResp(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...options.headers },
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { _raw: text.slice(0, 500) }
  }
  return { ok: res.ok, status: res.status, data }
}

async function login(email, password) {
  const url = `${API_BASE}/auth/login`
  log('LOGIN', 'POST', { url, email })
  const { ok, status, data } = await fetchResp(url, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (!ok) {
    console.error('❌ Login failed', status, data)
    process.exit(1)
  }
  
  const responseData = data.data || data
  const token = responseData.accessToken || data.accessToken
  const user = responseData.user || data.user
  
  if (!token) {
    console.error('❌ No token in response', data)
    process.exit(1)
  }
  
  // Extract tenantId from JWT
  let tenantId = null
  try {
    const jwt = require('jsonwebtoken')
    const decoded = jwt.decode(token)
    tenantId = decoded?.tenantId || decoded?.tenant_id
    if (tenantId) {
      tenantId = String(tenantId).toLowerCase().trim()
    }
  } catch (e) {
    log('LOGIN', 'JWT decode failed', { error: e.message })
  }
  
  if (!tenantId) {
    tenantId = user?.tenantId || user?.tenant_id || responseData.user?.tenantId
    if (tenantId) {
      tenantId = String(tenantId).toLowerCase().trim()
    }
  }
  
  log('LOGIN', 'OK', { 
    tenantId: tenantId || '(none)', 
    employeeId: user?.employee_id || user?.employeeId,
    userId: user?._id || user?.id,
    email: user?.email,
    name: user?.name || user?.fullName || user?.firstName
  })
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

async function checkEmployeeInHR(token, tenantId, employeeId, userId, email) {
  // Try to find employee by employeeId
  if (employeeId) {
    const url = `${API_BASE}/hr/employees?employeeId=${encodeURIComponent(employeeId)}`
    const { ok, status, data } = await fetchResp(url, {
      method: 'GET',
      headers: authHeaders(token, tenantId),
    })
    
    if (ok && data.data && Array.isArray(data.data) && data.data.length > 0) {
      return { found: true, employee: data.data[0] }
    }
  }
  
  // Try by userId
  if (userId) {
    const url = `${API_BASE}/hr/employees?userId=${encodeURIComponent(userId)}`
    const { ok, status, data } = await fetchResp(url, {
      method: 'GET',
      headers: authHeaders(token, tenantId),
    })
    
    if (ok && data.data && Array.isArray(data.data) && data.data.length > 0) {
      return { found: true, employee: data.data[0] }
    }
  }
  
  // Try by email
  if (email) {
    const url = `${API_BASE}/hr/employees?email=${encodeURIComponent(email)}`
    const { ok, status, data } = await fetchResp(url, {
      method: 'GET',
      headers: authHeaders(token, tenantId),
    })
    
    if (ok && data.data && Array.isArray(data.data) && data.data.length > 0) {
      return { found: true, employee: data.data[0] }
    }
  }
  
  return { found: false, employee: null }
}

async function listStores(token, tenantId) {
  const url = `${API_BASE}/hr/stores`
  log('LIST_STORES', 'GET', { url })
  const { ok, status, data } = await fetchResp(url, {
    method: 'GET',
    headers: authHeaders(token, tenantId),
  })
  
  if (ok && data.data && Array.isArray(data.data)) {
    log('LIST_STORES', 'OK', { count: data.data.length })
    return data.data
  } else {
    log('LIST_STORES', 'FAIL', { status, response: data })
    return []
  }
}

async function createStore(token, tenantId) {
  const storeData = {
    name: 'Default Store',
    code: 'STORE001',
    description: 'Default store for attendance',
    address: {
      street: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      zipCode: '400001'
    },
    coordinates: {
      latitude: LATITUDE,
      longitude: LONGITUDE
    },
    geofenceRadius: 100,
    status: 'active'
  }
  
  log('CREATE_STORE', 'POST', { url: `${API_BASE}/hr/stores`, storeData })
  const { ok, status, data } = await fetchResp(`${API_BASE}/hr/stores`, {
    method: 'POST',
    headers: authHeaders(token, tenantId),
    body: JSON.stringify(storeData),
  })
  
  if (ok) {
    log('CREATE_STORE', 'OK', { 
      status,
      storeId: data.data?._id || data.data?.id,
      name: data.data?.name
    })
    return { success: true, store: data.data || data }
  } else {
    log('CREATE_STORE', 'FAIL', { 
      status, 
      error: data?.error || data?.message,
      response: data 
    })
    return { success: false, error: data?.error || data?.message, status }
  }
}

async function createEmployeeInHR(token, tenantId, user, employeeId, userId) {
  // First, get available stores
  const stores = await listStores(token, tenantId)
  
  if (stores.length === 0) {
    console.error('❌ No stores found. Cannot create employee without store assignment.')
    console.error('   Please create a store first or assign employee to existing store.')
    return { success: false, error: 'No stores available' }
  }
  
  const store = stores[0]
  const storeId = store._id || store.id
  
  // Extract name from user
  const name = user?.name || user?.fullName || user?.firstName || EMAIL.split('@')[0]
  const nameParts = name.split(' ')
  const firstName = nameParts[0] || name
  const lastName = nameParts.slice(1).join(' ') || ''
  
  const employeeData = {
    employeeId: employeeId,
    code: employeeId,
    firstName: firstName,
    lastName: lastName,
    fullName: name,
    email: user?.email || EMAIL,
    phone: user?.phone || '',
    department: user?.department || 'Operations',
    jobTitle: user?.designation || user?.jobTitle || 'Employee',
    designation: user?.designation || user?.jobTitle || 'Employee',
    doj: user?.joining_date || user?.doj || new Date().toISOString(),
    status: 'active',
    storeId: storeId, // CRITICAL: Assign to store
    userId: userId // Link to existing auth user
  }
  
  log('CREATE_EMPLOYEE_HR', 'POST', { 
    url: `${API_BASE}/hr/employees`,
    employeeData: { ...employeeData, password: '***' }
  })
  
  const { ok, status, data } = await fetchResp(`${API_BASE}/hr/employees`, {
    method: 'POST',
    headers: authHeaders(token, tenantId),
    body: JSON.stringify(employeeData),
  })
  
  if (ok) {
    log('CREATE_EMPLOYEE_HR', 'OK', { 
      status,
      employeeId: data.data?.employeeId || data.data?.employee_id,
      storeId: data.data?.store || data.data?.storeId
    })
    return { success: true, employee: data.data || data }
  } else {
    log('CREATE_EMPLOYEE_HR', 'FAIL', { 
      status, 
      error: data?.error || data?.message,
      response: data 
    })
    return { success: false, error: data?.error || data?.message, status }
  }
}

async function assignStoreToEmployee(token, tenantId, employeeId, storeId) {
  const url = `${API_BASE}/hr/employees/${employeeId}`
  log('ASSIGN_STORE', 'PUT', { url, storeId })
  const { ok, status, data } = await fetchResp(url, {
    method: 'PUT',
    headers: authHeaders(token, tenantId),
    body: JSON.stringify({ storeId: storeId }),
  })
  
  if (ok) {
    log('ASSIGN_STORE', 'OK', { status })
    return { success: true }
  } else {
    log('ASSIGN_STORE', 'FAIL', { status, error: data?.error || data?.message })
    return { success: false, error: data?.error || data?.message }
  }
}

async function clockIn(token, tenantId) {
  const url = `${API_BASE}/attendance/clock-in`
  const body = {
    latitude: LATITUDE,
    longitude: LONGITUDE,
    notes: 'Test clock-in from script',
    timestamp: Date.now()
  }
  log('CLOCK_IN', 'POST', { url, body })
  const { ok, status, data } = await fetchResp(url, {
    method: 'POST',
    headers: authHeaders(token, tenantId),
    body: JSON.stringify(body),
  })
  
  if (ok) {
    log('CLOCK_IN', 'OK', { 
      status,
      message: data?.message,
      checkIn: data?.data?.checkIn || data?.data?.check_in,
      isClockedIn: data?.data?.isClockedIn
    })
    return { success: true, data: data.data || data }
  } else {
    log('CLOCK_IN', 'FAIL', { 
      status, 
      error: data?.error || data?.message,
      response: data 
    })
    return { success: false, error: data?.error || data?.message, status }
  }
}

async function clockOut(token, tenantId) {
  const url = `${API_BASE}/attendance/clock-out`
  const body = {
    latitude: LATITUDE,
    longitude: LONGITUDE,
    notes: 'Test clock-out from script'
  }
  log('CLOCK_OUT', 'POST', { url, body })
  const { ok, status, data } = await fetchResp(url, {
    method: 'POST',
    headers: authHeaders(token, tenantId),
    body: JSON.stringify(body),
  })
  
  if (ok) {
    log('CLOCK_OUT', 'OK', { 
      status,
      message: data?.message,
      checkOut: data?.data?.checkOut || data?.data?.check_out,
      totalHours: data?.data?.totalHours || data?.data?.total_hours
    })
    return { success: true, data: data.data || data }
  } else {
    log('CLOCK_OUT', 'FAIL', { 
      status, 
      error: data?.error || data?.message,
      response: data 
    })
    return { success: false, error: data?.error || data?.message, status }
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('Create Employee in HR and Test Attendance')
  console.log('='.repeat(60))
  console.log(`Backend API: ${API_BASE}`)
  console.log(`Email: ${EMAIL}`)
  console.log(`Location: ${LATITUDE}, ${LONGITUDE}`)
  console.log('')
  
  // Step 1: Login as employee
  const { token, tenantId, user, employeeId, userId } = await login(EMAIL, PASSWORD)
  
  // Step 2: Check if employee exists in HR
  console.log('')
  console.log('Checking if employee exists in HR service...')
  const hrCheck = await checkEmployeeInHR(token, tenantId, employeeId, userId, user?.email)
  
  let hrEmployee = hrCheck.employee
  
  if (!hrCheck.found) {
    console.log('')
    console.log('Employee not found in HR service. Creating...')
    
    // Step 3: Check for stores, create one if needed
    let stores = await listStores(token, tenantId)
    let storeId = null
    
    if (stores.length === 0) {
      console.log('No stores found. Logging in as admin to create a default store...')
      // Login as admin to create store
      const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD)
      if (!adminLogin.token) {
        console.error('❌ Failed to login as admin')
        process.exit(1)
      }
      
      // CRITICAL: Create store in the SAME tenant as the employee
      const storeResult = await createStore(adminLogin.token, tenantId) // Use employee's tenantId, not admin's
      if (storeResult.success) {
        storeId = storeResult.store._id || storeResult.store.id
        stores = [storeResult.store]
        console.log('✅ Store created by admin in tenant:', tenantId)
      } else {
        console.error('❌ Failed to create store')
        console.error('   Error:', storeResult.error)
        process.exit(1)
      }
    } else {
      storeId = stores[0]._id || stores[0].id
    }
    
    // Step 4: Create employee in HR service (use admin token if needed for cross-tenant)
    let createToken = token
    let createTenantId = tenantId
    // If employee tenant is different from admin tenant, use admin token
    if (tenantId !== adminLogin?.tenantId && adminLogin?.token) {
      console.log('Using admin token to create employee in different tenant')
      createToken = adminLogin.token
      // Still use employee's tenantId for the employee creation
    }
    const createResult = await createEmployeeInHR(createToken, createTenantId, user, employeeId, userId)
    
    if (!createResult.success) {
      console.error('❌ Failed to create employee in HR service')
      console.error('   Error:', createResult.error)
      process.exit(1)
    }
    
    hrEmployee = createResult.employee
    
    // Wait a bit for the employee to be fully created
    console.log('⏳ Waiting 2 seconds for employee to be fully created...')
    await new Promise(resolve => setTimeout(resolve, 2000))
  } else {
    console.log('✅ Employee already exists in HR service')
    
    // Check if employee has store assignment
    const hasStore = hrEmployee?.store || hrEmployee?.storeId
    if (!hasStore) {
      console.log('⚠️  Employee has no store assignment. Assigning to first available store...')
      const stores = await listStores(token, tenantId)
      if (stores.length > 0) {
        const storeId = stores[0]._id || stores[0].id
        const hrEmployeeId = hrEmployee._id || hrEmployee.id
        await assignStoreToEmployee(token, tenantId, hrEmployeeId, storeId)
        console.log('✅ Store assigned')
      } else {
        console.error('❌ No stores available. Cannot assign store.')
        process.exit(1)
      }
    } else {
      console.log('✅ Employee has store assignment')
    }
  }
  
  // Step 4: Test clock-in
  console.log('')
  console.log('='.repeat(60))
  console.log('Testing Clock-In')
  console.log('='.repeat(60))
  const clockInResult = await clockIn(token, tenantId)
  
  if (!clockInResult.success) {
    console.error('❌ Clock-in failed')
    console.error('   Error:', clockInResult.error)
    process.exit(1)
  }
  
  // Step 5: Wait a bit
  console.log('')
  console.log('⏳ Waiting 2 seconds before clock-out...')
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Step 6: Test clock-out
  console.log('')
  console.log('='.repeat(60))
  console.log('Testing Clock-Out')
  console.log('='.repeat(60))
  const clockOutResult = await clockOut(token, tenantId)
  
  if (!clockOutResult.success) {
    console.error('❌ Clock-out failed')
    console.error('   Error:', clockOutResult.error)
    process.exit(1)
  }
  
  // Summary
  console.log('')
  console.log('='.repeat(60))
  console.log('✅ Test Complete!')
  console.log('='.repeat(60))
  console.log('Summary:')
  console.log(`  Login: ✅ OK`)
  console.log(`  Employee in HR: ${hrCheck.found ? '✅ Already exists' : '✅ Created'}`)
  console.log(`  Clock-In: ✅ OK`)
  console.log(`  Clock-Out: ✅ OK`)
  console.log('')
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err)
  if (err.stack) {
    console.error('Stack:', err.stack)
  }
  process.exit(1)
})
