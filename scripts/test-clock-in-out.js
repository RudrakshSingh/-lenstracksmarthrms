#!/usr/bin/env node
/**
 * Test Clock-In and Clock-Out APIs
 * 
 * Usage:
 *   BACKEND_URL=http://your-api.com node scripts/test-clock-in-out.js
 *   EMAIL=user@example.com PASSWORD=pass node scripts/test-clock-in-out.js
 */

const rawBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000'
const BASE = rawBase.replace(/\/+$/, '')
const API_BASE = BASE.endsWith('/api') ? BASE : `${BASE}/api`

const EMAIL = process.env.EMAIL || 'admin@upcapto.com'
const PASSWORD = process.env.PASSWORD || 'Upcapto@2026'
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
  
  if (!tenantId) {
    console.error('⚠️  WARNING: No tenantId found')
  }
  
  log('LOGIN', 'OK', { tenantId: tenantId || '(none)', employeeId: user?.employee_id || user?.employeeId })
  return { token, tenantId, employeeId: user?.employee_id || user?.employeeId }
}

function authHeaders(token, tenantId) {
  const h = { 'Content-Type': 'application/json', Accept: 'application/json' }
  h.Authorization = `Bearer ${token}`
  if (tenantId) {
    h['x-tenant-id'] = String(tenantId).toLowerCase().trim()
  }
  return h
}

async function checkTodayAttendance(token, tenantId, employeeId) {
  const url = `${API_BASE}/attendance/today?employeeId=${encodeURIComponent(employeeId)}&date=${new Date().toISOString().slice(0, 10)}`
  log('CHECK_TODAY', 'GET', { url })
  const { ok, status, data } = await fetchResp(url, {
    method: 'GET',
    headers: authHeaders(token, tenantId),
  })
  
  if (ok) {
    const attendance = data.data || data
    const isClockedIn = attendance?.isClockedIn || !!(attendance?.checkIn && !attendance?.checkOut)
    log('CHECK_TODAY', 'OK', { 
      isClockedIn,
      hasCheckIn: !!attendance?.checkIn,
      hasCheckOut: !!attendance?.checkOut,
      status: attendance?.status 
    })
    return { isClockedIn, attendance }
  } else {
    log('CHECK_TODAY', 'FAIL', { status, error: data?.error || data?.message })
    return { isClockedIn: false, attendance: null }
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
  console.log('Testing Clock-In and Clock-Out APIs')
  console.log('='.repeat(60))
  console.log(`Backend API: ${API_BASE}`)
  console.log(`Email: ${EMAIL}`)
  console.log(`Location: ${LATITUDE}, ${LONGITUDE}`)
  console.log('')
  
  // Step 1: Login
  const { token, tenantId, employeeId } = await login()
  
  if (!employeeId) {
    console.error('❌ No employeeId found. Cannot test attendance APIs.')
    process.exit(1)
  }
  
  // Step 2: Check today's attendance
  console.log('')
  const { isClockedIn, attendance } = await checkTodayAttendance(token, tenantId, employeeId)
  let clockInResult = null
  
  // Step 3: Clock In (if not already clocked in)
  console.log('')
  if (isClockedIn) {
    console.log('ℹ️  Already clocked in. Skipping clock-in...')
    console.log('   Check-in time:', attendance?.checkIn?.time || attendance?.check_in_time || 'N/A')
    clockInResult = { success: true, skipped: true }
  } else {
    clockInResult = await clockIn(token, tenantId)
    if (!clockInResult.success) {
      if (clockInResult.status === 400 && clockInResult.error?.toLowerCase().includes('already clocked')) {
        console.log('ℹ️  Already clocked in (backend validation)')
        clockInResult = { success: true, skipped: true, reason: 'already_clocked_in' }
      } else {
        console.error('❌ Clock-in failed')
        process.exit(1)
      }
    }
  }
  
  // Step 4: Wait a bit
  console.log('')
  console.log('⏳ Waiting 2 seconds before clock-out...')
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Step 5: Clock Out
  console.log('')
  const clockOutResult = await clockOut(token, tenantId)
  if (!clockOutResult.success) {
    if (clockOutResult.status === 400 && clockOutResult.error?.toLowerCase().includes('not clocked')) {
      console.log('ℹ️  Not clocked in. Cannot clock out.')
    } else {
      console.error('❌ Clock-out failed')
      process.exit(1)
    }
  }
  
  // Summary
  console.log('')
  console.log('='.repeat(60))
  console.log('✅ Test Complete!')
  console.log('='.repeat(60))
  console.log('Summary:')
  console.log(`  Login: ✅ OK`)
  console.log(`  Check Today: ${attendance ? '✅ OK' : '⚠️  No record'}`)
  const clockInSuccess = !!(isClockedIn || clockInResult?.success)
  console.log(`  Clock-In: ${clockInSuccess ? '✅ OK' : '❌ FAIL'}`)
  console.log(`  Clock-Out: ${clockOutResult.success ? '✅ OK' : '❌ FAIL'}`)
  console.log('')
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err)
  if (err.stack) {
    console.error('Stack:', err.stack)
  }
  process.exit(1)
})
