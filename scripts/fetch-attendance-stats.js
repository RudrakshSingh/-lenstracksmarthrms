#!/usr/bin/env node
/**
 * Fetch exact response from GET /api/attendance/stats after logging in.
 * Usage: node scripts/fetch-attendance-stats.js
 *
 * Login: admin@lenstrack.com / AdminPass123! / Tenant: lenstrack
 * Then GET /api/attendance/stats
 * 
 * Environment Variables:
 * - API_BASE: Base API URL (default: production ALB)
 * - EMAIL: Login email (default: admin@lenstrack.com)
 * - PASSWORD: Login password (default: AdminPass123!)
 * - TENANT_ID: Tenant ID (default: lenstrack)
 */

// Use production ALB URL or override with env vars
// For local development: API_BASE=http://localhost:3000/api
// For production: API_BASE=http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api
const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api'

const EMAIL = process.env.EMAIL || 'admin@lenstrack.com'
const PASSWORD = process.env.PASSWORD || 'AdminPass123!'
const TENANT_ID = process.env.TENANT_ID || 'lenstrack'

async function main() {
  console.log('1. Logging in to', API_BASE.replace('/api', ''))
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD
      // Note: tenantId is not needed in login body, it's extracted from user after login
    }),
  })

  const loginBody = await loginRes.json().catch(() => ({}))
  if (!loginRes.ok) {
    console.error('Login failed:', loginRes.status, loginBody)
    process.exit(1)
  }

  const token = loginBody.accessToken || loginBody.data?.accessToken
  const user = loginBody.user || loginBody.data?.user || loginBody.data
  const tenantFromUser = user?.tenantId || user?.tenant_id || TENANT_ID

  if (!token) {
    console.error('No access token in response. Keys:', Object.keys(loginBody))
    process.exit(1)
  }
  console.log('Login OK. Tenant:', tenantFromUser || TENANT_ID)

  // Test without date parameter first (today's stats)
  console.log('\n2. Fetching GET', `${API_BASE}/attendance/stats`)
  const statsRes = await fetch(`${API_BASE}/attendance/stats`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Tenant-Id': tenantFromUser || TENANT_ID,
    },
  })

  const statsText = await statsRes.text()
  let statsJson
  try {
    statsJson = JSON.parse(statsText)
  } catch {
    console.log('Response (not JSON):', statsText.slice(0, 500))
    process.exit(0)
  }

  console.log('\n--- Exact response from /api/attendance/stats ---')
  console.log(JSON.stringify(statsJson, null, 2))
  console.log('\n--- End of response ---')
  
  // Also fetch actual attendance records for today
  console.log('\n3. Fetching actual attendance records for today')
  const recordsRes = await fetch(`${API_BASE}/attendance`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Tenant-Id': tenantFromUser || TENANT_ID,
    },
  })
  
  const recordsText = await recordsRes.text()
  let recordsJson
  try {
    recordsJson = JSON.parse(recordsText)
  } catch {
    console.log('Records response (not JSON):', recordsText.slice(0, 500))
  }
  
  if (recordsRes.ok && recordsJson) {
    console.log('\n--- Attendance Records for today ---')
    if (Array.isArray(recordsJson.data)) {
      console.log(`Total Records Found: ${recordsJson.data.length}`)
      if (recordsJson.data.length > 0) {
        console.log('\nRecords:')
        recordsJson.data.forEach((record, index) => {
          console.log(`\n${index + 1}. Employee: ${record.employeeName || record.employee_id || 'N/A'}`)
          console.log(`   Status: ${record.status || 'N/A'}`)
          console.log(`   Check In: ${record.check_in_time || record.checkInTime || 'N/A'}`)
          console.log(`   Check Out: ${record.check_out_time || record.checkOutTime || 'N/A'}`)
          console.log(`   Total Hours: ${record.total_hours || record.totalHours || 0}`)
          console.log(`   Is Late: ${record.is_late || record.isLate || false}`)
          console.log(`   Store: ${record.store_code || record.storeCode || 'N/A'}`)
        })
      } else {
        console.log('⚠️  No attendance records found for today')
      }
    } else {
      console.log(JSON.stringify(recordsJson, null, 2))
    }
  }
  
  // Validation
  if (statsJson.data && statsJson.data.totalEmployees) {
    console.log(`\n✅ Total Employees: ${statsJson.data.totalEmployees}`)
    console.log(`✅ Present: ${statsJson.data.presentToday || 0}`)
    console.log(`✅ Absent: ${statsJson.data.absentToday || 0}`)
    console.log(`✅ Late: ${statsJson.data.lateArrivals || 0}`)
    console.log(`✅ Attendance Rate: ${statsJson.data.attendanceRate || 0}%`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
