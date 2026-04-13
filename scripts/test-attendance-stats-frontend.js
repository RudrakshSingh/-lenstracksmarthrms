#!/usr/bin/env node
/**
 * Fetch exact response from GET /api/attendance/stats after logging in.
 * Usage: node scripts/test-attendance-stats-frontend.js
 *
 * Login: admin@lenstrack.com / AdminPass123! / Tenant: lenstrack
 * Then GET /api/attendance/stats
 */

// Use production ALB URL or override with env vars
const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api'

const EMAIL = 'admin@lenstrack.com'
const PASSWORD = 'AdminPass123!'
const TENANT_ID = 'lenstrack'

async function main() {
  console.log('='.repeat(60))
  console.log('Testing Attendance Stats API')
  console.log('='.repeat(60))
  
  console.log('\n1. Logging in...')
  console.log(`   URL: ${API_BASE}/auth/login`)
  console.log(`   Email: ${EMAIL}`)
  console.log(`   Tenant: ${TENANT_ID}`)
  
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
    console.error('❌ Login failed:', loginRes.status, loginBody)
    process.exit(1)
  }

  const token = loginBody.accessToken || loginBody.data?.accessToken
  const user = loginBody.user || loginBody.data?.user || loginBody.data
  const tenantFromUser = user?.tenantId || user?.tenant_id || TENANT_ID

  if (!token) {
    console.error('❌ No access token in response. Keys:', Object.keys(loginBody))
    process.exit(1)
  }
  
  console.log('✅ Login OK')
  console.log(`   Token: ${token.substring(0, 30)}...`)
  console.log(`   Tenant: ${tenantFromUser || TENANT_ID}`)
  console.log(`   User: ${user?.name || user?.email || 'N/A'}`)

  console.log('\n2. Fetching GET /api/attendance/stats')
  console.log(`   URL: ${API_BASE}/attendance/stats`)
  console.log(`   Headers: Authorization: Bearer ..., X-Tenant-Id: ${tenantFromUser || TENANT_ID}`)
  
  const statsRes = await fetch(`${API_BASE}/attendance/stats`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantFromUser || TENANT_ID,
    },
  })

  const statsText = await statsRes.text()
  let statsJson
  try {
    statsJson = JSON.parse(statsText)
  } catch {
    console.log('❌ Response is not JSON:')
    console.log(statsText.slice(0, 500))
    process.exit(1)
  }

  if (!statsRes.ok) {
    console.error('❌ Stats API failed:', statsRes.status)
    console.error('Response:', statsJson)
    process.exit(1)
  }

  console.log('✅ Stats API OK')
  console.log('\n' + '='.repeat(60))
  console.log('--- Exact response from /api/attendance/stats ---')
  console.log(JSON.stringify(statsJson, null, 2))
  console.log('='.repeat(60))
  console.log('\n--- Summary ---')
  
  if (statsJson.data) {
    const data = statsJson.data
    console.log(`Total Employees: ${data.totalEmployees}`)
    console.log(`Present Today: ${data.presentToday}`)
    console.log(`Absent Today: ${data.absentToday}`)
    console.log(`Late Arrivals: ${data.lateArrivals}`)
    console.log(`On Leave: ${data.onLeave}`)
    console.log(`Attendance Rate: ${data.attendanceRate}%`)
    console.log(`Average Hours: ${data.averageHours}`)
    
    // Validation
    if (data.totalEmployees === 4) {
      console.log('\n✅ VALIDATION: totalEmployees is 4 (correct for Lenstrack)')
    } else if (data.totalEmployees === 73) {
      console.log('\n❌ VALIDATION FAILED: totalEmployees is 73 (showing all tenants)')
    } else {
      console.log(`\n⚠️  VALIDATION: totalEmployees is ${data.totalEmployees} (expected 4 for Lenstrack)`)
    }
  }
  
  console.log('\n--- End of response ---')
}

main().catch((err) => {
  console.error('❌ Error:', err.message)
  console.error(err.stack)
  process.exit(1)
})
