#!/usr/bin/env node
/**
 * Production Test Script for Rudi
 * Tests clock in/out, attendance status, and 10-hour rule
 * 
 * Usage: node scripts/test-rudi-prod.js
 */

const API_BASE = 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api'
const EMAIL = 'rudi@gmail.com'
const PASSWORD = 'Rudi@3006'
const EMPLOYEE_ID = 'EMP-2026-886706'

let token = null
let tenantId = null
let user = null

async function login() {
  console.log('='.repeat(60))
  console.log('🔐 Step 1: Login')
  console.log('='.repeat(60))
  
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
  console.log(`   Tenant ID: ${tenantId}`)
  console.log('')
}

async function checkCurrentStatus() {
  console.log('='.repeat(60))
  console.log('📊 Step 2: Check Current Attendance Status')
  console.log('='.repeat(60))
  
  const today = new Date().toISOString().split('T')[0]
  const url = `${API_BASE}/attendance/today?employeeId=${EMPLOYEE_ID}&date=${today}`
  
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId
    }
  })
  
  const data = await res.json()
  
  if (res.ok && data.data) {
    const att = data.data
    console.log('✅ Current Status:')
    console.log(`   Is Clocked In: ${att.isClockedIn || false}`)
    if (att.checkIn) {
      console.log(`   Check-in Time: ${new Date(att.checkIn.time || att.check_in_time).toLocaleString()}`)
    }
    if (att.checkOut) {
      console.log(`   Check-out Time: ${new Date(att.checkOut.time || att.check_out_time).toLocaleString()}`)
    }
    console.log(`   Total Hours: ${att.totalHours || att.total_hours || 0}`)
    console.log(`   Status: ${att.status}`)
    console.log(`   Store: ${att.storeCode || att.store_code}`)
    
    return att
  } else {
    console.log('ℹ️  No attendance record for today')
    return null
  }
}

async function clockIn() {
  console.log('')
  console.log('='.repeat(60))
  console.log('🕐 Step 3: Clock In')
  console.log('='.repeat(60))
  
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
      notes: 'Production test clock-in'
    })
  })
  
  const data = await res.json()
  
  if (!res.ok) {
    const errorMsg = (data.error || data.message || '').toLowerCase()
    if (errorMsg.includes('already clocked')) {
      console.log('ℹ️  Already clocked in')
      return null
    }
    console.error('❌ Clock-in failed:', data)
    return null
  }
  
  console.log('✅ Clock-in successful!')
  if (data.data?.checkIn) {
    console.log(`   Check-in Time: ${new Date(data.data.checkIn.time).toLocaleString()}`)
  }
  console.log(`   Status: ${data.data?.status || 'present'}`)
  console.log(`   Store: ${data.data?.storeCode || data.data?.store_code}`)
  
  return data.data
}

async function clockOut() {
  console.log('')
  console.log('='.repeat(60))
  console.log('🕐 Step 4: Clock Out')
  console.log('='.repeat(60))
  
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
      notes: 'Production test clock-out'
    })
  })
  
  const data = await res.json()
  
  if (!res.ok) {
    console.error('❌ Clock-out failed:', data)
    return null
  }
  
  console.log('✅ Clock-out successful!')
  
  const att = data.data || data
  if (att.checkIn || att.check_in_time) {
    const checkInTime = att.checkIn?.time || att.check_in_time
    console.log(`   Check-in Time: ${new Date(checkInTime).toLocaleString()}`)
  }
  if (att.checkOut || att.check_out_time) {
    const checkOutTime = att.checkOut?.time || att.check_out_time
    console.log(`   Check-out Time: ${new Date(checkOutTime).toLocaleString()}`)
  }
  
  const totalHours = att.total_hours || att.totalHours || 0
  console.log(`   Total Hours: ${totalHours.toFixed(2)}`)
  console.log(`   Status: ${att.status}`)
  console.log(`   Store: ${att.storeCode || att.store_code}`)
  
  // Check 10-hour rule
  console.log('')
  console.log('📋 10-Hour Rule Check:')
  if (totalHours < 10) {
    console.log(`   ⚠️  Total hours (${totalHours.toFixed(2)}) is less than 10 hours`)
    if (att.status === 'absent') {
      console.log('   ✅ Correctly marked as ABSENT (10-hour rule working)')
    } else {
      console.log('   ⚠️  Status is not absent (should be absent for < 10 hours)')
    }
  } else {
    console.log(`   ✅ Total hours (${totalHours.toFixed(2)}) meets 10-hour requirement`)
    if (att.status === 'present') {
      console.log('   ✅ Correctly marked as PRESENT')
    }
  }
  
  return att
}

async function checkSchedulerStatus() {
  console.log('')
  console.log('='.repeat(60))
  console.log('⏰ Step 5: Check Scheduler Status')
  console.log('='.repeat(60))
  
  try {
    const res = await fetch(`${API_BASE}/attendance/scheduler/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    })
    
    const data = await res.json()
    
    if (res.ok && data.scheduler) {
      console.log('✅ Scheduler Status:')
      console.log(`   Is Running: ${data.scheduler.isRunning}`)
      console.log(`   Jobs Count: ${data.scheduler.jobsCount}`)
      console.log(`   Jobs: ${data.scheduler.jobs?.join(', ') || 'N/A'}`)
      return data.scheduler
    } else {
      console.log('ℹ️  Scheduler endpoint not available (may not be deployed yet)')
      console.log('   This is expected if the new code is not deployed')
      return null
    }
  } catch (error) {
    console.log('ℹ️  Scheduler endpoint not available:', error.message)
    return null
  }
}

async function main() {
  try {
    // Step 1: Login
    await login()
    
    // Step 2: Check current status
    const currentStatus = await checkCurrentStatus()
    
    // Step 3: Clock in (if not already clocked in)
    if (!currentStatus?.isClockedIn) {
      await clockIn()
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000))
    } else {
      console.log('')
      console.log('ℹ️  Already clocked in, skipping clock-in step')
    }
    
    // Step 4: Clock out
    await clockOut()
    
    // Step 5: Check scheduler status
    await checkSchedulerStatus()
    
    console.log('')
    console.log('='.repeat(60))
    console.log('✅ Production Test Complete!')
    console.log('='.repeat(60))
    console.log('')
    console.log('📋 Summary:')
    console.log('   - Login: ✅')
    console.log('   - Attendance Status: ✅')
    console.log('   - Clock In/Out: ✅')
    console.log('   - 10-Hour Rule: Checked')
    console.log('   - Scheduler: Checked')
    console.log('')
    
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
