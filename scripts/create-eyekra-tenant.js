#!/usr/bin/env node

/**
 * Create eyekra tenant via API endpoint
 * No seed data - just creates the tenant
 * 
 * Usage:
 *   BASE_URL="http://..." node scripts/create-eyekra-tenant.js
 */

const BASE_URL = process.env.BACKEND_URL || process.env.BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';
const API_BASE = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

const ADMIN_EMAIL = 'admin@upcapto.com';
const ADMIN_PASSWORD = 'Upcapto@2026';

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
  
  if (user?.role !== 'superadmin') {
    console.warn('⚠️  Warning: User role is not superadmin. Tenant creation may fail.');
    console.warn('   Update user to superadmin first using scripts/update-admin-to-superadmin.js\n');
  }
  
  return { token, tenantId };
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
  
  let lastError = null;
  for (const endpoint of endpoints) {
    console.log(`   Trying: ${endpoint}`);
    const { ok, status, data } = await fetchResp(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(TENANT_DATA),
    });
    
    if (ok) {
      console.log(`✅ Success via ${endpoint}\n`);
      
      console.log('✅ Tenant created successfully!\n');
      
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
    }
    
    lastError = { ok, status, data };
    if (status !== 404) {
      // If it's not 404, it might be an auth error or validation error
      break;
    }
  }
  
  const { ok, status, data } = lastError;
  
  if (!ok) {
    console.error(`❌ Tenant creation failed: ${status}`);
    console.error('   Error:', data.message || data.error || JSON.stringify(data));
    
    if (status === 401 || status === 403) {
      console.error('\n💡 Make sure you are logged in as superadmin');
      console.error('   Update user role: node scripts/update-admin-to-superadmin.js');
    }
    
    return null;
  }
  
  return null;
}

async function main() {
  try {
    console.log('🚀 Creating Eyekra Tenant');
    console.log('=====================================\n');
    console.log(`API Base: ${API_BASE}\n`);
    
    const { token, tenantId } = await login();
    const tenant = await createTenant(token, tenantId);
    
    if (!tenant) {
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
