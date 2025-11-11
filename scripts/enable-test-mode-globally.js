#!/usr/bin/env node

/**
 * Enable TEST_MODE globally for all services
 * Updates environment configuration for all services
 */

const fs = require('fs');
const path = require('path');

const services = [
  'hr-service', 'attendance-service', 'payroll-service', 'crm-service',
  'inventory-service', 'sales-service', 'purchase-service', 'financial-service',
  'document-service', 'service-management', 'cpp-service', 'prescription-service',
  'analytics-service', 'notification-service', 'monitoring-service',
  'auth-service', 'tenant-registry-service', 'realtime-service'
];

function ensureTestMode(serviceName) {
  const servicePath = path.join(__dirname, '..', 'microservices', serviceName);
  
  // Check for .env file
  const envFiles = [
    path.join(servicePath, '.env'),
    path.join(servicePath, 'azure.env'),
    path.join(servicePath, 'local.env')
  ];

  let envFile = envFiles.find(f => fs.existsSync(f));
  
  if (!envFile) {
    // Create .env file
    envFile = path.join(servicePath, '.env');
  }

  let content = '';
  if (fs.existsSync(envFile)) {
    content = fs.readFileSync(envFile, 'utf8');
  }

  // Add or update TEST_MODE
  if (content.includes('TEST_MODE')) {
    content = content.replace(/TEST_MODE\s*=\s*.*/g, 'TEST_MODE=true');
  } else {
    content += '\n# Test Mode - Allows requests without authentication\nTEST_MODE=true\n';
  }

  // Ensure MONGO_URI and other essential vars exist
  if (!content.includes('MONGO_URI')) {
    content += '\n# Database\nMONGO_URI=mongodb://localhost:27017/etelios\n';
  }

  if (!content.includes('JWT_SECRET') && serviceName === 'auth-service') {
    content += '\n# JWT Secret\nJWT_SECRET=test-secret-key-change-in-production\n';
  }

  fs.writeFileSync(envFile, content.trim() + '\n');
  console.log(`✅ ${serviceName}: TEST_MODE enabled in ${path.basename(envFile)}`);
}

console.log('\n🔧 Enabling TEST_MODE for all services...\n');

services.forEach(service => {
  try {
    ensureTestMode(service);
  } catch (error) {
    console.log(`⚠️  ${service}: ${error.message}`);
  }
});

console.log('\n✅ TEST_MODE enabled globally');
console.log('\n📝 Note: Restart services for changes to take effect');
console.log('   Run: node fix-and-start-services.js');

