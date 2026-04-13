/**
 * Test Sales System with Aditya's Account - Debug Version
 * Shows detailed response for troubleshooting
 */

require('dotenv').config();
const https = require('https');
const http = require('http');
const { URL } = require('url');

const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';
const EMAIL = 'Aditya@gmail.com';
const PASSWORD = 'yrv0s48mA1!';
const TENANT_ID = 'eyekra';

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function apiCall(method, endpoint, data = null, token = null, tenantId = TENANT_ID) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(`${API_BASE}${endpoint}`);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const postData = data ? JSON.stringify(data) : null;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenantId
        },
        timeout: 10000
      };

      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }

      if (postData) {
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = client.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const result = JSON.parse(responseData);
            resolve({
              success: res.statusCode >= 200 && res.statusCode < 300 && result.success !== false,
              data: result,
              status: res.statusCode,
              raw: responseData
            });
          } catch (parseError) {
            resolve({
              success: false,
              error: 'Failed to parse response',
              status: res.statusCode,
              raw: responseData
            });
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          error: error.message,
          status: 0
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          error: 'Request timeout',
          status: 0
        });
      });

      if (postData) {
        req.write(postData);
      }

      req.end();
    } catch (error) {
      resolve({
        success: false,
        error: error.message,
        status: 0
      });
    }
  });
}

async function main() {
  try {
    log('\n🚀 Testing Sales System with Aditya\'s Account', 'cyan');
    log('='.repeat(60), 'cyan');
    log(`\n📋 Credentials:`, 'yellow');
    log(`   Email: ${EMAIL}`, 'blue');
    log(`   Tenant: ${TENANT_ID}`, 'blue');
    log(`   API Base: ${API_BASE}`, 'blue');
    log('');

    // Step 1: Login
    log('🔐 Step 1: Logging in...', 'yellow');
    
    // Try with tenant in header
    let loginResult = await apiCall('POST', '/api/auth/login', {
      email: EMAIL,
      password: PASSWORD
    });

    if (!loginResult.success && loginResult.status === 0) {
      log(`   ⚠️  Connection issue: ${loginResult.error}`, 'yellow');
      log(`   Trying with tenantId in body...`, 'yellow');
      
      // Try with tenantId in body
      loginResult = await apiCall('POST', '/api/auth/login', {
        email: EMAIL,
        password: PASSWORD,
        tenantId: TENANT_ID
      }, null, ''); // No tenant in header
    }

    if (!loginResult.success) {
      log(`   ❌ Login Failed`, 'red');
      log(`   Status: ${loginResult.status}`, 'red');
      log(`   Error: ${loginResult.error || JSON.stringify(loginResult.data)}`, 'red');
      if (loginResult.raw) {
        log(`   Raw Response: ${loginResult.raw}`, 'red');
      }
      process.exit(1);
    }

    const token = loginResult.data?.data?.accessToken || loginResult.data?.data?.token || loginResult.data?.accessToken || loginResult.data?.token;
    const user = loginResult.data?.data?.user || loginResult.data?.user;

    if (!token) {
      log(`   ❌ No token in response`, 'red');
      log(`   Response: ${JSON.stringify(loginResult.data, null, 2)}`, 'red');
      process.exit(1);
    }

    log(`   ✅ Login successful`, 'green');
    log(`   User: ${user?.name || user?.fullName || EMAIL}`, 'blue');
    log(`   Employee ID: ${user?.employeeId || user?.employee_id || 'N/A'}`, 'blue');
    log(`   Store: ${user?.store?.name || user?.store || 'N/A'}`, 'blue');
    log(`   Token: ${token.substring(0, 50)}...`, 'blue');
    log('');

    const storeId = user?.store?._id || user?.store?.id || user?.store || 'store_id_here';

    // Step 2: Check clock-in status
    log('⏰ Step 2: Checking clock-in status...', 'yellow');
    const attendanceResult = await apiCall('GET', '/api/attendance/today', null, token);
    
    if (attendanceResult.success && attendanceResult.data.data) {
      const attendance = attendanceResult.data.data;
      if (attendance.checkIn && !attendance.checkOut) {
        log(`   ✅ Already clocked in`, 'green');
        log(`   Check-in time: ${attendance.checkIn.time}`, 'blue');
      } else if (attendance.checkOut) {
        log(`   ⚠️  Already clocked out`, 'yellow');
      } else {
        log(`   ℹ️  Not clocked in`, 'cyan');
      }
    } else {
      log(`   ℹ️  No attendance record found`, 'cyan');
    }
    log('');

    // Step 3: Clock in
    log('⏰ Step 3: Clocking in...', 'yellow');
    const clockInResult = await apiCall('POST', '/api/attendance/clock-in', {
      latitude: 19.0760,
      longitude: 72.8777,
      notes: 'Test sales system'
    }, token);

    if (clockInResult.success) {
      log(`   ✅ Clocked in successfully`, 'green');
    } else {
      log(`   ⚠️  Clock-in: ${clockInResult.error || JSON.stringify(clockInResult.data)}`, 'yellow');
    }
    log('');

    // Step 4: Add sales entry
    log('💰 Step 4: Adding sales entry...', 'yellow');
    const salesResult = await apiCall('POST', '/api/sales/daily-entry', {
      customer_name: 'Test Customer',
      customer_phone: `+91${Math.floor(Math.random() * 10000000000)}`,
      items: [
        {
          product_name: 'Test Product 1',
          quantity: 2,
          unit_price: 5000,
          discount_percentage: 10,
          tax_rate: 18
        }
      ],
      store_id: storeId,
      payment_method: 'CASH',
      notes: 'Test sales entry'
    }, token);

    if (salesResult.success) {
      log(`   ✅ Sales entry created`, 'green');
      const order = salesResult.data.data;
      log(`   Order: ${order.order_number}`, 'blue');
      log(`   Amount: ₹${order.total_amount.toLocaleString('en-IN')}`, 'blue');
    } else {
      log(`   ❌ Sales entry failed: ${salesResult.error || JSON.stringify(salesResult.data)}`, 'red');
    }
    log('');

    // Step 5: Get today sales
    log('📊 Step 5: Getting today sales...', 'yellow');
    const todaySalesResult = await apiCall('GET', '/api/sales/employee/today', null, token);

    if (todaySalesResult.success) {
      const sales = todaySalesResult.data.data;
      log(`   ✅ Today sales retrieved`, 'green');
      log(`   Total Sales: ₹${sales.totalSales.toLocaleString('en-IN')}`, 'blue');
      log(`   Orders: ${sales.totalOrders}`, 'blue');
      log(`   Items: ${sales.totalItems}`, 'blue');
    } else {
      log(`   ❌ Failed: ${todaySalesResult.error || JSON.stringify(todaySalesResult.data)}`, 'red');
    }
    log('');

    // Step 6: End day
    log('🏁 Step 6: Ending day...', 'yellow');
    const endDayResult = await apiCall('POST', '/api/sales/employee/end-day', null, token);

    if (endDayResult.success) {
      log(`   ✅ Day ended`, 'green');
      const summary = endDayResult.data.data.summary;
      log(`   ${summary.message}`, 'blue');
    } else {
      log(`   ❌ Failed: ${endDayResult.error || JSON.stringify(endDayResult.data)}`, 'red');
    }
    log('');

    // Step 7: Clock out
    log('⏰ Step 7: Clocking out...', 'yellow');
    const clockOutResult = await apiCall('POST', '/api/attendance/clock-out', {
      latitude: 19.0760,
      longitude: 72.8777,
      notes: 'End of day clock-out'
    }, token);

    if (clockOutResult.success) {
      log(`   ✅ Clocked out successfully`, 'green');
      log(`   ⚠️  Sales auto-calculated in background`, 'cyan');
    } else {
      log(`   ❌ Failed: ${clockOutResult.error || JSON.stringify(clockOutResult.data)}`, 'red');
    }
    log('');

    log('✅ All tests completed!', 'green');
    log('='.repeat(60), 'cyan');

  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
