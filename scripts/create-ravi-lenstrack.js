#!/usr/bin/env node
/**
 * Create Ravi employee in lenstrack tenant
 * - Create Tagging department
 * - Create and onboard Ravi employee
 * - Assign to warehouse (no store)
 * - Mark attendance
 * - Show dashboard
 */

const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api'
const TENANT = 'lenstrack'
const ADMIN_EMAIL = 'admin@lenstrack.com'
const ADMIN_PASSWORD = 'AdminPass123!'

// Employee details
const EMPLOYEE_NAME = 'Ravi'
const EMPLOYEE_EMAIL = 'ravi@lenstrack.com'
const EMPLOYEE_PHONE = '+919876543211'
const EMPLOYEE_PASSWORD = 'Ravi@2026!'
const EMPLOYEE_ID = `EMP-${Date.now().toString().slice(-6)}`

// Warehouse location (Mumbai coordinates as default)
const WAREHOUSE_LAT = 19.0760
const WAREHOUSE_LONG = 72.8777

function log(step, msg, data = null) {
  console.log(data ? `[${step}] ${msg} ${JSON.stringify(data, null, 2)}` : `[${step}] ${msg}`)
}

async function fetchResp(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      }
    })
    const data = await response.json()
    return { ok: response.ok, status: response.status, data }
  } catch (error) {
    return { ok: false, status: 0, data: { error: error.message } }
  }
}

function authHeaders(token, tenantId) {
  return {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': tenantId
  }
}

async function login() {
  log('LOGIN', 'Logging in as admin...')
  const { ok, status, data } = await fetchResp(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    })
  })
  
  if (!ok) {
    log('LOGIN', 'FAIL', { status, error: data?.error || data?.message })
    throw new Error(`Login failed: ${data?.error || data?.message}`)
  }
  
  const token = data.data?.accessToken || data.accessToken
  const tenantId = data.data?.user?.tenantId || data.user?.tenantId || TENANT
  log('LOGIN', 'OK', { token: token?.substring(0, 30) + '...', tenantId })
  return { token, tenantId }
}

async function createWarehouseStore(token, tenantId) {
  log('CREATE_WAREHOUSE_STORE', 'Creating warehouse store...')
  const storeData = {
    name: 'Main Warehouse',
    code: 'WH001',
    description: 'Main Warehouse for Lenstrack',
    address: {
      street: 'Warehouse Location',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      zipCode: '400001'
    },
    coordinates: {
      latitude: WAREHOUSE_LAT,
      longitude: WAREHOUSE_LONG
    },
    geofenceRadius: 200, // Larger radius for warehouse
    status: 'active'
  }
  
  const { ok, status, data } = await fetchResp(`${API_BASE}/hr/stores`, {
    method: 'POST',
    headers: authHeaders(token, tenantId),
    body: JSON.stringify(storeData)
  })
  
  if (ok) {
    const store = data.data || data
    log('CREATE_WAREHOUSE_STORE', 'OK', { storeId: store._id || store.id, name: store.name, code: store.code })
    return { success: true, store }
  } else {
    // Check if store already exists
    if (status === 409 || data?.message?.includes('already exists')) {
      log('CREATE_WAREHOUSE_STORE', 'EXISTS', 'Warehouse store already exists, fetching...')
      const { ok: fetchOk, data: fetchData } = await fetchResp(`${API_BASE}/hr/stores?search=WH001`, {
        headers: authHeaders(token, tenantId)
      })
      if (fetchOk) {
        const stores = fetchData.data || fetchData.stores || fetchData
        const existingStore = Array.isArray(stores) ? stores.find(s => s.code === 'WH001' || s.name?.includes('Warehouse')) : stores
        if (existingStore) {
          log('CREATE_WAREHOUSE_STORE', 'FOUND', { storeId: existingStore._id || existingStore.id, name: existingStore.name })
          return { success: true, store: existingStore }
        }
      }
    }
    log('CREATE_WAREHOUSE_STORE', 'FAIL', { status, error: data?.error || data?.message })
    throw new Error(`Failed to create warehouse store: ${data?.error || data?.message}`)
  }
}

async function createDepartment(token, tenantId) {
  log('CREATE_DEPARTMENT', 'Creating Tagging department...')
  const deptData = {
    name: 'Tagging',
    code: 'TAGGING',
    description: 'Tagging Department'
  }
  
  const { ok, status, data } = await fetchResp(`${API_BASE}/hr/departments`, {
    method: 'POST',
    headers: authHeaders(token, tenantId),
    body: JSON.stringify(deptData)
  })
  
  if (ok) {
    const dept = data.data || data
    log('CREATE_DEPARTMENT', 'OK', { deptId: dept._id || dept.id, name: dept.name, code: dept.code })
    return { success: true, department: dept }
  } else {
    // Check if department already exists
    if (status === 200 || data?.message?.includes('already exists')) {
      log('CREATE_DEPARTMENT', 'EXISTS', 'Department already exists, fetching...')
      const { ok: fetchOk, data: fetchData } = await fetchResp(`${API_BASE}/hr/departments`, {
        headers: authHeaders(token, tenantId)
      })
      if (fetchOk) {
        const depts = fetchData.data || fetchData.departments || fetchData
        const existingDept = Array.isArray(depts) ? depts.find(d => d.code === 'TAGGING' || d.name === 'Tagging') : depts
        if (existingDept) {
          log('CREATE_DEPARTMENT', 'FOUND', { deptId: existingDept._id || existingDept.id, name: existingDept.name })
          return { success: true, department: existingDept }
        }
      }
    }
    log('CREATE_DEPARTMENT', 'FAIL', { status, error: data?.error || data?.message })
    throw new Error(`Failed to create department: ${data?.error || data?.message}`)
  }
}

async function createEmployee(token, tenantId, departmentId, storeId) {
  log('CREATE_EMPLOYEE', 'Creating Ravi employee (warehouse store)...')
  const employeeData = {
    employeeId: EMPLOYEE_ID,
    firstName: EMPLOYEE_NAME,
    fullName: EMPLOYEE_NAME,
    email: EMPLOYEE_EMAIL,
    phone: EMPLOYEE_PHONE,
    password: EMPLOYEE_PASSWORD,
    roleName: 'employee',
    storeId: storeId, // Assign to warehouse store
    department: 'Tagging',
    jobTitle: 'Warehouse Tagging Specialist',
    designation: 'Warehouse Tagging Specialist',
    status: 'active',
    doj: new Date().toISOString(),
    workLocation: {
      type: 'warehouse',
      name: 'Main Warehouse',
      address: 'Warehouse Location'
    }
  }
  
  const { ok, status, data } = await fetchResp(`${API_BASE}/hr/employees`, {
    method: 'POST',
    headers: authHeaders(token, tenantId),
    body: JSON.stringify(employeeData)
  })
  
  if (ok) {
    const employee = data.data || data
    log('CREATE_EMPLOYEE', 'OK', { 
      employeeId: employee.employeeId || employee.employee_id,
      email: employee.email,
      name: employee.fullName || employee.firstName,
      department: employee.departmentRef?.name,
      store: employee.store?.name || 'No Store (Warehouse)'
    })
    return { success: true, employee }
  } else {
    log('CREATE_EMPLOYEE', 'FAIL', { status, error: data?.error || data?.message })
    throw new Error(`Failed to create employee: ${data?.error || data?.message}`)
  }
}

async function markAttendance(employeeToken, tenantId) {
  log('ATTENDANCE', 'Marking clock in...')
  
  // Clock in
  const clockInResp = await fetchResp(`${API_BASE}/attendance/clock-in`, {
    method: 'POST',
    headers: authHeaders(employeeToken, tenantId),
    body: JSON.stringify({
      latitude: WAREHOUSE_LAT,
      longitude: WAREHOUSE_LONG,
      notes: 'Clock in from warehouse'
    })
  })
  
  if (clockInResp.ok) {
    const attendance = clockInResp.data.data || clockInResp.data
    log('ATTENDANCE', 'CLOCK_IN OK', { 
      attendanceId: attendance._id,
      checkInTime: attendance.check_in_time,
      store: attendance.store_code || 'Warehouse'
    })
  } else {
    log('ATTENDANCE', 'CLOCK_IN FAIL', { error: clockInResp.data?.error || clockInResp.data?.message })
  }
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  // Clock out
  log('ATTENDANCE', 'Marking clock out...')
  const clockOutResp = await fetchResp(`${API_BASE}/attendance/clock-out`, {
    method: 'POST',
    headers: authHeaders(employeeToken, tenantId),
    body: JSON.stringify({
      latitude: WAREHOUSE_LAT,
      longitude: WAREHOUSE_LONG,
      notes: 'Clock out from warehouse'
    })
  })
  
  if (clockOutResp.ok) {
    const attendance = clockOutResp.data.data || clockOutResp.data
    log('ATTENDANCE', 'CLOCK_OUT OK', { 
      attendanceId: attendance._id,
      checkInTime: attendance.check_in_time,
      checkOutTime: attendance.check_out_time,
      store: attendance.store_code || 'Warehouse'
    })
  } else {
    log('ATTENDANCE', 'CLOCK_OUT FAIL', { error: clockOutResp.data?.error || clockOutResp.data?.message })
  }
}

async function getEmployeeDashboard(employeeToken, tenantId) {
  log('EMPLOYEE_DASHBOARD', 'Fetching employee dashboard...')
  const { ok, status, data } = await fetchResp(`${API_BASE}/hr/dashboard`, {
    headers: authHeaders(employeeToken, tenantId)
  })
  
  if (ok) {
    const dashboard = data.data || data
    log('EMPLOYEE_DASHBOARD', 'OK', dashboard)
    return dashboard
  } else {
    log('EMPLOYEE_DASHBOARD', 'FAIL', { status, error: data?.error || data?.message })
    return null
  }
}

async function getAdminDashboard(adminToken, tenantId) {
  log('ADMIN_DASHBOARD', 'Fetching admin dashboard...')
  const { ok, status, data } = await fetchResp(`${API_BASE}/hr/dashboard`, {
    headers: authHeaders(adminToken, tenantId)
  })
  
  if (ok) {
    const dashboard = data.data || data
    log('ADMIN_DASHBOARD', 'OK', dashboard)
    return dashboard
  } else {
    log('ADMIN_DASHBOARD', 'FAIL', { status, error: data?.error || data?.message })
    return null
  }
}

async function getAttendanceHistory(employeeToken, tenantId) {
  log('ATTENDANCE_HISTORY', 'Fetching attendance history...')
  const { ok, status, data } = await fetchResp(`${API_BASE}/attendance/history?limit=5`, {
    headers: authHeaders(employeeToken, tenantId)
  })
  
  if (ok) {
    const records = data.data || data
    log('ATTENDANCE_HISTORY', 'OK', { 
      total: data.pagination?.total || (Array.isArray(records) ? records.length : 0),
      records: Array.isArray(records) ? records.map(r => ({
        date: r.date,
        checkIn: r.check_in_time,
        checkOut: r.check_out_time,
        store: r.store_code || 'Warehouse',
        status: r.status
      })) : records
    })
    return records
  } else {
    log('ATTENDANCE_HISTORY', 'FAIL', { status, error: data?.error || data?.message })
    return null
  }
}

async function getTodayAttendance(employeeToken, tenantId) {
  log('TODAY_ATTENDANCE', 'Fetching today attendance...')
  const { ok, status, data } = await fetchResp(`${API_BASE}/attendance/today`, {
    headers: authHeaders(employeeToken, tenantId)
  })
  
  if (ok) {
    const attendance = data.data || data
    log('TODAY_ATTENDANCE', 'OK', attendance)
    return attendance
  } else {
    log('TODAY_ATTENDANCE', 'FAIL', { status, error: data?.error || data?.message })
    return null
  }
}

async function main() {
  try {
    console.log('🚀 Starting Ravi Employee Creation in Lenstrack Tenant')
    console.log('='.repeat(60))
    
    // 1. Login as admin
    const { token, tenantId } = await login()
    
    // 2. Create warehouse store
    const { store } = await createWarehouseStore(token, tenantId)
    const storeId = store._id || store.id
    
    // 3. Create Tagging department
    const { department } = await createDepartment(token, tenantId)
    const departmentId = department._id || department.id
    
    // 4. Create employee (warehouse store assigned)
    const { employee } = await createEmployee(token, tenantId, departmentId, storeId)
    const employeeMongoId = employee._id || employee.id
    
    // 4. Login as employee
    log('EMPLOYEE_LOGIN', 'Logging in as Ravi...')
    const { ok: empLoginOk, data: empLoginData } = await fetchResp(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: EMPLOYEE_EMAIL,
        password: EMPLOYEE_PASSWORD
      })
    })
    
    if (!empLoginOk) {
      log('EMPLOYEE_LOGIN', 'FAIL', { error: empLoginData?.error || empLoginData?.message })
      throw new Error('Failed to login as employee')
    }
    
    const employeeToken = empLoginData.data?.accessToken || empLoginData.accessToken
    const employeeTenantId = empLoginData.data?.user?.tenantId || empLoginData.user?.tenantId || tenantId
    log('EMPLOYEE_LOGIN', 'OK', { token: employeeToken?.substring(0, 30) + '...', tenantId: employeeTenantId })
    
    // 5. Mark attendance
    await markAttendance(employeeToken, employeeTenantId)
    
    // 6. Get today attendance (with time)
    const todayAttendance = await getTodayAttendance(employeeToken, employeeTenantId)
    
    // 7. Get attendance history
    await getAttendanceHistory(employeeToken, employeeTenantId)
    
    // 8. Get employee dashboard
    const employeeDashboard = await getEmployeeDashboard(employeeToken, employeeTenantId)
    
    // 9. Get admin dashboard
    const adminDashboard = await getAdminDashboard(token, tenantId)
    
    console.log('\n✅ All operations completed successfully!')
    console.log('='.repeat(60))
    console.log(`\n📋 Summary:`)
    console.log(`   Employee: ${EMPLOYEE_NAME} (${EMPLOYEE_EMAIL})`)
    console.log(`   Employee ID: ${EMPLOYEE_ID}`)
    console.log(`   Department: ${department.name} (${department.code})`)
    console.log(`   Store: ${store.name} (${store.code}) - Warehouse`)
    console.log(`   Tenant: ${tenantId}`)
    
    if (todayAttendance) {
      console.log(`\n📅 Today's Attendance:`)
      console.log(`   Check In: ${todayAttendance.check_in_time || 'N/A'}`)
      console.log(`   Check Out: ${todayAttendance.check_out_time || 'N/A'}`)
      console.log(`   Status: ${todayAttendance.status || 'N/A'}`)
      console.log(`   Is Clocked In: ${todayAttendance.isClockedIn || false}`)
    }
    
    if (employeeDashboard?.widgets?.attendance) {
      console.log(`\n👤 Employee Dashboard Attendance:`)
      const att = employeeDashboard.widgets.attendance
      console.log(`   Status: ${att.status || 'N/A'}`)
      console.log(`   Check In: ${att.checkInTime || 'N/A'}`)
      console.log(`   Check Out: ${att.checkOutTime || 'N/A'}`)
    }
    
    if (adminDashboard?.widgets?.attendance) {
      console.log(`\n👨‍💼 Admin Dashboard Attendance:`)
      const att = adminDashboard.widgets.attendance.overall
      console.log(`   Total Employees: ${att.totalEmployees || 0}`)
      console.log(`   Present Today: ${att.presentToday || 0}`)
      console.log(`   Absent Today: ${att.absentToday || 0}`)
      console.log(`   Attendance Rate: ${att.attendanceRate || 0}%`)
    }
    
    console.log(`\n🔐 Login credentials:`)
    console.log(`   Email: ${EMPLOYEE_EMAIL}`)
    console.log(`   Password: ${EMPLOYEE_PASSWORD}`)
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

module.exports = { main }
