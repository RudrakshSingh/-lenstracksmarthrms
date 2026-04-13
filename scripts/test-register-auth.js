#!/usr/bin/env node
/**
 * Test script to understand what backend needs for register to work
 */

const rawBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000'
const BASE = rawBase.replace(/\/+$/, '')
const API_BASE = BASE.endsWith('/api') ? BASE : `${BASE}/api`

const ADMIN_EMAIL = 'admin@upcapto.com'
const ADMIN_PASSWORD = 'Upcapto@2026'

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
    data = { _raw: text.slice(0, 500) }
  }
  return { ok: res.ok, status: res.status, data, headers: Object.fromEntries(res.headers.entries()) }
}

async function testRegisterAuth() {
  console.log('=== Testing Register Authentication Requirements ===\n')
  
  // Step 1: Login to get token
  console.log('1. Logging in...')
  const loginRes = await fetchResp(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  
  if (!loginRes.ok) {
    console.error('Login failed:', loginRes.status, loginRes.data)
    return
  }
  
  const responseData = loginRes.data.data || loginRes.data
  const token = responseData.accessToken || loginRes.data.accessToken
  
  if (!token) {
    console.error('No token received')
    return
  }
  
  console.log('✅ Login successful')
  console.log('   Token preview:', token.substring(0, 50) + '...\n')
  
  // Step 2: Decode token to see what's inside
  console.log('2. Decoding token...')
  const jwt = require('jsonwebtoken')
  const decoded = jwt.decode(token)
  console.log('   Token payload:', JSON.stringify(decoded, null, 2))
  console.log('   userId:', decoded?.userId)
  console.log('   tenantId:', decoded?.tenantId)
  console.log('   issuer:', decoded?.iss)
  console.log('   audience:', decoded?.aud)
  console.log('   expires:', decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : 'N/A')
  console.log('')
  
  // Step 3: Try to verify token the way optionalAuthenticate does
  console.log('3. Testing token verification (like optionalAuthenticate in routes.js)...')
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'
    const verified = jwt.verify(token, JWT_SECRET)
    console.log('   ✅ Token verified with JWT_SECRET (no issuer/audience check)')
    console.log('   Verified payload:', JSON.stringify(verified, null, 2))
  } catch (e) {
    console.log('   ❌ Token verification failed:', e.message)
    console.log('   Error type:', e.name)
  }
  console.log('')
  
  // Step 4: Try to verify token with issuer/audience (like verifyAccessToken)
  console.log('4. Testing token verification (like verifyAccessToken in jwt.js)...')
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'etelios-dev-secret-key-2024'
    const verified = jwt.verify(token, JWT_SECRET, {
      issuer: 'hrms-backend',
      audience: 'hrms-frontend'
    })
    console.log('   ✅ Token verified with issuer/audience check')
    console.log('   Verified payload:', JSON.stringify(verified, null, 2))
  } catch (e) {
    console.log('   ❌ Token verification failed:', e.message)
    console.log('   Error type:', e.name)
  }
  console.log('')
  
  // Step 5: Test register with token
  console.log('5. Testing register endpoint with token...')
  const registerBody = {
    employee_id: 'TEST-' + Date.now(),
    name: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    email: 'test.' + Date.now() + '@upcapto.com',
    phone: '+919876543210',
    password: 'TestPassword123!',
    role: 'employee',
    department: 'Engineering',
    designation: 'Developer',
    joining_date: new Date().toISOString().slice(0, 10),
    tenantId: decoded?.tenantId || 'upcapto'
  }
  
  console.log('   Request body:', JSON.stringify(registerBody, null, 2))
  console.log('   Headers: Authorization: Bearer ' + token.substring(0, 20) + '...')
  console.log('   Headers: x-tenant-id: ' + (decoded?.tenantId || 'upcapto'))
  console.log('')
  
  const registerRes = await fetchResp(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': decoded?.tenantId || 'upcapto'
    },
    body: JSON.stringify(registerBody),
  })
  
  console.log('   Response status:', registerRes.status)
  console.log('   Response:', JSON.stringify(registerRes.data, null, 2))
  
  if (registerRes.ok) {
    console.log('\n✅ Register successful!')
  } else {
    console.log('\n❌ Register failed')
    console.log('   This means optionalAuthenticate did not set req.user')
    console.log('   Possible reasons:')
    console.log('   1. Token verification failed silently')
    console.log('   2. User lookup failed (userId not found in database)')
    console.log('   3. JWT_SECRET mismatch between services')
  }
}

testRegisterAuth().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
