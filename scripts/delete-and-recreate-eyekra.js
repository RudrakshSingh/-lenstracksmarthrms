#!/usr/bin/env node

/**
 * Delete and Recreate Eyekra Tenant
 * 
 * Usage:
 *   BASE_URL="http://..." node scripts/delete-and-recreate-eyekra.js
 */

const BASE_URL = process.env.BACKEND_URL || process.env.BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';
const API_BASE = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

const ADMIN_EMAIL = 'admin@upcapto.com';
const ADMIN_PASSWORD = 'Upcapto@2026';
const TENANT_ID = 'eyekra';

// Eyekra tenant details
const TENANT_DATA = {
  name: 'Eyekra',
  email: 'contact@eyekra.com',
  domain: 'eyekra.com',
  phone: '+91-9876543210',
  city: 'Mumbai',
  state: 'Maharashtra',
  country: 'India',
  plan: 'Basic'
};

async function fetchResp(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...options.headers },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { _raw: text.slice(0, 300) };
  }
  return { ok: res.ok, status: res.status, data };
}

async function login() {
  console.log('🔐 Logging in as superadmin...');
  const { ok, status, data } = await fetchResp(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  
  if (!ok) {
    console.error(`❌ Login failed: ${status}`, data);
    process.exit(1);
  }
  
  const token = data.accessToken || data.data?.accessToken;
  const user = data.user || data.data?.user;
  const tenantId = user?.tenantId || data.data?.user?.tenantId;
  
  if (!token) {
    console.error('❌ No token received', data);
    process.exit(1);
  }
  
  console.log(`✅ Logged in as: ${user?.name || user?.email}`);
  console.log(`   Role: ${user?.role}`);
  console.log(`   Tenant: ${tenantId}\n`);
  
  return { token, tenantId };
}

async function deleteTenant(token, tenantId, targetTenantId) {
  console.log(`🗑️  Deleting tenant: ${targetTenantId}...`);
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': tenantId,
    'X-Tenant-Id': tenantId,
  };
  
  // Try multiple endpoints
  const endpoints = [
    `${API_BASE}/tenants/${targetTenantId}`,
    `${API_BASE}/admin/tenants/${targetTenantId}`,
    `${BASE_URL}/api/tenants/${targetTenantId}`,
    `${BASE_URL}/api/admin/tenants/${targetTenantId}`,
  ];
  
  let deleted = false;
  for (const endpoint of endpoints) {
    console.log(`   Trying: ${endpoint}`);
    const { ok, status, data } = await fetchResp(endpoint, {
      method: 'DELETE',
      headers,
    });
    
    if (ok) {
      console.log(`✅ Tenant deleted successfully via ${endpoint}\n`);
      deleted = true;
      break;
    } else if (status === 404) {
      console.log(`   Tenant not found (may already be deleted)`);
    } else if (status !== 404) {
      console.log(`   Response: ${status} - ${data.message || data.error || JSON.stringify(data)}`);
      if (status === 200 || status === 204) {
        deleted = true;
        break;
      }
    }
  }
  
  if (!deleted) {
    console.log('⚠️  Could not delete tenant (may not exist or already deleted)');
  }
  
  return deleted;
}

async function createTenant(token, tenantId) {
  console.log('🏢 Creating eyekra tenant...');
  console.log(`   Name: ${TENANT_DATA.name}`);
  console.log(`   Email: ${TENANT_DATA.email}`);
  console.log(`   Domain: ${TENANT_DATA.domain}\n`);
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': tenantId,
    'X-Tenant-Id': tenantId,
  };
  
  // Try multiple endpoints
  const endpoints = [
    `${API_BASE}/tenants`,
    `${API_BASE}/admin/tenants`,
    `${BASE_URL}/api/tenants`,
    `${BASE_URL}/api/admin/tenants`,
  ];
  
  for (const endpoint of endpoints) {
    console.log(`   Trying: ${endpoint}`);
    const { ok, status, data } = await fetchResp(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(TENANT_DATA),
    });
    
    if (ok) {
      console.log(`✅ Tenant created successfully via ${endpoint}\n`);
      
      const tenant = data.data || data;
      console.log('📋 Tenant Details:');
      console.log(`   Tenant ID: ${tenant.tenantId || tenant.id}`);
      console.log(`   Name: ${tenant.name}`);
      console.log(`   Domain: ${tenant.domain || tenant.fullDomain}`);
      console.log(`   Email: ${tenant.email}`);
      console.log(`   Status: ${tenant.status}`);
      console.log(`   Plan: ${tenant.plan}\n`);
      
      // Show admin users if created
      if (tenant.adminUsers || tenant.adminUser) {
        const adminUsers = tenant.adminUsers || { admin: tenant.adminUser };
        console.log('👥 Admin Users Created:');
        
        if (adminUsers.admin) {
          console.log(`   Admin Email: ${adminUsers.admin.email}`);
          if (adminUsers.admin.temporaryPassword) {
            console.log(`   Admin Password: ${adminUsers.admin.temporaryPassword} (temporary)`);
          }
        }
        
        if (adminUsers.superAdmin) {
          console.log(`   Super Admin Email: ${adminUsers.superAdmin.email}`);
          if (adminUsers.superAdmin.temporaryPassword) {
            console.log(`   Super Admin Password: ${adminUsers.superAdmin.temporaryPassword} (temporary)`);
          }
        }
        console.log('');
      }
      
      return tenant;
    } else if (status === 409) {
      console.log(`   ⚠️  Tenant already exists (status: 409)`);
      return null;
    } else {
      console.log(`   Response: ${status} - ${data.message || data.error || JSON.stringify(data)}`);
    }
  }
  
  return null;
}

async function main() {
  try {
    console.log('🔄 Delete and Recreate Eyekra Tenant');
    console.log('=====================================\n');
    console.log(`API Base: ${API_BASE}\n`);
    
    // Step 1: Login
    const { token, tenantId } = await login();
    
    // Step 2: Delete tenant
    await deleteTenant(token, tenantId, TENANT_ID);
    
    // Wait a bit for deletion to complete
    console.log('⏳ Waiting 2 seconds before recreation...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Create tenant
    const tenant = await createTenant(token, tenantId);
    
    if (!tenant) {
      console.log('⚠️  Tenant creation failed or already exists');
      process.exit(1);
    }
    
    console.log('✅ Done!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Login with admin credentials (if provided above)');
    console.log('   2. Change password on first login');
    console.log('   3. Start using the tenant');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
