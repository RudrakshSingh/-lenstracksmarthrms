#!/usr/bin/env node
/**
 * Clock In Script (aligned with Attendance Status API v2.0)
 * Logs in, checks today's attendance via GET /api/attendance/today (uses isClockedIn),
 * then POST /api/attendance/clock-in if not already clocked in.
 *
 * Usage:
 *   PASSWORD=xxx node scripts/clock-in.js
 *   EMAIL=you@example.com PASSWORD=xxx node scripts/clock-in.js
 *   BASE_URL=http://localhost:3000 PASSWORD=xxx node scripts/clock-in.js
 *
 * Env:
 *   BASE_URL   - Shell app URL (default http://localhost:3000)
 *   EMAIL      - Login email
 *   PASSWORD   - Login password (required)
 *   DATE       - Optional. Date YYYY-MM-DD for today check (default: today)
 *   LATITUDE   - Optional (default 28.6139)
 *   LONGITUDE  - Optional (default 77.2090)
 *
 * API: GET /api/attendance/today?employeeId=&date= (isClockedIn, checkIn, checkOut)
 *      POST /api/attendance/clock-in (backend handles store codes per doc)
 * Requires: Shell dev server running (pnpm dev:shell).
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const EMAIL = process.env.EMAIL || 'raviraikwar10022001@gmail.com'
const PASSWORD = process.env.PASSWORD || ''
const DATE = process.env.DATE || new Date().toISOString().split('T')[0]
const LATITUDE = parseFloat(process.env.LATITUDE || '28.6139')
const LONGITUDE = parseFloat(process.env.LONGITUDE || '77.2090')

/**
 * Extract check-in time from attendance record
 * Handles both old and new response formats
 */
function getCheckInTime(record) {
  if (!record?.checkIn) return null
  const c = record.checkIn
  if (typeof c === 'string') return c
  if (c && typeof c === 'object' && c.time) return c.time
  return null
}

/**
 * Format date/time for display
 */
function formatDateTime(dateTime) {
  if (!dateTime) return 'N/A'
  try {
    return new Date(dateTime).toLocaleString()
  } catch {
    return dateTime
  }
}

async function main() {
  if (!PASSWORD) {
    console.error('❌ Set PASSWORD. Usage: PASSWORD=yourpass node scripts/clock-in.js')
    process.exit(1)
  }

  console.log('🔐 Logging in...', EMAIL)
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })

  if (!loginRes.ok) {
    const err = await loginRes.text()
    console.error('❌ Login failed:', loginRes.status, err)
    process.exit(1)
  }

  const loginData = await loginRes.json()
  
  // Extract token - handle both response formats
  const token = loginData.data?.accessToken || loginData.accessToken
  const user = loginData.data?.user || loginData.user
  
  // Extract tenantId - try multiple paths
  const tenantId = user?.tenantId || user?.tenant_id || loginData.data?.user?.tenantId || null

  if (!token) {
    console.error('❌ No access token in login response')
    console.error('Response:', JSON.stringify(loginData, null, 2))
    process.exit(1)
  }

  // Extract employeeId - try multiple paths
  const employeeId = user?.employee_id || user?.employeeId || user?.id
  if (!employeeId) {
    console.error('❌ No employeeId in user.')
    console.error('User object:', JSON.stringify(user, null, 2))
    process.exit(1)
  }

  console.log('✅ Logged in. Employee ID:', employeeId)
  if (tenantId) {
    console.log('   Tenant ID:', tenantId)
  }

  // GET /api/attendance/today per doc (employeeId, optional date; use isClockedIn)
  const todayParams = new URLSearchParams({ employeeId, date: DATE })
  const todayUrl = `${BASE_URL}/api/attendance/today?${todayParams}`
  
  console.log('📋 Checking today\'s attendance...')
  const todayRes = await fetch(todayUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(tenantId && { 'X-Tenant-Id': tenantId }),
    },
  })

  if (todayRes.ok) {
    const todayJson = await todayRes.json()
    const data = todayJson.data
    
    // Handle null data (no attendance for today)
    if (!data) {
      console.log('ℹ️  No attendance record for today. Proceeding to clock in...')
    } else {
      // Use isClockedIn when present (API v2.0 - recommended)
      // Fallback to checkIn && !checkOut for backward compatibility
      const isClockedIn =
        typeof data?.isClockedIn === 'boolean'
          ? data.isClockedIn
          : !!(data?.checkIn && !data?.checkOut)
      
      if (isClockedIn) {
        const checkInTime = getCheckInTime(data)
        console.log('ℹ️  Already clocked in today.')
        console.log('   Check-in time:', formatDateTime(checkInTime))
        console.log('   Status: Currently clocked in (isClockedIn: true)')
        console.log('   💡 Run clock-out script first if you need to clock in again.')
        process.exit(0)
      } else if (data.checkIn && data.checkOut) {
        // Employee has clocked in and out today
        console.log('ℹ️  Attendance complete for today.')
        console.log('   Check-in:', formatDateTime(getCheckInTime(data)))
        console.log('   Check-out:', formatDateTime(data.checkOut?.time))
        console.log('   Total hours:', data.totalHours || 'N/A')
        console.log('   💡 You can clock in again for a new session.')
      }
    }
  } else {
    // Log error but continue (might be permission issue, but clock-in might still work)
    const errorText = await todayRes.text()
    console.warn('⚠️  Could not check today\'s attendance:', todayRes.status, errorText)
    console.log('   Proceeding to clock in anyway...')
  }

  console.log('🕐 Clocking in...')
  const clockInRes = await fetch(`${BASE_URL}/api/attendance/clock-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(tenantId && { 'X-Tenant-Id': tenantId }),
    },
    body: JSON.stringify({
      latitude: LATITUDE,
      longitude: LONGITUDE,
      timestamp: Date.now(),
      notes: 'Clock-in from script',
    }),
  })

  if (!clockInRes.ok) {
    const errText = await clockInRes.text()
    let errJson = {}
    try {
      errJson = JSON.parse(errText)
    } catch (_) {
      // Not JSON, use text as error
    }
    
    const msg = errJson?.message || errJson?.error || errText
    const errorCode = errJson?.error || 'UNKNOWN_ERROR'
    
    // Handle specific error cases
    if (
      clockInRes.status === 400 &&
      typeof msg === 'string' &&
      (msg.toLowerCase().includes('clock out from your current session') ||
        msg.toLowerCase().includes('already clocked in') ||
        msg.toLowerCase().includes('please clock out'))
    ) {
      console.log('ℹ️  Already clocked in (backend validation).')
      console.log('   Message:', msg)
      console.log('   💡 Run clock-out script first, then clock-in again if needed.')
      process.exit(0)
    }
    
    if (clockInRes.status === 400 && typeof msg === 'string' && 
        msg.toLowerCase().includes('store')) {
      console.error('❌ Store validation error:', msg)
      console.error('   This might be a store assignment issue. Please contact HR.')
      process.exit(1)
    }
    
    if (clockInRes.status === 404) {
      console.error('❌ Employee not found:', msg)
      console.error('   Please ensure employee exists in HR system.')
      process.exit(1)
    }
    
    console.error('❌ Clock in failed:', clockInRes.status)
    console.error('   Error:', errorCode)
    console.error('   Message:', msg)
    if (errJson.stack) {
      console.error('   Stack:', errJson.stack)
    }
    process.exit(1)
  }

  const resData = await clockInRes.json()
  const responseData = resData.data || resData
  
  console.log('✅ Clock in successful!')
  if (resData.message) {
    console.log('   Message:', resData.message)
  }
  
  // Display check-in details if available
  if (responseData.checkIn || responseData.check_in) {
    const checkIn = responseData.checkIn || responseData.check_in
    if (checkIn.time) {
      console.log('   Check-in time:', formatDateTime(checkIn.time))
    }
    if (checkIn.location) {
      console.log('   Location:', checkIn.location.address || 
        `Lat: ${checkIn.location.latitude}, Lng: ${checkIn.location.longitude}`)
    }
  }
  
  // Display store information if available
  if (responseData.storeCode || responseData.store_code) {
    console.log('   Store:', responseData.storeCode || responseData.store_code)
  }
}

main().catch((e) => {
  console.error('❌ Unexpected error:', e.message)
  if (e.stack) {
    console.error('Stack:', e.stack)
  }
  process.exit(1)
})
