#!/usr/bin/env node

/**
 * Update existing admin user to superadmin role via API
 * 
 * Usage:
 *   BASE_URL="http://..." node scripts/update-admin-to-superadmin-api.js
 */

const BASE_URL = process.env.BACKEND_URL || process.env.BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';
const API_BASE = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

const ADMIN_EMAIL = 'admin@upcapto.com';
const ADMIN_PASSWORD = 'Upcapto@2026';

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
  console.log('🔐 Logging in as admin...');
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
  console.log(`   Current role: ${user?.role}`);
  console.log(`   Tenant: ${tenantId}\n`);
  
  return { token, tenantId, userId: user?._id || user?.id };
}

async function updateUserRole(token, tenantId, userId) {
  console.log('🔄 Updating user role to superadmin...');
  
  // Try different endpoints that might support role updates
  const endpoints = [
    `${API_BASE}/hr/users/${userId}`,
    `${API_BASE}/admin/users/${userId}`,
    `${API_BASE}/auth/users/${userId}`,
  ];
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': tenantId,
    'X-Tenant-Id': tenantId,
  };
  
  for (const endpoint of endpoints) {
    console.log(`   Trying: ${endpoint}`);
    const { ok, status, data } = await fetchResp(endpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ 
        role: 'superadmin',
        designation: 'Super Administrator'
      }),
    });
    
    if (ok) {
      console.log(`✅ User updated successfully via ${endpoint}`);
      return true;
    } else if (status !== 404) {
      console.log(`   Response: ${status} - ${data.message || data.error || JSON.stringify(data)}`);
    }
  }
  
  return false;
}

async function main() {
  try {
    console.log('🚀 Updating Admin to Superadmin via API...');
    console.log('=====================================\n');
    console.log(`API Base: ${API_BASE}\n`);
    
    const { token, tenantId, userId } = await login();
    
    if (!userId) {
      console.error('❌ Could not get user ID from login response');
      process.exit(1);
    }
    
    const updated = await updateUserRole(token, tenantId, userId);
    
    if (!updated) {
      console.error('\n❌ Could not update user role via API');
      console.error('\n💡 Alternative: Update directly in database');
      console.error('   Use: MONGODB_URI="..." node scripts/update-admin-to-superadmin.js');
      console.error('\n💡 Or use kubectl to exec into a pod and update MongoDB directly');
      process.exit(1);
    }
    
    console.log('\n✅ User updated to superadmin successfully!');
    console.log('\n🔐 Login Credentials:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Tenant: ${tenantId}`);
    console.log(`   Role: superadmin`);
    console.log('\n📝 Next Steps:');
    console.log('   1. Login with the credentials above');
    console.log('   2. Create tenants: POST /api/tenants');
    console.log('   3. Create tenant admin users (automatically created when creating tenants)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
