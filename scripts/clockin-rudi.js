#!/usr/bin/env node
/**
 * Clock In/Out Script for Rudi
 * Logs in with rudi@gmail.com / Rudi@3006 and clocks in/out using live backend URL
 * 
 * Usage: 
 *   node scripts/clockin-rudi.js          # Clock in (default)
 *   node scripts/clockin-rudi.js in       # Clock in
 *   node scripts/clockin-rudi.js out      # Clock out
 *   ACTION=out node scripts/clockin-rudi.js  # Clock out via env var
 */

// Live backend URL
const API_BASE = 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api'

// Credentials
const EMAIL = 'rudi@gmail.com'
const PASSWORD = 'Rudi@3006'

// Default location (Mumbai coordinates)
const LATITUDE = parseFloat(process.env.LATITUDE || '19.0760')
const LONGITUDE = parseFloat(process.env.LONGITUDE || '72.8777')

// Determine action: 'in' or 'out' (default: 'in')
const ACTION = (process.argv[2] || process.env.ACTION || 'in').toLowerCase()
const isClockIn = ACTION === 'in' || ACTION === 'clockin' || ACTION === 'clock-in'
const isClockOut = ACTION === 'out' || ACTION === 'clockout' || ACTION === 'clock-out'

async function fetchAttendanceStatus(token, tenantId, employeeId) {
  try {
    const statusRes = await fetch(`${API_BASE}/attendance/today?employeeId=${employeeId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId,
      },
    })
    
    if (statusRes.ok) {
      const statusData = await statusRes.json()
      return statusData.data || statusData
    }
  } catch (err) {
    // Ignore errors
  }
  return null
}

async function main() {
  if (!isClockIn && !isClockOut) {
    console.error('❌ Invalid action. Use "in" or "out"')
    console.error('   Usage: node scripts/clockin-rudi.js [in|out]')
    process.exit(1)
  }

  const actionName = isClockIn ? 'Clock-In' : 'Clock-Out'
  console.log('='.repeat(60))
  console.log(`🕐 ${actionName} Script for Rudi`)
  console.log('='.repeat(60))
  console.log(`📧 Email: ${EMAIL}`)
  console.log(`🌐 Backend URL: ${API_BASE.replace('/api', '')}`)
  console.log(`🎯 Action: ${isClockIn ? 'Clock In' : 'Clock Out'}`)
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

  const employeeId = user?.employee_id || user?.employeeId

  // Clock In
  if (isClockIn) {
    console.log('2️⃣  Clocking in...')
    console.log(`   Location: Lat ${LATITUDE}, Lng ${LONGITUDE}`)
    
    const clockInRes = await fetch(`${API_BASE}/attendance/clock-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId,
      },
      body: JSON.stringify({
        latitude: LATITUDE,
        longitude: LONGITUDE,
        timestamp: Date.now(),
        notes: 'Clock-in from script',
      }),
    })

    const clockInBody = await clockInRes.json().catch(async () => {
      // If JSON parsing fails, try to get text
      const text = await clockInRes.text().catch(() => '')
      return { error: text || 'Unknown error', raw: text }
    })
    
    if (!clockInRes.ok) {
      const errorMsg = (clockInBody.error || clockInBody.message || '').toLowerCase()
      
      // Check if already clocked in - this is actually a success case
      if (errorMsg.includes('already clocked') || errorMsg.includes('clock out')) {
        console.log('ℹ️  Already clocked in!')
        console.log('')
        console.log('📋 Response:')
        console.log(`   ${clockInBody.error || clockInBody.message}`)
        console.log('')
        console.log('💡 To clock in again, you need to clock out first.')
        console.log('')
        
        // Try to fetch current attendance status
        console.log('📊 Fetching current attendance status...')
        const attendance = await fetchAttendanceStatus(token, tenantId, employeeId)
        
        if (attendance) {
          if (attendance.checkIn || attendance.check_in_time) {
            const checkInTime = attendance.checkIn?.time || attendance.check_in_time
            console.log(`   ✅ Check-in Time: ${new Date(checkInTime).toLocaleString()}`)
          }
          
          if (attendance.storeCode || attendance.store_code) {
            console.log(`   🏪 Store: ${attendance.storeCode || attendance.store_code}`)
          }
        }
        
        console.log('')
        console.log('='.repeat(60))
        console.log('✅ Status: Already clocked in')
        console.log('='.repeat(60))
        process.exit(0)
      }
      
      // Other errors
      console.error('❌ Clock-in failed!')
      console.error(`   Status: ${clockInRes.status}`)
      console.error(`   Error: ${clockInBody.message || clockInBody.error || JSON.stringify(clockInBody)}`)
      console.error('')
      console.error('📋 Full Error Response:')
      console.error(JSON.stringify(clockInBody, null, 2))
      process.exit(1)
    }

    // Success!
    console.log('✅ Clock-in successful!')
    console.log('')
    
    const responseData = clockInBody.data || clockInBody
    
    // Display check-in details
    if (responseData.checkIn || responseData.check_in_time) {
      const checkIn = responseData.checkIn || {}
      const checkInTime = checkIn.time || responseData.check_in_time || responseData.date
      
      if (checkInTime) {
        console.log('📅 Check-in Time:', new Date(checkInTime).toLocaleString())
      }
      
      if (checkIn.location) {
        console.log('📍 Location:', checkIn.location.address || 
          `Lat: ${checkIn.location.latitude}, Lng: ${checkIn.location.longitude}`)
      }
    }
    
    // Display store information
    if (responseData.storeCode || responseData.store_code) {
      console.log('🏪 Store:', responseData.storeCode || responseData.store_code)
    }
    
    if (responseData.status) {
      console.log('📊 Status:', responseData.status)
    }
    
    console.log('')
    console.log('='.repeat(60))
    console.log('✅ Clock-in completed successfully!')
    console.log('='.repeat(60))
    
    // Print full response for reference
    console.log('')
    console.log('📋 Full Response:')
    console.log(JSON.stringify(clockInBody, null, 2))
  }

  // Clock Out
  if (isClockOut) {
    console.log('2️⃣  Clocking out...')
    console.log(`   Location: Lat ${LATITUDE}, Lng ${LONGITUDE}`)
    
    const clockOutRes = await fetch(`${API_BASE}/attendance/clock-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId,
      },
      body: JSON.stringify({
        latitude: LATITUDE,
        longitude: LONGITUDE,
        timestamp: Date.now(),
        notes: 'Clock-out from script',
      }),
    })

    const clockOutBody = await clockOutRes.json().catch(async () => {
      // If JSON parsing fails, try to get text
      const text = await clockOutRes.text().catch(() => '')
      return { error: text || 'Unknown error', raw: text }
    })
    
    if (!clockOutRes.ok) {
      const errorMsg = (clockOutBody.error || clockOutBody.message || '').toLowerCase()
      
      // Check if not clocked in
      if (errorMsg.includes('not clocked in') || errorMsg.includes('clock in first') || 
          errorMsg.includes('no open attendance')) {
        console.log('ℹ️  Not clocked in!')
        console.log('')
        console.log('📋 Response:')
        console.log(`   ${clockOutBody.error || clockOutBody.message}`)
        console.log('')
        console.log('💡 Please clock in first before clocking out.')
        console.log('')
        
        // Try to fetch current attendance status
        console.log('📊 Fetching current attendance status...')
        const attendance = await fetchAttendanceStatus(token, tenantId, employeeId)
        
        if (attendance) {
          if (attendance.checkIn || attendance.check_in_time) {
            const checkInTime = attendance.checkIn?.time || attendance.check_in_time
            console.log(`   ✅ Check-in Time: ${new Date(checkInTime).toLocaleString()}`)
          }
          
          if (attendance.checkOut || attendance.check_out_time) {
            const checkOutTime = attendance.checkOut?.time || attendance.check_out_time
            console.log(`   ✅ Check-out Time: ${new Date(checkOutTime).toLocaleString()}`)
          }
          
          if (attendance.storeCode || attendance.store_code) {
            console.log(`   🏪 Store: ${attendance.storeCode || attendance.store_code}`)
          }
        }
        
        console.log('')
        console.log('='.repeat(60))
        console.log('❌ Status: Not clocked in')
        console.log('='.repeat(60))
        process.exit(1)
      }
      
      // Other errors
      console.error('❌ Clock-out failed!')
      console.error(`   Status: ${clockOutRes.status}`)
      console.error(`   Error: ${clockOutBody.message || clockOutBody.error || JSON.stringify(clockOutBody)}`)
      console.error('')
      console.error('📋 Full Error Response:')
      console.error(JSON.stringify(clockOutBody, null, 2))
      process.exit(1)
    }

    // Success!
    console.log('✅ Clock-out successful!')
    console.log('')
    
    const responseData = clockOutBody.data || clockOutBody
    
    // Display check-out details
    if (responseData.checkOut || responseData.check_out_time) {
      const checkOut = responseData.checkOut || {}
      const checkOutTime = checkOut.time || responseData.check_out_time
      
      if (checkOutTime) {
        console.log('📅 Check-out Time:', new Date(checkOutTime).toLocaleString())
      }
      
      if (checkOut.location) {
        console.log('📍 Location:', checkOut.location.address || 
          `Lat: ${checkOut.location.latitude}, Lng: ${checkOut.location.longitude}`)
      }
    }
    
    // Display check-in details if available
    if (responseData.checkIn || responseData.check_in_time) {
      const checkIn = responseData.checkIn || {}
      const checkInTime = checkIn.time || responseData.check_in_time
      
      if (checkInTime) {
        console.log('📅 Check-in Time:', new Date(checkInTime).toLocaleString())
      }
    }
    
    // Display total hours
    if (responseData.total_hours || responseData.totalHours) {
      const hours = responseData.total_hours || responseData.totalHours
      console.log('⏱️  Total Hours:', hours.toFixed(2))
    }
    
    // Display store information
    if (responseData.storeCode || responseData.store_code) {
      console.log('🏪 Store:', responseData.storeCode || responseData.store_code)
    }
    
    if (responseData.status) {
      console.log('📊 Status:', responseData.status)
    }
    
    console.log('')
    console.log('='.repeat(60))
    console.log('✅ Clock-out completed successfully!')
    console.log('='.repeat(60))
    
    // Print full response for reference
    console.log('')
    console.log('📋 Full Response:')
    console.log(JSON.stringify(clockOutBody, null, 2))
  }
}

main().catch((err) => {
  console.error('')
  console.error('❌ Unexpected error:', err.message)
  if (err.stack) {
    console.error('Stack:', err.stack)
  }
  process.exit(1)
})
