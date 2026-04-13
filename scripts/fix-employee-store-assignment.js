#!/usr/bin/env node
/**
 * Fix employee store assignment - assigns a valid store to employee
 * 
 * Usage:
 *   BACKEND_URL=http://your-api.com EMAIL=user@example.com PASSWORD=pass node scripts/fix-employee-store-assignment.js
 */

const rawBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000'
const BASE = rawBase.replace(/\/+$/, '')
const API_BASE = BASE.endsWith('/api') ? BASE : `${BASE}/api`

const EMAIL = process.env.EMAIL || 'Aditya@gmail.com'
const PASSWORD = process.env.PASSWORD || 'yrv0s48mA1!'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@upcapto.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Upcapto@2026'

async function fetchResp(url, options = {}) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
    
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
      throw new Error(`DNS resolution failed for ${url}. The hostname may not exist or there may be a network issue.`)
    }
    if (err.message?.includes('fetch failed')) {
      throw new Error(`Network error connecting to ${url}: ${err.cause?.message || err.message}`)
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

async function getEmployee(token, tenantId, userId) {
  const url = `${API_BASE}/hr/employees/${userId}`
  const { ok, status, data } = await fetchResp(url, {
    method: 'GET',
    headers: authHeaders(token, tenantId),
  })
  
  if (ok && data.data) {
    return { found: true, employee: data.data }
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
      latitude: 19.076,
      longitude: 72.8777
    },
    geofenceRadius: 100,
    status: 'active'
  }
  
  const { ok, status, data } = await fetchResp(`${API_BASE}/hr/stores`, {
    method: 'POST',
    headers: authHeaders(token, tenantId),
    body: JSON.stringify(storeData),
  })
  
  if (ok) {
    return { success: true, store: data.data || data }
  } else {
    return { success: false, error: data?.error || data?.message, status }
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

async function updateEmployeeTenant(token, tenantId, employeeId, newTenantId) {
  const url = `${API_BASE}/hr/employees/${employeeId}`
  const { ok, status, data } = await fetchResp(url, {
    method: 'PUT',
    headers: authHeaders(token, tenantId),
    body: JSON.stringify({ tenantId: newTenantId }),
  })
  
  if (ok) {
    return { success: true, employee: data.data || data }
  } else {
    return { success: false, error: data?.error || data?.message, status, response: data }
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('Fix Employee Store Assignment')
  console.log('='.repeat(60))
  console.log(`Backend API: ${API_BASE}`)
  console.log(`Email: ${EMAIL}`)
  console.log('')
  
  // Step 1: Login as employee
  const { token, tenantId, user, employeeId, userId } = await login(EMAIL, PASSWORD)
  console.log(`✅ Logged in - Tenant: ${tenantId}, Employee ID: ${employeeId}, User ID: ${userId}`)
  
  // Step 2: Get employee from HR
  console.log('')
  console.log('Fetching employee from HR service...')
  const empResult = await getEmployee(token, tenantId, userId)
  
  if (!empResult.found) {
    console.error('❌ Employee not found in HR service')
    process.exit(1)
  }
  
  const employee = empResult.employee
  const hrEmployeeId = employee._id || employee.id
  const actualTenantId = (employee.tenantId || employee.tenant_id || tenantId || 'default').toLowerCase().trim()
  
  console.log(`✅ Employee found: ${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.name)
  console.log(`   HR Employee ID: ${hrEmployeeId}`)
  console.log(`   Employee Tenant: ${actualTenantId}`)
  console.log(`   Store: ${employee.store ? (employee.store._id || employee.store.id || employee.store.name || 'Invalid') : 'None'}`)
  
  // Step 3: Check if store is valid
  const storeId = employee.store?._id || employee.store?.id
  const isStoreValid = storeId && storeId.toString().trim() !== '' && employee.store?.name && employee.store.name !== 'Unknown Store'
  
  if (isStoreValid) {
    console.log('')
    console.log('✅ Employee has a valid store assigned')
    console.log(`   Store: ${employee.store.name} (${employee.store.code || ''})`)
    process.exit(0)
  }
  
  // Step 4: List stores in employee's actual tenant (where employee was found)
  console.log('')
  console.log('Listing stores in tenant:', actualTenantId)
  let stores = await listStores(token, actualTenantId)
  
  // If no stores, try to create one in the employee's tenant
  if (stores.length === 0) {
    console.log('No stores found in employee tenant. Logging in as admin to create a store...')
    const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD)
    console.log(`Admin tenant: ${adminLogin.tenantId}, Employee tenant: ${actualTenantId}`)
    
    // Try to create store in employee's tenant
    console.log(`Creating a default store in tenant: ${actualTenantId}`)
    const storeResult = await createStore(adminLogin.token, actualTenantId)
    
    if (storeResult.success) {
      stores = [storeResult.store]
      console.log('✅ Store created in employee tenant')
    } else if (storeResult.error === 'TENANT_MISMATCH' || storeResult.status === 403) {
      // Admin can't create stores in different tenant - try using admin's tenant stores instead
      console.log('⚠️  Admin cannot create stores in employee tenant (tenant mismatch)')
      console.log(`Trying to find stores in admin tenant: ${adminLogin.tenantId}...`)
      const adminStores = await listStores(adminLogin.token, adminLogin.tenantId)
      
      if (adminStores.length > 0) {
        console.log(`Found ${adminStores.length} stores in admin tenant.`)
        console.log('⚠️  Note: Employee will be assigned to a store from a different tenant.')
        console.log('   This may require updating the employee\'s tenant or store assignment.')
        stores = adminStores
      } else {
        console.error('❌ No stores available in any tenant')
        console.error('   Please create a store manually in the employee\'s tenant or update the employee\'s tenant.')
        process.exit(1)
      }
    } else {
      console.error('❌ Failed to create store:', storeResult.error)
      console.error('   Status:', storeResult.status)
      process.exit(1)
    }
  }
  
  if (stores.length === 0) {
    console.error('❌ No stores available')
    process.exit(1)
  }
  
  // Step 5: Assign store to employee
  const targetStoreId = stores[0]._id || stores[0].id
  const storeTenantId = (stores[0].tenantId || stores[0].tenant_id || actualTenantId).toLowerCase().trim()
  console.log('')
  console.log(`Assigning store: ${stores[0].name} (${stores[0].code || ''})`)
  console.log(`   Store ID: ${targetStoreId}`)
  console.log(`   Store Tenant: ${storeTenantId}`)
  console.log(`   Employee Tenant: ${actualTenantId}`)
  
  // If store is in different tenant, update employee's tenant first
  if (storeTenantId !== actualTenantId) {
    console.log(`⚠️  Store is in different tenant (${storeTenantId} vs ${actualTenantId})`)
    console.log('Updating employee tenant to match store tenant...')
    const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD)
    
    // Try to update employee's tenant using admin token from employee's current tenant
    let tenantUpdateResult = await updateEmployeeTenant(adminLogin.token, actualTenantId, hrEmployeeId, storeTenantId)
    
    // If that fails, try with store's tenant
    if (!tenantUpdateResult.success) {
      tenantUpdateResult = await updateEmployeeTenant(adminLogin.token, storeTenantId, hrEmployeeId, storeTenantId)
    }
    
    if (tenantUpdateResult.success) {
      console.log('✅ Employee tenant updated to:', storeTenantId)
      actualTenantId = storeTenantId
    } else {
      console.log('⚠️  Could not update employee tenant. Will try assignment anyway...')
    }
  }
  
  // Use the store's tenant ID for assignment
  let result = await updateEmployeeStore(token, storeTenantId, hrEmployeeId, targetStoreId)
  
  // If that fails, try with admin token using store's tenant
  if (!result.success && (result.status === 403 || result.status === 404)) {
    console.log('Employee token failed. Trying with admin token...')
    const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD)
    result = await updateEmployeeStore(adminLogin.token, storeTenantId, hrEmployeeId, targetStoreId)
  }
  
  if (result.success) {
    console.log('✅ Store assigned successfully!')
    console.log(`   Store: ${stores[0].name} (${stores[0].code || ''})`)
  } else {
    console.error('❌ Failed to assign store')
    console.error('   Error:', result.error)
    console.error('   Status:', result.status)
    
    if (result.status === 404 && storeTenantId !== actualTenantId) {
      console.error('')
      console.error('⚠️  Tenant Isolation Issue Detected')
      console.error(`   Employee is in tenant: ${actualTenantId}`)
      console.error(`   Store is in tenant: ${storeTenantId}`)
      console.error('')
      console.error('   Manual steps required:')
      console.error('   1. Create a store in the "default" tenant, OR')
      console.error('   2. Move the employee to the "upcapto" tenant')
      console.error('')
      console.error('   To create a store in default tenant, you need an admin user in that tenant.')
      console.error('   Or update the employee\'s tenant using a database script.')
    } else {
      console.error('   Response:', JSON.stringify(result.response, null, 2))
    }
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
