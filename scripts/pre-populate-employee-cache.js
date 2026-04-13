#!/usr/bin/env node
/**
 * Pre-populate employee cache by querying HR service directly
 * This ensures employee is available for attendance service lookups
 */

const rawBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000'
const BASE = rawBase.replace(/\/+$/, '')
const API_BASE = BASE.endsWith('/api') ? BASE : `${BASE}/api`

const EMAIL = process.env.EMAIL || 'Aditya@gmail.com'
const PASSWORD = process.env.PASSWORD || 'yrv0s48mA1!'

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

async function queryEmployee(token, tenantId, employeeId) {
  const url = `${API_BASE}/hr/employees?employeeId=${encodeURIComponent(employeeId)}`
  const { ok, status, data } = await fetchResp(url, {
    method: 'GET',
    headers: authHeaders(token, tenantId),
  })
  
  if (ok && data.data && Array.isArray(data.data) && data.data.length > 0) {
    return data.data[0]
  }
  return null
}

async function main() {
  console.log('Pre-populating employee cache...')
  console.log(`Email: ${EMAIL}`)
  console.log('')
  
  const { token, tenantId, employeeId } = await login()
  console.log(`✅ Logged in - Tenant: ${tenantId}, Employee ID: ${employeeId}`)
  
  // Query employee to ensure it's accessible
  console.log('')
  console.log('Querying employee from HR service...')
  const employee = await queryEmployee(token, tenantId, employeeId)
  
  if (employee) {
    console.log('✅ Employee found in HR service')
    console.log(`   Name: ${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.name || 'N/A')
    console.log(`   Store: ${employee.store?.name || employee.storeId || 'N/A'}`)
    console.log('')
    console.log('✅ Employee is accessible. Cache will be populated on first clock-in attempt.')
  } else {
    console.error('❌ Employee not found in HR service')
    process.exit(1)
  }
  
  console.log('')
  console.log('Now try clock-in/clock-out - it should work!')
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
