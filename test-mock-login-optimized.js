/**
 * Test Mock Login Endpoint - Optimized Version
 * Tests the optimized mock login endpoint to verify 408 timeout is fixed
 */

const https = require('https');

const AUTH_URL = 'https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net';

function testMockLogin(role = 'hr', requestNumber = 1) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const data = JSON.stringify({ role });
    
    const options = {
      hostname: 'etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net',
      port: 443,
      path: '/api/auth/mock-login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      },
      rejectUnauthorized: false,
      timeout: 15000 // 15 second timeout
    };

    console.log(`\n[Request ${requestNumber}] Testing Mock Login...`);
    console.log(`Role: ${role}`);
    console.log(`URL: ${AUTH_URL}/api/auth/mock-login`);

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response Time: ${responseTime}s`);
        
        try {
          const json = JSON.parse(responseData);
          
          if (res.statusCode === 200 && json.success) {
            console.log('✅ SUCCESS!');
            console.log(`User: ${json.data.user.name} (${json.data.user.email})`);
            console.log(`Role: ${json.data.user.role}`);
            console.log(`Token Length: ${json.data.accessToken.length} chars`);
            console.log(`Response Time: ${responseTime}s`);
            
            resolve({
              success: true,
              statusCode: res.statusCode,
              responseTime: parseFloat(responseTime),
              data: json
            });
          } else {
            console.log('❌ FAILED');
            console.log('Response:', JSON.stringify(json, null, 2));
            reject(new Error(`HTTP ${res.statusCode}: ${json.message || 'Unknown error'}`));
          }
        } catch (e) {
          console.log('❌ Invalid JSON response');
          console.log('Raw response:', responseData.substring(0, 200));
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', (error) => {
      const endTime = Date.now();
      const responseTime = ((endTime - startTime) / 1000).toFixed(2);
      console.log(`❌ Request Error: ${error.message}`);
      console.log(`Response Time: ${responseTime}s`);
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      const endTime = Date.now();
      const responseTime = ((endTime - startTime) / 1000).toFixed(2);
      console.log(`❌ Request Timeout (15s)`);
      console.log(`Response Time: ${responseTime}s`);
      reject(new Error('Request timeout'));
    });

    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     Mock Login Endpoint Test - Optimized Version        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  const results = [];
  const roles = ['hr', 'admin', 'manager', 'employee'];

  // Test different roles
  console.log('\n=== Testing Different Roles ===');
  for (const role of roles) {
    try {
      const result = await testMockLogin(role, results.length + 1);
      results.push({ role, ...result });
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between requests
    } catch (error) {
      results.push({ role, success: false, error: error.message });
    }
  }

  // Test multiple requests for same role (cache test)
  console.log('\n=== Testing Cache Performance (5 requests) ===');
  const cacheResults = [];
  for (let i = 1; i <= 5; i++) {
    try {
      const result = await testMockLogin('hr', i);
      cacheResults.push(result.responseTime);
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      cacheResults.push(null);
    }
  }

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                    Test Summary                           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  
  console.log('\n=== Role Tests ===');
  results.forEach(r => {
    if (r.success) {
      console.log(`✅ ${r.role}: ${r.responseTime}s (Status: ${r.statusCode})`);
    } else {
      console.log(`❌ ${r.role}: ${r.error || 'Failed'}`);
    }
  });

  if (cacheResults.length > 0) {
    console.log('\n=== Cache Performance ===');
    const validTimes = cacheResults.filter(t => t !== null);
    if (validTimes.length > 0) {
      const avgTime = (validTimes.reduce((a, b) => a + b, 0) / validTimes.length).toFixed(2);
      const minTime = Math.min(...validTimes).toFixed(2);
      const maxTime = Math.max(...validTimes).toFixed(2);
      console.log(`Average: ${avgTime}s`);
      console.log(`Min: ${minTime}s`);
      console.log(`Max: ${maxTime}s`);
      console.log(`Requests: ${validTimes.length}/5`);
    }
  }

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`\n✅ Success Rate: ${successCount}/${totalCount} (${((successCount/totalCount)*100).toFixed(0)}%)`);
  
  const allTimes = results.filter(r => r.success).map(r => r.responseTime);
  if (allTimes.length > 0) {
    const avgTime = (allTimes.reduce((a, b) => a + b, 0) / allTimes.length).toFixed(2);
    console.log(`⏱️  Average Response Time: ${avgTime}s`);
    
    if (avgTime < 3) {
      console.log('✅ Performance: EXCELLENT (<3s)');
    } else if (avgTime < 5) {
      console.log('✅ Performance: GOOD (<5s)');
    } else if (avgTime < 10) {
      console.log('⚠️  Performance: ACCEPTABLE (<10s)');
    } else {
      console.log('❌ Performance: NEEDS IMPROVEMENT (>10s)');
    }
  }

  console.log('\n✅ Test completed!');
}

runTests().catch(console.error);

