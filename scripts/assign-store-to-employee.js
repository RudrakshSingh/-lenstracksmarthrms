#!/usr/bin/env node
/**
 * Assign store to employee in HR service
 * 
 * Usage:
 *   BACKEND_URL=http://your-api.com EMAIL=user@example.com PASSWORD=pass node scripts/assign-store-to-employee.js
 */

const rawBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000'
const BASE = rawBase.replace(/\/+$/, '')
const API_BASE = BASE.endsWith('/api') ? BASE : `${BASE}/api`

const EMAIL = process.env.EMAIL || 'Aditya@gmail.com'
const PASSWORD = process.env.PASSWORD || 'yrv0s48mA1!'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@upcapto.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Upcapto@2026'

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

async function getEmployee(token, tenantId, employeeId, userId) {
  // Try by userId first (direct endpoint)
  if (userId) {
    const url = `${API_BASE}/hr/employees/${userId}`
    const { ok, status, data } = await fetchResp(url, {
      method: 'GET',
      headers: authHeaders(token, tenantId),
    })
    
    if (ok && data.data) {
      return { found: true, employee: data.data }
    }
  }
  
  // Try by employeeId
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
  
  return { found: false, employee: null }
}

async function listStores(token, tenantId) {
  const url = `${API_BASE}/hr/stores`
  const { ok, status, data } = await fetchResp(url, {
    method: 'GET',
    headers: authHeaders(token, tenantId),
  })
  
  if (ok && data.data && Array.isArray(data.data)) {
    return data.data
  }
  return []
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
    return { success: false, error: data?.error || data?.message, status }
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('Assign Store to Employee')
  console.log('='.repeat(60))
  console.log(`Backend API: ${API_BASE}`)
  console.log(`Email: ${EMAIL}`)
  console.log('')
  
  // Step 1: Login as employee
  const { token, tenantId, user, employeeId, userId } = await login(EMAIL, PASSWORD)
  console.log(`✅ Logged in - Tenant: ${tenantId}, Employee ID: ${employeeId}`)
  
  // Step 2: Get employee from HR
  console.log('')
  console.log('Fetching employee from HR service...')
  const empResult = await getEmployee(token, tenantId, employeeId, userId)
  
  if (!empResult.found) {
    console.error('❌ Employee not found in HR service')
    console.error('   Please create employee first using create-employee-hr-and-test-attendance.js')
    process.exit(1)
  }
  
  const employee = empResult.employee
  const hrEmployeeId = employee._id || employee.id
  
  console.log(`✅ Employee found: ${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.name)
  console.log(`   HR Employee ID: ${hrEmployeeId}`)
  console.log(`   Current Store: ${employee.store ? (employee.store._id || employee.store) : 'None'}`)
  
  // Step 3: Check if employee already has a store
  if (employee.store && (employee.store._id || employee.store)) {
    console.log('')
    console.log('✅ Employee already has a store assigned')
    console.log(`   Store ID: ${employee.store._id || employee.store}`)
    process.exit(0)
  }
  
  // Step 4: List stores in employee's tenant
  console.log('')
  console.log('Listing stores in tenant:', tenantId)
  let stores = await listStores(token, tenantId)
  
  // If no stores in employee's tenant, try admin's tenant
  if (stores.length === 0) {
    console.log('No stores found in employee tenant. Trying admin tenant...')
    const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD)
    stores = await listStores(adminLogin.token, adminLogin.tenantId)
    
    if (stores.length > 0) {
      console.log(`Found ${stores.length} stores in admin tenant. Using first store.`)
      // Use admin token to update employee (cross-tenant operation)
      const storeId = stores[0]._id || stores[0].id
      console.log('')
      console.log('Assigning store using admin token...')
      const result = await updateEmployeeStore(adminLogin.token, tenantId, hrEmployeeId, storeId)
      
      if (result.success) {
        console.log('✅ Store assigned successfully!')
        console.log(`   Store: ${stores[0].name} (${stores[0].code || ''})`)
        process.exit(0)
      } else {
        console.error('❌ Failed to assign store')
        console.error('   Error:', result.error)
        process.exit(1)
      }
    }
  }
  
  if (stores.length === 0) {
    console.error('❌ No stores found in any tenant')
    console.error('   Please create a store first')
    process.exit(1)
  }
  
  // Step 5: Assign first available store
  const storeId = stores[0]._id || stores[0].id
  console.log('')
  console.log(`Assigning store: ${stores[0].name} (${stores[0].code || ''})`)
  const result = await updateEmployeeStore(token, tenantId, hrEmployeeId, storeId)
  
  if (result.success) {
    console.log('✅ Store assigned successfully!')
    console.log(`   Store: ${stores[0].name} (${stores[0].code || ''})`)
  } else {
    console.error('❌ Failed to assign store')
    console.error('   Error:', result.error)
    console.error('   Status:', result.status)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err)
  if (err.stack) {
    console.error('Stack:', err.stack)
  }
  process.exit(1)
})
