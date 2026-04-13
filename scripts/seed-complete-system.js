#!/usr/bin/env node

/**
 * Complete System Seed Script
 * 
 * Creates all necessary data for testing:
 * 1. Superadmin (upcapto)
 * 2. Tenants (lenstrack, upcapto, eyekra)
 * 3. Tenant Admins
 * 4. Stores
 * 5. Departments
 * 6. Employees
 * 
 * Usage:
 *   node scripts/seed-complete-system.js
 * 
 * Environment Variables:
 *   BASE_URL - API base URL (default: production ALB)
 *   MONGODB_URI - MongoDB connection string
 */

const axios = require('axios');
const bcrypt = require('bcryptjs');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';
// Note: This script uses API calls, not direct database access, so MONGODB_URI is not needed

// Test Data
const TEST_DATA = {
  superadmin: {
    email: 'admin@upcapto.com',
    password: 'Upcapto@2026',
    tenantId: 'upcapto',
    name: 'Upcapto Super Admin',
    employeeId: 'UPCAPTO-ADMIN-001'
  },
  tenants: [
    {
      name: 'Lenstrack',
      email: 'admin@lenstrack.com',
      domain: 'lenstrack.com',
      phone: '+91-9876543210',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      plan: 'Professional',
      tenantId: 'lenstrack'
    },
    {
      name: 'Upcapto',
      email: 'admin@upcapto.com',
      domain: 'upcapto.com',
      phone: '+91-9876543210',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      plan: 'Enterprise',
      tenantId: 'upcapto'
    },
    {
      name: 'Eyekra',
      email: 'admin@eyekra.com',
      domain: 'eyekra.com',
      phone: '+91-9876543210',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      plan: 'Professional',
      tenantId: 'eyekra'
    }
  ],
  stores: [
    {
      name: 'Mumbai Store',
      code: 'LK001',
      storeCode: 'LK001',
      address: {
        street: '123 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        zip: '400001',
        country: 'India'
      },
      coordinates: {
        latitude: 19.0760,
        longitude: 72.8777
      },
      radius: 100,
      phone: '+91-9876543210',
      email: 'mumbai@lenstrack.com',
      status: 'active'
    },
    {
      name: 'Delhi Store',
      code: 'LK002',
      storeCode: 'LK002',
      address: {
        street: '456 Market Road',
        city: 'Delhi',
        state: 'Delhi',
        zip: '110001',
        country: 'India'
      },
      coordinates: {
        latitude: 28.6139,
        longitude: 77.2090
      },
      radius: 100,
      phone: '+91-9876543211',
      email: 'delhi@lenstrack.com',
      status: 'active'
    }
  ],
  departments: [
    {
      name: 'Sales',
      code: 'SALES',
      description: 'Sales Department',
      status: 'active'
    },
    {
      name: 'HR',
      code: 'HR',
      description: 'Human Resources Department',
      status: 'active'
    },
    {
      name: 'IT',
      code: 'IT',
      description: 'Information Technology Department',
      status: 'active'
    }
  ],
  employees: [
    {
      employeeId: 'EMP-2026-969954',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@lenstrack.com',
      phone: '+91-9876543210',
      password: 'EmployeePass123!',
      roleName: 'employee',
      designation: 'Sales Executive',
      joining_date: '2026-01-01',
      status: 'active'
    },
    {
      employeeId: 'EMP-2026-969955',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@lenstrack.com',
      phone: '+91-9876543211',
      password: 'EmployeePass123!',
      roleName: 'employee',
      designation: 'HR Executive',
      joining_date: '2026-01-01',
      status: 'active'
    }
  ]
};

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Helper function to make API calls
async function apiCall(method, endpoint, data = null, token = null, tenantId = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (tenantId) {
      config.headers['x-tenant-id'] = tenantId;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data || err.message,
      status: err.response?.status || 500
    };
  }
}

// Step 1: Login as Superadmin
async function loginAsSuperadmin() {
  log('\n📝 Step 1: Logging in as Superadmin...', 'blue');
  
  const result = await apiCall('POST', '/api/auth/login', {
    email: TEST_DATA.superadmin.email,
    password: TEST_DATA.superadmin.password
  });

  if (result.success && result.data.success) {
    success(`Logged in as superadmin: ${TEST_DATA.superadmin.email}`);
    return result.data.data.accessToken;
  } else {
    error(`Login failed: ${JSON.stringify(result.error)}`);
    return null;
  }
}

// Step 2: Create Tenants
async function createTenants(superadminToken) {
  log('\n📝 Step 2: Creating Tenants...', 'blue');
  
  const createdTenants = [];
  
  for (const tenant of TEST_DATA.tenants) {
    info(`Creating tenant: ${tenant.name} (${tenant.tenantId})`);
    
    const result = await apiCall(
      'POST',
      '/api/tenants',
      tenant,
      superadminToken,
      'upcapto'
    );

    if (result.success && result.data.success) {
      success(`Tenant created: ${tenant.name}`);
      createdTenants.push({
        ...tenant,
        adminUsers: result.data.data.adminUsers
      });
    } else {
      if (result.status === 409 || result.error?.message?.includes('already exists')) {
        warning(`Tenant already exists: ${tenant.name}`);
        createdTenants.push(tenant);
      } else {
        error(`Failed to create tenant ${tenant.name}: ${JSON.stringify(result.error)}`);
      }
    }
  }

  return createdTenants;
}

// Step 3: Login as Tenant Admin
async function loginAsTenantAdmin(tenantEmail, temporaryPassword, tenantId) {
  log(`\n📝 Logging in as Tenant Admin: ${tenantEmail}`, 'blue');
  
  const result = await apiCall('POST', '/api/auth/login', {
    email: tenantEmail,
    password: temporaryPassword
  });

  if (result.success && result.data.success) {
    success(`Logged in as tenant admin: ${tenantEmail}`);
    
    // If mustChangePassword is true, change password first
    if (result.data.data.mustChangePassword) {
      warning('Password change required. Changing password...');
      const newPassword = 'AdminPass123!';
      const changeResult = await apiCall(
        'PUT',
        '/api/auth/change-password',
        {
          currentPassword: temporaryPassword,
          newPassword: newPassword,
          confirmPassword: newPassword
        },
        result.data.data.accessToken,
        tenantId
      );

      if (changeResult.success) {
        success('Password changed successfully');
        // Login again with new password
        return loginAsTenantAdmin(tenantEmail, newPassword, tenantId);
      } else {
        error(`Password change failed: ${JSON.stringify(changeResult.error)}`);
        return result.data.data.accessToken; // Use original token
      }
    }
    
    return result.data.data.accessToken;
  } else {
    error(`Login failed: ${JSON.stringify(result.error)}`);
    return null;
  }
}

// Step 4: Create Stores
async function createStores(adminToken, tenantId) {
  log(`\n📝 Step 4: Creating Stores for tenant: ${tenantId}...`, 'blue');
  
  const createdStores = [];
  
  for (const store of TEST_DATA.stores) {
    info(`Creating store: ${store.name} (${store.code})`);
    
    const result = await apiCall(
      'POST',
      '/api/hr/stores',
      store,
      adminToken,
      tenantId
    );

    if (result.success && result.data.success) {
      success(`Store created: ${store.name}`);
      createdStores.push(result.data.data);
    } else {
      if (result.status === 409 || result.error?.message?.includes('already exists')) {
        warning(`Store already exists: ${store.name}`);
        // Try to get existing store
        const getResult = await apiCall(
          'GET',
          `/api/hr/stores?code=${store.code}`,
          null,
          adminToken,
          tenantId
        );
        if (getResult.success && getResult.data.data && getResult.data.data.length > 0) {
          createdStores.push(getResult.data.data[0]);
        }
      } else {
        error(`Failed to create store ${store.name}: ${JSON.stringify(result.error)}`);
      }
    }
  }

  return createdStores;
}

// Step 5: Create Departments
async function createDepartments(adminToken, tenantId) {
  log(`\n📝 Step 5: Creating Departments for tenant: ${tenantId}...`, 'blue');
  
  const createdDepartments = [];
  
  for (const dept of TEST_DATA.departments) {
    info(`Creating department: ${dept.name} (${dept.code})`);
    
    const result = await apiCall(
      'POST',
      '/api/hr/departments',
      dept,
      adminToken,
      tenantId
    );

    if (result.success && result.data.success) {
      success(`Department created: ${dept.name}`);
      createdDepartments.push(result.data.data);
    } else {
      if (result.status === 409 || result.error?.message?.includes('already exists')) {
        warning(`Department already exists: ${dept.name}`);
        // Try to get existing department
        const getResult = await apiCall(
          'GET',
          `/api/hr/departments?code=${dept.code}`,
          null,
          adminToken,
          tenantId
        );
        if (getResult.success && getResult.data.data && getResult.data.data.length > 0) {
          createdDepartments.push(getResult.data.data[0]);
        }
      } else {
        error(`Failed to create department ${dept.name}: ${JSON.stringify(result.error)}`);
      }
    }
  }

  return createdDepartments;
}

// Step 6: Create Employees
async function createEmployees(adminToken, tenantId, stores, departments) {
  log(`\n📝 Step 6: Creating Employees for tenant: ${tenantId}...`, 'blue');
  
  const createdEmployees = [];
  
  for (let i = 0; i < TEST_DATA.employees.length; i++) {
    const employee = TEST_DATA.employees[i];
    const store = stores[i % stores.length];
    const department = departments[i % departments.length];
    
    info(`Creating employee: ${employee.firstName} ${employee.lastName} (${employee.employeeId})`);
    
    const employeeData = {
      ...employee,
      storeId: store?._id || store?.id,
      department: department?.code || department?.name || 'SALES'
    };
    
    const result = await apiCall(
      'POST',
      '/api/hr/employees',
      employeeData,
      adminToken,
      tenantId
    );

    if (result.success && result.data.success) {
      success(`Employee created: ${employee.firstName} ${employee.lastName}`);
      createdEmployees.push(result.data.data);
    } else {
      if (result.status === 409 || result.error?.message?.includes('already exists')) {
        warning(`Employee already exists: ${employee.employeeId}`);
        // Try to get existing employee
        const getResult = await apiCall(
          'GET',
          `/api/hr/employees/${employee.employeeId}`,
          null,
          adminToken,
          tenantId
        );
        if (getResult.success && getResult.data.success) {
          createdEmployees.push(getResult.data.data);
        }
      } else {
        error(`Failed to create employee ${employee.employeeId}: ${JSON.stringify(result.error)}`);
      }
    }
  }

  return createdEmployees;
}

// Main seed function
async function seedCompleteSystem() {
  try {
    log('\n🚀 Starting Complete System Seed...', 'blue');
    log('=====================================\n', 'blue');
    
    info(`Base URL: ${BASE_URL}\n`);

    // Step 1: Login as Superadmin
    const superadminToken = await loginAsSuperadmin();
    if (!superadminToken) {
      error('Cannot proceed without superadmin token');
      process.exit(1);
    }

    // Step 2: Create Tenants
    const tenants = await createTenants(superadminToken);
    
    // Step 3: For each tenant, create stores, departments, and employees
    const seedResults = {};
    
    for (const tenant of tenants) {
      log(`\n📦 Processing Tenant: ${tenant.name} (${tenant.tenantId})`, 'yellow');
      
      // Get admin credentials
      const adminEmail = tenant.adminUsers?.admin?.email || tenant.email;
      const adminPassword = tenant.adminUsers?.admin?.temporaryPassword || 'TempPass123!@#';
      
      // Login as tenant admin
      const adminToken = await loginAsTenantAdmin(adminEmail, adminPassword, tenant.tenantId);
      if (!adminToken) {
        warning(`Skipping tenant ${tenant.name} - cannot get admin token`);
        continue;
      }

      // Create stores
      const stores = await createStores(adminToken, tenant.tenantId);
      
      // Create departments
      const departments = await createDepartments(adminToken, tenant.tenantId);
      
      // Create employees
      const employees = await createEmployees(adminToken, tenant.tenantId, stores, departments);
      
      seedResults[tenant.tenantId] = {
        tenant,
        stores,
        departments,
        employees,
        adminToken
      };
    }

    // Summary
    log('\n📊 Seed Summary', 'blue');
    log('=====================================\n', 'blue');
    
    for (const [tenantId, data] of Object.entries(seedResults)) {
      log(`\n🏢 Tenant: ${data.tenant.name} (${tenantId})`, 'cyan');
      log(`   Stores: ${data.stores.length}`, 'cyan');
      log(`   Departments: ${data.departments.length}`, 'cyan');
      log(`   Employees: ${data.employees.length}`, 'cyan');
      
      if (data.employees.length > 0) {
        log(`\n   Employee Credentials:`, 'yellow');
        for (const emp of data.employees) {
          const testEmp = TEST_DATA.employees.find(e => e.employeeId === emp.employeeId);
          if (testEmp) {
            log(`     Email: ${testEmp.email}`, 'yellow');
            log(`     Password: ${testEmp.password}`, 'yellow');
          }
        }
      }
    }

    log('\n✅ Complete System Seed Finished!', 'green');
    log('=====================================\n', 'green');
    
    // Save credentials to file
    const fs = require('fs');
    const credentials = {
      superadmin: {
        email: TEST_DATA.superadmin.email,
        password: TEST_DATA.superadmin.password,
        tenantId: TEST_DATA.superadmin.tenantId
      },
      tenants: Object.values(seedResults).map(data => ({
        name: data.tenant.name,
        tenantId: data.tenant.tenantId,
        adminEmail: data.tenant.adminUsers?.admin?.email || data.tenant.email,
        adminPassword: data.tenant.adminUsers?.admin?.temporaryPassword || 'TempPass123!@#',
        employees: data.employees.map(emp => {
          const testEmp = TEST_DATA.employees.find(e => e.employeeId === emp.employeeId);
          return {
            employeeId: emp.employeeId,
            email: testEmp?.email || emp.email,
            password: testEmp?.password || 'EmployeePass123!'
          };
        })
      }))
    };
    
    fs.writeFileSync('seed-credentials.json', JSON.stringify(credentials, null, 2));
    success('Credentials saved to seed-credentials.json');

  } catch (error) {
    error(`Seed failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run seed
if (require.main === module) {
  seedCompleteSystem();
}

module.exports = { seedCompleteSystem, TEST_DATA };
