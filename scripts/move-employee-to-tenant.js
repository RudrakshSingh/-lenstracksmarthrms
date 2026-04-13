#!/usr/bin/env node
/**
 * Move Employee to Different Tenant
 * 
 * Usage:
 *   BACKEND_URL=http://your-api.com ADMIN_EMAIL=admin@upcapto.com ADMIN_PASSWORD=pass \
 *   EMPLOYEE_EMAIL=Aditya@gmail.com NEW_TENANT=eyekra node scripts/move-employee-to-tenant.js
 */

const rawBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000'
const BASE = rawBase.replace(/\/+$/, '')
const API_BASE = BASE.endsWith('/api') ? BASE : `${BASE}/api`

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@upcapto.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Upcapto@2026'
const EMPLOYEE_EMAIL = process.env.EMPLOYEE_EMAIL || 'Aditya@gmail.com'
const NEW_TENANT = process.env.NEW_TENANT || 'eyekra'

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

async function findEmployeeByEmail(token, tenantId, email) {
  const url = `${API_BASE}/hr/employees?search=${encodeURIComponent(email)}&limit=100`
  const { ok, status, data } = await fetchResp(url, {
    method: 'GET',
    headers: authHeaders(token, tenantId),
  })
  
  if (!ok) {
    return null
  }
  
  const employees = data.data?.employees || data.employees || data.data || []
  return employees.find(emp => 
    (emp.email || '').toLowerCase() === email.toLowerCase()
  ) || null
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
  console.log('Move Employee to Different Tenant')
  console.log('='.repeat(60))
  console.log(`Backend API: ${API_BASE}`)
  console.log(`Employee Email: ${EMPLOYEE_EMAIL}`)
  console.log(`New Tenant: ${NEW_TENANT}`)
  console.log('')
  
  // Step 1: Login as admin
  console.log('🔐 Logging in as admin...')
  const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD)
  console.log(`✅ Logged in - Tenant: ${adminLogin.tenantId}, User ID: ${adminLogin.userId}`)
  
  // Step 2: Find employee - try multiple tenants
  console.log(`\n🔍 Searching for employee: ${EMPLOYEE_EMAIL}`)
  const tenantsToSearch = ['default', 'upcapto', 'lenstrack', 'eyekra']
  let employee = null
  let foundInTenant = null
  
  for (const tenantId of tenantsToSearch) {
    try {
      const found = await findEmployeeByEmail(adminLogin.token, tenantId, EMPLOYEE_EMAIL)
      if (found) {
        employee = found
        foundInTenant = tenantId
        console.log(`✅ Found employee in tenant: ${tenantId}`)
        console.log(`   Employee ID: ${employee.employeeId || employee.employee_id}`)
        console.log(`   Current Tenant: ${employee.tenantId || employee.tenant_id || tenantId}`)
        console.log(`   Name: ${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.name)
        break
      }
    } catch (error) {
      // Continue searching
    }
  }
  
  if (!employee) {
    console.error(`❌ Employee not found: ${EMPLOYEE_EMAIL}`)
    process.exit(1)
  }
  
  const employeeId = employee._id || employee.id
  const currentTenant = (employee.tenantId || employee.tenant_id || foundInTenant).toLowerCase().trim()
  const newTenantId = NEW_TENANT.toLowerCase().trim()
  
  if (currentTenant === newTenantId) {
    console.log(`\n✅ Employee is already in tenant: ${newTenantId}`)
    process.exit(0)
  }
  
  // Step 3: Update tenant
  console.log(`\n🔄 Moving employee from "${currentTenant}" to "${newTenantId}"...`)
  
  // Try with current tenant first
  let updateResult = await updateEmployeeTenant(adminLogin.token, currentTenant, employeeId, newTenantId)
  
  // If that fails, try with new tenant
  if (!updateResult.success && (updateResult.status === 403 || updateResult.status === 404)) {
    console.log('⚠️  Retrying with new tenant context...')
    updateResult = await updateEmployeeTenant(adminLogin.token, newTenantId, employeeId, newTenantId)
  }
  
  if (updateResult.success) {
    console.log(`✅ Employee moved successfully!`)
    console.log(`   New Tenant: ${newTenantId}`)
    console.log(`   Employee: ${employee.employeeId || employee.employee_id}`)
  } else {
    console.error(`❌ Failed to move employee`)
    console.error(`   Error: ${updateResult.error || updateResult.status}`)
    console.error(`   Response: ${JSON.stringify(updateResult.response, null, 2)}`)
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
