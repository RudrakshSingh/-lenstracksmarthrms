const fetch = require('node-fetch');

const API_BASE = 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api';
const EMAIL = 'admin@lenstrack.com';
const PASSWORD = 'AdminPass123!';
const TENANT_ID = 'lenstrack';

// Yesterday's date
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = yesterday.toISOString().split('T')[0];

async function main() {
  console.log('Checking yesterday\'s attendance:', yesterdayStr);
  
  // Login
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  
  const login = await loginRes.json();
  const token = login.accessToken || login.data?.accessToken;
  const tenant = login.user?.tenantId || TENANT_ID;
  
  // Get stats
  const statsRes = await fetch(`${API_BASE}/attendance/stats?date=${yesterdayStr}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenant,
    },
  });
  
  const stats = await statsRes.json();
  console.log('\n=== Attendance Stats for Yesterday ===');
  console.log(JSON.stringify(stats, null, 2));
  
  // Get records
  const recordsRes = await fetch(`${API_BASE}/attendance?date=${yesterdayStr}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenant,
    },
  });
  
  const records = await recordsRes.json();
  console.log('\n=== Attendance Records for Yesterday ===');
  if (Array.isArray(records.data)) {
    console.log(`Total Records: ${records.data.length}`);
    records.data.forEach((r, i) => {
      console.log(`\n${i+1}. ${r.employeeName || r.employee_id}`);
      console.log(`   Status: ${r.status}`);
      console.log(`   Check In: ${r.check_in_time || r.checkInTime}`);
      console.log(`   Check Out: ${r.check_out_time || r.checkOutTime}`);
      console.log(`   Hours: ${r.total_hours || r.totalHours}`);
    });
  } else {
    console.log(JSON.stringify(records, null, 2));
  }
}

main().catch(console.error);
