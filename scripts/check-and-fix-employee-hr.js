#!/usr/bin/env node
/**
 * Check if employee exists in HR service and has store assignment
 * If not, provide instructions to fix
 */

const rawBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000'
const BASE = rawBase.replace(/\/+$/, '')
const API_BASE = BASE.endsWith('/api') ? BASE : `${BASE}/api`

const EMAIL = process.env.EMAIL || 'Aditya@gmail.com'
const PASSWORD = process.env.PASSWORD || 'yrv0s48mA1!'

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

async function login() {
  const url = `${API_BASE}/auth/login`
  log('LOGIN', 'POST', { url, email: EMAIL })
  const { ok, status, data } = await fetchResp(url, {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
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
    email: user?.email
  })
  return { token, tenantId, user, employeeId: user?.employee_id || user?.employeeId }
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
  console.log('')
  console.log('='.repeat(60))
  console.log('Checking Employee in HR Service')
  console.log('='.repeat(60))
  
  // Try to find employee by employeeId
  if (employeeId) {
    const url = `${API_BASE}/hr/employees?employeeId=${encodeURIComponent(employeeId)}`
    log('HR_CHECK', 'GET by employeeId', { url })
    const { ok, status, data } = await fetchResp(url, {
      method: 'GET',
      headers: authHeaders(token, tenantId),
    })
    
    if (ok && data.data && Array.isArray(data.data) && data.data.length > 0) {
      const emp = data.data[0]
      log('HR_CHECK', 'FOUND by employeeId', {
        employeeId: emp.employeeId || emp.employee_id,
        hasStore: !!emp.store,
        storeId: emp.store?._id || emp.store?.id || emp.store,
        storeName: emp.store?.name || 'N/A'
      })
      return { found: true, employee: emp, method: 'employeeId' }
    } else {
      log('HR_CHECK', 'NOT FOUND by employeeId', { status, response: data })
    }
  }
  
  // Try to find by userId
  if (userId) {
    const url = `${API_BASE}/hr/employees?userId=${encodeURIComponent(userId)}`
    log('HR_CHECK', 'GET by userId', { url })
    const { ok, status, data } = await fetchResp(url, {
      method: 'GET',
      headers: authHeaders(token, tenantId),
    })
    
    if (ok && data.data && Array.isArray(data.data) && data.data.length > 0) {
      const emp = data.data[0]
      log('HR_CHECK', 'FOUND by userId', {
        employeeId: emp.employeeId || emp.employee_id,
        hasStore: !!emp.store,
        storeId: emp.store?._id || emp.store?.id || emp.store,
        storeName: emp.store?.name || 'N/A'
      })
      return { found: true, employee: emp, method: 'userId' }
    } else {
      log('HR_CHECK', 'NOT FOUND by userId', { status, response: data })
    }
  }
  
  // Try to find by email
  if (email) {
    const url = `${API_BASE}/hr/employees?email=${encodeURIComponent(email)}`
    log('HR_CHECK', 'GET by email', { url })
    const { ok, status, data } = await fetchResp(url, {
      method: 'GET',
      headers: authHeaders(token, tenantId),
    })
    
    if (ok && data.data && Array.isArray(data.data) && data.data.length > 0) {
      const emp = data.data[0]
      log('HR_CHECK', 'FOUND by email', {
        employeeId: emp.employeeId || emp.employee_id,
        hasStore: !!emp.store,
        storeId: emp.store?._id || emp.store?.id || emp.store,
        storeName: emp.store?.name || 'N/A'
      })
      return { found: true, employee: emp, method: 'email' }
    } else {
      log('HR_CHECK', 'NOT FOUND by email', { status, response: data })
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

async function main() {
  console.log('='.repeat(60))
  console.log('Employee HR Service Check')
  console.log('='.repeat(60))
  console.log(`Backend API: ${API_BASE}`)
  console.log(`Email: ${EMAIL}`)
  console.log('')
  
  // Step 1: Login
  const { token, tenantId, user, employeeId, userId } = await login()
  
  // Step 2: Check employee in HR service
  const hrCheck = await checkEmployeeInHR(token, tenantId, employeeId, user?._id || user?.id, user?.email)
  
  // Step 3: Summary
  console.log('')
  console.log('='.repeat(60))
  console.log('Summary')
  console.log('='.repeat(60))
  
  if (hrCheck.found) {
    const emp = hrCheck.employee
    console.log('✅ Employee found in HR service')
    console.log(`   Employee ID: ${emp.employeeId || emp.employee_id}`)
    console.log(`   Name: ${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || 'N/A')
    console.log(`   Email: ${emp.email || 'N/A'}`)
    
    if (emp.store) {
      const storeId = emp.store?._id || emp.store?.id || emp.store
      const storeName = emp.store?.name || 'N/A'
      console.log(`   ✅ Store assigned: ${storeName} (${storeId})`)
      console.log('')
      console.log('✅ Employee is ready for clock-in/clock-out!')
    } else {
      console.log(`   ❌ No store assigned`)
      console.log('')
      console.log('⚠️  Employee needs store assignment for attendance')
      console.log('')
      console.log('To fix:')
      console.log('1. List available stores')
      const stores = await listStores(token, tenantId)
      if (stores.length > 0) {
        console.log(`   Found ${stores.length} stores:`)
        stores.slice(0, 5).forEach(store => {
          console.log(`   - ${store.name || store.code} (ID: ${store._id || store.id})`)
        })
        console.log('')
        console.log('2. Assign employee to a store using:')
        console.log(`   PUT ${API_BASE}/hr/employees/${emp._id || emp.id}`)
        console.log(`   Body: { "store": "${stores[0]._id || stores[0].id}" }`)
      } else {
        console.log('   No stores found. Create a store first.')
      }
    }
  } else {
    console.log('❌ Employee NOT found in HR service')
    console.log('')
    console.log('To fix:')
    console.log('1. Create employee in HR service using:')
    console.log(`   POST ${API_BASE}/hr/employees`)
    console.log(`   Body: {`)
    console.log(`     "userId": "${user?._id || user?.id}",`)
    console.log(`     "employeeId": "${employeeId}",`)
    console.log(`     "email": "${user?.email}",`)
    console.log(`     "firstName": "...",`)
    console.log(`     "lastName": "...",`)
    console.log(`     "store": "<storeId>",`)
    console.log(`     ...other required fields`)
    console.log(`   }`)
    console.log('')
    console.log('2. Or use the onboarding script to create employee properly')
  }
  
  console.log('')
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err)
  if (err.stack) {
    console.error('Stack:', err.stack)
  }
  process.exit(1)
})
