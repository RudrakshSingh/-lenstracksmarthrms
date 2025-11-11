#!/usr/bin/env node

/**
 * Extract All APIs from Route Files
 * Comprehensive extraction of all API endpoints from microservices
 */

const fs = require('fs');
const path = require('path');

const services = [
  { name: 'auth-service', port: 3001, basePath: '/api/auth' },
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
  { name: 'notification-service', port: 3015, basePath: '/api/notification' },
  { name: 'monitoring-service', port: 3016, basePath: '/api/monitoring' },
  { name: 'tenant-registry-service', port: 3020, basePath: '/api/tenants' },
  { name: 'realtime-service', port: 3021, basePath: '/ws' }
];

function extractAPIsFromRouteFile(filePath, service) {
  const content = fs.readFileSync(filePath, 'utf8');
  const apis = [];
  
  // Match route patterns: router.get, router.post, router.put, router.delete, router.patch
  const routePattern = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  
  while ((match = routePattern.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    let endpoint = match[2];
    
    // Clean endpoint
    endpoint = endpoint.replace(/^\//, '');
    
    // Build full path
    let fullPath = service.basePath;
    if (endpoint && endpoint !== '/') {
      fullPath += (fullPath.endsWith('/') ? '' : '/') + endpoint;
    }
    
    apis.push({
      method,
      endpoint: fullPath,
      service: service.name,
      port: service.port
    });
  }
  
  // Also check for app.use patterns that might mount routes
  const usePattern = /app\.use\s*\(\s*['"`]([^'"`]+)['"`]/g;
  while ((match = usePattern.exec(content)) !== null) {
    const base = match[1];
    // This is a mounted route, we'll handle it separately if needed
  }
  
  return apis;
}

function findRouteFiles(serviceDir) {
  const routeFiles = [];
  
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.includes('node_modules')) {
        walkDir(filePath);
      } else if (file.endsWith('.routes.js') || file.endsWith('.route.js')) {
        routeFiles.push(filePath);
      }
    });
  }
  
  walkDir(serviceDir);
  return routeFiles;
}

const allAPIs = [];
const healthAPIs = [];

services.forEach(service => {
  const serviceDir = path.join(__dirname, '..', 'microservices', service.name);
  
  if (!fs.existsSync(serviceDir)) {
    console.log(`⚠️  Service directory not found: ${service.name}`);
    return;
  }
  
  // Add health check
  healthAPIs.push({
    method: 'GET',
    endpoint: '/health',
    service: service.name,
    port: service.port,
    description: 'Service health check'
  });
  
  // Find and process route files
  const routeFiles = findRouteFiles(serviceDir);
  
  routeFiles.forEach(routeFile => {
    const apis = extractAPIsFromRouteFile(routeFile, service);
    allAPIs.push(...apis);
  });
});

// Also add health APIs
allAPIs.push(...healthAPIs);

console.log(`\n✅ Extracted ${allAPIs.length} APIs from ${services.length} services\n`);

// Group by service
const apisByService = {};
allAPIs.forEach(api => {
  if (!apisByService[api.service]) {
    apisByService[api.service] = [];
  }
  apisByService[api.service].push(api);
});

// Print summary
Object.keys(apisByService).sort().forEach(service => {
  console.log(`${service}: ${apisByService[service].length} APIs`);
});

// Save to JSON
const output = {
  totalAPIs: allAPIs.length,
  services: services.length,
  extractedAt: new Date().toISOString(),
  apis: allAPIs,
  apisByService
};

fs.writeFileSync(
  path.join(__dirname, '..', 'all-apis-complete.json'),
  JSON.stringify(output, null, 2)
);

console.log(`\n✅ Saved to: all-apis-complete.json\n`);

