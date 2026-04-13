#!/usr/bin/env node
/**
 * Check yesterday's attendance records
 * Usage: node scripts/check-yesterday-attendance.js
 */

const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api';
const EMAIL = process.env.EMAIL || 'admin@lenstrack.com';
const PASSWORD = process.env.PASSWORD || 'AdminPass123!';
const TENANT_ID = process.env.TENANT_ID || 'lenstrack';

// Get yesterday's date
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD

async function main() {
  console.log('='.repeat(80));
  console.log('📊 Checking Yesterday\'s Attendance Records');
  console.log('='.repeat(80));
  console.log(`Date: ${yesterdayStr}`);
  console.log(`Tenant: ${TENANT_ID}`);
  console.log('');

  try {
    // Step 1: Login
    console.log('1️⃣ Logging in...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD
      }),
    });

    const loginBody = await loginRes.json();
    if (!loginRes.ok) {
      console.error('❌ Login failed:', loginRes.status);
      console.error(loginBody);
      process.exit(1);
    }

    const token = loginBody.accessToken || loginBody.data?.accessToken;
    const user = loginBody.user || loginBody.data?.user || loginBody.data;
    const tenantFromUser = user?.tenantId || user?.tenant_id || TENANT_ID;

    if (!token) {
      console.error('❌ No access token received');
      process.exit(1);
    }

    console.log(`✅ Login successful! User: ${user?.name || EMAIL}, Tenant: ${tenantFromUser}`);
    console.log('');

    // Step 2: Get Attendance Stats for Yesterday
    console.log('2️⃣ Fetching Attendance Stats for Yesterday...');
    console.log(`   URL: ${API_BASE}/attendance/stats?date=${yesterdayStr}`);
    
    const statsRes = await fetch(`${API_BASE}/attendance/stats?date=${yesterdayStr}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantFromUser || TENANT_ID,
      },
    });

    const statsData = await statsRes.json();
    
    if (!statsRes.ok) {
      console.error('❌ Stats API failed:', statsRes.status);
      console.error(JSON.stringify(statsData, null, 2));
      process.exit(1);
    }

    console.log('✅ Stats API OK');
    console.log('');
    console.log('='.repeat(80));
    console.log('📊 Attendance Statistics for Yesterday');
    console.log('='.repeat(80));
    console.log(JSON.stringify(statsData, null, 2));
    console.log('');

    if (statsData.data) {
      const data = statsData.data;
      console.log('📈 Summary:');
      console.log(`   Total Employees: ${data.totalEmployees || 0}`);
      console.log(`   Present Today: ${data.presentToday || 0}`);
      console.log(`   Absent Today: ${data.absentToday || 0}`);
      console.log(`   Late Arrivals: ${data.lateArrivals || 0}`);
      console.log(`   On Leave: ${data.onLeave || 0}`);
      console.log(`   Attendance Rate: ${data.attendanceRate || 0}%`);
      console.log(`   Average Hours: ${data.averageHours || 0}`);
      console.log('');
    }

    // Step 3: Get Actual Attendance Records for Yesterday
    console.log('3️⃣ Fetching Actual Attendance Records for Yesterday...');
    console.log(`   URL: ${API_BASE}/attendance?date=${yesterdayStr}`);
    
    const recordsRes = await fetch(`${API_BASE}/attendance?date=${yesterdayStr}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantFromUser || TENANT_ID,
      },
    });

    const recordsData = await recordsRes.json();
    
    if (!recordsRes.ok) {
      console.error('❌ Records API failed:', recordsRes.status);
      console.error(JSON.stringify(recordsData, null, 2));
    } else {
      console.log('✅ Records API OK');
      console.log('');
      console.log('='.repeat(80));
      console.log('📋 Attendance Records for Yesterday');
      console.log('='.repeat(80));
      
      if (Array.isArray(recordsData.data)) {
        console.log(`Total Records Found: ${recordsData.data.length}`);
        console.log('');
        
        if (recordsData.data.length > 0) {
          console.log('Records:');
          recordsData.data.forEach((record, index) => {
            console.log(`\n${index + 1}. Employee: ${record.employeeName || record.employee_id || 'N/A'}`);
            console.log(`   Status: ${record.status || 'N/A'}`);
            console.log(`   Check In: ${record.check_in_time || record.checkInTime || 'N/A'}`);
            console.log(`   Check Out: ${record.check_out_time || record.checkOutTime || 'N/A'}`);
            console.log(`   Total Hours: ${record.total_hours || record.totalHours || 0}`);
            console.log(`   Is Late: ${record.is_late || record.isLate || false}`);
            console.log(`   Store: ${record.store_code || record.storeCode || 'N/A'}`);
          });
        } else {
          console.log('⚠️  No attendance records found for yesterday');
        }
      } else if (recordsData.data && typeof recordsData.data === 'object') {
        console.log(JSON.stringify(recordsData.data, null, 2));
      } else {
        console.log(JSON.stringify(recordsData, null, 2));
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('✅ Check Complete!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
