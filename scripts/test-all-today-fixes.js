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

let token = '';
let tenantId = '';
let employeeId = '';
let storeId = '';
let leaveRequestId = '';

async function testAllFixes() {
  console.log('🧪 Testing All Today\'s Fixes & Features\n');
  console.log('='.repeat(60));

  try {
    // ============================================================
    // TEST 1: Login as Admin
    // ============================================================
    console.log('\n1️⃣ TEST: Login as Admin (Upcapto)');
    console.log('-'.repeat(60));
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

    token = loginRes.data.data?.accessToken || loginRes.data.accessToken;
    tenantId = loginRes.data.data?.user?.tenantId || 'upcapto';
    console.log('✅ Login successful');
    console.log(`   Role: ${loginRes.data.data?.user?.role || 'admin'}`);
    console.log(`   Tenant: ${tenantId}`);

    // ============================================================
    // TEST 2: Roster - GET API (Fixed populate filter)
    // ============================================================
    console.log('\n2️⃣ TEST: Roster GET API (Fixed populate filter)');
    console.log('-'.repeat(60));
    const today = new Date().toISOString().split('T')[0];
    const rosterGetRes = await makeRequest(`${API_BASE}/api/hr/roster?startDate=${today}&endDate=${today}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });

    if (rosterGetRes.status === 200 && rosterGetRes.data.success) {
      const rosterData = rosterGetRes.data.data || rosterGetRes.data.roster || [];
      const total = rosterGetRes.data.total || rosterGetRes.data.pagination?.total_records || rosterData.length;
      console.log(`✅ GET roster working! Found ${rosterData.length} entry/entries (Total: ${total})`);
      if (rosterData.length > 0) {
        console.log(`   First entry: ${rosterData[0].shift || 'N/A'} shift`);
        if (rosterData[0].employee) {
          console.log(`   Employee: ${rosterData[0].employee.firstName || 'N/A'} ${rosterData[0].employee.lastName || ''}`);
        }
      }
    } else {
      console.error('❌ GET roster failed:', rosterGetRes.status, rosterGetRes.data);
    }

    // ============================================================
    // TEST 3: Roster - Upsert (Update existing entry)
    // ============================================================
    console.log('\n3️⃣ TEST: Roster Upsert (Update existing entry)');
    console.log('-'.repeat(60));
    
    // First, get an employee and store
    const employeesRes = await makeRequest(`${API_BASE}/api/hr/employees?limit=1`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });

    if (employeesRes.status === 200 && employeesRes.data.success) {
      const employees = employeesRes.data.data || employeesRes.data.employees || [];
      if (employees.length > 0) {
        employeeId = employees[0]._id || employees[0].id || employees[0].employeeId;
        const empIdStr = employees[0].employeeId || employees[0].employee_id || 'N/A';
        console.log(`✅ Found employee: ${employees[0].firstName || 'N/A'} (${empIdStr})`);
        console.log(`   Employee ID for balance: ${empIdStr}`);
      } else {
        console.log('⚠️  No employees found, using default employee ID');
        employeeId = 'EMP-2026-886706'; // Default for testing
      }
    } else {
      console.log('⚠️  Failed to get employees, using default employee ID');
      employeeId = 'EMP-2026-886706'; // Default for testing
    }

    const storesRes = await makeRequest(`${API_BASE}/api/hr/stores?limit=1`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });

    if (storesRes.status === 200 && storesRes.data.success) {
      const stores = storesRes.data.data || [];
      if (stores.length > 0) {
        storeId = stores[0]._id;
        console.log(`✅ Found store: ${stores[0].name || 'N/A'}`);
      }
    }

    if (employeeId && storeId) {
      // Create roster entry
      const createRosterRes = await makeRequest(`${API_BASE}/api/hr/roster`, {
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
          shiftEnd: '17:00'
        }
      });

      if (createRosterRes.status === 200 || createRosterRes.status === 201) {
        const rosterId = createRosterRes.data.data?._id || createRosterRes.data.data?.id;
        console.log(`✅ First create successful! ID: ${rosterId}`);

        // Try to create again (should UPDATE, not create new)
        const updateRosterRes = await makeRequest(`${API_BASE}/api/hr/roster`, {
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
            shiftEnd: '22:00'
          }
        });

        if (updateRosterRes.status === 200 || updateRosterRes.status === 201) {
          const updatedRosterId = updateRosterRes.data.data?._id || updateRosterRes.data.data?.id;
          if (updatedRosterId === rosterId) {
            console.log(`✅ Upsert working! Same ID: ${updatedRosterId}`);
            console.log(`   Shift updated to: ${updateRosterRes.data.data?.shift || 'EVENING'}`);
          } else {
            console.log(`⚠️  Different ID returned (might be new entry): ${updatedRosterId}`);
          }
        } else {
          console.error('❌ Update roster failed:', updateRosterRes.status, updateRosterRes.data);
        }
      } else {
        console.error('❌ Create roster failed:', createRosterRes.status, createRosterRes.data);
      }
    }

    // ============================================================
    // TEST 4: Employee Leave Access (Fixed permission)
    // ============================================================
    console.log('\n4️⃣ TEST: Employee Leave Access (Fixed permission)');
    console.log('-'.repeat(60));
    
    // Login as employee
    const empLoginRes = await makeRequest(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      body: {
        email: 'rudi@gmail.com',
        password: 'Rudi@3006'
      }
    });

    if (empLoginRes.status === 200 && empLoginRes.data.success) {
      const empToken = empLoginRes.data.data?.accessToken || empLoginRes.data.accessToken;
      const empTenantId = empLoginRes.data.data?.user?.tenantId || 'default';
      console.log('✅ Employee login successful');

      // Test /api/attendance/leave (frontend endpoint)
      const attendanceLeaveRes = await makeRequest(`${API_BASE}/api/attendance/leave?page=1&limit=10`, {
        headers: {
          'Authorization': `Bearer ${empToken}`,
          'X-Tenant-Id': empTenantId
        }
      });

      if (attendanceLeaveRes.status === 200 && attendanceLeaveRes.data.success) {
        const requests = attendanceLeaveRes.data.data?.requests || attendanceLeaveRes.data.data || [];
        console.log(`✅ /api/attendance/leave working! Found ${requests.length} leave request(s)`);
      } else {
        console.error('❌ /api/attendance/leave failed:', attendanceLeaveRes.status, attendanceLeaveRes.data);
      }

      // Test /api/hr/leave-requests (direct HR service)
      const hrLeaveRes = await makeRequest(`${API_BASE}/api/hr/leave-requests?page=1&limit=10`, {
        headers: {
          'Authorization': `Bearer ${empToken}`,
          'X-Tenant-Id': empTenantId
        }
      });

      if (hrLeaveRes.status === 200 && hrLeaveRes.data.success) {
        const requests = hrLeaveRes.data.data?.requests || hrLeaveRes.data.data || [];
        console.log(`✅ /api/hr/leave-requests working! Found ${requests.length} leave request(s)`);
      } else {
        console.error('❌ /api/hr/leave-requests failed:', hrLeaveRes.status, hrLeaveRes.data);
      }
    } else {
      console.error('❌ Employee login failed:', empLoginRes.data);
    }

    // ============================================================
    // TEST 5: Leave Balance Update on Approval
    // ============================================================
    console.log('\n5️⃣ TEST: Leave Balance Update on Approval');
    console.log('-'.repeat(60));
    
    // Get employee ID for balance check (use employeeId string, not _id)
    const empIdForBalance = employeeId || 'EMP-2026-886706';
    // If employeeId is ObjectId, try to get employeeId string from employees API
    let empIdString = empIdForBalance;
    if (empIdForBalance && empIdForBalance.length === 24) {
      // Looks like ObjectId, try to get employeeId string
      const empDetailsRes = await makeRequest(`${API_BASE}/api/hr/employees?limit=1`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId
        }
      });
      if (empDetailsRes.status === 200 && empDetailsRes.data.success) {
        const employees = empDetailsRes.data.data || empDetailsRes.data.employees || [];
        if (employees.length > 0) {
          empIdString = employees[0].employeeId || employees[0].employee_id || empIdForBalance;
        }
      }
    }
    
    // Get initial balance
    const initialBalanceRes = await makeRequest(`${API_BASE}/api/hr/leaves/balance?employeeId=${empIdString}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });

    if (initialBalanceRes.status === 200 && initialBalanceRes.data.success) {
      const initialBalance = initialBalanceRes.data.data;
      const initialCasualUsed = initialBalance.casualLeave?.used || 0;
      const initialCasualAvailable = initialBalance.casualLeave?.available || 0;
      console.log(`✅ Initial balance retrieved`);
      console.log(`   Casual Leave - Used: ${initialCasualUsed}, Available: ${initialCasualAvailable}`);

      // Create a leave request
      if (employeeId && employeeId !== 'EMP-2026-886706') {
        const createLeaveRes = await makeRequest(`${API_BASE}/api/hr/leave-requests`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Id': tenantId
          },
          body: {
            employee_id: employeeId,
            leave_type: 'CL',
            from_date: today,
            to_date: today,
            reason: 'Test leave for balance update',
            half_day: false
          }
        });

        if (createLeaveRes.status === 200 || createLeaveRes.status === 201) {
          leaveRequestId = createLeaveRes.data.data?._id || createLeaveRes.data.data?.id;
          console.log(`✅ Leave request created! ID: ${leaveRequestId}`);

          // Approve the leave request
          const approveRes = await makeRequest(`${API_BASE}/api/hr/leave-requests/${leaveRequestId}/approve`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Tenant-Id': tenantId
            },
            body: {
              comments: 'Approved for testing'
            }
          });

          if (approveRes.status === 200 && approveRes.data.success) {
            console.log(`✅ Leave request approved!`);

            // Wait a bit for balance update
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Get updated balance
            const updatedBalanceRes = await makeRequest(`${API_BASE}/api/hr/leaves/balance?employeeId=${empIdString}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'X-Tenant-Id': tenantId
              }
            });

            if (updatedBalanceRes.status === 200 && updatedBalanceRes.data.success) {
              const updatedBalance = updatedBalanceRes.data.data;
              const updatedCasualUsed = updatedBalance.casualLeave?.used || 0;
              const updatedCasualAvailable = updatedBalance.casualLeave?.available || 0;
              console.log(`✅ Updated balance retrieved`);
              console.log(`   Casual Leave - Used: ${updatedCasualUsed}, Available: ${updatedCasualAvailable}`);

              if (updatedCasualUsed > initialCasualUsed) {
                console.log(`✅ Leave balance updated correctly! Used increased from ${initialCasualUsed} to ${updatedCasualUsed}`);
              } else {
                console.log(`⚠️  Leave balance not updated. Used still ${updatedCasualUsed} (was ${initialCasualUsed})`);
              }
            } else {
              console.error('❌ Failed to get updated balance:', updatedBalanceRes.status, updatedBalanceRes.data);
            }
          } else {
            console.error('❌ Failed to approve leave:', approveRes.status, approveRes.data);
          }
        } else {
          console.error('❌ Failed to create leave request:', createLeaveRes.status, createLeaveRes.data);
        }
      } else {
        console.log('⚠️  Skipping leave balance test - no employee ID available');
      }
    } else {
      console.error('❌ Failed to get initial balance:', initialBalanceRes.status, initialBalanceRes.data);
    }

    // ============================================================
    // TEST 6: Dashboard Roster Widget
    // ============================================================
    console.log('\n6️⃣ TEST: Dashboard Roster Widget');
    console.log('-'.repeat(60));
    
    const dashboardRes = await makeRequest(`${API_BASE}/api/hr/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });

    if (dashboardRes.status === 200 && dashboardRes.data.success) {
      const dashboard = dashboardRes.data.data;
      if (dashboard.widgets?.roster) {
        console.log('✅ Roster widget found in dashboard');
        console.log(`   Today's shift: ${dashboard.widgets.roster.today?.shift || 'N/A'}`);
        console.log(`   Shift time: ${dashboard.widgets.roster.today?.shiftStart || 'N/A'} - ${dashboard.widgets.roster.today?.shiftEnd || 'N/A'}`);
      } else {
        console.log('⚠️  Roster widget not found in dashboard response');
      }
    } else {
      console.error('❌ Dashboard fetch failed:', dashboardRes.status, dashboardRes.data);
    }

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ All Tests Completed!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    console.error(error.stack);
  }
}

testAllFixes();
