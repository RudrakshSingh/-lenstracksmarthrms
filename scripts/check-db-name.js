#!/usr/bin/env node

/**
 * Check what database the HR service is connected to
 */

const http = require('http');

const BASE_URL = 'http://localhost:3002';

function makeRequest(method, url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 3002,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function checkDB() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Checking Database Connection');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Check health endpoint
    console.log('1. Checking health endpoint...');
    const healthRes = await makeRequest('GET', `${BASE_URL}/api/hr/health`);
    
    if (healthRes.status === 200) {
      console.log('✅ Service is running\n');
      console.log('Health Status:', JSON.stringify(healthRes.data, null, 2));
    } else {
      console.log('❌ Service health check failed');
      return;
    }

    // Check environment variables
    console.log('\n2. Checking environment variables...');
    console.log('   DB_NAME:', process.env.DB_NAME || 'NOT SET');
    console.log('   MONGO_DB_NAME:', process.env.MONGO_DB_NAME || 'NOT SET');
    console.log('   MONGO_URI:', process.env.MONGO_URI ? process.env.MONGO_URI.replace(/(:\/\/[^:]+:)([^@]+)(@)/, '$1****$3') : 'NOT SET');

    // Try to get employee count
    console.log('\n3. Checking employee count...');
    try {
      const loginRes = await makeRequest('POST', `${BASE_URL}/api/auth/mock-login`, {
        email: 'admin@company.com',
        role: 'admin'
      });
      
      if (loginRes.status === 200) {
        const authToken = loginRes.data?.data?.accessToken || loginRes.data?.accessToken;
        
        const employeesRes = await makeRequest('GET', `${BASE_URL}/api/hr/employees?limit=1`, null, authToken);
        if (employeesRes.status === 200) {
          const data = employeesRes.data?.data || employeesRes.data;
          const count = data?.pagination?.totalItems || 0;
          console.log(`   Total employees in database: ${count}`);
          
          if (count === 0) {
            console.log('   ⚠️  WARNING: No employees found in database!');
            console.log('   This could mean:');
            console.log('   - Database is empty');
            console.log('   - Connected to wrong database');
            console.log('   - Employees not being saved');
          }
        }
      }
    } catch (error) {
      console.log('   ⚠️  Could not check employee count:', error.message);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  Expected Database: etelios_hr_service');
    console.log('═══════════════════════════════════════════════════════');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('   Make sure HR service is running on port 3002');
  }
}

checkDB();

