const http = require('http');

const API_BASE = 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';

// Helper function to make HTTP requests
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
    console.log('🧪 Testing Roster Upsert Functionality\n');

    // Step 1: Login as Upcapto admin
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

    // Step 2: Get employees to find one for testing
    console.log('2️⃣ Fetching employees...');
    const employeesRes = await makeRequest(`${API_BASE}/api/hr/employees?page=1&limit=5`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });

    if (employeesRes.status !== 200 || !employeesRes.data.success) {
      console.error('❌ Failed to fetch employees:', employeesRes.data);
      return;
    }

    const employees = employeesRes.data.data?.employees || employeesRes.data.data || [];
    if (employees.length === 0) {
      console.error('❌ No employees found');
      return;
    }

    const testEmployee = employees[0];
    const employeeId = testEmployee._id || testEmployee.id;
    const employeeIdString = testEmployee.employeeId || testEmployee.employee_id || employeeId;
    console.log(`✅ Found employee: ${testEmployee.firstName || testEmployee.name} (${employeeIdString})\n`);

    // Step 3: Get stores
    console.log('3️⃣ Fetching stores...');
    const storesRes = await makeRequest(`${API_BASE}/api/hr/stores?page=1&limit=5`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });

    if (storesRes.status !== 200 || !storesRes.data.success) {
      console.error('❌ Failed to fetch stores:', storesRes.data);
      return;
    }

    const stores = storesRes.data.data?.stores || storesRes.data.data || [];
    if (stores.length === 0) {
      console.error('❌ No stores found');
      return;
    }

    const testStore = stores[0];
    const storeId = testStore._id || testStore.id || testStore.code;
    console.log(`✅ Found store: ${testStore.name} (${storeId})\n`);

    // Step 4: Check existing roster for today
    const today = new Date().toISOString().split('T')[0];
    console.log(`4️⃣ Checking existing roster for ${today}...`);
    const existingRosterRes = await makeRequest(`${API_BASE}/api/hr/roster?startDate=${today}&endDate=${today}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });

    let existingRoster = null;
    if (existingRosterRes.status === 200 && existingRosterRes.data.success) {
      const rosterData = existingRosterRes.data.data?.data || existingRosterRes.data.data || [];
      existingRoster = rosterData.find(r => 
        (r.employeeId === employeeIdString || r.employee?._id === employeeId || r.employee === employeeId)
      );
      if (existingRoster) {
        console.log(`⚠️  Found existing roster entry: ${existingRoster._id || existingRoster.id}`);
        console.log(`   Shift: ${existingRoster.shift}, Time: ${existingRoster.shiftStart} - ${existingRoster.shiftEnd}\n`);
      } else {
        console.log('✅ No existing roster entry for this employee today\n');
      }
    }

    // Step 5: Create/Update roster entry
    console.log('5️⃣ Creating/Updating roster entry...');
    const rosterData = {
      employeeId: employeeId,
      storeId: storeId,
      date: today,
      shift: 'MORNING',
      shiftStart: '09:00',
      shiftEnd: '17:00',
      notes: 'Test roster upsert'
    };

    const createRes = await makeRequest(`${API_BASE}/api/hr/roster`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      },
      body: rosterData
    });

    if (createRes.status === 200 || createRes.status === 201) {
      if (createRes.data.success) {
        const roster = createRes.data.data;
        console.log('✅ Roster entry created/updated successfully!');
        console.log(`   ID: ${roster.id || roster._id}`);
        console.log(`   Employee: ${roster.employeeName}`);
        console.log(`   Store: ${roster.storeName}`);
        console.log(`   Date: ${roster.date}`);
        console.log(`   Shift: ${roster.shift}`);
        console.log(`   Time: ${roster.shiftStart} - ${roster.shiftEnd}`);
        console.log(`   Status: ${roster.status}\n`);

        // Step 6: Try to create again (should update, not error)
        console.log('6️⃣ Attempting to create again (should update existing entry)...');
        const createAgainRes = await makeRequest(`${API_BASE}/api/hr/roster`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Id': tenantId
          },
          body: {
            ...rosterData,
            shift: 'EVENING',
            shiftStart: '14:00',
            shiftEnd: '22:00',
            notes: 'Updated roster entry'
          }
        });

        if (createAgainRes.status === 200 || createAgainRes.status === 201) {
          if (createAgainRes.data.success) {
            const updatedRoster = createAgainRes.data.data;
            console.log('✅ Roster entry updated successfully (no 409 error)!');
            console.log(`   ID: ${updatedRoster.id || updatedRoster._id}`);
            console.log(`   Shift: ${updatedRoster.shift} (changed from MORNING)`);
            console.log(`   Time: ${updatedRoster.shiftStart} - ${updatedRoster.shiftEnd} (updated)`);
            console.log(`   Notes: ${updatedRoster.notes}\n`);

            // Verify it's the same ID
            if ((roster.id || roster._id) === (updatedRoster.id || updatedRoster._id)) {
              console.log('✅ Confirmed: Same roster entry was updated (upsert working!)\n');
            } else {
              console.log('⚠️  Warning: Different roster IDs (might have created new entry)\n');
            }
          } else {
            console.error('❌ Update failed:', createAgainRes.data);
          }
        } else if (createAgainRes.status === 409) {
          console.error('❌ Still getting 409 error - upsert not working!');
          console.error('   Response:', createAgainRes.data);
        } else {
          console.error('❌ Unexpected error:', createAgainRes.status, createAgainRes.data);
        }
      } else {
        console.error('❌ Create failed:', createRes.data);
      }
    } else if (createRes.status === 409) {
      console.error('❌ Got 409 error on first create:', createRes.data);
      console.error('   This might be due to an existing overlapping shift');
    } else {
      console.error('❌ Unexpected error:', createRes.status, createRes.data);
    }

    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error(error.stack);
  }
}

testRosterUpsert();
