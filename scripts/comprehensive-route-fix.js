#!/usr/bin/env node

/**
 * Comprehensive Route Fix Script
 * Fixes route mounting issues across all services
 */

const fs = require('fs');
const path = require('path');

const services = [
  { name: 'hr-service', prefix: 'hr', port: 3002 },
  { name: 'attendance-service', prefix: 'attendance', port: 3003 },
  { name: 'payroll-service', prefix: 'payroll', port: 3004 },
  { name: 'crm-service', prefix: 'crm', port: 3005 },
  { name: 'inventory-service', prefix: 'inventory', port: 3006 },
  { name: 'sales-service', prefix: 'sales', port: 3007 },
  { name: 'purchase-service', prefix: 'purchase', port: 3008 },
  { name: 'financial-service', prefix: 'financial', port: 3009 },
  { name: 'document-service', prefix: 'documents', port: 3010 },
  { name: 'service-management', prefix: 'service', port: 3011 },
  { name: 'cpp-service', prefix: 'cpp', port: 3012 },
  { name: 'prescription-service', prefix: 'prescription', port: 3013 },
  { name: 'analytics-service', prefix: 'analytics', port: 3014 },
  { name: 'notification-service', prefix: 'notification', port: 3015 },
  { name: 'monitoring-service', prefix: 'monitoring', port: 3016 }
];

// Enhanced 404 handler that lists available routes
const enhanced404Handler = `
// Enhanced 404 handler with route information
app.use((req, res) => {
  // Try to get route information if available
  const routesInfo = [];
  
  // Common routes that should exist
  routesInfo.push('GET /health');
  routesInfo.push(\`GET /api/{{PREFIX}}/status\`);
  routesInfo.push(\`GET /api/{{PREFIX}}/health\`);
  
  res.status(404).json({
    success: false,
    message: 'Route not found - The requested endpoint does not exist or may require authentication',
    path: req.path,
    method: req.method,
    service: '{{SERVICE_NAME}}',
    port: {{PORT}},
    hint: 'Most routes require authentication. Include Authorization header with Bearer token.',
    availableEndpoints: routesInfo,
    timestamp: new Date().toISOString(),
    troubleshooting: {
      authentication: 'Add header: Authorization: Bearer <token>',
      dynamicRoutes: 'Replace :id with actual ID (e.g., /api/hr/employees/actual-id-123)',
      basePath: \`All routes are under /api/{{PREFIX}}/\`
    }
  });
});
`;

function fixServiceRoutes(service) {
  const serverPath = path.join(__dirname, '..', 'microservices', service.name, 'src', 'server.js');
  
  if (!fs.existsSync(serverPath)) {
    console.log(`⚠️  ${service.name}: server.js not found`);
    return false;
  }

  let content = fs.readFileSync(serverPath, 'utf8');
  let modified = false;

  // Fix 1: Ensure 404 handler is before error handler
  const has404 = content.includes('Route not found') || content.includes('404');
  const errorHandlerPos = content.indexOf('// Error handling');
  const notFoundPos = content.indexOf('// 404 handler');

  if (has404 && notFoundPos > errorHandlerPos && errorHandlerPos > 0) {
    // 404 handler is after error handler, need to move it
    const notFoundSection = content.substring(notFoundPos, content.indexOf('// Error handling', notFoundPos));
    content = content.substring(0, notFoundPos) + content.substring(notFoundPos + notFoundSection.length);
    content = content.substring(0, errorHandlerPos) + notFoundSection + content.substring(errorHandlerPos);
    modified = true;
    console.log(`✅ ${service.name}: Moved 404 handler before error handler`);
  }

  // Fix 2: Update 404 handler to be more informative
  if (has404) {
    const handler = enhanced404Handler
      .replace(/{{SERVICE_NAME}}/g, service.name)
      .replace(/{{PREFIX}}/g, service.prefix)
      .replace(/{{PORT}}/g, service.port);

    // Replace existing 404 handler
    const regex = /\/\/ 404 handler[\s\S]*?app\.use\(\(req, res\)[^}]+}\s*\);\s*\}\);/;
    if (regex.test(content)) {
      content = content.replace(regex, handler.trim());
      modified = true;
      console.log(`✅ ${service.name}: Enhanced 404 handler`);
    }
  }

  // Fix 3: Ensure routes are loaded before error handlers
  const loadRoutesPos = content.indexOf('loadRoutes()');
  const errorHandlerIndex = content.indexOf('// Error handling');
  
  if (loadRoutesPos > errorHandlerIndex && errorHandlerIndex > 0) {
    // Routes are loaded after error handler - this is wrong
    console.log(`⚠️  ${service.name}: Routes may be loaded in wrong order`);
  }

  // Fix 4: Add missing closing braces (syntax errors)
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    console.log(`⚠️  ${service.name}: Brace mismatch detected (${openBraces} open, ${closeBraces} close)`);
    // Try to fix common pattern: missing }); after health check
    const healthCheckPattern = /app\.get\('\/health',[^}]+res\.json\([^}]+\}\);/;
    if (healthCheckPattern.test(content)) {
      // Check if closing brace is missing
      const match = content.match(/app\.get\('\/health',[^}]+res\.json\([^}]+\);/);
      if (match && !match[0].includes('});')) {
        content = content.replace(
          /(app\.get\('\/health',[^}]+res\.json\([^}]+\);)/,
          '$1\n});'
        );
        modified = true;
        console.log(`✅ ${service.name}: Fixed missing closing brace in health check`);
      }
    }
  }

  if (modified) {
    fs.writeFileSync(serverPath, content);
    console.log(`✅ ${service.name}: Fixed route mounting issues`);
    return true;
  }

  return false;
}

console.log('🔧 Fixing Route Mounting Issues...\n');

let fixedCount = 0;
services.forEach(service => {
  if (fixServiceRoutes(service)) {
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} services`);
console.log('\n📝 Next Steps:');
console.log('1. Restart services to apply changes');
console.log('2. Re-run API tests');
console.log('3. Check if 404 errors are reduced');

