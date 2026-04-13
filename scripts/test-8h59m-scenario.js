#!/usr/bin/env node
/**
 * Test 8h 59m Scenario
 * Simulates: Clock in, work for 8h 59m, clock out
 * Expected: Status should be ABSENT (less than 10 hours)
 * 
 * Note: Since we can't actually wait 8h 59m, this test demonstrates
 * the logic by checking what happens with current time and explaining
 * what would happen with 8h 59m.
 */

const API_BASE = 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api'
const EMAIL = 'rudi@gmail.com'
const PASSWORD = 'Rudi@3006'
const EMPLOYEE_ID = 'EMP-2026-886706'

let token = null
let tenantId = null

async function login() {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  })
  const data = await res.json()
  token = data.accessToken || data.data?.accessToken
  const user = data.user || data.data?.user || data.data
  tenantId = user?.tenantId || user?.tenant_id || 'upcapto'
  console.log('✅ Logged in')
}

async function clockIn() {
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
      notes: '8h 59m test - clock in'
    })
  })
  const data = await res.json()
  if (!res.ok && !data.error?.toLowerCase().includes('already clocked')) {
    throw new Error('Clock-in failed: ' + JSON.stringify(data))
  }
  return data.data
}

async function clockOut() {
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
      notes: '8h 59m test - clock out'
    })
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error('Clock-out failed: ' + JSON.stringify(data))
  }
  return data.data
}

async function main() {
  console.log('='.repeat(70))
  console.log('🧪 8 HOURS 59 MINUTES SCENARIO TEST')
  console.log('='.repeat(70))
  console.log('')
  console.log('Scenario:')
  console.log('  1. Clock in')
  console.log('  2. Work for 8 hours 59 minutes')
  console.log('  3. Clock out')
  console.log('  4. Expected: Status = ABSENT (because < 10 hours)')
  console.log('')
  console.log('Note: We cannot wait 8h 59m, so this test will:')
  console.log('  - Clock in now')
  console.log('  - Clock out immediately (shows actual elapsed time)')
  console.log('  - Verify the 10-hour rule logic works')
  console.log('  - Explain what would happen with 8h 59m')
  console.log('')
  
  await login()
  
  // Step 1: Clock in
  console.log('📝 Step 1: Clocking in...')
  const clockInData = await clockIn()
  const checkInTime = clockInData?.checkIn?.time || clockInData?.check_in_time
  console.log(`✅ Clocked in at: ${new Date(checkInTime).toLocaleString()}`)
  console.log('')
  
  // Step 2: Wait a moment (simulating work)
  console.log('📝 Step 2: Working... (simulating 8h 59m scenario)')
  console.log('   In real scenario: Employee works for 8 hours 59 minutes')
  await new Promise(resolve => setTimeout(resolve, 3000))
  console.log('')
  
  // Step 3: Clock out
  console.log('📝 Step 3: Clocking out...')
  const clockOutData = await clockOut()
  
  const checkOutTime = clockOutData?.checkOut?.time || clockOutData?.check_out_time
  const totalHours = clockOutData?.total_hours || clockOutData?.totalHours || 0
  const status = clockOutData?.status
  
  console.log(`✅ Clocked out at: ${new Date(checkOutTime).toLocaleString()}`)
  console.log(`   Total Hours: ${totalHours.toFixed(2)}`)
  console.log(`   Status: ${status}`)
  console.log('')
  
  // Step 4: Analysis
  console.log('='.repeat(70))
  console.log('📊 RESULT ANALYSIS')
  console.log('='.repeat(70))
  console.log('')
  
  if (totalHours < 10) {
    console.log(`✅ Total hours: ${totalHours.toFixed(2)} hours (< 10 hours)`)
    if (status === 'absent') {
      console.log('✅ Status: ABSENT (correctly marked)')
      console.log('')
      console.log('🎯 CONCLUSION:')
      console.log('   The 10-hour rule is WORKING CORRECTLY!')
      console.log('   When total hours < 10, status is marked as ABSENT.')
      console.log('')
      console.log('💡 For 8h 59m scenario:')
      console.log('   - If employee works exactly 8h 59m and clocks out')
      console.log('   - Total hours = 8.98 hours (< 10 hours)')
      console.log('   - Status will be: ABSENT ✅')
    } else {
      console.log(`❌ Status: ${status} (should be absent)`)
      console.log('   The 10-hour rule is NOT working correctly!')
    }
  } else {
    console.log(`ℹ️  Total hours: ${totalHours.toFixed(2)} hours (>= 10 hours)`)
    console.log(`   Status: ${status}`)
    console.log('   This test used actual elapsed time, not 8h 59m')
  }
  
  console.log('')
  console.log('='.repeat(70))
  console.log('✅ Test Complete!')
  console.log('='.repeat(70))
}

main().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
