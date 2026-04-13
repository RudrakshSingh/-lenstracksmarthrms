#!/usr/bin/env node

/**
 * Chaos Monkey Test - Simulate failures and test system resilience
 * 
 * This script simulates various failure scenarios:
 * - Random endpoint failures
 * - Timeout scenarios
 * - High error rates
 * - Service unavailability
 * - Network issues
 * 
 * Usage:
 *   BASE_URL="http://..." node scripts/chaos-monkey-test.js
 *   BASE_URL="http://..." DURATION=300 FAILURE_RATE=0.1 node scripts/chaos-monkey-test.js
 */

const BASE_URL = process.env.BACKEND_URL || process.env.BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';
const DURATION = parseInt(process.env.DURATION || '300', 10); // Test duration in seconds (default 5 minutes)
const FAILURE_RATE = parseFloat(process.env.FAILURE_RATE || '0.05', 10); // 5% failure rate
const CONCURRENT = parseInt(process.env.CONCURRENT || '50', 10); // Concurrent requests
const CHAOS_INTERVAL = parseInt(process.env.CHAOS_INTERVAL || '30', 10); // Chaos events every N seconds

// Open endpoints to test
const ENDPOINTS = [
  { method: 'GET', path: '/health', name: 'Root Health' },
  { method: 'GET', path: '/api/auth/health', name: 'Auth Health' },
  { method: 'GET', path: '/api/auth/status', name: 'Auth Status' },
  { method: 'GET', path: '/api/hr/health', name: 'HR Health' },
  { method: 'GET', path: '/api/hr/status', name: 'HR Status' },
  { method: 'GET', path: '/api/attendance/health', name: 'Attendance Health' },
  { method: 'GET', path: '/api/attendance/status', name: 'Attendance Status' },
  { method: 'GET', path: '/api/sales/health', name: 'Sales Health' },
  { method: 'GET', path: '/api/sales/status', name: 'Sales Status' },
  { method: 'GET', path: '/api/hr', name: 'HR Service Info' },
  { method: 'GET', path: '/', name: 'Gateway Info' },
];

// Chaos scenarios
const CHAOS_SCENARIOS = [
  'timeout',           // Simulate timeouts
  'error_injection',   // Inject errors
  'high_load',         // Sudden spike in load
  'service_degradation', // Simulate slow responses
  'random_failures',   // Random endpoint failures
];

// Statistics
const stats = {
  total: 0,
  success: 0,
  errors: 0,
  timeouts: 0,
  chaosEvents: 0,
  recoveryTime: [],
  statusCodes: {},
  responseTimes: [],
  errorsByType: {},
  startTime: null,
  endTime: null,
  chaosHistory: []
};

// Colors
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

// Make a request with optional chaos injection
async function makeRequest(endpoint, chaosMode = null) {
  const url = `${BASE_URL}${endpoint.path}`;
  const startTime = Date.now();
  
  try {
    // Chaos: Simulate timeout
    if (chaosMode === 'timeout') {
      await new Promise(resolve => setTimeout(resolve, 15000)); // Force timeout
    }
    
    // Chaos: Simulate network error
    if (chaosMode === 'network_error') {
      throw new Error('Simulated network error');
    }
    
    const controller = new AbortController();
    const timeout = chaosMode === 'slow' ? 20000 : 10000; // Longer timeout for slow mode
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
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
    
    // Chaos: Simulate server error
    if (chaosMode === 'server_error' && Math.random() < 0.5) {
      return {
        success: false,
        statusCode: 500,
        responseTime,
        error: 'SIMULATED_SERVER_ERROR'
      };
    }
    
    // Read response
    try {
      await response.text();
    } catch (e) {
      // Ignore
    }
    
    return {
      success: response.ok || statusCode < 500,
      statusCode,
      responseTime,
      error: null
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    if (error.name === 'AbortError' || chaosMode === 'timeout') {
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

// Select random chaos scenario
function selectChaosScenario() {
  return CHAOS_SCENARIOS[Math.floor(Math.random() * CHAOS_SCENARIOS.length)];
}

// Apply chaos to endpoint selection
function shouldApplyChaos() {
  return Math.random() < FAILURE_RATE;
}

// Get chaos mode for a request
function getChaosMode(chaosScenario, endpoint) {
  if (!shouldApplyChaos()) {
    return null;
  }
  
  switch (chaosScenario) {
    case 'timeout':
      return 'timeout';
    case 'error_injection':
      return Math.random() < 0.5 ? 'network_error' : 'server_error';
    case 'service_degradation':
      return 'slow';
    case 'random_failures':
      return Math.random() < 0.3 ? 'timeout' : (Math.random() < 0.5 ? 'network_error' : null);
    default:
      return null;
  }
}

// Run chaos monkey test
async function runChaosTest() {
  log('\n🐵 Chaos Monkey Test - System Resilience Testing', 'bright');
  log('=====================================', 'bright');
  log(`Base URL: ${BASE_URL}`, 'cyan');
  log(`Duration: ${DURATION} seconds (${(DURATION / 60).toFixed(1)} minutes)`, 'cyan');
  log(`Concurrent Requests: ${CONCURRENT}`, 'cyan');
  log(`Failure Rate: ${(FAILURE_RATE * 100).toFixed(1)}%`, 'cyan');
  log(`Chaos Events Interval: ${CHAOS_INTERVAL}s`, 'cyan');
  log('=====================================\n', 'bright');
  
  stats.startTime = Date.now();
  let currentChaosScenario = null;
  let lastChaosEvent = 0;
  let chaosActive = false;
  let chaosStartTime = null;
  
  // Main test loop
  const testInterval = setInterval(async () => {
    const elapsed = (Date.now() - stats.startTime) / 1000;
    
    // Trigger chaos events periodically
    if (elapsed - lastChaosEvent >= CHAOS_INTERVAL) {
      currentChaosScenario = selectChaosScenario();
      chaosActive = true;
      chaosStartTime = Date.now();
      lastChaosEvent = elapsed;
      stats.chaosEvents++;
      
      log(`\n💥 CHAOS EVENT #${stats.chaosEvents}: ${currentChaosScenario.toUpperCase()}`, 'red');
      log(`   Time: ${elapsed.toFixed(1)}s`, 'yellow');
      stats.chaosHistory.push({
        event: currentChaosScenario,
        time: elapsed,
        duration: null
      });
    }
    
    // End chaos event after some time
    if (chaosActive && chaosStartTime && (Date.now() - chaosStartTime) / 1000 >= CHAOS_INTERVAL / 2) {
      if (chaosStartTime) {
        const chaosDuration = (Date.now() - chaosStartTime) / 1000;
        const lastEvent = stats.chaosHistory[stats.chaosHistory.length - 1];
        if (lastEvent) {
          lastEvent.duration = chaosDuration;
        }
        
        // Check recovery
        const recoveryTime = Date.now() - chaosStartTime;
        stats.recoveryTime.push(recoveryTime);
        
        log(`   ✅ Chaos ended after ${chaosDuration.toFixed(1)}s`, 'green');
      }
      chaosActive = false;
      chaosStartTime = null;
    }
    
    // Make concurrent requests
    const requests = [];
    for (let i = 0; i < CONCURRENT; i++) {
      const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
      const chaosMode = chaosActive ? getChaosMode(currentChaosScenario, endpoint) : null;
      
      requests.push((async () => {
        const result = await makeRequest(endpoint, chaosMode);
        
        stats.total++;
        if (result.success) {
          stats.success++;
        } else {
          stats.errors++;
          if (result.error === 'TIMEOUT') {
            stats.timeouts++;
          }
          if (result.error) {
            stats.errorsByType[result.error] = (stats.errorsByType[result.error] || 0) + 1;
          }
        }
        
        if (result.statusCode) {
          stats.statusCodes[result.statusCode] = (stats.statusCodes[result.statusCode] || 0) + 1;
        }
        
        stats.responseTimes.push(result.responseTime);
      })());
    }
    
    await Promise.all(requests);
    
    // Print progress every 10 seconds
    if (Math.floor(elapsed) % 10 === 0 && elapsed > 0) {
      const successRate = ((stats.success / stats.total) * 100).toFixed(2);
      const errorRate = ((stats.errors / stats.total) * 100).toFixed(2);
      process.stdout.write(`\r⏱️  ${elapsed.toFixed(0)}s | Total: ${stats.total} | Success: ${successRate}% | Errors: ${errorRate}% | Chaos: ${chaosActive ? 'ACTIVE' : 'INACTIVE'}`);
    }
    
    // Stop after duration
    if (elapsed >= DURATION) {
      clearInterval(testInterval);
      stats.endTime = Date.now();
      await generateReport();
    }
  }, 1000); // Run every second
}

// Generate final report
async function generateReport() {
  const totalDuration = (stats.endTime - stats.startTime) / 1000;
  
  log('\n\n📊 CHAOS MONKEY TEST REPORT', 'bright');
  log('=====================================', 'bright');
  log(`Total Duration: ${totalDuration.toFixed(2)}s (${(totalDuration / 60).toFixed(2)} minutes)`, 'cyan');
  log(`Total Requests: ${stats.total}`, 'cyan');
  log(`✅ Successful: ${stats.success} (${((stats.success / stats.total) * 100).toFixed(2)}%)`, stats.success / stats.total > 0.9 ? 'green' : 'yellow');
  log(`❌ Errors: ${stats.errors} (${((stats.errors / stats.total) * 100).toFixed(2)}%)`, stats.errors / stats.total < 0.1 ? 'green' : 'red');
  log(`⏱️  Timeouts: ${stats.timeouts}`, stats.timeouts === 0 ? 'green' : 'yellow');
  log(`💥 Chaos Events: ${stats.chaosEvents}`, 'magenta');
  
  // Response time statistics
  if (stats.responseTimes.length > 0) {
    const times = stats.responseTimes;
    const sortedTimes = times.length > 10000 ? times.slice().sort((a, b) => a - b) : [...times].sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;
    const sum = times.reduce((a, b) => a + b, 0);
    const avg = sum / times.length;
    const min = times.reduce((a, b) => Math.min(a, b), Infinity);
    const max = times.reduce((a, b) => Math.max(a, b), -Infinity);
    const rps = stats.total / totalDuration;
    
    log(`\n⏱️  Response Time Statistics:`, 'cyan');
    log(`   Min: ${min}ms, Max: ${max}ms, Avg: ${avg.toFixed(2)}ms`, 'cyan');
    log(`   P50: ${p50}ms, P95: ${p95}ms, P99: ${p99}ms`, 'cyan');
    log(`\n📈 Throughput: ${rps.toFixed(2)} requests/second`, 'cyan');
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
  
  // Error types
  if (Object.keys(stats.errorsByType).length > 0) {
    log(`\n❌ Error Types:`, 'red');
    Object.entries(stats.errorsByType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        log(`   ${type}: ${count}`, 'yellow');
      });
  }
  
  // Chaos events summary
  if (stats.chaosHistory.length > 0) {
    log(`\n💥 Chaos Events Summary:`, 'magenta');
    const eventCounts = {};
    stats.chaosHistory.forEach(event => {
      eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
    });
    Object.entries(eventCounts).forEach(([event, count]) => {
      log(`   ${event}: ${count} events`, 'yellow');
    });
    
    if (stats.recoveryTime.length > 0) {
      const avgRecovery = stats.recoveryTime.reduce((a, b) => a + b, 0) / stats.recoveryTime.length;
      log(`\n🔄 Average Recovery Time: ${avgRecovery.toFixed(2)}ms`, 'cyan');
    }
  }
  
  // Resilience assessment
  log(`\n🛡️  Resilience Assessment:`, 'bright');
  const successRate = (stats.success / stats.total) * 100;
  const errorRate = (stats.errors / stats.total) * 100;
  
  if (successRate >= 95 && errorRate <= 5) {
    log(`   ✅ EXCELLENT: System handled chaos gracefully`, 'green');
    log(`   Success rate: ${successRate.toFixed(2)}%`, 'green');
  } else if (successRate >= 90 && errorRate <= 10) {
    log(`   ⚠️  GOOD: System resilient but some degradation`, 'yellow');
    log(`   Success rate: ${successRate.toFixed(2)}%`, 'yellow');
  } else {
    log(`   ❌ NEEDS IMPROVEMENT: System struggled under chaos`, 'red');
    log(`   Success rate: ${successRate.toFixed(2)}%`, 'red');
  }
  
  log('\n✅ Chaos Monkey test completed!', 'green');
  log('=====================================\n', 'bright');
}

// Run the test
runChaosTest().catch(error => {
  log(`\n❌ Fatal Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
