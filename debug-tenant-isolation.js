#!/usr/bin/env node

/**
 * Debug Script: Check tenantId in database
 * 
 * This script checks what tenantId values exist in the database
 */

require('dotenv').config();
const axios = require('axios');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'https://98.70.245.87';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`)
};

async function apiCall(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      validateStatus: () => true,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response;
  } catch (error) {
    return {
      status: 500,
      data: { error: error.message },
      error
    };
  }
}

async function login(email, password, tenantId) {
  const response = await apiCall('POST', '/api/auth/login', {
    emailOrEmployeeId: email,
    password: password
  }, {
    'X-Tenant-Id': tenantId
  });
  
  if (response.status === 200 && response.data.success) {
    return response.data.data?.accessToken || response.data.data?.token || response.data.token;
  }
  return null;
}

async function debugTenantIsolation() {
  log.section('Debugging Tenant Isolation');
  
  // Login
  const token = await login('admin@lenstrack.etelios.com', 'Lenstrack@Admin123', 'lenstrack');
  if (!token) {
    log.error('Failed to login');
    return;
  }
  
  log.section('Checking Employees');
  
  // Get employees with different tenantIds
  const responseLenstrack = await apiCall('GET', '/api/hr/employees', null, {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': 'lenstrack'
  });
  
  const responseTest = await apiCall('GET', '/api/hr/employees', null, {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': 'test-tenant'
  });
  
  const responseDefault = await apiCall('GET', '/api/hr/employees', null, {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': 'default'
  });
  
  if (responseLenstrack.status === 200) {
    const employees = responseLenstrack.data.data || responseLenstrack.data.employees || [];
    log.info(`Employees with X-Tenant-Id: lenstrack: ${employees.length}`);
    
    // Check tenantId in each employee
    const tenantIds = {};
    employees.forEach(emp => {
      const tid = emp.tenantId || 'undefined';
      tenantIds[tid] = (tenantIds[tid] || 0) + 1;
    });
    
    log.info('TenantId distribution:');
    Object.entries(tenantIds).forEach(([tid, count]) => {
      log.info(`  ${tid}: ${count} employees`);
    });
    
    // Show first few employees
    if (employees.length > 0) {
      log.info('\nFirst 3 employees:');
      employees.slice(0, 3).forEach(emp => {
        log.info(`  - ${emp.employeeId || emp.employee_id}: tenantId=${emp.tenantId || 'undefined'}, email=${emp.email}`);
      });
    }
  }
  
  if (responseTest.status === 200) {
    const employees = responseTest.data.data || responseTest.data.employees || [];
    log.info(`\nEmployees with X-Tenant-Id: test-tenant: ${employees.length}`);
    
    const tenantIds = {};
    employees.forEach(emp => {
      const tid = emp.tenantId || 'undefined';
      tenantIds[tid] = (tenantIds[tid] || 0) + 1;
    });
    
    log.info('TenantId distribution:');
    Object.entries(tenantIds).forEach(([tid, count]) => {
      log.info(`  ${tid}: ${count} employees`);
    });
  }
  
  if (responseDefault.status === 200) {
    const employees = responseDefault.data.data || responseDefault.data.employees || [];
    log.info(`\nEmployees with X-Tenant-Id: default: ${employees.length}`);
    
    const tenantIds = {};
    employees.forEach(emp => {
      const tid = emp.tenantId || 'undefined';
      tenantIds[tid] = (tenantIds[tid] || 0) + 1;
    });
    
    log.info('TenantId distribution:');
    Object.entries(tenantIds).forEach(([tid, count]) => {
      log.info(`  ${tid}: ${count} employees`);
    });
  }
  
  log.section('Conclusion');
  log.warn('If you see employees with tenantId="default" or undefined, they need to be migrated.');
  log.warn('If you see the same employees in different tenant queries, tenant isolation is not working.');
}

if (require.main === module) {
  debugTenantIsolation().catch(error => {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { debugTenantIsolation };
