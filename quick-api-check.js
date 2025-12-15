#!/usr/bin/env node

/**
 * Quick API Health Check Script
 * Quickly checks if all microservices are responding
 */

const http = require('http');

const services = [
  { name: 'API Gateway', port: 3000 },
  { name: 'auth-service', port: 3001 },
  { name: 'hr-service', port: 3002 },
  { name: 'attendance-service', port: 3003 },
  { name: 'payroll-service', port: 3004 },
  { name: 'crm-service', port: 3005 },
  { name: 'inventory-service', port: 3006 },
  { name: 'sales-service', port: 3007 },
  { name: 'purchase-service', port: 3008 },
  { name: 'financial-service', port: 3009 },
  { name: 'document-service', port: 3010 },
  { name: 'service-management', port: 3011 },
  { name: 'cpp-service', port: 3012 },
  { name: 'prescription-service', port: 3013 },
  { name: 'analytics-service', port: 3014 },
  { name: 'notification-service', port: 3015 },
  { name: 'monitoring-service', port: 3016 },
  { name: 'tenant-registry-service', port: 3020 },
  { name: 'realtime-service', port: 3021 }
];

function checkService(service) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: service.port,
      path: '/health',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            service: service.name,
            port: service.port,
            status: 'online',
            response: json
          });
        } catch (e) {
          resolve({
            service: service.name,
            port: service.port,
            status: 'unhealthy',
            error: 'Invalid JSON response'
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        service: service.name,
        port: service.port,
        status: 'offline',
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        service: service.name,
        port: service.port,
        status: 'timeout',
        error: 'Request timeout'
      });
    });

    req.end();
  });
}

async function main() {
  console.log('🔍 Quick API Health Check\n');
  console.log('='.repeat(60));
  
  const results = await Promise.all(services.map(checkService));
  
  const online = results.filter(r => r.status === 'online');
  const offline = results.filter(r => r.status !== 'online');
  
  console.log('\n✅ Online Services:');
  online.forEach(r => {
    console.log(`  ✓ ${r.service.padEnd(30)} (Port ${r.port}) - ${r.response?.status || 'OK'}`);
  });
  
  if (offline.length > 0) {
    console.log('\n❌ Offline/Unhealthy Services:');
    offline.forEach(r => {
      console.log(`  ✗ ${r.service.padEnd(30)} (Port ${r.port}) - ${r.status}: ${r.error || 'N/A'}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`Summary: ${online.length}/${services.length} services online`);
  console.log('='.repeat(60) + '\n');
  
  process.exit(offline.length > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

