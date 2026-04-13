#!/usr/bin/env node

/**
 * Intensive Load Test for Open/Public Backend Services
 * Tests all public endpoints that don't require authentication
 * 
 * Usage:
 *   BASE_URL="http://..." node scripts/load-test-open-services.js
 *   BASE_URL="http://..." CONCURRENT=100 REQUESTS=10000 node scripts/load-test-open-services.js
 */

const BASE_URL = process.env.BACKEND_URL || process.env.BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';
const CONCURRENT = parseInt(process.env.CONCURRENT || '50', 10); // Concurrent requests
const TOTAL_REQUESTS = parseInt(process.env.REQUESTS || '5000', 10); // Total requests per endpoint
const DURATION = parseInt(process.env.DURATION || '60', 10); // Duration in seconds

// Open/Public endpoints (no authentication required)
const OPEN_ENDPOINTS = [
  // Health checks
  { method: 'GET', path: '/health', name: 'Root Health' },
  { method: 'GET', path: '/api/auth/health', name: 'Auth Health' },
  { method: 'GET', path: '/api/auth/status', name: 'Auth Status' },
  { method: 'GET', path: '/api/hr/health', name: 'HR Health' },
  { method: 'GET', path: '/api/hr/status', name: 'HR Status' },
  { method: 'GET', path: '/api/attendance/health', name: 'Attendance Health' },
  { method: 'GET', path: '/api/attendance/status', name: 'Attendance Status' },
  { method: 'GET', path: '/api/sales/health', name: 'Sales Health' },
  { method: 'GET', path: '/api/sales/status', name: 'Sales Status' },
  { method: 'GET', path: '/api/service/health', name: 'Service Management Health' },
  { method: 'GET', path: '/api/service/status', name: 'Service Management Status' },
  { method: 'GET', path: '/api/monitoring/health', name: 'Monitoring Health' },
  { method: 'GET', path: '/api/monitoring/status', name: 'Monitoring Status' },
  
  // Service info endpoints
  { method: 'GET', path: '/api/hr', name: 'HR Service Info' },
  { method: 'GET', path: '/', name: 'Gateway Info' },
  
  // Public auth endpoints (read-only, no side effects)
  // Note: We'll test login with invalid credentials to avoid creating sessions
];

// Statistics tracking
const stats = {
  total: 0,
  success: 0,
  errors: 0,
  timeouts: 0,
  statusCodes: {},
  responseTimes: [],
  errorsByEndpoint: {},
  startTime: null,
  endTime: null
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Make a single request
async function makeRequest(endpoint) {
  const url = `${BASE_URL}${endpoint.path}`;
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const responseTime = Date.now() - startTime;
    const statusCode = response.status;
    
    // Read response body (but don't parse large responses)
    try {
      await response.text();
    } catch (e) {
      // Ignore body read errors
    }
    
    return {
      success: response.ok || statusCode < 500,
      statusCode,
      responseTime,
      error: null
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    if (error.name === 'AbortError') {
      return {
        success: false,
        statusCode: 0,
        responseTime,
        error: 'TIMEOUT'
      };
    }
    
    return {
      success: false,
      statusCode: 0,
      responseTime,
      error: error.message || 'NETWORK_ERROR'
    };
  }
}

// Run load test for a single endpoint
async function loadTestEndpoint(endpoint) {
  const endpointStats = {
    name: endpoint.name,
    path: endpoint.path,
    total: 0,
    success: 0,
    errors: 0,
    timeouts: 0,
    statusCodes: {},
    responseTimes: [],
    errors: []
  };
  
  log(`\n📊 Testing: ${endpoint.name} (${endpoint.method} ${endpoint.path})`, 'cyan');
  log(`   Concurrent: ${CONCURRENT}, Total: ${TOTAL_REQUESTS}`, 'cyan');
  
  const startTime = Date.now();
  let completed = 0;
  const requestsPerWorker = Math.ceil(TOTAL_REQUESTS / CONCURRENT);
  
  // Create workers (concurrent requests)
  const workers = [];
  for (let i = 0; i < CONCURRENT; i++) {
    workers.push((async () => {
      for (let j = 0; j < requestsPerWorker && completed < TOTAL_REQUESTS; j++) {
        const result = await makeRequest(endpoint);
        
        endpointStats.total++;
        stats.total++;
        
        if (result.success) {
          endpointStats.success++;
          stats.success++;
        } else {
          endpointStats.errors++;
          stats.errors++;
          
          if (result.error === 'TIMEOUT') {
            endpointStats.timeouts++;
            stats.timeouts++;
          }
          
          if (result.error) {
            endpointStats.errors.push(result.error);
            if (!stats.errorsByEndpoint[endpoint.name]) {
              stats.errorsByEndpoint[endpoint.name] = [];
            }
            stats.errorsByEndpoint[endpoint.name].push(result.error);
          }
        }
        
        if (result.statusCode) {
          endpointStats.statusCodes[result.statusCode] = (endpointStats.statusCodes[result.statusCode] || 0) + 1;
          stats.statusCodes[result.statusCode] = (stats.statusCodes[result.statusCode] || 0) + 1;
        }
        
        endpointStats.responseTimes.push(result.responseTime);
        stats.responseTimes.push(result.responseTime);
        
        completed++;
        
        // Progress update every 10%
        if (completed % Math.max(1, Math.floor(TOTAL_REQUESTS / 10)) === 0) {
          const progress = ((completed / TOTAL_REQUESTS) * 100).toFixed(1);
          process.stdout.write(`\r   Progress: ${progress}% (${completed}/${TOTAL_REQUESTS})`);
        }
      }
    })());
  }
  
  await Promise.all(workers);
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  // Calculate statistics (optimized for large arrays)
  const times = endpointStats.responseTimes;
  const sortedTimes = times.length > 10000 
    ? times.slice().sort((a, b) => a - b) // Only sort if needed
    : [...times].sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;
  const sum = times.reduce((a, b) => a + b, 0);
  const avg = sum / times.length;
  const min = times.reduce((a, b) => Math.min(a, b), Infinity);
  const max = times.reduce((a, b) => Math.max(a, b), -Infinity);
  const rps = endpointStats.total / duration;
  const successRate = ((endpointStats.success / endpointStats.total) * 100).toFixed(2);
  
  log(`\n   ✅ Completed in ${duration.toFixed(2)}s`, 'green');
  log(`   📈 Requests/sec: ${rps.toFixed(2)}`, 'cyan');
  log(`   ✅ Success Rate: ${successRate}% (${endpointStats.success}/${endpointStats.total})`, endpointStats.success === endpointStats.total ? 'green' : 'yellow');
  
  if (endpointStats.errors > 0) {
    log(`   ❌ Errors: ${endpointStats.errors}`, 'red');
    if (endpointStats.timeouts > 0) {
      log(`   ⏱️  Timeouts: ${endpointStats.timeouts}`, 'yellow');
    }
  }
  
  log(`   ⏱️  Response Times:`, 'cyan');
  log(`      Min: ${min}ms, Max: ${max}ms, Avg: ${avg.toFixed(2)}ms`, 'cyan');
  log(`      P50: ${p50}ms, P95: ${p95}ms, P99: ${p99}ms`, 'cyan');
  
  if (Object.keys(endpointStats.statusCodes).length > 0) {
    log(`   📊 Status Codes:`, 'cyan');
    Object.entries(endpointStats.statusCodes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([code, count]) => {
        const color = code.startsWith('2') ? 'green' : code.startsWith('4') ? 'yellow' : 'red';
        log(`      ${code}: ${count}`, color);
      });
  }
  
  return endpointStats;
}

// Main load test function
async function runLoadTest() {
  log('\n🚀 Intensive Load Test - Open Services Only', 'bright');
  log('=====================================', 'bright');
  log(`Base URL: ${BASE_URL}`, 'cyan');
  log(`Concurrent Requests: ${CONCURRENT}`, 'cyan');
  log(`Total Requests per Endpoint: ${TOTAL_REQUESTS}`, 'cyan');
  log(`Total Endpoints: ${OPEN_ENDPOINTS.length}`, 'cyan');
  log(`Estimated Duration: ~${((TOTAL_REQUESTS * OPEN_ENDPOINTS.length) / CONCURRENT / 60).toFixed(1)} minutes`, 'cyan');
  log('=====================================\n', 'bright');
  
  stats.startTime = Date.now();
  
  const results = [];
  
  // Test each endpoint
  for (const endpoint of OPEN_ENDPOINTS) {
    try {
      const result = await loadTestEndpoint(endpoint);
      results.push(result);
    } catch (error) {
      log(`\n❌ Error testing ${endpoint.name}: ${error.message}`, 'red');
    }
  }
  
  stats.endTime = Date.now();
  const totalDuration = (stats.endTime - stats.startTime) / 1000;
  
  // Overall statistics
  log('\n\n📊 OVERALL STATISTICS', 'bright');
  log('=====================================', 'bright');
  log(`Total Duration: ${totalDuration.toFixed(2)}s (${(totalDuration / 60).toFixed(2)} minutes)`, 'cyan');
  log(`Total Requests: ${stats.total}`, 'cyan');
  log(`✅ Successful: ${stats.success} (${((stats.success / stats.total) * 100).toFixed(2)}%)`, stats.success === stats.total ? 'green' : 'yellow');
  log(`❌ Errors: ${stats.errors} (${((stats.errors / stats.total) * 100).toFixed(2)}%)`, stats.errors > 0 ? 'red' : 'green');
  
  if (stats.timeouts > 0) {
    log(`⏱️  Timeouts: ${stats.timeouts}`, 'yellow');
  }
  
  // Overall response time statistics (optimized for large arrays)
  if (stats.responseTimes.length > 0) {
    const times = stats.responseTimes;
    // Use efficient sorting for large arrays
    const sortedTimes = times.length > 10000
      ? times.slice().sort((a, b) => a - b)
      : [...times].sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;
    const sum = times.reduce((a, b) => a + b, 0);
    const avg = sum / times.length;
    const min = times.reduce((a, b) => Math.min(a, b), Infinity);
    const max = times.reduce((a, b) => Math.max(a, b), -Infinity);
    const overallRps = stats.total / totalDuration;
    
    log(`\n⏱️  Overall Response Times:`, 'cyan');
    log(`   Min: ${min}ms, Max: ${max}ms, Avg: ${avg.toFixed(2)}ms`, 'cyan');
    log(`   P50: ${p50}ms, P95: ${p95}ms, P99: ${p99}ms`, 'cyan');
    log(`\n📈 Overall Throughput: ${overallRps.toFixed(2)} requests/second`, 'cyan');
  }
  
  // Status code distribution
  if (Object.keys(stats.statusCodes).length > 0) {
    log(`\n📊 Status Code Distribution:`, 'cyan');
    Object.entries(stats.statusCodes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([code, count]) => {
        const percentage = ((count / stats.total) * 100).toFixed(2);
        const color = code.startsWith('2') ? 'green' : code.startsWith('4') ? 'yellow' : 'red';
        log(`   ${code}: ${count} (${percentage}%)`, color);
      });
  }
  
  // Error summary by endpoint
  if (Object.keys(stats.errorsByEndpoint).length > 0) {
    log(`\n❌ Errors by Endpoint:`, 'red');
    Object.entries(stats.errorsByEndpoint).forEach(([endpoint, errors]) => {
      const errorCounts = {};
      errors.forEach(err => {
        errorCounts[err] = (errorCounts[err] || 0) + 1;
      });
      log(`   ${endpoint}:`, 'yellow');
      Object.entries(errorCounts).forEach(([err, count]) => {
        log(`      ${err}: ${count}`, 'red');
      });
    });
  }
  
  // Per-endpoint summary
  log(`\n📋 Per-Endpoint Summary:`, 'bright');
  log('=====================================', 'bright');
  results.forEach(result => {
    const successRate = ((result.success / result.total) * 100).toFixed(1);
    const avgTime = result.responseTimes.reduce((a, b) => a + b, 0) / result.responseTimes.length;
    const color = result.success === result.total ? 'green' : result.success > result.total * 0.9 ? 'yellow' : 'red';
    log(`${result.name}:`, 'cyan');
    log(`   Success: ${successRate}% | Avg Time: ${avgTime.toFixed(2)}ms | Total: ${result.total}`, color);
  });
  
  log('\n✅ Load test completed!', 'green');
  log('=====================================\n', 'bright');
}

// Run the load test
runLoadTest().catch(error => {
  log(`\n❌ Fatal Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
