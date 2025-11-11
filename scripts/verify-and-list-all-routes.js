#!/usr/bin/env node

/**
 * Verify and List All Routes
 * Checks if routes are properly loaded and lists all registered routes
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const services = [
  { name: 'hr-service', port: 3002, basePath: '/api/hr' },
  { name: 'attendance-service', port: 3003, basePath: '/api/attendance' },
  { name: 'payroll-service', port: 3004, basePath: '/api/payroll' },
  { name: 'crm-service', port: 3005, basePath: '/api/crm' },
  { name: 'inventory-service', port: 3006, basePath: '/api/inventory' },
  { name: 'sales-service', port: 3007, basePath: '/api/sales' },
  { name: 'purchase-service', port: 3008, basePath: '/api/purchase' },
  { name: 'financial-service', port: 3009, basePath: '/api/financial' },
  { name: 'document-service', port: 3010, basePath: '/api/documents' },
  { name: 'service-management', port: 3011, basePath: '/api/service' },
  { name: 'cpp-service', port: 3012, basePath: '/api/cpp' },
  { name: 'prescription-service', port: 3013, basePath: '/api/prescription' },
  { name: 'analytics-service', port: 3014, basePath: '/api/analytics' },
  { name: 'notification-service', port: 3015, basePath: '/api/notification' }
];

function extractRoutesFromFile(filePath, baseMountPath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const routes = [];
  
  // Match route definitions: router.get, router.post, etc.
  const routePattern = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  
  while ((match = routePattern.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    let endpoint = match[2];
    
    // Build full path
    let fullPath = baseMountPath;
    if (endpoint && !endpoint.startsWith('/')) {
      fullPath += '/' + endpoint;
    } else if (endpoint.startsWith('/')) {
      fullPath += endpoint;
    }
    
    routes.push({
      method,
      endpoint: fullPath,
      originalEndpoint: endpoint
    });
  }
  
  return routes;
}

function findRouteFiles(servicePath, baseMountPath) {
  const routes = [];
  const routesDir = path.join(servicePath, 'src', 'routes');
  
  if (!fs.existsSync(routesDir)) {
    return routes;
  }
  
  const files = fs.readdirSync(routesDir);
  files.forEach(file => {
    if (file.endsWith('.routes.js') || file.endsWith('.route.js')) {
      const filePath = path.join(routesDir, file);
      const fileRoutes = extractRoutesFromFile(filePath, baseMountPath);
      routes.push(...fileRoutes);
    }
  });
  
  return routes;
}

function checkServerRouteMounting(servicePath, service) {
  const serverPath = path.join(servicePath, 'src', 'server.js');
  if (!fs.existsSync(serverPath)) {
    return { mounted: false, error: 'server.js not found' };
  }
  
  const content = fs.readFileSync(serverPath, 'utf8');
  const mounts = [];
  
  // Find app.use patterns for route mounting
  const usePattern = /app\.use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*[^)]+require\s*\(['"`]\.\/routes\/([^'"`]+)/g;
  let match;
  
  while ((match = usePattern.exec(content)) !== null) {
    mounts.push({
      mountPath: match[1],
      routeFile: match[2]
    });
  }
  
  // Also check direct route definitions in server.js
  const directRoutes = [];
  const directPattern = /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  while ((match = directPattern.exec(content)) !== null) {
    directRoutes.push({
      method: match[1].toUpperCase(),
      path: match[2]
    });
  }
  
  return {
    mounted: mounts.length > 0 || directRoutes.length > 0,
    mounts,
    directRoutes
  };
}

async function testRoute(service, route) {
  return new Promise((resolve) => {
    // Replace dynamic parameters with test values
    let testPath = route.endpoint;
    testPath = testPath.replace(/:id/g, 'test-id-123');
    testPath = testPath.replace(/:userId/g, 'test-user-123');
    testPath = testPath.replace(/:customerId/g, 'test-customer-123');
    testPath = testPath.replace(/:orderId/g, 'test-order-123');
    testPath = testPath.replace(/:productId/g, 'test-product-123');
    testPath = testPath.replace(/:storeId/g, 'test-store-123');
    testPath = testPath.replace(/:ticketId/g, 'test-ticket-123');
    testPath = testPath.replace(/:prescriptionId/g, 'test-prescription-123');
    testPath = testPath.replace(/:campaignId/g, 'test-campaign-123');
    testPath = testPath.replace(/:coupon_id/g, 'test-coupon-123');
    testPath = testPath.replace(/:vendorId/g, 'test-vendor-123');
    testPath = testPath.replace(/:invoiceId/g, 'test-invoice-123');
    testPath = testPath.replace(/:assetId/g, 'test-asset-123');
    testPath = testPath.replace(/:dashboardId/g, 'test-dashboard-123');
    testPath = testPath.replace(/:widgetId/g, 'test-widget-123');
    testPath = testPath.replace(/:lockId/g, 'test-lock-123');
    testPath = testPath.replace(/:family_id/g, 'test-family-123');
    testPath = testPath.replace(/:tenantId/g, 'default-tenant');
    testPath = testPath.replace(/:identifier/g, 'test-identifier');
    testPath = testPath.replace(/:role/g, 'admin');
    testPath = testPath.replace(/:sku_id/g, 'SKU001');
    testPath = testPath.replace(/:payment_id/g, 'PAY001');
    testPath = testPath.replace(/:ruleId/g, 'RULE001');
    testPath = testPath.replace(/:customer_id/g, 'CUST001');
    testPath = testPath.replace(/:order_id/g, 'ORDER001');
    
    const req = http.request({
      hostname: 'localhost',
      port: service.port,
      path: testPath,
      method: route.method,
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Mode': 'true'
      },
      timeout: 3000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          accessible: res.statusCode !== 404,
          isAuth: res.statusCode === 401,
          response: data.substring(0, 100)
        });
      });
    });

    req.on('error', () => {
      resolve({ status: 0, accessible: false, error: 'Connection refused' });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, accessible: false, error: 'Timeout' });
    });

    req.end();
  });
}

async function verifyService(service) {
  const servicePath = path.join(__dirname, '..', 'microservices', service.name);
  
  if (!fs.existsSync(servicePath)) {
    return null;
  }

  // Check route mounting
  const mounting = checkServerRouteMounting(servicePath, service);
  
  // Extract routes from route files
  const routes = findRouteFiles(servicePath, service.basePath);
  
  // Test a few routes
  const testResults = [];
  for (let i = 0; i < Math.min(routes.length, 5); i++) {
    const result = await testRoute(service, routes[i]);
    testResults.push(result);
  }

  return {
    service: service.name,
    port: service.port,
    routesFound: routes.length,
    routes: routes.slice(0, 10), // First 10 for display
    mounting,
    testResults
  };
}

async function main() {
  console.log('\n🔍 Verifying Route Loading and Mounting...\n');
  
  const results = [];
  for (const service of services) {
    const result = await verifyService(service);
    if (result) {
      results.push(result);
      console.log(`✅ ${service.name}: ${result.routesFound} routes found, ${result.mounting.mounts.length} route files mounted`);
    } else {
      console.log(`❌ ${service.name}: Service directory not found`);
    }
  }

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    services: results
  };

  fs.writeFileSync('route-verification-report.json', JSON.stringify(report, null, 2));
  
  console.log('\n📊 Summary:');
  console.log(`  Total services checked: ${results.length}`);
  console.log(`  Total routes found: ${results.reduce((sum, r) => sum + r.routesFound, 0)}`);
  console.log(`  Routes properly mounted: ${results.filter(r => r.mounting.mounted).length}/${results.length}`);
  console.log('\n📄 Detailed report: route-verification-report.json');
}

main().catch(console.error);

