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

async function testEmployeeLeaveAccess() {
  try {
    console.log('🧪 Testing Employee Leave Access\n');

    // Step 1: Login as employee (Rudi)
    console.log('1️⃣ Logging in as employee (Rudi)...');
    const loginRes = await makeRequest(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      body: {
        email: 'rudi@gmail.com',
        password: 'Rudi@3006'
      }
    });

    if (loginRes.status !== 200 || !loginRes.data.success) {
      console.error('❌ Login failed:', loginRes.data);
      return;
    }

    const token = loginRes.data.data?.accessToken || loginRes.data.accessToken;
    const tenantId = loginRes.data.data?.user?.tenantId || 'eyekra';
    const userRole = loginRes.data.data?.user?.role || 'employee';
    console.log('✅ Login successful');
    console.log(`   Role: ${userRole}`);
    console.log(`   Tenant: ${tenantId}\n`);

    // Step 2: Test /api/attendance/leave (frontend calls this)
    console.log('2️⃣ Testing GET /api/attendance/leave (frontend endpoint)...');
    const attendanceLeaveRes = await makeRequest(`${API_BASE}/api/attendance/leave?page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });

    if (attendanceLeaveRes.status === 200 && attendanceLeaveRes.data.success) {
      console.log('✅ /api/attendance/leave working!');
      const requests = attendanceLeaveRes.data.data?.requests || attendanceLeaveRes.data.data || [];
      console.log(`   Found ${requests.length} leave request(s)`);
      if (requests.length > 0) {
        console.log(`   First leave: ${requests[0].leave_type} from ${requests[0].from_date} to ${requests[0].to_date}`);
      }
    } else {
      console.error('❌ /api/attendance/leave failed:', attendanceLeaveRes.status, attendanceLeaveRes.data);
    }

    // Step 3: Test /api/hr/leave-requests (direct HR service)
    console.log('\n3️⃣ Testing GET /api/hr/leave-requests (direct HR service)...');
    const hrLeaveRes = await makeRequest(`${API_BASE}/api/hr/leave-requests?page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });

    if (hrLeaveRes.status === 200 && hrLeaveRes.data.success) {
      console.log('✅ /api/hr/leave-requests working!');
      const requests = hrLeaveRes.data.data?.requests || hrLeaveRes.data.data || [];
      console.log(`   Found ${requests.length} leave request(s)`);
    } else {
      console.error('❌ /api/hr/leave-requests failed:', hrLeaveRes.status, hrLeaveRes.data);
    }

    // Step 4: Test /api/hr/leave (alias)
    console.log('\n4️⃣ Testing GET /api/hr/leave (alias)...');
    const hrLeaveAliasRes = await makeRequest(`${API_BASE}/api/hr/leave?page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });

    if (hrLeaveAliasRes.status === 200 && hrLeaveAliasRes.data.success) {
      console.log('✅ /api/hr/leave working!');
      const requests = hrLeaveAliasRes.data.data?.requests || hrLeaveAliasRes.data.data || [];
      console.log(`   Found ${requests.length} leave request(s)`);
    } else {
      console.error('❌ /api/hr/leave failed:', hrLeaveAliasRes.status, hrLeaveAliasRes.data);
    }

    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error(error.stack);
  }
}

testEmployeeLeaveAccess();
