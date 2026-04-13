#!/usr/bin/env node

/**
 * Debug Eyekra Login Issue
 * 
 * This script tests login with different email patterns and shows detailed errors
 */

const BASE_URL = process.env.BACKEND_URL || process.env.BASE_URL || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';
const API_BASE = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

const TENANT_ID = 'eyekra';

// Test credentials
const TEST_CREDENTIALS = [
  { email: 'contact@eyekra.com', password: 'cnbxs2b9A1!', desc: 'Tenant email with known password' },
  { email: 'admin@eyekra.com', password: 'cnbxs2b9A1!', desc: 'Admin pattern with known password' },
  { email: 'contact@eyekra.com', password: 'TempPass123!@#', desc: 'Tenant email with common temp password' },
  { email: 'admin@eyekra.com', password: 'TempPass123!@#', desc: 'Admin pattern with common temp password' },
];

async function testLogin(email, password) {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { _raw: text.substring(0, 500) };
    }
    
    return {
      ok: response.ok,
      status: response.status,
      data,
      email,
      password: password.substring(0, 3) + '***'
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: { error: error.message },
      email,
      password: password.substring(0, 3) + '***'
    };
  }
}

async function main() {
  console.log('🔍 Debugging Eyekra Login Issue\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Tenant: ${TENANT_ID}\n`);
  console.log('='.repeat(60));
  console.log('Testing Login with Different Credentials\n');
  
  for (const cred of TEST_CREDENTIALS) {
    console.log(`\n📧 Testing: ${cred.desc}`);
    console.log(`   Email: ${cred.email}`);
    console.log(`   Password: ${cred.password.substring(0, 3)}***`);
    
    const result = await testLogin(cred.email, cred.password);
    
    if (result.ok) {
      console.log(`   ✅ SUCCESS!`);
      const user = result.data.data?.user || result.data.user;
      console.log(`   User ID: ${user?._id || user?.id}`);
      console.log(`   Role: ${user?.role}`);
      console.log(`   Tenant: ${user?.tenantId}`);
      console.log(`   Email: ${user?.email}`);
      console.log(`   Must Change Password: ${result.data.data?.mustChangePassword || user?.mustChangePassword}`);
      console.log(`\n   🎉 Working credentials found!`);
      console.log(`   Email: ${cred.email}`);
      console.log(`   Password: ${cred.password}`);
      process.exit(0);
    } else {
      console.log(`   ❌ FAILED (Status: ${result.status})`);
      const errorMsg = result.data.message || result.data.error || JSON.stringify(result.data).substring(0, 200);
      console.log(`   Error: ${errorMsg}`);
    }
    
    // Small delay between attempts
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n❌ None of the tested credentials worked.');
  console.log('\n💡 Possible Issues:');
  console.log('   1. Admin user was not created during tenant creation');
  console.log('   2. Password was changed after tenant creation');
  console.log('   3. Email is different from expected');
  console.log('   4. User account is inactive or suspended');
  console.log('\n🔧 Solutions:');
  console.log('   1. Check tenant creation response for admin user email and password');
  console.log('   2. Reset password using: scripts/reset-eyekra-admin-password.js');
  console.log('   3. Check database for users with tenantId="eyekra"');
  console.log('   4. Verify user status in database');
}

main().catch(console.error);
