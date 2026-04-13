#!/usr/bin/env node
/**
 * Complete onboarding script – frontend ke hisaab se, sirf BACKEND URL use karke.
 * Shell/HRMS proxy nahi, direct backend API calls.
 *
 * Flow (frontend Step 5 jaisa):
 *   1. POST /api/auth/login → token + tenantId
 *   2. POST /api/auth/register
 *   3. POST /api/hr/employees (agar register ne create nahi kiya)
 *   4. GET /api/hr/employees?employee_id=... (resolve EMP-* → backend id)
 *   5. PUT /api/hr/employees/:id (statutory)
 *   6. POST /api/hr/employees/:id/assign-role
 *   7. PATCH /api/hr/employees/:id/status
 *
 * Usage:
 *   node scripts/onboarding-backend-complete.js
 *   BACKEND_URL=https://your-api.com node scripts/onboarding-backend-complete.js
 *
 * Env: BACKEND_URL or NEXT_PUBLIC_API_BASE_URL or API_BASE_URL (base without /api; script adds /api)
 */

const rawBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000'
const BASE = rawBase.replace(/\/+$/, '')
const API_BASE = BASE.endsWith('/api') ? BASE : `${BASE}/api`

const ADMIN_EMAIL = 'admin@upcapto.com'
const ADMIN_PASSWORD = 'Upcapto@2026'

const EMPLOYEE_ID = 'EMP-' + String(Date.now()).slice(-10)
const EMPLOYEE_NAME = 'Backend Onboard User'
const EMPLOYEE_EMAIL = 'backend.onboard.' + Date.now() + '@upcapto.com'
const EMPLOYEE_PHONE = '+919876543210'
const EMPLOYEE_PASSWORD = 'TempPassword123!'
const DEPARTMENT = 'Engineering'
const DESIGNATION = 'Developer'
const JOINING_DATE = new Date().toISOString().slice(0, 10)
const ROLE = 'employee'

function log(step, msg, data = null) {
  console.log(data ? `[${step}] ${msg} ${JSON.stringify(data)}` : `[${step}] ${msg}`)
}

function authHeaders(token, tenantId) {
  const h = { 'Content-Type': 'application/json', Accept: 'application/json' }
  h.Authorization = `Bearer ${token}`
  // CRITICAL: Backend validateTenantMiddleware checks x-tenant-id (lowercase)
  // Must match JWT token's tenantId (both normalized to lowercase)
  if (tenantId) {
    // Normalize to lowercase (backend does: tenantId.toLowerCase().trim())
    const normalizedTenantId = String(tenantId).toLowerCase().trim()
    h['x-tenant-id'] = normalizedTenantId
  }
  return h
}

async function fetchResp(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...options.headers },
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { _raw: text.slice(0, 300) }
  }
  return { ok: res.ok, status: res.status, data }
}

async function login() {
  const url = `${API_BASE}/auth/login`
  log('LOGIN', 'POST', { url })
  const { ok, status, data } = await fetchResp(url, {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!ok) {
    console.error('Login failed', status, data)
    process.exit(1)
  }
  
  // Backend returns: { success: true, data: { user, accessToken, refreshToken } }
  const responseData = data.data || data
  const token = responseData.accessToken || data.accessToken
  const user = responseData.user || data.user
  
  if (!token) {
    console.error('No token in response', data)
    process.exit(1)
  }
  
  // CRITICAL: Extract tenantId from JWT token (backend includes it in token payload)
  // Backend auth middleware extracts: decoded.tenantId and sets req.user.tenantId
  // validateTenantMiddleware compares: req.user.tenantId === header X-Tenant-Id (both normalized)
  let tenantId = null
  try {
    // Decode JWT without verification (just to read tenantId)
    const jwt = require('jsonwebtoken')
    const decoded = jwt.decode(token)
    // JWT token structure: { userId, email, role, tenantId, employee_id, iat, exp, aud, iss }
    tenantId = decoded?.tenantId || decoded?.tenant_id
    if (tenantId) {
      log('LOGIN', 'JWT decoded', { tenantIdFromJWT: tenantId })
    }
  } catch (e) {
    log('LOGIN', 'JWT decode failed', { error: e.message })
  }
  
  // Fallback to user object if JWT doesn't have it
  if (!tenantId) {
    tenantId = user?.tenantId || user?.tenant_id || responseData.user?.tenantId
    if (tenantId) {
      log('LOGIN', 'Using tenantId from user object (fallback)', { tenantId })
    }
  }
  
  // CRITICAL: Normalize tenantId to lowercase (validateTenantMiddleware does: tenantId.toLowerCase().trim())
  if (tenantId) {
    tenantId = String(tenantId).toLowerCase().trim()
  } else {
    console.error('⚠️  ERROR: No tenantId found in JWT token or user object')
    console.error('   This will cause TENANT_MISMATCH errors')
    process.exit(1)
  }
  
  log('LOGIN', 'OK', { tenantId, tokenPreview: token.substring(0, 20) + '...' })
  return { token, tenantId }
}

async function register(token, tenantId) {
  const url = `${API_BASE}/auth/register`
  const parts = EMPLOYEE_NAME.split(' ')
  const firstName = parts[0] || EMPLOYEE_NAME
  const lastName = parts.slice(1).join(' ') || ''
  
  // Backend register expects tenantId in body (normalized to lowercase)
  // Register endpoint uses optionalAuthenticate - works without auth for first user, needs auth for subsequent
  // 
  // ✅ FIXED: optionalAuthenticate now uses verifyAccessToken() from jwt.js
  //    - Uses correct JWT_SECRET and validates issuer/audience
  //    - Properly sets req.user with _id and id
  //    - Note: Service needs restart for fix to take effect
  const body = {
    employee_id: EMPLOYEE_ID,
    name: EMPLOYEE_NAME,
    firstName,
    lastName,
    email: EMPLOYEE_EMAIL,
    phone: EMPLOYEE_PHONE,
    password: EMPLOYEE_PASSWORD,
    role: ROLE,
    department: DEPARTMENT,
    designation: DESIGNATION,
    joining_date: JOINING_DATE,
    // CRITICAL: Include tenantId in body (backend normalizes to lowercase)
    ...(tenantId && { tenantId: String(tenantId).toLowerCase().trim() }),
  }
  
  // Debug: Verify token can be decoded before sending
  let tokenValid = false
  if (token) {
    try {
      const jwt = require('jsonwebtoken')
      const decoded = jwt.decode(token)
      if (decoded && decoded.userId) {
        tokenValid = true
        log('REGISTER', 'Token check', { 
          hasToken: true, 
          userId: decoded.userId,
          tenantId: decoded.tenantId,
          issuer: decoded.iss,
          audience: decoded.aud
        })
      }
    } catch (e) {
      log('REGISTER', 'Token decode failed', { error: e.message })
    }
  }
  
  log('REGISTER', 'POST', { 
    hasAuth: !!token, 
    tokenValid,
    hasTenant: !!tenantId, 
    tenantId 
  })
  
  const out = await fetchResp(url, {
    method: 'POST',
    headers: authHeaders(token, tenantId), // Include auth header if token exists
    body: JSON.stringify(body),
  })
  
  // If register fails with 401, it means optionalAuthenticate didn't set req.user
  // This happens when token verification fails silently (wrong secret, issuer/audience mismatch, etc.)
  if (!out.ok && out.status === 401) {
    log('REGISTER', '401 - Token not recognized by optionalAuthenticate', {
      hint: 'Token might have issuer/audience mismatch or wrong JWT_SECRET',
      suggestion: 'This is expected - createEmployee will work instead'
    })
  }
  
  log('REGISTER', out.ok ? 'OK' : 'FAIL', { 
    status: out.status, 
    error: out.data?.error || out.data?.message,
    response: out.data 
  })
  return out
}

async function createEmployee(token, tenantId) {
  const url = `${API_BASE}/hr/employees`
  const body = {
    employeeId: EMPLOYEE_ID,
    code: EMPLOYEE_ID,
    firstName: EMPLOYEE_NAME.split(' ')[0] || EMPLOYEE_NAME,
    lastName: EMPLOYEE_NAME.split(' ').slice(1).join(' ') || '',
    fullName: EMPLOYEE_NAME,
    email: EMPLOYEE_EMAIL,
    phone: EMPLOYEE_PHONE,
    department: DEPARTMENT,
    jobTitle: DESIGNATION,
    designation: DESIGNATION,
    roleFamily: 'Engineering',
    doj: new Date(JOINING_DATE).toISOString(),
    status: 'active',
    password: EMPLOYEE_PASSWORD,
    roleName: ROLE,
  }
  log('CREATE_EMPLOYEE', 'POST')
  const out = await fetchResp(url, {
    method: 'POST',
    headers: authHeaders(token, tenantId),
    body: JSON.stringify(body),
  })
  log('CREATE_EMPLOYEE', out.ok ? 'OK' : 'FAIL', { 
    status: out.status, 
    error: out.data?.error || out.data?.message,
    response: out.data 
  })
  return out
}

async function resolveEmployeeId(token, tenantId) {
  const url = `${API_BASE}/hr/employees?employee_id=${encodeURIComponent(EMPLOYEE_ID)}&limit=10`
  log('RESOLVE', 'GET')
  const { ok, data } = await fetchResp(url, { method: 'GET', headers: authHeaders(token, tenantId) })
  if (!ok) return EMPLOYEE_ID
  const list = data.data || data.employees || data.list || data
  const arr = Array.isArray(list) ? list : list?.data || []
  const first = arr.find((e) => (e.employee_id || e.employeeId) === EMPLOYEE_ID) || arr[0]
  const id = first ? (first.id || first._id || first.employeeId || first.employee_id) : null
  if (id) log('RESOLVE', 'OK', { backendId: id })
  return id ? String(id) : EMPLOYEE_ID
}

async function updateStatutory(token, tenantId, employeeId) {
  const url = `${API_BASE}/hr/employees/${employeeId}`
  log('STATUTORY', 'PUT')
  const out = await fetchResp(url, {
    method: 'PUT',
    headers: authHeaders(token, tenantId),
    body: JSON.stringify({ panNumber: null, bankAccount: null, uan: null }),
  })
  log('STATUTORY', out.ok ? 'OK' : 'FAIL', { 
    status: out.status,
    error: out.data?.error || out.data?.message 
  })
  return out.ok
}

async function assignRole(token, tenantId, employeeId) {
  const url = `${API_BASE}/hr/employees/${employeeId}/assign-role`
  log('ASSIGN_ROLE', 'POST')
  const out = await fetchResp(url, {
    method: 'POST',
    headers: authHeaders(token, tenantId),
    body: JSON.stringify({ roleName: ROLE }),
  })
  log('ASSIGN_ROLE', out.ok ? 'OK' : 'FAIL', { 
    status: out.status,
    error: out.data?.error || out.data?.message 
  })
  return out.ok
}

async function updateStatus(token, tenantId, employeeId) {
  const url = `${API_BASE}/hr/employees/${employeeId}/status`
  log('STATUS', 'PATCH')
  const out = await fetchResp(url, {
    method: 'PATCH',
    headers: authHeaders(token, tenantId),
    body: JSON.stringify({ status: 'active' }),
  })
  log('STATUS', out.ok ? 'OK' : 'FAIL', { 
    status: out.status,
    error: out.data?.error || out.data?.message 
  })
  return out.ok
}

function getBackendId(fromData) {
  if (!fromData) return null
  const d = fromData.data ?? fromData
  return d.id ?? d._id ?? d.employeeId ?? d.employee_id ?? null
}

async function main() {
  console.log('Backend API base:', API_BASE)
  console.log('Employee:', EMPLOYEE_EMAIL, '| ID:', EMPLOYEE_ID)
  console.log('---')

  const { token, tenantId } = await login()

  let backendId = null
  const reg = await register(token, tenantId)
  if (reg.ok) backendId = getBackendId(reg.data)

  let createOk = false
  if (!backendId) {
    const create = await createEmployee(token, tenantId)
    createOk = create.ok
    if (create.ok) backendId = getBackendId(create.data)
  }

  if (!backendId) backendId = await resolveEmployeeId(token, tenantId)

  if (!backendId) {
    console.error('---\nCould not get backend employee id (register + create failed).')
    process.exit(1)
  }

  const statOk = await updateStatutory(token, tenantId, backendId)
  const roleOk = await assignRole(token, tenantId, backendId)
  const statusOk = await updateStatus(token, tenantId, backendId)

  console.log('---')
  console.log('Done. Employee:', EMPLOYEE_EMAIL, '| Backend ID:', backendId)
  console.log('Summary: Login OK | Register', reg.ok ? 'OK' : 'FAIL', '| Create', createOk ? 'OK' : 'FAIL', '| Statutory', statOk ? 'OK' : 'FAIL', '| Role', roleOk ? 'OK' : 'FAIL', '| Status', statusOk ? 'OK' : 'FAIL')
  
  if (!reg.ok) {
    console.log('')
    console.log('⚠️  Register failed - possible reasons:')
    console.log('   1. Auth service not restarted after fix (see REGISTER_AUTH_FIX.md)')
    console.log('   2. Token expired or invalid')
    console.log('   3. User not found in database')
    console.log('   - Workaround: createEmployee works (uses proper authenticate middleware)')
  }
  
  // Exit success if createEmployee worked (register failure is expected due to backend bug)
  process.exit(createOk && statOk && roleOk && statusOk ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
