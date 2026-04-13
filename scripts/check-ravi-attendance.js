#!/usr/bin/env node
/**
 * Check Ravi's attendance for today
 * Usage: node scripts/check-ravi-attendance.js
 */

const API_BASE = process.env.API_BASE || 'https://api.etelios.com/api'
const ADMIN_EMAIL = process.env.EMAIL || 'admin@lenstrack.com'
const ADMIN_PASSWORD = process.env.PASSWORD || 'AdminPass123!'
const TENANT_ID = process.env.TENANT_ID || 'lenstrack'

// Ravi's possible employee IDs/emails
const RAVI_EMAILS = ['ravi@lenstrack.com', 'ravirrr@gmail.com']
const RAVI_NAME = 'Ravi'

async function main() {
  console.log('🔍 Checking Ravi\'s Attendance')
  console.log('================================\n')

  // Step 1: Login as Admin
  console.log('1. Logging in as Admin...')
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    }),
  })

  const loginBody = await loginRes.json().catch(() => ({}))
  if (!loginRes.ok) {
    console.error('❌ Login failed:', loginRes.status, loginBody)
    process.exit(1)
  }

  const token = loginBody.accessToken || loginBody.data?.accessToken
  const user = loginBody.user || loginBody.data?.user || loginBody.data
  const tenantFromUser = user?.tenantId || user?.tenant_id || TENANT_ID

  if (!token) {
    console.error('❌ No access token in response')
    process.exit(1)
  }
  console.log('✅ Login successful. Tenant:', tenantFromUser || TENANT_ID)
  console.log('')

  // Step 2: Get today's date
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD
  console.log(`2. Checking attendance for today: ${todayStr}\n`)

  // Step 3: Get all attendance records for today
  console.log('3. Fetching today\'s attendance records...')
  const attendanceRes = await fetch(`${API_BASE}/attendance?date=${todayStr}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Tenant-Id': tenantFromUser || TENANT_ID,
    },
  })

  const attendanceText = await attendanceRes.text()
  let attendanceJson
  try {
    attendanceJson = JSON.parse(attendanceText)
  } catch {
    console.log('❌ Response is not JSON:', attendanceText.slice(0, 500))
    process.exit(1)
  }

  if (!attendanceRes.ok) {
    console.error('❌ Failed to fetch attendance:', attendanceRes.status, attendanceJson)
    process.exit(1)
  }

  // Step 4: Find Ravi's attendance
  const records = attendanceJson.data || attendanceJson.records || []
  console.log(`   Total records found: ${records.length}\n`)

  // Search for Ravi by name or email
  const raviRecords = records.filter(record => {
    const employeeName = (record.employeeName || record.employee?.name || record.employee?.fullName || '').toLowerCase()
    const employeeEmail = (record.employee?.email || '').toLowerCase()
    const employeeId = (record.employee_id || record.employeeId || '').toLowerCase()
    
    return employeeName.includes('ravi') || 
           RAVI_EMAILS.some(email => employeeEmail.includes(email.toLowerCase())) ||
           employeeId.includes('ravi')
  })

  // Step 5: Display results
  if (raviRecords.length === 0) {
    console.log('❌ Ravi की attendance आज के लिए नहीं मिली')
    console.log('')
    console.log('📋 All employees with attendance today:')
    records.forEach((record, index) => {
      const name = record.employeeName || record.employee?.name || record.employee?.fullName || record.employee_id || 'N/A'
      console.log(`   ${index + 1}. ${name} (${record.employee_id || 'N/A'})`)
    })
  } else {
    console.log(`✅ Ravi की attendance मिली! (${raviRecords.length} record(s))\n`)
    
    raviRecords.forEach((record, index) => {
      console.log(`--- Record ${index + 1} ---`)
      console.log(`Employee Name: ${record.employeeName || record.employee?.name || record.employee?.fullName || 'N/A'}`)
      console.log(`Employee ID: ${record.employee_id || record.employeeId || 'N/A'}`)
      console.log(`Email: ${record.employee?.email || 'N/A'}`)
      console.log(`Status: ${record.status || 'N/A'}`)
      console.log(`Date: ${record.date || record.check_in_time || 'N/A'}`)
      console.log(`Check In: ${record.check_in_time || record.checkInTime || 'Not checked in'}`)
      console.log(`Check Out: ${record.check_out_time || record.checkOutTime || 'Not checked out'}`)
      console.log(`Total Hours: ${record.total_hours || record.totalHours || 0}`)
      console.log(`Is Late: ${record.is_late || record.isLate ? 'Yes' : 'No'}`)
      console.log(`Store: ${record.store_code || record.storeCode || record.store?.name || 'N/A'}`)
      if (record.check_in_location) {
        console.log(`Check In Location: ${record.check_in_location.address || 'N/A'}`)
      }
      console.log('')
    })
  }

  // Step 6: Also check today's attendance endpoint
  console.log('4. Checking today\'s attendance endpoint...')
  const todayRes = await fetch(`${API_BASE}/attendance/today`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Tenant-Id': tenantFromUser || TENANT_ID,
    },
  })

  const todayText = await todayRes.text()
  let todayJson
  try {
    todayJson = JSON.parse(todayText)
  } catch {
    // Not JSON, skip
  }

  if (todayRes.ok && todayJson) {
    const todayName = (todayJson.data?.employeeName || todayJson.data?.employee?.name || '').toLowerCase()
    if (todayName.includes('ravi')) {
      console.log('✅ Today endpoint also shows Ravi\'s attendance')
    }
  }

  console.log('\n✅ Check complete!')
}

main().catch((err) => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
