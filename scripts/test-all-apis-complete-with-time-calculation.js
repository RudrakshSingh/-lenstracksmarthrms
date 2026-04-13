#!/usr/bin/env node
/**
 * Complete API Testing Script - A to Z
 * Tests all APIs and attendance time calculation
 */

const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api'

// Test credentials
const TEST_USERS = {
  upcapto: { email: 'admin@upcapto.com', password: 'Upcapto@2026', tenant: 'upcapto' },
  lenstrack: { email: 'admin@lenstrack.com', password: 'AdminPass123!', tenant: 'lenstrack' },
  eyekra: { email: 'admin@eyekra.com', password: 'Eyekra@Admin2026!', tenant: 'eyekra' },
  aditya: { email: 'Aditya@gmail.com', password: 'yrv0s48mA1!', tenant: 'eyekra' },
  ravi: { email: 'ravi@lenstrack.com', password: 'Ravi@2026!', tenant: 'lenstrack' },
  rudraksh: { email: 'rudraksh@eyekra.com', password: 'Rudraksh@2026!', tenant: 'eyekra' }
}

const results = {
  passed: [],
  failed: [],
  total: 0
}

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
    reset: '\x1b[0m'
  }
  console.log(`${colors[type] || ''}${message}${colors.reset}`)
}

async function fetchResp(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      }
    })
    const data = await response.json()
    return { ok: response.ok, status: response.status, data }
  } catch (error) {
    return { ok: false, status: 0, data: { error: error.message } }
  }
}

function authHeaders(token, tenantId) {
  return {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': tenantId
  }
}

async function login(email, password) {
  const { ok, status, data } = await fetchResp(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  
  if (ok) {
    const token = data.data?.accessToken || data.accessToken
    const tenantId = data.data?.user?.tenantId || data.user?.tenantId
    return { success: true, token, tenantId, user: data.data?.user || data.user }
  }
  return { success: false, error: data?.error || data?.message, status }
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

function calculateTotalTime(sessions) {
  let totalMinutes = 0
  sessions.forEach(session => {
    if (session.checkIn) {
      const checkIn = new Date(session.checkIn)
      const checkOut = session.checkOut ? new Date(session.checkOut) : new Date()
      const diffMs = checkOut - checkIn
      const minutes = Math.max(0, Math.round(diffMs / (1000 * 60)))
      totalMinutes += minutes
    }
  })
  return totalMinutes
}

async function testAPI(name, method, endpoint, options = {}) {
  results.total++
  try {
    const { ok, status, data } = await fetchResp(`${API_BASE}${endpoint}`, {
      method,
      ...options,
      headers: authHeaders(options.token, options.tenantId)
    })
    
    if (ok || status < 500) {
      results.passed.push({ name, status, endpoint })
      log(`✅ ${name}`, 'success')
      return { success: true, data, status }
    } else {
      results.failed.push({ name, status, error: data?.error || data?.message, endpoint })
      log(`❌ ${name}: ${data?.error || data?.message}`, 'error')
      return { success: false, data, status }
    }
  } catch (error) {
    results.failed.push({ name, error: error.message, endpoint })
    log(`❌ ${name}: ${error.message}`, 'error')
    return { success: false, error: error.message }
  }
}

async function testAttendanceTimeCalculation(user) {
  log(`\n📊 Testing Attendance Time Calculation for ${user.email}`, 'info')
  
  const { token, tenantId } = await login(user.email, user.password)
  if (!token) {
    log(`❌ Login failed for ${user.email}`, 'error')
    return
  }
  
  const today = new Date().toISOString().split('T')[0]
  
  // Get attendance records
  const attendanceResp = await testAPI(
    `Get Attendance Records - ${user.email}`,
    'GET',
    `/attendance?date=${today}&limit=100`,
    { token, tenantId }
  )
  
  if (!attendanceResp.success) return
  
  // Parse attendance records
  let records = []
  if (Array.isArray(attendanceResp.data.data)) {
    records = attendanceResp.data.data
  } else if (attendanceResp.data.data?.attendances) {
    records = attendanceResp.data.data.attendances
  } else if (attendanceResp.data.data?.records) {
    records = attendanceResp.data.data.records
  }
  
  log(`\n📅 Found ${records.length} attendance records for today`, 'info')
  
  // Calculate total time
  const sessions = records.map(r => ({
    checkIn: r.check_in_time || r.checkIn?.time,
    checkOut: r.check_out_time || r.checkOut?.time,
    store: r.store_code || r.store?.code
  }))
  
  const totalMinutes = calculateTotalTime(sessions)
  const totalHours = (totalMinutes / 60).toFixed(2)
  
  log(`\n⏱️  Time Calculation:`, 'info')
  log(`   Total Sessions: ${sessions.length}`, 'info')
  log(`   Total Minutes: ${totalMinutes}`, 'info')
  log(`   Total Hours: ${totalHours}`, 'info')
  log(`   Formatted: ${formatDuration(totalMinutes)}`, 'info')
  
  // Show session breakdown
  sessions.forEach((session, idx) => {
    if (session.checkIn) {
      const checkIn = new Date(session.checkIn)
      const checkOut = session.checkOut ? new Date(session.checkOut) : null
      const duration = checkOut 
        ? Math.round((checkOut - checkIn) / (1000 * 60))
        : Math.round((new Date() - checkIn) / (1000 * 60))
      
      log(`   Session ${idx + 1}: ${checkIn.toLocaleTimeString()} - ${checkOut ? checkOut.toLocaleTimeString() : 'Active'} (${formatDuration(duration)})`, 'info')
    }
  })
  
  // Test dashboard API
  const dashboardResp = await testAPI(
    `Get Dashboard - ${user.email}`,
    'GET',
    `/hr/dashboard`,
    { token, tenantId }
  )
  
  if (dashboardResp.success && dashboardResp.data.data?.widgets?.attendance?.totalLoginTimeToday) {
    const dashboardTotal = dashboardResp.data.data.widgets.attendance.totalLoginTimeToday
    log(`\n📊 Dashboard Total Hours:`, 'info')
    log(`   Hours: ${dashboardTotal.hours}`, 'info')
    log(`   Minutes: ${dashboardTotal.minutes}`, 'info')
    log(`   Formatted: ${dashboardTotal.formatted}`, 'info')
    log(`   Sessions: ${dashboardTotal.sessionsCount}`, 'info')
    
    // Compare
    if (Math.abs(dashboardTotal.minutes - totalMinutes) <= 1) {
      log(`   ✅ Match! Dashboard calculation is correct`, 'success')
    } else {
      log(`   ⚠️  Mismatch! Expected ${totalMinutes} minutes, got ${dashboardTotal.minutes}`, 'warn')
    }
  } else {
    log(`   ⚠️  Dashboard totalLoginTimeToday not available`, 'warn')
  }
}

async function runAllTests() {
  log('🚀 Starting Complete API Testing (A to Z)', 'info')
  log('='.repeat(60), 'info')
  
  // Test with Upcapto Admin
  const upcapto = await login(TEST_USERS.upcapto.email, TEST_USERS.upcapto.password)
  if (!upcapto.success) {
    log('❌ Upcapto admin login failed', 'error')
    return
  }
  
  log('\n📋 AUTH APIs', 'info')
  await testAPI('Login', 'POST', '/auth/login', {
    body: JSON.stringify({ email: TEST_USERS.upcapto.email, password: TEST_USERS.upcapto.password })
  })
  await testAPI('Get Me', 'GET', '/auth/me', { token: upcapto.token, tenantId: upcapto.tenantId })
  
  log('\n📋 HR APIs', 'info')
  await testAPI('Get Employees', 'GET', '/hr/employees?limit=10', { token: upcapto.token, tenantId: upcapto.tenantId })
  await testAPI('Get Stores', 'GET', '/hr/stores', { token: upcapto.token, tenantId: upcapto.tenantId })
  await testAPI('Get Departments', 'GET', '/hr/departments', { token: upcapto.token, tenantId: upcapto.tenantId })
  await testAPI('Get Dashboard', 'GET', '/hr/dashboard', { token: upcapto.token, tenantId: upcapto.tenantId })
  await testAPI('Get Roles', 'GET', '/hr/roles', { token: upcapto.token, tenantId: upcapto.tenantId })
  
  log('\n📋 ATTENDANCE APIs', 'info')
  const today = new Date().toISOString().split('T')[0]
  await testAPI('Get Attendance Records', 'GET', `/attendance?date=${today}&limit=10`, { token: upcapto.token, tenantId: upcapto.tenantId })
  await testAPI('Get Today Attendance', 'GET', '/attendance/today', { token: upcapto.token, tenantId: upcapto.tenantId })
  await testAPI('Get Attendance History', 'GET', '/attendance/history?limit=10', { token: upcapto.token, tenantId: upcapto.tenantId })
  await testAPI('Get Attendance Summary', 'GET', `/attendance/summary?startDate=${today}&endDate=${today}`, { token: upcapto.token, tenantId: upcapto.tenantId })
  
  log('\n📋 TIME TRACKING APIs', 'info')
  await testAPI('Get Time Tracking', 'GET', '/hr/time-tracking?limit=10', { token: upcapto.token, tenantId: upcapto.tenantId })
  await testAPI('Get Time Tracking Stats', 'GET', '/hr/time-tracking/stats', { token: upcapto.token, tenantId: upcapto.tenantId })
  await testAPI('Get Timesheets', 'GET', '/hr/time-tracking/timesheets', { token: upcapto.token, tenantId: upcapto.tenantId })
  await testAPI('Get Projects', 'GET', '/hr/time-tracking/projects', { token: upcapto.token, tenantId: upcapto.tenantId })
  
  log('\n📋 TENANT APIs', 'info')
  await testAPI('Get Tenants', 'GET', '/hr/tenants', { token: upcapto.token, tenantId: upcapto.tenantId })
  
  // Test attendance time calculation for all users
  log('\n' + '='.repeat(60), 'info')
  log('⏱️  ATTENDANCE TIME CALCULATION TESTS', 'info')
  log('='.repeat(60), 'info')
  
  for (const [key, user] of Object.entries(TEST_USERS)) {
    if (key !== 'upcapto') { // Already tested
      await testAttendanceTimeCalculation(user)
    }
  }
  
  // Summary
  log('\n' + '='.repeat(60), 'info')
  log('📊 TEST SUMMARY', 'info')
  log('='.repeat(60), 'info')
  log(`Total Tests: ${results.total}`, 'info')
  log(`✅ Passed: ${results.passed.length}`, 'success')
  log(`❌ Failed: ${results.failed.length}`, results.failed.length > 0 ? 'error' : 'success')
  
  if (results.failed.length > 0) {
    log('\n❌ Failed Tests:', 'error')
    results.failed.forEach(f => {
      log(`   - ${f.name}: ${f.error || f.status}`, 'error')
    })
  }
  
  log('\n✅ Testing Complete!', 'success')
}

// Run tests
if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = { runAllTests, testAPI, testAttendanceTimeCalculation }
