#!/usr/bin/env node

/**
 * Script to login and clock out
 * Usage: node clock-out-script.js
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const EMAIL = 'lenstrack01@gmail.com';
const PASSWORD = 'cnbxs2b9A1!';

// Default location (Mumbai coordinates - you can change these)
const DEFAULT_LATITUDE = 19.0760;
const DEFAULT_LONGITUDE = 72.8777;

async function login() {
  try {
    console.log('🔐 Logging in...');
    console.log(`   Email: ${EMAIL}`);
    console.log(`   API URL: ${API_BASE_URL}/api/auth/login`);
    
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: EMAIL,
      password: PASSWORD
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.data.success && response.data.data) {
      const token = response.data.data.accessToken || response.data.data.token;
      const user = response.data.data.user;
      
      console.log('✅ Login successful!');
      console.log(`   User: ${user.name || user.firstName || EMAIL}`);
      console.log(`   Employee ID: ${user.employee_id || user.employeeId || 'N/A'}`);
      
      return token;
    } else {
      throw new Error('Login response format unexpected');
    }
  } catch (error) {
    if (error.response) {
      console.error('❌ Login failed!');
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      console.error('❌ Login failed - No response from server');
      console.error(`   URL: ${API_BASE_URL}/api/auth/login`);
      console.error('   Make sure the server is running and API_BASE_URL is correct');
    } else {
      console.error('❌ Login error:', error.message);
    }
    throw error;
  }
}

async function clockOut(token, latitude = DEFAULT_LATITUDE, longitude = DEFAULT_LONGITUDE) {
  try {
    console.log('\n🕐 Clocking out...');
    console.log(`   Location: ${latitude}, ${longitude}`);
    console.log(`   API URL: ${API_BASE_URL}/api/attendance/clock-out`);
    
    const response = await axios.post(
      `${API_BASE_URL}/api/attendance/clock-out`,
      {
        latitude: latitude,
        longitude: longitude,
        notes: 'Clock out via script'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.data.success || response.data.message) {
      console.log('✅ Clock out successful!');
      
      const attendance = response.data.data || response.data;
      if (attendance.check_out_time || attendance.clockOutTime) {
        const clockOutTime = attendance.check_out_time || attendance.clockOutTime;
        console.log(`   Clock out time: ${new Date(clockOutTime).toLocaleString()}`);
      }
      
      if (attendance.check_in_time || attendance.clockInTime) {
        const clockInTime = attendance.check_in_time || attendance.clockInTime;
        console.log(`   Clock in time: ${new Date(clockInTime).toLocaleString()}`);
      }
      
      return attendance;
    } else {
      throw new Error('Clock out response format unexpected');
    }
  } catch (error) {
    if (error.response) {
      console.error('❌ Clock out failed!');
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
      
      if (error.response.status === 400) {
        const errorMsg = error.response.data?.message || error.response.data?.error?.message || '';
        if (errorMsg.includes('clock in') || errorMsg.includes('No open clock-in')) {
          console.error('\n   ⚠️  You are not clocked in. Please clock in first.');
        }
      } else if (error.response.status === 401) {
        console.error('\n   ⚠️  Authentication failed. Token may be invalid.');
      } else if (error.response.status === 403) {
        console.error('\n   ⚠️  Clock out blocked due to security violation.');
      }
    } else if (error.request) {
      console.error('❌ Clock out failed - No response from server');
      console.error(`   URL: ${API_BASE_URL}/api/attendance/clock-out`);
    } else {
      console.error('❌ Clock out error:', error.message);
    }
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting login and clock out process...\n');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Login
    const token = await login();
    
    // Step 2: Clock out
    await clockOut(token);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Process completed successfully!');
    
  } catch (error) {
    console.log('\n' + '='.repeat(50));
    console.error('❌ Process failed!');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { login, clockOut };
