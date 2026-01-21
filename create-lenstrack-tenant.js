#!/usr/bin/env node

/**
 * Create Lenstrack Tenant in Production
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'https://98.70.245.87';
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

let adminToken = null;

function makeRequest(method, path, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = BASE_URL.startsWith('https');
    const client = isHttps ? https : http;
    const url = new URL(path, BASE_URL);
    
    const headers = {
      'Content-Type': 'application/json',
      'Host': 'api.etelios.com',
      ...options.headers
    };

    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    }

    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers,
      rejectUnauthorized: false,
      timeout: 30000
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function getSuperAdminToken() {
  log.section('1. Getting Super Admin Token');
  
  const adminCredentials = [
    { email: 'admin@etelios.com', password: 'Admin@123456' },
    { email: 'superadmin@etelios.com', password: 'Admin@123456' }
  ];

  for (const creds of adminCredentials) {
    log.info(`Trying login: ${creds.email}`);
    try {
      const response = await makeRequest('POST', '/api/auth/login', {
        body: {
          emailOrEmployeeId: creds.email,
          password: creds.password
        }
      });

      if (response.status === 200 && response.data.success) {
        adminToken = response.data.data?.accessToken || response.data.accessToken;
        if (adminToken) {
          log.success(`✓ Login successful: ${creds.email}`);
          log.info(`  Token: ${adminToken.substring(0, 30)}...`);
          return true;
        }
      } else {
        log.warn(`  Login failed: ${response.data.message || response.status}`);
      }
    } catch (error) {
      log.warn(`  Login error: ${error.message}`);
    }
  }

  log.error('✗ Could not login with any credentials');
  log.warn('  Please provide admin credentials or create admin user first');
  return false;
}

async function checkExistingTenant() {
  log.section('2. Checking Existing Lenstrack Tenant');
  
  if (!adminToken) {
    log.warn('Skipping check - no admin token');
    return null;
  }

  try {
    const response = await makeRequest('GET', '/api/tenants');
    
    if (response.status === 200 && response.data.success) {
      const tenants = Array.isArray(response.data.data) ? response.data.data : (response.data.data?.tenants || []);
      const lenstrack = tenants.find(t => 
        t.domain === 'lenstrack' || 
        t.tenantId === 'lenstrack' ||
        t.companyName?.toLowerCase().includes('lenstrack')
      );
      
      if (lenstrack) {
        log.success('✓ Lenstrack tenant already exists');
        log.info(`  Tenant ID: ${lenstrack.tenantId || lenstrack.id}`);
        log.info(`  Company: ${lenstrack.companyName}`);
        log.info(`  Domain: ${lenstrack.domain}`);
        return lenstrack;
      } else {
        log.info('  Lenstrack tenant not found');
        return null;
      }
    }
  } catch (error) {
    log.warn(`  Error checking tenants: ${error.message}`);
  }
  
  return null;
}

async function createLenstrackTenant() {
  log.section('3. Creating Lenstrack Tenant');
  
  if (!adminToken) {
    log.error('Cannot create tenant without admin token');
    return false;
  }

  const tenantData = {
    name: 'Lenstrack', // REQUIRED FIELD
    domain: 'lenstrack',
    subdomain: 'lenstrack',
    email: 'admin@lenstrack.etelios.com', // This email will be used to create admin user
    phone: '+919876543210',
    primaryContact: 'Lenstrack Admin', // Admin user name
    address: {
      street: 'Lenstrack Office',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India'
    },
    plan: 'enterprise',
    modules: ['hr', 'analytics', 'reports']
  };

  log.info('Creating Lenstrack tenant...');
  log.info(`  Name: ${tenantData.name}`);
  log.info(`  Domain: ${tenantData.domain}`);
  log.info(`  Email: ${tenantData.email} (will create admin user)`);
  
  try {
    const response = await makeRequest('POST', '/api/tenants', {
      body: tenantData
    });

    if (response.status === 201 || response.status === 200) {
      if (response.data.success) {
        const tenant = response.data.data;
        log.success('✓ Lenstrack tenant created successfully!');
        log.info('\n━━━ Tenant Details ━━━\n');
        log.info(`Tenant ID: ${tenant.tenantId || tenant.id}`);
        log.info(`Company ID: ${tenant.companyId || tenant.id}`);
        log.info(`Company Name: ${tenant.companyName}`);
        log.info(`Domain: ${tenant.domain}`);
        log.info(`Status: ${tenant.status || 'active'}`);
        
        if (tenant.adminUser) {
          log.info('\n━━━ Admin User Details ━━━\n');
          log.info(`Email: ${tenant.adminUser.email || 'admin@lenstrack.etelios.com'}`);
          log.info(`Name: ${tenant.adminUser.name}`);
          log.info(`Employee ID: ${tenant.adminUser.employeeId}`);
          if (tenant.adminUser.temporaryPassword) {
            log.warn(`⚠ Temporary Password: ${tenant.adminUser.temporaryPassword}`);
            log.warn('  Please change password on first login!');
          }
        }

        if (tenant.superAdminUser) {
          log.info('\n━━━ Super Admin User Details ━━━\n');
          log.info(`Email: ${tenant.superAdminUser.email || 'superadmin@lenstrack.etelios.com'}`);
          log.info(`Name: ${tenant.superAdminUser.name}`);
          log.info(`Employee ID: ${tenant.superAdminUser.employeeId}`);
          if (tenant.superAdminUser.temporaryPassword) {
            log.warn(`⚠ Temporary Password: ${tenant.superAdminUser.temporaryPassword}`);
            log.warn('  Please change password on first login!');
          }
        }
        
        // Save credentials for testing
        console.log('\n━━━ Login Credentials ━━━\n');
        console.log('Admin:');
        console.log(`  Email: admin@lenstrack.etelios.com`);
        console.log(`  Password: ${tenant.adminUser?.temporaryPassword || 'Check response above'}`);
        console.log('\nSuper Admin:');
        console.log(`  Email: superadmin@lenstrack.etelios.com`);
        console.log(`  Password: ${tenant.superAdminUser?.temporaryPassword || 'Check response above'}`);

        if (tenant.passwordChangeMessage) {
          log.info(`\n${tenant.passwordChangeMessage}`);
        }

        return true;
      } else {
        log.error(`✗ Tenant creation failed: ${response.data.message}`);
        if (response.data.error) {
          log.error(`  Error: ${response.data.error}`);
        }
        return false;
      }
    } else {
      log.error(`✗ Tenant creation failed: ${response.status}`);
      log.info(`  Response: ${JSON.stringify(response.data).substring(0, 500)}`);
      return false;
    }
  } catch (error) {
    log.error(`✗ Tenant creation error: ${error.message}`);
    if (error.stack) {
      log.error(`  Stack: ${error.stack.substring(0, 200)}`);
    }
    return false;
  }
}

async function run() {
  console.log('\n🏢 Creating Lenstrack Tenant in Production\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  // Step 1: Get admin token
  const hasToken = await getSuperAdminToken();
  
  if (!hasToken) {
    log.error('\n❌ Cannot proceed without admin token');
    log.info('\nTo create tenant, you need to:');
    log.info('1. Login with existing admin credentials, OR');
    log.info('2. Create admin user first, OR');
    log.info('3. Provide admin token manually\n');
    process.exit(1);
  }

  // Step 2: Check if tenant already exists
  const existing = await checkExistingTenant();
  
  if (existing) {
    log.info('\n✅ Lenstrack tenant already exists. No need to create again.');
    process.exit(0);
  }

  // Step 3: Create tenant
  const success = await createLenstrackTenant();
  
  if (success) {
    log.success('\n✅ Lenstrack tenant created successfully!');
    log.info('\nNext steps:');
    log.info('1. Login with admin credentials');
    log.info('2. Change temporary password');
    log.info('3. Start creating employees\n');
  } else {
    log.error('\n❌ Failed to create Lenstrack tenant');
    process.exit(1);
  }
}

run().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
