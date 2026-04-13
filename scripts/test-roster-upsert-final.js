const http = require('http');

const API_BASE = 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = http.request({
      hostname: urlObj.hostname,
      port: 80,
      path: urlObj.pathname + (urlObj.search || ''),
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function testRosterUpsert() {
  try {
    console.log('🧪 Testing Roster Upsert & Dashboard Display\n');

    // Step 1: Login
    console.log('1️⃣ Logging in as Upcapto admin...');
    const loginRes = await makeRequest(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      body: {
        email: 'admin@upcapto.com',
        password: 'Upcapto@2026'
      }
    });

    if (loginRes.status !== 200 || !loginRes.data.success) {
      console.error('❌ Login failed:', loginRes.data);
      return;
    }

    const token = loginRes.data.data?.accessToken || loginRes.data.accessToken;
    const tenantId = loginRes.data.data?.user?.tenantId || 'upcapto';
    console.log('✅ Login successful\n');

    // Step 2: Get employee
    console.log('2️⃣ Fetching employees...');
    const empRes = await makeRequest(`${API_BASE}/api/hr/employees?page=1&limit=1`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });

    if (empRes.status !== 200 || !empRes.data.success) {
      console.error('❌ Failed to fetch employees:', empRes.data);
      return;
    }

    // Handle different response structures
    let employees = empRes.data.data?.employees || empRes.data.data?.data || [];
    if (Array.isArray(empRes.data.data) && !employees.length) {
      employees = empRes.data.data;
    }
    
    const employee = employees[0];
    if (!employee) {
      console.error('❌ No employees found');
      console.error('Response structure:', Object.keys(empRes.data.data || {}));
      return;
    }

    const employeeId = employee._id || employee.id;
    const employeeIdString = employee.employeeId || employee.employee_id || employeeId;
    console.log(`✅ Found employee: ${employee.firstName || employee.name} (${employeeIdString})\n`);

    // Step 3: Get store
    console.log('3️⃣ Fetching stores...');
    const storeRes = await makeRequest(`${API_BASE}/api/hr/stores?page=1&limit=1`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });

    if (storeRes.status !== 200 || !storeRes.data.success) {
      console.error('❌ Failed to fetch stores:', storeRes.data);
      return;
    }

    // Handle different response structures
    let stores = storeRes.data.data?.stores || storeRes.data.data?.data || [];
    if (Array.isArray(storeRes.data.data) && !stores.length) {
      stores = storeRes.data.data;
    }
    
    const store = stores[0];
    if (!store) {
      console.error('❌ No stores found');
      return;
    }

    const storeId = store._id || store.id || store.code;
    console.log(`✅ Found store: ${store.name} (${storeId})\n`);

    // Step 4: Create roster (first time)
    const today = new Date().toISOString().split('T')[0];
    console.log(`4️⃣ Creating roster for ${today}...`);
    const create1Res = await makeRequest(`${API_BASE}/api/hr/roster`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      },
      body: {
        employeeId: employeeId,
        storeId: storeId,
        date: today,
        shift: 'MORNING',
        shiftStart: '09:00',
        shiftEnd: '17:00',
        notes: 'Test roster creation'
      }
    });

    if (create1Res.status === 200 || create1Res.status === 201) {
      if (create1Res.data.success) {
        const roster1 = create1Res.data.data;
        console.log('✅ First create successful!');
        console.log(`   ID: ${roster1.id || roster1._id}`);
        console.log(`   Shift: ${roster1.shift}`);
        console.log(`   Time: ${roster1.shiftStart} - ${roster1.shiftEnd}\n`);
      } else {
        console.error('❌ First create failed:', create1Res.data.message);
        return;
      }
    } else {
      console.error('❌ First create error:', create1Res.status, create1Res.data);
      return;
    }

    // Step 5: Create again (should update, not error)
    console.log('5️⃣ Creating again (should UPDATE, not create new)...');
    const create2Res = await makeRequest(`${API_BASE}/api/hr/roster`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      },
      body: {
        employeeId: employeeId,
        storeId: storeId,
        date: today,
        shift: 'EVENING',
        shiftStart: '14:00',
        shiftEnd: '22:00',
        notes: 'Updated roster entry'
      }
    });

    if (create2Res.status === 200 || create2Res.status === 201) {
      if (create2Res.data.success) {
        const roster2 = create2Res.data.data;
        console.log('✅ Second create successful (upsert working)!');
        console.log(`   ID: ${roster2.id || roster2._id}`);
        console.log(`   Shift: ${roster2.shift} (changed from MORNING to EVENING)`);
        console.log(`   Time: ${roster2.shiftStart} - ${roster2.shiftEnd} (updated)\n`);
      } else {
        console.error('❌ Second create failed:', create2Res.data.message);
      }
    } else if (create2Res.status === 409) {
      console.error('❌ Still getting 409 overlap error - upsert NOT working!');
      console.error('   Response:', create2Res.data);
    } else {
      console.error('❌ Unexpected error:', create2Res.status, create2Res.data);
    }

    // Step 6: Check GET roster API
    console.log('6️⃣ Checking GET roster API...');
    const getRes = await makeRequest(`${API_BASE}/api/hr/roster?startDate=${today}&endDate=${today}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });

    if (getRes.status === 200 && getRes.data.success) {
      const rosterData = getRes.data.data?.data || getRes.data.data || [];
      console.log(`✅ GET roster successful! Found ${rosterData.length} entry/entries`);
      if (rosterData.length > 0) {
        console.log(`   First entry: ${rosterData[0].shift} shift, ${rosterData[0].shiftStart}-${rosterData[0].shiftEnd}`);
      }
    } else {
      console.error('❌ GET roster failed:', getRes.data);
    }

    // Step 7: Check dashboard roster
    console.log('\n7️⃣ Checking dashboard roster data...');
    const dashboardRes = await makeRequest(`${API_BASE}/api/hr/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });

    if (dashboardRes.status === 200 && dashboardRes.data.success) {
      const rosterWidget = dashboardRes.data.data?.widgets?.roster;
      if (rosterWidget) {
        console.log('✅ Dashboard roster widget found!');
        if (rosterWidget.today) {
          console.log(`   Today's shift: ${rosterWidget.today.shift}`);
          console.log(`   Time: ${rosterWidget.today.shiftStart} - ${rosterWidget.today.shiftEnd}`);
          console.log(`   Store: ${rosterWidget.today.storeName || 'N/A'}`);
        }
        if (rosterWidget.all && rosterWidget.all.length > 0) {
          console.log(`   Total roster entries: ${rosterWidget.all.length}`);
        } else {
          console.log('   ⚠️  No roster entries in "all" array');
        }
      } else {
        console.log('   ⚠️  Roster widget not found in dashboard response');
      }
    } else {
      console.error('❌ Dashboard fetch failed:', dashboardRes.data);
    }

    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error(error.stack);
  }
}

testRosterUpsert();
