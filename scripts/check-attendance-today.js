#!/usr/bin/env node
/**
 * Check Attendance Today API Response
 * Logs in with rudi@gmail.com / Rudi@3006 and checks /api/attendance/today endpoint
 * 
 * Usage: node scripts/check-attendance-today.js
 */

// API Base URL
const API_BASE = process.env.API_BASE || 'http://localhost:3000/api'

// Credentials
const EMAIL = 'rudi@gmail.com'
const PASSWORD = 'Rudi@3006'

// Parameters
const EMPLOYEE_ID = 'EMP-2026-886706'
const DATE = process.env.DATE || '2026-03-06'

async function main() {
  console.log('='.repeat(60))
  console.log('📊 Check Attendance Today API')
  console.log('='.repeat(60))
  console.log(`📧 Email: ${EMAIL}`)
  console.log(`🌐 API Base: ${API_BASE}`)
  console.log(`👤 Employee ID: ${EMPLOYEE_ID}`)
  console.log(`📅 Date: ${DATE}`)
  console.log('')

  // Step 1: Login
  console.log('1️⃣  Logging in...')
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD
    }),
  })

  const loginBody = await loginRes.json().catch(() => ({}))
  
  if (!loginRes.ok) {
    console.error('❌ Login failed!')
    console.error(`   Status: ${loginRes.status}`)
    console.error(`   Error: ${loginBody.message || loginBody.error || JSON.stringify(loginBody)}`)
    process.exit(1)
  }

  // Extract token and user info
  const token = loginBody.accessToken || loginBody.data?.accessToken
  const user = loginBody.user || loginBody.data?.user || loginBody.data
  const tenantId = user?.tenantId || user?.tenant_id || 'lenstrack'

  if (!token) {
    console.error('❌ No access token in login response')
    console.error('Response keys:', Object.keys(loginBody))
    process.exit(1)
  }

  console.log('✅ Login successful!')
  console.log(`   User: ${user?.name || user?.email || 'N/A'}`)
  console.log(`   Employee ID: ${user?.employee_id || user?.employeeId || 'N/A'}`)
  console.log(`   Tenant ID: ${tenantId}`)
  console.log('')

  // Step 2: Fetch Attendance Today
  const url = `${API_BASE}/attendance/today?employeeId=${EMPLOYEE_ID}&date=${DATE}`
  console.log('2️⃣  Fetching attendance data...')
  console.log(`   URL: ${url}`)
  console.log('')
  
  const attendanceRes = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId,
    },
  })

  const attendanceBody = await attendanceRes.json().catch(async () => {
    // If JSON parsing fails, try to get text
    const text = await attendanceRes.text().catch(() => '')
    return { error: text || 'Unknown error', raw: text }
  })
  
  console.log('📋 Response Status:', attendanceRes.status, attendanceRes.statusText)
  console.log('')
  
  if (!attendanceRes.ok) {
    console.error('❌ Request failed!')
    console.error(`   Error: ${attendanceBody.message || attendanceBody.error || JSON.stringify(attendanceBody)}`)
    console.error('')
    console.error('📋 Full Error Response:')
    console.error(JSON.stringify(attendanceBody, null, 2))
    process.exit(1)
  }

  // Success - Display formatted response
  console.log('✅ Request successful!')
  console.log('')
  console.log('='.repeat(60))
  console.log('📋 RESPONSE DATA:')
  console.log('='.repeat(60))
  console.log(JSON.stringify(attendanceBody, null, 2))
  console.log('='.repeat(60))
  console.log('')

  // Parse and display key information
  const data = attendanceBody.data || attendanceBody
  
  if (data) {
    console.log('📊 Key Information:')
    console.log('')
    
    if (data.isClockedIn !== undefined) {
      console.log(`   ✅ Is Clocked In: ${data.isClockedIn}`)
    }
    
    if (data.checkIn || data.check_in_time) {
      const checkIn = data.checkIn || {}
      const checkInTime = checkIn.time || data.check_in_time
      if (checkInTime) {
        console.log(`   📅 Check-in Time: ${new Date(checkInTime).toLocaleString()}`)
      }
      if (checkIn.location) {
        console.log(`   📍 Check-in Location: Lat ${checkIn.location.latitude}, Lng ${checkIn.location.longitude}`)
      }
    }
    
    if (data.checkOut || data.check_out_time) {
      const checkOut = data.checkOut || {}
      const checkOutTime = checkOut.time || data.check_out_time
      if (checkOutTime) {
        console.log(`   📅 Check-out Time: ${new Date(checkOutTime).toLocaleString()}`)
      }
      if (checkOut.location) {
        console.log(`   📍 Check-out Location: Lat ${checkOut.location.latitude}, Lng ${checkOut.location.longitude}`)
      }
    }
    
    if (data.total_hours || data.totalHours) {
      console.log(`   ⏱️  Total Hours: ${data.total_hours || data.totalHours}`)
    }
    
    if (data.storeCode || data.store_code) {
      console.log(`   🏪 Store: ${data.storeCode || data.store_code}`)
    }
    
    if (data.status) {
      console.log(`   📊 Status: ${data.status}`)
    }
    
    if (data.is_late !== undefined) {
      console.log(`   ⚠️  Is Late: ${data.is_late || data.isLate}`)
    }
  } else {
    console.log('ℹ️  No attendance data found for this date')
  }
  
  console.log('')
}

main().catch((err) => {
  console.error('')
  console.error('❌ Unexpected error:', err.message)
  if (err.stack) {
    console.error('Stack:', err.stack)
  }
  process.exit(1)
})
