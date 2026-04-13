#!/usr/bin/env node
/**
 * Comprehensive API Test Suite
 * Tests all major APIs after infrastructure and tenant-aware fixes
 * 
 * Usage:
 *   BACKEND_URL=http://your-api.com EMAIL=user@example.com PASSWORD=pass node scripts/test-all-apis.js
 */

const rawBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000'
const BASE = rawBase.replace(/\/+$/, '')
const API_BASE = BASE.endsWith('/api') ? BASE : `${BASE}/api`

const EMAIL = process.env.EMAIL || 'Aditya@gmail.com'
const PASSWORD = process.env.PASSWORD || 'yrv0s48mA1!'
const LATITUDE = parseFloat(process.env.LATITUDE || '19.0760')
const LONGITUDE = parseFloat(process.env.LONGITUDE || '72.8777')

const results = {
  passed: [],
  failed: [],
  warnings: []
}

function log(step, msg, data = null) {
  console.log(data ? `[${step}] ${msg} ${JSON.stringify(data, null, 2)}` : `[${step}] ${msg}`)
}

function recordResult(test, success, message = '', data = null) {
  if (success) {
    results.passed.push({ test, message, data })
    console.log(`✅ ${test}: ${message}`)
  } else {
    results.failed.push({ test, message, data })
    console.log(`❌ ${test}: ${message}`)
  }
}

function recordWarning(test, message, data = null) {
  results.warnings.push({ test, message, data })
  console.log(`⚠️  ${test}: ${message}`)
}

async function fetchResp(url, options = {}) {
  try {
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
    return { ok: res.ok, status: res.status, data, headers: res.headers }
  } catch (error) {
    return { ok: false, status: 0, data: { error: error.message }, error }
  }
}

async function login() {
  const url = `${API_BASE}/auth/login`
  log('LOGIN', 'POST', { url, email: EMAIL })
  const { ok, status, data } = await fetchResp(url, {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  
  if (!ok) {
    recordResult('Login', false, `Failed with status ${status}`, data)
    return null
  }
  
  const responseData = data.data || data
  const token = responseData.accessToken || data.accessToken
  const user = responseData.user || data.user
  
  if (!token) {
    recordResult('Login', false, 'No token in response', data)
    return null
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
  
  recordResult('Login', true, `Success - Tenant: ${tenantId || 'none'}`, {
    tenantId: tenantId || 'none',
    employeeId: user?.employee_id || user?.employeeId,
    hasToken: !!token
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

async function testHealthEndpoints() {
  console.log('\n' + '='.repeat(60))
  console.log('Testing Health Endpoints')
  console.log('='.repeat(60))
  
  // Attendance service health
  const attendanceHealth = await fetchResp(`${BASE}/health`)
  recordResult('Attendance Health', attendanceHealth.ok, 
    attendanceHealth.ok ? 'Service is healthy' : `Status: ${attendanceHealth.status}`,
    attendanceHealth.data)
  
  // Attendance service API health
  const attendanceApiHealth = await fetchResp(`${API_BASE}/attendance/health`)
  recordResult('Attendance API Health', attendanceApiHealth.ok,
    attendanceApiHealth.ok ? 'API is healthy' : `Status: ${attendanceApiHealth.status}`,
    attendanceApiHealth.data)
  
  // Circuit breaker metrics
  const circuitBreakers = await fetchResp(`${API_BASE}/attendance/health/circuit-breakers`)
  if (circuitBreakers.ok && circuitBreakers.data.circuitBreakers) {
    const hrState = circuitBreakers.data.circuitBreakers.hrService
    recordResult('Circuit Breaker Metrics', true, 
      `HR Service: ${hrState?.state || 'unknown'}`, 
      circuitBreakers.data.circuitBreakers)
  } else {
    recordWarning('Circuit Breaker Metrics', 'Endpoint not available or invalid response', circuitBreakers.data)
  }
}

async function testHRServiceAPIs(token, tenantId, userId) {
  console.log('\n' + '='.repeat(60))
  console.log('Testing HR Service APIs')
  console.log('='.repeat(60))
  
  // Get employee by ID
  if (userId) {
    const employee = await fetchResp(`${API_BASE}/hr/employees/${userId}`, {
      method: 'GET',
      headers: authHeaders(token, tenantId),
    })
    recordResult('Get Employee by ID', employee.ok,
      employee.ok ? 'Employee found' : `Status: ${employee.status}`,
      employee.ok ? { 
        hasStore: !!(employee.data?.data?.store || employee.data?.store),
        storeName: employee.data?.data?.store?.name || employee.data?.store?.name || 'none'
      } : employee.data)
  }
  
  // List employees
  const employees = await fetchResp(`${API_BASE}/hr/employees?limit=5`, {
    method: 'GET',
    headers: authHeaders(token, tenantId),
  })
  recordResult('List Employees', employees.ok,
    employees.ok ? `Found ${Array.isArray(employees.data?.data) ? employees.data.data.length : 0} employees` : `Status: ${employees.status}`,
    employees.data)
  
  // List stores
  const stores = await fetchResp(`${API_BASE}/hr/stores`, {
    method: 'GET',
    headers: authHeaders(token, tenantId),
  })
  const storeCount = Array.isArray(stores.data?.data) ? stores.data.data.length : 0
  recordResult('List Stores', stores.ok,
    stores.ok ? `Found ${storeCount} stores` : `Status: ${stores.status}`,
    { count: storeCount })
}

async function testAttendanceAPIs(token, tenantId, employeeId) {
  console.log('\n' + '='.repeat(60))
  console.log('Testing Attendance APIs')
  console.log('='.repeat(60))
  
  // Check today's attendance
  const today = new Date().toISOString().slice(0, 10)
  const todayAttendance = await fetchResp(
    `${API_BASE}/attendance/today?employeeId=${encodeURIComponent(employeeId)}&date=${today}`,
    {
      method: 'GET',
      headers: authHeaders(token, tenantId),
    }
  )
  recordResult('Get Today Attendance', todayAttendance.ok,
    todayAttendance.ok ? 'Today attendance retrieved' : `Status: ${todayAttendance.status}`,
    todayAttendance.data)
  
  // Clock in
  const clockIn = await fetchResp(`${API_BASE}/attendance/clock-in`, {
    method: 'POST',
    headers: authHeaders(token, tenantId),
    body: JSON.stringify({
      latitude: LATITUDE,
      longitude: LONGITUDE,
      notes: 'API test clock-in',
      timestamp: Date.now()
    }),
  })
  recordResult('Clock In', clockIn.ok,
    clockIn.ok ? 'Clock-in successful' : `Status: ${clockIn.status} - ${clockIn.data?.error || clockIn.data?.message || ''}`,
    clockIn.data)
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Clock out
  const clockOut = await fetchResp(`${API_BASE}/attendance/clock-out`, {
    method: 'POST',
    headers: authHeaders(token, tenantId),
    body: JSON.stringify({
      latitude: LATITUDE,
      longitude: LONGITUDE,
      notes: 'API test clock-out'
    }),
  })
  recordResult('Clock Out', clockOut.ok,
    clockOut.ok ? 'Clock-out successful' : `Status: ${clockOut.status} - ${clockOut.data?.error || clockOut.data?.message || ''}`,
    clockOut.data)
  
  // Get attendance records
  const records = await fetchResp(`${API_BASE}/attendance/records?limit=5`, {
    method: 'GET',
    headers: authHeaders(token, tenantId),
  })
  recordResult('Get Attendance Records', records.ok,
    records.ok ? 'Records retrieved' : `Status: ${records.status}`,
    records.data)
}

async function testNetworkConnectivity() {
  console.log('\n' + '='.repeat(60))
  console.log('Testing Network Connectivity')
  console.log('='.repeat(60))
  
  // Test base URL
  const baseTest = await fetchResp(`${BASE}/health`)
  recordResult('Base URL Connectivity', baseTest.ok || baseTest.status === 404,
    baseTest.ok ? 'Base URL reachable' : `Status: ${baseTest.status}`)
  
  // Test API base
  const apiTest = await fetchResp(`${API_BASE}/attendance/health`)
  recordResult('API Base Connectivity', apiTest.ok,
    apiTest.ok ? 'API base reachable' : `Status: ${apiTest.status}`)
}

async function main() {
  console.log('='.repeat(60))
  console.log('Comprehensive API Test Suite')
  console.log('='.repeat(60))
  console.log(`Backend API: ${API_BASE}`)
  console.log(`Email: ${EMAIL}`)
  console.log(`Location: ${LATITUDE}, ${LONGITUDE}`)
  console.log('')
  
  // Test network connectivity first
  await testNetworkConnectivity()
  
  // Test health endpoints
  await testHealthEndpoints()
  
  // Login
  const loginResult = await login()
  if (!loginResult) {
    console.log('\n❌ Cannot proceed without login. Exiting.')
    printSummary()
    process.exit(1)
  }
  
  const { token, tenantId, employeeId } = loginResult
  
  // Test HR Service APIs
  await testHRServiceAPIs(token, tenantId, loginResult.userId)
  
  // Test Attendance APIs
  if (employeeId) {
    await testAttendanceAPIs(token, tenantId, employeeId)
  } else {
    recordWarning('Attendance APIs', 'Skipped - No employeeId found')
  }
  
  // Print summary
  printSummary()
}

function printSummary() {
  console.log('\n' + '='.repeat(60))
  console.log('Test Summary')
  console.log('='.repeat(60))
  console.log(`✅ Passed: ${results.passed.length}`)
  console.log(`❌ Failed: ${results.failed.length}`)
  console.log(`⚠️  Warnings: ${results.warnings.length}`)
  console.log('')
  
  if (results.failed.length > 0) {
    console.log('Failed Tests:')
    results.failed.forEach(({ test, message }) => {
      console.log(`  ❌ ${test}: ${message}`)
    })
    console.log('')
  }
  
  if (results.warnings.length > 0) {
    console.log('Warnings:')
    results.warnings.forEach(({ test, message }) => {
      console.log(`  ⚠️  ${test}: ${message}`)
    })
    console.log('')
  }
  
  const successRate = ((results.passed.length / (results.passed.length + results.failed.length)) * 100).toFixed(1)
  console.log(`Success Rate: ${successRate}%`)
  console.log('')
  
  if (results.failed.length === 0) {
    console.log('🎉 All tests passed!')
  } else {
    console.log('⚠️  Some tests failed. Please review the output above.')
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err)
  if (err.stack) {
    console.error('Stack:', err.stack)
  }
  printSummary()
  process.exit(1)
})
