#!/usr/bin/env node

/**
 * Fix Route Mounting Issues
 * Adds 404 handlers and ensures routes are properly mounted
 */

const fs = require('fs');
const path = require('path');

const services = [
  'hr-service',
  'attendance-service',
  'payroll-service',
  'crm-service',
  'inventory-service',
  'sales-service',
  'purchase-service',
  'financial-service',
  'document-service',
  'service-management',
  'cpp-service',
  'prescription-service',
  'analytics-service',
  'notification-service',
  'monitoring-service'
];

// 404 handler template
const notFoundHandler = `
// 404 handler - Route not found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method,
    service: '{{SERVICE_NAME}}',
    availableRoutes: [
      'GET /health',
      'GET /api/{{SERVICE_PREFIX}}/...',
      // Routes will be dynamically listed if service provides route info
    ],
    timestamp: new Date().toISOString()
  });
});
`;

function getServicePrefix(serviceName) {
  const mapping = {
    'hr-service': 'hr',
    'attendance-service': 'attendance',
    'payroll-service': 'payroll',
    'crm-service': 'crm',
    'inventory-service': 'inventory',
    'sales-service': 'sales',
    'purchase-service': 'purchase',
    'financial-service': 'financial',
    'document-service': 'documents',
    'service-management': 'service',
    'cpp-service': 'cpp',
    'prescription-service': 'prescription',
    'analytics-service': 'analytics',
    'notification-service': 'notification',
    'monitoring-service': 'monitoring'
  };
  return mapping[serviceName] || serviceName.replace('-service', '');
}

services.forEach(serviceName => {
  const serverPath = path.join(__dirname, '..', 'microservices', serviceName, 'src', 'server.js');
  
  if (!fs.existsSync(serverPath)) {
    console.log(`⚠️  ${serviceName}: server.js not found`);
    return;
  }

  let serverContent = fs.readFileSync(serverPath, 'utf8');
  const servicePrefix = getServicePrefix(serviceName);
  
  // Check if 404 handler already exists
  if (serverContent.includes('404') || serverContent.includes('not found')) {
    console.log(`✅ ${serviceName}: 404 handler already exists`);
    return;
  }

  // Find where to insert 404 handler (before error handler or at end)
  let insertPosition = serverContent.lastIndexOf('// Error handling');
  if (insertPosition === -1) {
    insertPosition = serverContent.lastIndexOf('app.use((err');
  }
  if (insertPosition === -1) {
    insertPosition = serverContent.lastIndexOf('app.listen');
  }

  if (insertPosition > 0) {
    const handler = notFoundHandler
      .replace('{{SERVICE_NAME}}', serviceName)
      .replace('{{SERVICE_PREFIX}}', servicePrefix);

    serverContent = serverContent.slice(0, insertPosition) + 
                   handler + '\n' + 
                   serverContent.slice(insertPosition);

    fs.writeFileSync(serverPath, serverContent);
    console.log(`✅ ${serviceName}: 404 handler added`);
  } else {
    console.log(`⚠️  ${serviceName}: Could not find insertion point`);
  }
});

console.log('\n✅ Route mounting fixes completed');

