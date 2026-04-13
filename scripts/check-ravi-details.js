#!/usr/bin/env node
/**
 * Check Ravi's employee details and attendance history
 */

const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api'
const ADMIN_EMAIL = process.env.EMAIL || 'admin@lenstrack.com'
const ADMIN_PASSWORD = process.env.PASSWORD || 'AdminPass123!'
const TENANT_ID = process.env.TENANT_ID || 'lenstrack'

async function main() {
  console.log('🔍 Checking Ravi\'s Details and Attendance')
  console.log('==========================================\n')

  // Login
  console.log('1. Logging in...')
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })

  const loginBody = await loginRes.json().catch(() => ({}))
  if (!loginRes.ok) {
    console.error('❌ Login failed')
    process.exit(1)
  }

  const token = loginRes.ok ? (loginBody.accessToken || loginBody.data?.accessToken) : null
  const tenantFromUser = loginBody.user?.tenantId || loginBody.data?.user?.tenantId || TENANT_ID

  console.log('✅ Login successful\n')

  // Get all employees
  console.log('2. Searching for Ravi in employees...')
  const employeesRes = await fetch(`${API_BASE}/hr/employees?search=ravi`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Tenant-Id': tenantFromUser,
    },
  })

  const employeesData = await employeesRes.json().catch(() => ({}))
  const employees = employeesData.data || employeesData.employees || []

  if (employees.length === 0) {
    console.log('❌ Ravi employee not found\n')
    
    // Try to get all employees
    console.log('3. Getting all employees...')
    const allEmployeesRes = await fetch(`${API_BASE}/hr/employees`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-Id': tenantFromUser,
      },
    })
    const allEmployeesData = await allEmployeesRes.json().catch(() => ({}))
    const allEmployees = allEmployeesData.data || allEmployeesData.employees || []
    console.log(`   Total employees: ${allEmployees.length}\n`)
    
    if (allEmployees.length > 0) {
      console.log('📋 First few employees:')
      allEmployees.slice(0, 10).forEach((emp, i) => {
        const name = emp.name || emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
        console.log(`   ${i+1}. ${name} (${emp.employee_id || emp.employeeId || 'N/A'}) - ${emp.email || 'N/A'}`)
      })
    }
  } else {
    console.log(`✅ Found ${employees.length} employee(s) matching "Ravi"\n`)
    
    employees.forEach((emp, i) => {
      console.log(`--- Employee ${i+1} ---`)
      const name = emp.name || emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
      console.log(`Name: ${name}`)
      console.log(`Employee ID: ${emp.employee_id || emp.employeeId || 'N/A'}`)
      console.log(`Email: ${emp.email || 'N/A'}`)
      console.log(`Status: ${emp.status || 'N/A'}`)
      console.log(`Store: ${emp.store?.name || emp.storeCode || 'N/A'}`)
      console.log('')
      
      // Check attendance for this employee
      if (emp.employee_id || emp.employeeId) {
        const empId = emp.employee_id || emp.employeeId
        console.log(`3. Checking attendance for ${name} (${empId})...`)
        
        // Check today's attendance
        const today = new Date().toISOString().split('T')[0]
        fetch(`${API_BASE}/attendance?employeeId=${empId}&date=${today}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-Id': tenantFromUser,
          },
        })
        .then(res => res.json())
        .then(data => {
          const records = data.data || data.records || []
          if (records.length > 0) {
            console.log(`   ✅ Attendance found for today!`)
            records.forEach(record => {
              console.log(`      Status: ${record.status || 'N/A'}`)
              console.log(`      Check In: ${record.check_in_time || 'N/A'}`)
              console.log(`      Check Out: ${record.check_out_time || 'N/A'}`)
            })
          } else {
            console.log(`   ❌ No attendance for today`)
          }
        })
        .catch(err => console.log(`   ⚠️  Could not check attendance: ${err.message}`))
      }
    })
  }

  // Check recent attendance (last 7 days)
  console.log('\n4. Checking attendance records for last 7 days...')
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const startDate = sevenDaysAgo.toISOString().split('T')[0]
  const endDate = new Date().toISOString().split('T')[0]

  const attendanceRes = await fetch(`${API_BASE}/attendance?startDate=${startDate}&endDate=${endDate}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Tenant-Id': tenantFromUser,
    },
  })

  const attendanceData = await attendanceRes.json().catch(() => ({}))
  const allRecords = attendanceData.data || attendanceData.records || []
  
  const raviRecords = allRecords.filter(record => {
    const name = (record.employeeName || record.employee?.name || '').toLowerCase()
    return name.includes('ravi')
  })

  if (raviRecords.length > 0) {
    console.log(`✅ Found ${raviRecords.length} attendance record(s) for Ravi in last 7 days:\n`)
    raviRecords.forEach((record, i) => {
      console.log(`   ${i+1}. Date: ${record.date || record.check_in_time}`)
      console.log(`      Status: ${record.status || 'N/A'}`)
      console.log(`      Check In: ${record.check_in_time || 'N/A'}`)
      console.log(`      Check Out: ${record.check_out_time || 'N/A'}`)
      console.log('')
    })
  } else {
    console.log('❌ No attendance records found for Ravi in last 7 days')
  }

  console.log('\n✅ Check complete!')
}

main().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
