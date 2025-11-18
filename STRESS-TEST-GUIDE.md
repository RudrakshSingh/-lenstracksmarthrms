# Stress Test Guide for Etelios Backend

## Overview

The stress test script (`stress-test.js`) is a comprehensive load testing tool that evaluates the performance, reliability, and scalability of the Etelios API Gateway under various load conditions.

## Features

- **Multiple Test Scenarios**: Light, Medium, Heavy, and Stress load tests
- **Comprehensive Metrics**: Response times, success rates, error rates, throughput
- **Multiple Endpoints**: Tests health, root, API info, and service status endpoints
- **Detailed Statistics**: P50, P95, P99 percentiles, average, min, max response times
- **Error Analysis**: Categorizes errors by type and tracks timeouts
- **Real-time Reporting**: Shows results as tests complete

## Quick Start

### Prerequisites

1. Ensure the backend server is running:
   ```bash
   npm start
   # or
   npm run dev
   ```

2. The server should be accessible at `http://localhost:3000` (or your configured URL)

### Running Tests

#### Run All Tests (Full Suite)
```bash
npm run stress-test
# or
node stress-test.js
```

#### Run Specific Load Level

**Light Load Test** (10 concurrent, 100 requests):
```bash
npm run stress-test:light
# or
node stress-test.js --light
```

**Medium Load Test** (50 concurrent, 500 requests):
```bash
npm run stress-test:medium
# or
node stress-test.js --medium
```

**Heavy Load Test** (100 concurrent, 1000 requests):
```bash
npm run stress-test:heavy
# or
node stress-test.js --heavy
```

**Stress Test** (200 concurrent, 2000 requests):
```bash
npm run stress-test:stress
# or
node stress-test.js --stress
```

#### Test Against Different URLs

**Local Development:**
```bash
node stress-test.js --url http://localhost:3000
```

**Azure Production:**
```bash
node stress-test.js --url https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net
```

**Using Environment Variable:**
```bash
BASE_URL=https://etelios-app-service.azurewebsites.net node stress-test.js
```

## Test Scenarios

| Scenario | Concurrent Requests | Total Requests | Duration | Use Case |
|----------|-------------------|----------------|----------|----------|
| Light Load | 10 | 100 | ~10s | Quick validation, development testing |
| Medium Load | 50 | 500 | ~30s | Normal production load simulation |
| Heavy Load | 100 | 1000 | ~60s | Peak load testing |
| Stress Test | 200 | 2000 | ~120s | Maximum capacity testing |

## Tested Endpoints

1. **Health Check** (`GET /health`) - Basic health endpoint
2. **Root Endpoint** (`GET /`) - API Gateway information
3. **API Info** (`GET /api`) - Service status and endpoints
4. **Auth Status** (`GET /api/auth/status`) - Authentication service status
5. **HR Status** (`GET /api/hr/status`) - HR service status

## Metrics Explained

### Response Time Metrics

- **Average**: Mean response time across all requests
- **Min**: Fastest response time
- **Max**: Slowest response time
- **P50 (Median)**: 50% of requests completed within this time
- **P95**: 95% of requests completed within this time
- **P99**: 99% of requests completed within this time

### Success Metrics

- **Success Rate**: Percentage of successful requests (2xx status codes)
- **Error Rate**: Percentage of failed requests
- **Timeouts**: Number of requests that exceeded the timeout (30 seconds)

### Performance Metrics

- **Requests Per Second (RPS)**: Throughput - how many requests the server can handle per second
- **Duration**: Total time taken to complete all requests

## Interpreting Results

### Good Performance Indicators

✅ **Success Rate > 95%**: Most requests are successful
✅ **P95 < 500ms**: 95% of requests complete in under 500ms
✅ **P99 < 1000ms**: 99% of requests complete in under 1 second
✅ **No Timeouts**: All requests complete within timeout period
✅ **High RPS**: Server can handle high throughput

### Warning Signs

⚠️ **Success Rate 80-95%**: Some errors, investigate error types
⚠️ **P95 > 1000ms**: Some requests are slow, may need optimization
⚠️ **Occasional Timeouts**: Server may be overloaded

### Critical Issues

❌ **Success Rate < 80%**: High error rate, server may be failing
❌ **P95 > 5000ms**: Very slow responses, performance issues
❌ **Many Timeouts**: Server cannot handle the load

## Example Output

```
================================================================================
🚀 Etelios Backend Stress Test
================================================================================
Base URL: http://localhost:3000
Test Time: 2025-11-18T08:56:07.620Z
================================================================================

🔍 Verifying server accessibility...
✅ Server is accessible (Status: 200)

================================================================================
🧪 Testing: Health Check (GET /health)
📊 Scenario: Light Load
   - Concurrent: 10
   - Total Requests: 100
   - Duration: 10s
================================================================================

✅ Results for Health Check:
   Total Requests: 100
   Success: 100 (100.00%)
   Errors: 0 (0.00%)
   Timeouts: 0
   Duration: 2.45s
   Requests/sec: 40.82

   Response Times:
   - Average: 245.32ms
   - Min: 12.45ms
   - Max: 456.78ms
   - P50: 234.56ms
   - P95: 412.34ms
   - P99: 445.67ms

   Status Codes:
   - 200: 100
```

## Troubleshooting

### Server Not Accessible

If you see "Server is not accessible":
1. Check if the server is running: `curl http://localhost:3000/health`
2. Verify the URL is correct
3. Check firewall/network settings
4. For Azure, ensure the App Service is running

### High Error Rates

If you see high error rates:
1. Check server logs for errors
2. Verify database connections
3. Check if rate limiting is too aggressive
4. Monitor server resources (CPU, memory)

### Slow Response Times

If response times are high:
1. Check database query performance
2. Verify network latency (especially for Azure)
3. Check if services are overloaded
4. Review caching strategies

### Timeouts

If you see many timeouts:
1. Increase timeout in `stress-test.js` (default: 30s)
2. Check if services are down or slow
3. Verify network connectivity
4. Check Azure App Service health

## Best Practices

1. **Start with Light Load**: Always start with light load to verify basic functionality
2. **Test Incrementally**: Gradually increase load to find breaking points
3. **Monitor Resources**: Watch CPU, memory, and network during tests
4. **Test Production-Like**: Use similar URLs and configurations as production
5. **Run Multiple Times**: Run tests multiple times to get consistent results
6. **Document Results**: Keep records of test results for comparison

## Customization

### Modify Test Scenarios

Edit `stress-test.js` to customize scenarios:

```javascript
SCENARIOS: [
  {
    name: 'Custom Test',
    concurrent: 25,
    requests: 250,
    duration: 20
  }
]
```

### Add More Endpoints

Add endpoints to test:

```javascript
ENDPOINTS: [
  { path: '/your-endpoint', method: 'GET', name: 'Your Endpoint' }
]
```

### Adjust Timeout

Change the timeout value:

```javascript
TIMEOUT: 60000, // 60 seconds
```

## Integration with CI/CD

You can integrate stress tests into your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Run Stress Test
  run: |
    npm start &
    sleep 10
    npm run stress-test:light
```

## Support

For issues or questions:
1. Check server logs
2. Review error messages in test output
3. Verify server configuration
4. Check network connectivity

