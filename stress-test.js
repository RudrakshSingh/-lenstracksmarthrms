#!/usr/bin/env node

/**
 * Comprehensive Stress Test for Etelios Backend API Gateway
 * Tests performance, reliability, and scalability under load
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  // Base URL - can be overridden via environment variable
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
  
  // Test scenarios
  SCENARIOS: [
    {
      name: 'Light Load',
      concurrent: 10,
      requests: 100,
      duration: 10 // seconds
    },
    {
      name: 'Medium Load',
      concurrent: 50,
      requests: 500,
      duration: 30
    },
    {
      name: 'Heavy Load',
      concurrent: 100,
      requests: 1000,
      duration: 60
    },
    {
      name: 'Stress Test',
      concurrent: 200,
      requests: 2000,
      duration: 120
    }
  ],
  
  // Endpoints to test
  ENDPOINTS: [
    { path: '/health', method: 'GET', name: 'Health Check' },
    { path: '/', method: 'GET', name: 'Root Endpoint' },
    { path: '/api', method: 'GET', name: 'API Info' },
    { path: '/api/auth/status', method: 'GET', name: 'Auth Status' },
    { path: '/api/hr/status', method: 'GET', name: 'HR Status' }
  ],
  
  // Request timeout (ms)
  TIMEOUT: 30000,
  
  // Results storage
  results: []
};

// Statistics tracking
class Stats {
  constructor() {
    this.reset();
  }
  
  reset() {
    this.total = 0;
    this.success = 0;
    this.errors = 0;
    this.timeouts = 0;
    this.responseTimes = [];
    this.statusCodes = {};
    this.errorsByType = {};
    this.startTime = null;
    this.endTime = null;
  }
  
  record(responseTime, statusCode, error = null) {
    this.total++;
    this.responseTimes.push(responseTime);
    
    if (error) {
      this.errors++;
      const errorType = error.code || error.message || 'Unknown';
      this.errorsByType[errorType] = (this.errorsByType[errorType] || 0) + 1;
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        this.timeouts++;
      }
    } else {
      this.success++;
      this.statusCodes[statusCode] = (this.statusCodes[statusCode] || 0) + 1;
    }
  }
  
  getStats() {
    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const len = sorted.length;
    
    return {
      total: this.total,
      success: this.success,
      errors: this.errors,
      timeouts: this.timeouts,
      successRate: ((this.success / this.total) * 100).toFixed(2) + '%',
      errorRate: ((this.errors / this.total) * 100).toFixed(2) + '%',
      avgResponseTime: len > 0 ? (this.responseTimes.reduce((a, b) => a + b, 0) / len).toFixed(2) + 'ms' : 'N/A',
      minResponseTime: len > 0 ? sorted[0].toFixed(2) + 'ms' : 'N/A',
      maxResponseTime: len > 0 ? sorted[len - 1].toFixed(2) + 'ms' : 'N/A',
      p50: len > 0 ? sorted[Math.floor(len * 0.5)].toFixed(2) + 'ms' : 'N/A',
      p95: len > 0 ? sorted[Math.floor(len * 0.95)].toFixed(2) + 'ms' : 'N/A',
      p99: len > 0 ? sorted[Math.floor(len * 0.99)].toFixed(2) + 'ms' : 'N/A',
      statusCodes: this.statusCodes,
      errorsByType: this.errorsByType,
      duration: this.endTime && this.startTime 
        ? ((this.endTime - this.startTime) / 1000).toFixed(2) + 's' 
        : 'N/A',
      requestsPerSecond: this.endTime && this.startTime && ((this.endTime - this.startTime) / 1000) > 0
        ? (this.total / ((this.endTime - this.startTime) / 1000)).toFixed(2)
        : 'N/A'
    };
  }
}

// Make a single request
async function makeRequest(endpoint, stats) {
  const startTime = performance.now();
  
  try {
    const response = await axios({
      method: endpoint.method,
      url: `${CONFIG.BASE_URL}${endpoint.path}`,
      timeout: CONFIG.TIMEOUT,
      validateStatus: () => true // Don't throw on any status code
    });
    
    const responseTime = performance.now() - startTime;
    stats.record(responseTime, response.status);
    
    return { success: true, status: response.status, responseTime };
  } catch (error) {
    const responseTime = performance.now() - startTime;
    stats.record(responseTime, null, error);
    
    return { success: false, error: error.message, responseTime };
  }
}

// Run concurrent requests
async function runConcurrentRequests(endpoint, concurrent, totalRequests) {
  const stats = new Stats();
  stats.startTime = performance.now();
  
  const requests = [];
  let completed = 0;
  
  // Create a pool of concurrent requests
  async function worker() {
    while (completed < totalRequests) {
      if (completed >= totalRequests) break;
      
      const current = completed++;
      if (current >= totalRequests) break;
      
      await makeRequest(endpoint, stats);
    }
  }
  
  // Start concurrent workers
  const workers = Array(concurrent).fill().map(() => worker());
  await Promise.all(workers);
  
  stats.endTime = performance.now();
  return stats;
}

// Run a test scenario
async function runScenario(scenario, endpoint) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 Testing: ${endpoint.name} (${endpoint.method} ${endpoint.path})`);
  console.log(`📊 Scenario: ${scenario.name}`);
  console.log(`   - Concurrent: ${scenario.concurrent}`);
  console.log(`   - Total Requests: ${scenario.requests}`);
  console.log(`   - Duration: ${scenario.duration}s`);
  console.log(`${'='.repeat(80)}\n`);
  
  const stats = await runConcurrentRequests(endpoint, scenario.concurrent, scenario.requests);
  const results = stats.getStats();
  
  // Display results
  console.log(`✅ Results for ${endpoint.name}:`);
  console.log(`   Total Requests: ${results.total}`);
  console.log(`   Success: ${results.success} (${results.successRate})`);
  console.log(`   Errors: ${results.errors} (${results.errorRate})`);
  console.log(`   Timeouts: ${results.timeouts}`);
  console.log(`   Duration: ${results.duration}`);
  console.log(`   Requests/sec: ${results.requestsPerSecond}`);
  console.log(`\n   Response Times:`);
  console.log(`   - Average: ${results.avgResponseTime}`);
  console.log(`   - Min: ${results.minResponseTime}`);
  console.log(`   - Max: ${results.maxResponseTime}`);
  console.log(`   - P50: ${results.p50}`);
  console.log(`   - P95: ${results.p95}`);
  console.log(`   - P99: ${results.p99}`);
  
  if (Object.keys(results.statusCodes).length > 0) {
    console.log(`\n   Status Codes:`);
    Object.entries(results.statusCodes).forEach(([code, count]) => {
      console.log(`   - ${code}: ${count}`);
    });
  }
  
  if (Object.keys(results.errorsByType).length > 0) {
    console.log(`\n   Errors:`);
    Object.entries(results.errorsByType).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });
  }
  
  return {
    endpoint: endpoint.name,
    scenario: scenario.name,
    ...results
  };
}

// Run all tests
async function runAllTests() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 Etelios Backend Stress Test`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Base URL: ${CONFIG.BASE_URL}`);
  console.log(`Test Time: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(80)}\n`);
  
  // First, verify the server is accessible
  try {
    console.log('🔍 Verifying server accessibility...');
    const healthCheck = await axios.get(`${CONFIG.BASE_URL}/health`, { timeout: 5000 });
    console.log(`✅ Server is accessible (Status: ${healthCheck.status})\n`);
  } catch (error) {
    console.error(`❌ Server is not accessible: ${error.message}`);
    console.error(`   Make sure the server is running at ${CONFIG.BASE_URL}`);
    process.exit(1);
  }
  
  const allResults = [];
  
  // Run each scenario on each endpoint
  for (const scenario of CONFIG.SCENARIOS) {
    for (const endpoint of CONFIG.ENDPOINTS) {
      try {
        const result = await runScenario(scenario, endpoint);
        allResults.push(result);
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Error running test: ${error.message}`);
      }
    }
  }
  
  // Generate summary report
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 STRESS TEST SUMMARY`);
  console.log(`${'='.repeat(80)}\n`);
  
  // Group by scenario
  const byScenario = {};
  allResults.forEach(result => {
    if (!byScenario[result.scenario]) {
      byScenario[result.scenario] = [];
    }
    byScenario[result.scenario].push(result);
  });
  
  Object.entries(byScenario).forEach(([scenario, results]) => {
    console.log(`\n📈 ${scenario}:`);
    console.log(`${'-'.repeat(80)}`);
    
    results.forEach(result => {
      const status = parseFloat(result.successRate) >= 95 ? '✅' : 
                     parseFloat(result.successRate) >= 80 ? '⚠️' : '❌';
      console.log(`${status} ${result.endpoint.padEnd(20)} | ` +
                  `Success: ${result.successRate.padStart(6)} | ` +
                  `Avg: ${result.avgResponseTime.padStart(10)} | ` +
                  `P95: ${result.p95.padStart(10)} | ` +
                  `RPS: ${result.requestsPerSecond.padStart(8)}`);
    });
  });
  
  // Overall statistics
  const totalRequests = allResults.reduce((sum, r) => sum + r.total, 0);
  const totalSuccess = allResults.reduce((sum, r) => sum + r.success, 0);
  const totalErrors = allResults.reduce((sum, r) => sum + r.errors, 0);
  const avgResponseTime = allResults.reduce((sum, r) => {
    const avg = parseFloat(r.avgResponseTime);
    return sum + (isNaN(avg) ? 0 : avg);
  }, 0) / allResults.length;
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 OVERALL STATISTICS`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Total Success: ${totalSuccess} (${((totalSuccess / totalRequests) * 100).toFixed(2)}%)`);
  console.log(`Total Errors: ${totalErrors} (${((totalErrors / totalRequests) * 100).toFixed(2)}%)`);
  console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`${'='.repeat(80)}\n`);
  
  // Recommendations
  console.log(`💡 RECOMMENDATIONS:`);
  const highErrorRate = allResults.filter(r => parseFloat(r.errorRate) > 5);
  const slowEndpoints = allResults.filter(r => {
    const p95 = parseFloat(r.p95);
    return !isNaN(p95) && p95 > 1000;
  });
  
  if (highErrorRate.length > 0) {
    console.log(`⚠️  High error rate detected on:`);
    highErrorRate.forEach(r => {
      console.log(`   - ${r.endpoint} (${r.scenario}): ${r.errorRate} error rate`);
    });
  }
  
  if (slowEndpoints.length > 0) {
    console.log(`⚠️  Slow response times detected (P95 > 1000ms):`);
    slowEndpoints.forEach(r => {
      console.log(`   - ${r.endpoint} (${r.scenario}): P95 = ${r.p95}`);
    });
  }
  
  if (highErrorRate.length === 0 && slowEndpoints.length === 0) {
    console.log(`✅ All endpoints are performing well!`);
  }
  
  console.log(`\n✅ Stress test completed!\n`);
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node stress-test.js [options]

Options:
  --url <url>     Base URL of the API (default: http://localhost:3000)
  --light         Run only light load test
  --medium        Run only medium load test
  --heavy         Run only heavy load test
  --stress        Run only stress test
  --help, -h      Show this help message

Examples:
  node stress-test.js
  node stress-test.js --url http://localhost:3000
  node stress-test.js --url https://etelios-app-service.azurewebsites.net --light
  BASE_URL=https://etelios-app-service.azurewebsites.net node stress-test.js
  `);
  process.exit(0);
}

// Parse URL argument
const urlIndex = args.indexOf('--url');
if (urlIndex !== -1 && args[urlIndex + 1]) {
  CONFIG.BASE_URL = args[urlIndex + 1];
}

// Filter scenarios based on arguments
if (args.includes('--light')) {
  CONFIG.SCENARIOS = CONFIG.SCENARIOS.filter(s => s.name === 'Light Load');
} else if (args.includes('--medium')) {
  CONFIG.SCENARIOS = CONFIG.SCENARIOS.filter(s => s.name === 'Medium Load');
} else if (args.includes('--heavy')) {
  CONFIG.SCENARIOS = CONFIG.SCENARIOS.filter(s => s.name === 'Heavy Load');
} else if (args.includes('--stress')) {
  CONFIG.SCENARIOS = CONFIG.SCENARIOS.filter(s => s.name === 'Stress Test');
}

// Run the tests
runAllTests().catch(error => {
  console.error(`\n❌ Fatal error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});

