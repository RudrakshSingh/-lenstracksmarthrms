/**
 * Create 4 Sales Entries for Aditya
 * Amounts: 2000, 12000, 45000, and one more (let's make it 5000)
 */

require('dotenv').config();
const https = require('https');
const http = require('http');
const { URL } = require('url');

const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';
const EMAIL = 'Aditya@gmail.com';
const PASSWORD = 'yrv0s48mA1!';
const TENANT_ID = 'eyekra';

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
        timeout: 15000
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
    log('\n💰 Creating Sales Entries for Aditya', 'cyan');
    log('='.repeat(60), 'cyan');

    // Step 1: Login
    log('\n🔐 Step 1: Logging in...', 'yellow');
    const loginResult = await apiCall('POST', '/api/auth/login', {
      email: EMAIL,
      password: PASSWORD
    });

    if (!loginResult.success) {
      log(`   ❌ Login Failed: ${loginResult.error || JSON.stringify(loginResult.data)}`, 'red');
      process.exit(1);
    }

    const token = loginResult.data?.data?.accessToken || loginResult.data?.accessToken || loginResult.data?.token;
    const user = loginResult.data?.data?.user || loginResult.data?.user;

    if (!token) {
      log(`   ❌ No token in response`, 'red');
      process.exit(1);
    }

    log(`   ✅ Login successful`, 'green');
    log(`   User: ${user?.name || user?.fullName || EMAIL}`, 'blue');
    log(`   Employee ID: ${user?.employeeId || user?.employee_id || 'N/A'}`, 'blue');
    
    const storeId = user?.store?._id || user?.store?.id || user?.store || '69a69035052d22973bc34935';

    // Step 2: Create 4 sales entries
    const salesAmounts = [2000, 12000, 45000, 5000];
    const salesEntries = [];

    for (let i = 0; i < salesAmounts.length; i++) {
      const amount = salesAmounts[i];
      log(`\n💰 Step ${i + 2}: Creating sales entry ₹${amount.toLocaleString('en-IN')}...`, 'yellow');

      const salesData = {
        customer_name: `Customer ${i + 1}`,
        customer_phone: `+91${Math.floor(9000000000 + Math.random() * 1000000000)}`,
        items: [
          {
            product_name: `Product for ₹${amount}`,
            quantity: 1,
            unit_price: amount,
            discount_percentage: 0,
            tax_rate: 0
          }
        ],
        store_id: storeId,
        payment_method: 'CASH',
        notes: `Test sales entry ${i + 1} - Amount: ₹${amount}`
      };

      const salesResult = await apiCall('POST', '/api/sales/daily-entry', salesData, token);

      if (salesResult.success) {
        log(`   ✅ Sales entry created`, 'green');
        const order = salesResult.data.data;
        log(`   Order: ${order.order_number}`, 'blue');
        log(`   Amount: ₹${order.total_amount.toLocaleString('en-IN')}`, 'blue');
        salesEntries.push(order);
      } else {
        log(`   ❌ Failed: ${salesResult.error || JSON.stringify(salesResult.data)}`, 'red');
      }

      // Small delay between entries
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Step 3: Get today sales summary
    log(`\n📊 Step 6: Getting today sales summary...`, 'yellow');
    const todaySalesResult = await apiCall('GET', '/api/sales/employee/today', null, token);

    if (todaySalesResult.success) {
      const sales = todaySalesResult.data.data;
      log(`   ✅ Today sales retrieved`, 'green');
      log(`   Total Sales: ₹${sales.totalSales.toLocaleString('en-IN')}`, 'blue');
      log(`   Total Orders: ${sales.totalOrders}`, 'blue');
      log(`   Total Items: ${sales.totalItems}`, 'blue');
    } else {
      log(`   ⚠️  Failed: ${todaySalesResult.error || JSON.stringify(todaySalesResult.data)}`, 'yellow');
    }

    log('\n✅ All sales entries created!', 'green');
    log('='.repeat(60), 'cyan');
    log(`\n📋 Summary:`, 'cyan');
    log(`   Created: ${salesEntries.length} sales entries`, 'blue');
    log(`   Total Amount: ₹${salesEntries.reduce((sum, order) => sum + (order.total_amount || 0), 0).toLocaleString('en-IN')}`, 'blue');

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
