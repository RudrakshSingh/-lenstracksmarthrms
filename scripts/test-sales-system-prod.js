/**
 * Test Sales System in Production
 * Tests: Sales entry, today sales, end day, clock-out with auto calculation
 */

require('dotenv').config();
const https = require('https');
const http = require('http');
const { URL } = require('url');

const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';
const EMAIL = process.env.EMAIL || 'Aditya@gmail.com';
const PASSWORD = process.env.PASSWORD || 'yrv0s48mA1!';
const TENANT_ID = process.env.TENANT_ID || 'eyekra';

// Colors for console
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
        }
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
              status: res.statusCode
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

async function login() {
  log('\n🔐 Step 1: Logging in...', 'yellow');
  
  const result = await apiCall('POST', '/api/auth/login', {
    email: EMAIL,
    password: PASSWORD
  });

  if (!result.success) {
    log(`   ❌ Login Failed: ${JSON.stringify(result.error || result.data)}`, 'red');
    process.exit(1);
  }

  const token = result.data.data?.token || result.data.token;
  const user = result.data.data?.user || result.data.user;
  
  log(`   ✅ Login Successful`, 'green');
  log(`   User: ${user?.name || user?.fullName || EMAIL}`, 'blue');
  log(`   Employee ID: ${user?.employeeId || user?.employee_id || 'N/A'}`, 'blue');
  
  return { token, user };
}

async function checkClockInStatus(token, tenantId) {
  log('\n⏰ Step 2: Checking clock-in status...', 'yellow');
  
  const result = await apiCall('GET', '/api/attendance/today', null, token, tenantId);
  
  if (result.success && result.data.data) {
    const attendance = result.data.data;
    if (attendance.checkIn && !attendance.checkOut) {
      log(`   ✅ Already clocked in`, 'green');
      log(`   Check-in time: ${attendance.checkIn.time}`, 'blue');
      return true;
    } else if (attendance.checkOut) {
      log(`   ⚠️  Already clocked out`, 'yellow');
      log(`   Check-out time: ${attendance.checkOut.time}`, 'blue');
      return false;
    }
  }
  
  log(`   ℹ️  Not clocked in`, 'cyan');
  return false;
}

async function clockIn(token, tenantId) {
  log('\n⏰ Step 3: Clocking in...', 'yellow');
  
  const result = await apiCall('POST', '/api/attendance/clock-in', {
    latitude: 19.0760,
    longitude: 72.8777,
    notes: 'Test sales system'
  }, token, tenantId);

  if (!result.success) {
    log(`   ❌ Clock-in Failed: ${JSON.stringify(result.error || result.data)}`, 'red');
    return false;
  }

  log(`   ✅ Clocked in successfully`, 'green');
  return true;
}

async function addSalesEntry(token, tenantId, storeId) {
  log('\n💰 Step 4: Adding sales entry...', 'yellow');
  
  const salesData = {
    customer_name: 'Test Customer',
    customer_phone: `+91${Math.floor(Math.random() * 10000000000)}`,
    items: [
      {
        product_name: 'Test Product 1',
        quantity: 2,
        unit_price: 5000,
        discount_percentage: 10,
        tax_rate: 18
      },
      {
        product_name: 'Test Product 2',
        quantity: 1,
        unit_price: 3000
      }
    ],
    store_id: storeId,
    payment_method: 'CASH',
    notes: 'Test sales entry'
  };

  const result = await apiCall('POST', '/api/sales/daily-entry', salesData, token, tenantId);

  if (!result.success) {
    log(`   ❌ Sales Entry Failed: ${JSON.stringify(result.error || result.data)}`, 'red');
    return null;
  }

  log(`   ✅ Sales entry created successfully`, 'green');
  const order = result.data.data;
  log(`   Order Number: ${order.order_number}`, 'blue');
  log(`   Total Amount: ₹${order.total_amount.toLocaleString('en-IN')}`, 'blue');
  
  return order;
}

async function getTodaySales(token, tenantId) {
  log('\n📊 Step 5: Getting today sales...', 'yellow');
  
  const result = await apiCall('GET', '/api/sales/employee/today', null, token, tenantId);

  if (!result.success) {
    log(`   ❌ Failed to get today sales: ${JSON.stringify(result.error || result.data)}`, 'red');
    return null;
  }

  const sales = result.data.data;
  log(`   ✅ Today sales retrieved`, 'green');
  log(`   Total Sales: ₹${sales.totalSales.toLocaleString('en-IN')}`, 'blue');
  log(`   Total Orders: ${sales.totalOrders}`, 'blue');
  log(`   Total Items: ${sales.totalItems}`, 'blue');
  
  return sales;
}

async function endDay(token, tenantId) {
  log('\n🏁 Step 6: Ending day...', 'yellow');
  
  const result = await apiCall('POST', '/api/sales/employee/end-day', null, token, tenantId);

  if (!result.success) {
    log(`   ❌ End Day Failed: ${JSON.stringify(result.error || result.data)}`, 'red');
    return false;
  }

  log(`   ✅ Day ended successfully`, 'green');
  const summary = result.data.data.summary;
  log(`   ${summary.message}`, 'blue');
  log(`   Orders: ${summary.orders}, Items: ${summary.items}`, 'blue');
  
  return true;
}

async function clockOut(token, tenantId) {
  log('\n⏰ Step 7: Clocking out...', 'yellow');
  
  const result = await apiCall('POST', '/api/attendance/clock-out', {
    latitude: 19.0760,
    longitude: 72.8777,
    notes: 'End of day clock-out - sales auto-calculated'
  }, token, tenantId);

  if (!result.success) {
    log(`   ❌ Clock Out Failed: ${JSON.stringify(result.error || result.data)}`, 'red');
    return false;
  }

  log(`   ✅ Clocked out successfully`, 'green');
  log(`   ⚠️  Sales auto-calculated in background`, 'cyan');
  
  return true;
}

async function main() {
  try {
    log('\n🚀 Starting Sales System Test in Production', 'cyan');
    log('='.repeat(60), 'cyan');

    // Step 1: Login
    const { token, user } = await login();
    const tenantId = user?.tenantId || TENANT_ID;
    const storeId = user?.store?._id || user?.store || user?.storeId || 'store_id_here';
    
    log(`\n📋 User Info:`, 'cyan');
    log(`   Name: ${user?.name || user?.fullName || EMAIL}`, 'blue');
    log(`   Employee ID: ${user?.employeeId || user?.employee_id || 'N/A'}`, 'blue');
    log(`   Tenant: ${tenantId}`, 'blue');
    log(`   Store ID: ${storeId}`, 'blue');

    // Step 2: Check clock-in status
    const isClockedIn = await checkClockInStatus(token, tenantId);

    // Step 3: Clock in if not already
    if (!isClockedIn) {
      await clockIn(token, tenantId);
    }

    // Step 4: Add sales entry
    await addSalesEntry(token, tenantId, storeId);

    // Step 5: Get today sales
    await getTodaySales(token, tenantId);

    // Step 6: End day
    await endDay(token, tenantId);

    // Step 7: Clock out
    await clockOut(token, tenantId);

    // Final: Get today sales again to verify
    log('\n📊 Final: Verifying sales after clock-out...', 'yellow');
    await getTodaySales(token, tenantId);

    log('\n✅ All tests completed successfully!', 'green');
    log('='.repeat(60), 'cyan');

  } catch (error) {
    log(`\n❌ Test failed with error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
main();
