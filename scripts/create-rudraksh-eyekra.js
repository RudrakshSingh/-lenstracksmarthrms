#!/usr/bin/env node
/**
 * Create Rudraksh employee in eyekra tenant
 * - Create Bangalore store
 * - Create Engineering and Technology department
 * - Create and onboard Rudraksh employee
 * - Mark attendance
 * - Show dashboard
 */

const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api'
const TENANT = 'eyekra'
const ADMIN_EMAIL = 'admin@eyekra.com'
const ADMIN_PASSWORD = 'Eyekra@Admin2026!'

// Bangalore coordinates
const BANGALORE_LAT = 12.9716
const BANGALORE_LONG = 77.5946

// Employee details
const EMPLOYEE_NAME = 'Rudraksh'
const EMPLOYEE_EMAIL = 'rudraksh@eyekra.com'
const EMPLOYEE_PHONE = '+919876543210'
const EMPLOYEE_PASSWORD = 'Rudraksh@2026!'
const EMPLOYEE_ID = `EMP-${Date.now().toString().slice(-6)}`

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

async function createStore(token, tenantId) {
  log('CREATE_STORE', 'Creating Bangalore store...')
  const storeData = {
    name: 'Bangalore Store',
    code: 'BLR001',
    description: 'Eyekra Bangalore Store',
    address: {
      street: '123 MG Road',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      zipCode: '560001'
    },
    coordinates: {
      latitude: BANGALORE_LAT,
      longitude: BANGALORE_LONG
    },
    geofenceRadius: 100,
    status: 'active'
  }
  
  const { ok, status, data } = await fetchResp(`${API_BASE}/hr/stores`, {
    method: 'POST',
    headers: authHeaders(token, tenantId),
    body: JSON.stringify(storeData)
  })
  
  if (ok) {
    const store = data.data || data
    log('CREATE_STORE', 'OK', { storeId: store._id || store.id, name: store.name, code: store.code })
    return { success: true, store }
  } else {
    // Check if store already exists
    if (status === 409 || data?.message?.includes('already exists')) {
      log('CREATE_STORE', 'EXISTS', 'Store already exists, fetching...')
      const { ok: fetchOk, data: fetchData } = await fetchResp(`${API_BASE}/hr/stores?search=BLR001`, {
        headers: authHeaders(token, tenantId)
      })
      if (fetchOk) {
        const stores = fetchData.data || fetchData.stores || fetchData
        const existingStore = Array.isArray(stores) ? stores.find(s => s.code === 'BLR001') : stores
        if (existingStore) {
          log('CREATE_STORE', 'FOUND', { storeId: existingStore._id || existingStore.id, name: existingStore.name })
          return { success: true, store: existingStore }
        }
      }
    }
    log('CREATE_STORE', 'FAIL', { status, error: data?.error || data?.message })
    throw new Error(`Failed to create store: ${data?.error || data?.message}`)
  }
}

async function createDepartment(token, tenantId) {
  log('CREATE_DEPARTMENT', 'Creating Engineering and Technology department...')
  const deptData = {
    name: 'Engineering and Technology',
    code: 'ENG_TECH',
    description: 'Engineering and Technology Department'
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
        const existingDept = Array.isArray(depts) ? depts.find(d => d.code === 'ENG_TECH' || d.name === 'Engineering and Technology') : depts
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

async function createEmployee(token, tenantId, storeId, departmentId) {
  log('CREATE_EMPLOYEE', 'Creating Rudraksh employee...')
  const employeeData = {
    employeeId: EMPLOYEE_ID,
    firstName: EMPLOYEE_NAME,
    fullName: EMPLOYEE_NAME,
    email: EMPLOYEE_EMAIL,
    phone: EMPLOYEE_PHONE,
    password: EMPLOYEE_PASSWORD,
    roleName: 'employee',
    storeId: storeId,
    department: 'Engineering and Technology',
    jobTitle: 'Software Engineer',
    designation: 'Software Engineer',
    status: 'active',
    doj: new Date().toISOString()
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
      store: employee.store?.name,
      department: employee.departmentRef?.name
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
      latitude: BANGALORE_LAT,
      longitude: BANGALORE_LONG,
      notes: 'Clock in from Bangalore store'
    })
  })
  
  if (clockInResp.ok) {
    log('ATTENDANCE', 'CLOCK_IN OK', { 
      attendanceId: clockInResp.data.data?._id,
      checkInTime: clockInResp.data.data?.check_in_time,
      store: clockInResp.data.data?.store_code
    })
  } else {
    log('ATTENDANCE', 'CLOCK_IN FAIL', { error: clockInResp.data?.error || clockInResp.data?.message })
  }
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Clock out
  log('ATTENDANCE', 'Marking clock out...')
  const clockOutResp = await fetchResp(`${API_BASE}/attendance/clock-out`, {
    method: 'POST',
    headers: authHeaders(employeeToken, tenantId),
    body: JSON.stringify({
      latitude: BANGALORE_LAT,
      longitude: BANGALORE_LONG,
      notes: 'Clock out from Bangalore store'
    })
  })
  
  if (clockOutResp.ok) {
    log('ATTENDANCE', 'CLOCK_OUT OK', { 
      attendanceId: clockOutResp.data.data?._id,
      checkOutTime: clockOutResp.data.data?.check_out_time,
      store: clockOutResp.data.data?.store_code
    })
  } else {
    log('ATTENDANCE', 'CLOCK_OUT FAIL', { error: clockOutResp.data?.error || clockOutResp.data?.message })
  }
}

async function getDashboard(token, tenantId) {
  log('DASHBOARD', 'Fetching dashboard data...')
  const { ok, status, data } = await fetchResp(`${API_BASE}/hr/dashboard`, {
    headers: authHeaders(token, tenantId)
  })
  
  if (ok) {
    log('DASHBOARD', 'OK', data.data || data)
    return data.data || data
  } else {
    log('DASHBOARD', 'FAIL', { status, error: data?.error || data?.message })
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
      total: data.pagination?.total || records.length,
      records: Array.isArray(records) ? records.map(r => ({
        date: r.date,
        checkIn: r.check_in_time,
        checkOut: r.check_out_time,
        store: r.store_code,
        status: r.status
      })) : records
    })
    return records
  } else {
    log('ATTENDANCE_HISTORY', 'FAIL', { status, error: data?.error || data?.message })
    return null
  }
}

async function main() {
  try {
    console.log('🚀 Starting Rudraksh Employee Creation in Eyekra Tenant')
    console.log('='.repeat(60))
    
    // 1. Login as admin
    const { token, tenantId } = await login()
    
    // 2. Create Bangalore store
    const { store } = await createStore(token, tenantId)
    const storeId = store._id || store.id
    
    // 3. Create Engineering and Technology department
    const { department } = await createDepartment(token, tenantId)
    const departmentId = department._id || department.id
    
    // 4. Create employee
    const { employee } = await createEmployee(token, tenantId, storeId, departmentId)
    const employeeMongoId = employee._id || employee.id
    
    // 5. Login as employee
    log('EMPLOYEE_LOGIN', 'Logging in as Rudraksh...')
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
    
    // 6. Mark attendance
    await markAttendance(employeeToken, employeeTenantId)
    
    // 7. Get attendance history
    await getAttendanceHistory(employeeToken, employeeTenantId)
    
    // 8. Get dashboard (as admin)
    await getDashboard(token, tenantId)
    
    console.log('\n✅ All operations completed successfully!')
    console.log('='.repeat(60))
    console.log(`\n📋 Summary:`)
    console.log(`   Employee: ${EMPLOYEE_NAME} (${EMPLOYEE_EMAIL})`)
    console.log(`   Employee ID: ${EMPLOYEE_ID}`)
    console.log(`   Store: ${store.name} (${store.code})`)
    console.log(`   Department: ${department.name} (${department.code})`)
    console.log(`   Tenant: ${tenantId}`)
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
