#!/usr/bin/env node
/**
 * Complete 10-Hour Rule Test
 * 1. Clock in
 * 2. Clock out after 1 hour (dummy test)
 * 3. Clock in again
 * 4. Complete shift for 8 hours 59 minutes (total < 10 hours)
 * 5. Check response - should be marked as absent
 */

const API_BASE = 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api'
const EMAIL = 'rudi@gmail.com'
const PASSWORD = 'Rudi@3006'
const EMPLOYEE_ID = 'EMP-2026-886706'

let token = null
let tenantId = null
let user = null

async function login() {
  console.log('='.repeat(70))
  console.log('🔐 Step 1: Login')
  console.log('='.repeat(70))
  
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  })
  
  const data = await res.json()
  if (!res.ok) {
    console.error('❌ Login failed:', data)
    process.exit(1)
  }
  
  token = data.accessToken || data.data?.accessToken
  user = data.user || data.data?.user || data.data
  tenantId = user?.tenantId || user?.tenant_id || 'upcapto'
  
  console.log('✅ Login successful!')
  console.log(`   User: ${user?.name || user?.email}`)
  console.log(`   Employee ID: ${user?.employee_id || user?.employeeId}`)
  console.log('')
}

async function clockIn() {
  console.log('='.repeat(70))
  console.log('🕐 Clocking In...')
  console.log('='.repeat(70))
  
  const res = await fetch(`${API_BASE}/attendance/clock-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId
    },
    body: JSON.stringify({
      latitude: 19.0760,
      longitude: 72.8777,
      timestamp: Date.now(),
      notes: 'Test clock-in'
    })
  })
  
  const data = await res.json()
  
  if (!res.ok) {
    const errorMsg = (data.error || data.message || '').toLowerCase()
    if (errorMsg.includes('already clocked')) {
      console.log('ℹ️  Already clocked in, fetching current session...')
      // Get current session
      const today = new Date().toISOString().split('T')[0]
      const statusRes = await fetch(`${API_BASE}/attendance/today?employeeId=${EMPLOYEE_ID}&date=${today}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId
        }
      })
      const statusData = await statusRes.json()
      if (statusData.data?.checkIn) {
        return {
          checkInTime: new Date(statusData.data.checkIn.time || statusData.data.check_in_time),
          attendanceId: statusData.data.id
        }
      }
      return null
    }
    console.error('❌ Clock-in failed:', data)
    return null
  }
  
  const checkInTime = new Date(data.data?.checkIn?.time || data.data?.check_in_time || Date.now())
  console.log('✅ Clock-in successful!')
  console.log(`   Check-in Time: ${checkInTime.toLocaleString()}`)
  console.log(`   Attendance ID: ${data.data?.id}`)
  console.log('')
  
  return {
    checkInTime: checkInTime,
    attendanceId: data.data?.id
  }
}

async function clockOut(attendanceId = null) {
  console.log('='.repeat(70))
  console.log('🕐 Clocking Out...')
  console.log('='.repeat(70))
  
  const res = await fetch(`${API_BASE}/attendance/clock-out`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId
    },
    body: JSON.stringify({
      latitude: 19.0760,
      longitude: 72.8777,
      timestamp: Date.now(),
      notes: 'Test clock-out'
    })
  })
  
  const data = await res.json()
  
  if (!res.ok) {
    console.error('❌ Clock-out failed:', data)
    return null
  }
  
  const att = data.data || data
  const checkInTime = att.checkIn?.time || att.check_in_time
  const checkOutTime = att.checkOut?.time || att.check_out_time
  const totalHours = att.total_hours || att.totalHours || 0
  
  console.log('✅ Clock-out successful!')
  if (checkInTime) {
    console.log(`   Check-in Time: ${new Date(checkInTime).toLocaleString()}`)
  }
  if (checkOutTime) {
    console.log(`   Check-out Time: ${new Date(checkOutTime).toLocaleString()}`)
  }
  console.log(`   Total Hours: ${totalHours.toFixed(2)}`)
  console.log(`   Status: ${att.status}`)
  console.log('')
  
  return {
    checkInTime: checkInTime ? new Date(checkInTime) : null,
    checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
    totalHours: totalHours,
    status: att.status,
    attendanceId: att.id || att._id
  }
}

async function simulateTimePassage(hours, minutes) {
  console.log('='.repeat(70))
  console.log(`⏳ Simulating time passage: ${hours} hours ${minutes} minutes`)
  console.log('='.repeat(70))
  console.log('ℹ️  Note: In real scenario, this would be actual time passage.')
  console.log('   For testing, we will manually update the check-in time in database.')
  console.log('   Or wait for the actual time to pass.')
  console.log('')
  console.log('💡 Since we cannot modify database directly, we have two options:')
  console.log('   1. Wait for actual time to pass (not practical)')
  console.log('   2. Use a test that checks the logic with current time')
  console.log('')
  console.log('📋 For this test, we will:')
  console.log(`   - Clock in now`)
  console.log(`   - Wait a few seconds`)
  console.log(`   - Clock out (will show actual elapsed time)`)
  console.log(`   - Then verify the 10-hour rule logic`)
  console.log('')
  
  // For demonstration, we'll just wait a few seconds
  const waitSeconds = 5
  console.log(`⏳ Waiting ${waitSeconds} seconds...`)
  await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000))
  console.log('✅ Time passage simulated')
  console.log('')
}

async function checkAttendanceStatus() {
  console.log('='.repeat(70))
  console.log('📊 Checking Final Attendance Status')
  console.log('='.repeat(70))
  
  const today = new Date().toISOString().split('T')[0]
  const res = await fetch(`${API_BASE}/attendance/today?employeeId=${EMPLOYEE_ID}&date=${today}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId
    }
  })
  
  const data = await res.json()
  
  if (res.ok && data.data) {
    const att = data.data
    console.log('✅ Attendance Status:')
    console.log(`   Is Clocked In: ${att.isClockedIn || false}`)
    if (att.checkIn) {
      console.log(`   Check-in Time: ${new Date(att.checkIn.time || att.check_in_time).toLocaleString()}`)
    }
    if (att.checkOut) {
      console.log(`   Check-out Time: ${new Date(att.checkOut.time || att.check_out_time).toLocaleString()}`)
    }
    console.log(`   Total Hours: ${att.totalHours || att.total_hours || 0}`)
    console.log(`   Status: ${att.status}`)
    console.log('')
    
    // Check 10-hour rule
    const totalHours = att.totalHours || att.total_hours || 0
    console.log('📋 10-Hour Rule Validation:')
    if (totalHours < 10) {
      console.log(`   ⚠️  Total hours (${totalHours.toFixed(2)}) is less than 10 hours`)
      if (att.status === 'absent') {
        console.log('   ✅ CORRECT: Status is ABSENT (10-hour rule working!)')
      } else {
        console.log(`   ❌ INCORRECT: Status is ${att.status} (should be absent)`)
      }
    } else {
      console.log(`   ✅ Total hours (${totalHours.toFixed(2)}) meets 10-hour requirement`)
      if (att.status === 'present') {
        console.log('   ✅ CORRECT: Status is PRESENT')
      }
    }
    console.log('')
    
    return att
  } else {
    console.log('ℹ️  No attendance record found')
    return null
  }
}

async function main() {
  try {
    console.log('')
    console.log('🧪 COMPLETE 10-HOUR RULE TEST')
    console.log('')
    console.log('Test Scenario:')
    console.log('  1. Clock in')
    console.log('  2. Clock out after 1 hour (dummy test)')
    console.log('  3. Clock in again')
    console.log('  4. Complete shift for 8 hours 59 minutes')
    console.log('  5. Check response - should be marked as ABSENT')
    console.log('')
    
    // Step 1: Login
    await login()
    
    // Step 2: First Clock In
    console.log('='.repeat(70))
    console.log('📝 TEST PART 1: First Clock In')
    console.log('='.repeat(70))
    const firstClockIn = await clockIn()
    if (!firstClockIn) {
      console.error('❌ Failed to clock in')
      process.exit(1)
    }
    
    // Step 3: Wait and Clock Out (1 hour simulation)
    console.log('='.repeat(70))
    console.log('📝 TEST PART 2: Clock Out After 1 Hour (Dummy Test)')
    console.log('='.repeat(70))
    await simulateTimePassage(1, 0)
    const firstClockOut = await clockOut()
    if (!firstClockOut) {
      console.error('❌ Failed to clock out')
      process.exit(1)
    }
    
    console.log('✅ First session completed')
    console.log(`   Total Hours: ${firstClockOut.totalHours.toFixed(2)}`)
    console.log(`   Status: ${firstClockOut.status}`)
    console.log('')
    
    // Step 4: Second Clock In
    console.log('='.repeat(70))
    console.log('📝 TEST PART 3: Second Clock In (Main Shift)')
    console.log('='.repeat(70))
    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
    const secondClockIn = await clockIn()
    if (!secondClockIn) {
      console.error('❌ Failed to clock in second time')
      process.exit(1)
    }
    
    // Step 5: Simulate 8 hours 59 minutes
    console.log('='.repeat(70))
    console.log('📝 TEST PART 4: Completing Shift (8 hours 59 minutes)')
    console.log('='.repeat(70))
    console.log('ℹ️  Note: In production, this would be actual 8h 59m time passage.')
    console.log('   For this test, we are checking the logic with current time.')
    console.log('   The 10-hour rule will be validated when clock-out happens.')
    console.log('')
    console.log('💡 Since we cannot wait 8h 59m, we will:')
    console.log('   1. Clock out immediately (will show actual elapsed time)')
    console.log('   2. Verify the 10-hour rule logic works correctly')
    console.log('   3. The rule should mark as ABSENT if total < 10 hours')
    console.log('')
    
    await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
    
    // Step 6: Clock Out (after 8h 59m simulation)
    const secondClockOut = await clockOut()
    if (!secondClockOut) {
      console.error('❌ Failed to clock out second time')
      process.exit(1)
    }
    
    // Step 7: Check Final Status
    console.log('='.repeat(70))
    console.log('📝 TEST PART 5: Final Status Check')
    console.log('='.repeat(70))
    await checkAttendanceStatus()
    
    // Summary
    console.log('='.repeat(70))
    console.log('📊 TEST SUMMARY')
    console.log('='.repeat(70))
    console.log('')
    console.log('First Session:')
    console.log(`   Duration: ${firstClockOut.totalHours.toFixed(2)} hours`)
    console.log(`   Status: ${firstClockOut.status}`)
    console.log('')
    console.log('Second Session (Main Shift):')
    console.log(`   Duration: ${secondClockOut.totalHours.toFixed(2)} hours`)
    console.log(`   Status: ${secondClockOut.status}`)
    console.log('')
    
    if (secondClockOut.totalHours < 10 && secondClockOut.status === 'absent') {
      console.log('✅ TEST PASSED: 10-hour rule working correctly!')
      console.log('   - Total hours < 10 hours')
      console.log('   - Status correctly marked as ABSENT')
    } else if (secondClockOut.totalHours < 10 && secondClockOut.status !== 'absent') {
      console.log('❌ TEST FAILED: 10-hour rule not working!')
      console.log('   - Total hours < 10 hours')
      console.log(`   - Status is ${secondClockOut.status} (should be absent)`)
    } else {
      console.log('ℹ️  TEST NOTE:')
      console.log(`   - Total hours: ${secondClockOut.totalHours.toFixed(2)}`)
      console.log(`   - Status: ${secondClockOut.status}`)
      console.log('   - This test used actual elapsed time, not simulated 8h 59m')
    }
    console.log('')
    console.log('='.repeat(70))
    console.log('✅ Test Complete!')
    console.log('='.repeat(70))
    
  } catch (error) {
    console.error('')
    console.error('❌ Test failed:', error.message)
    if (error.stack) {
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }
}

main()
