#!/usr/bin/env node

/**
 * Restart All Services with TEST_MODE Enabled
 * Kills existing processes and restarts with TEST_MODE=true
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const services = [
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
  { name: 'auth-service', port: 3001 },
  { name: 'tenant-registry-service', port: 3020 },
  { name: 'realtime-service', port: 3021 }
];

async function killServiceOnPort(port) {
  try {
    // Find process using the port
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    const pid = stdout.trim();
    if (pid) {
      await execAsync(`kill ${pid}`);
      console.log(`  ✅ Killed process on port ${port}`);
      return true;
    }
  } catch (error) {
    // Port not in use
    return false;
  }
  return false;
}

async function restartService(service) {
  console.log(`\n🔄 Restarting ${service.name}...`);
  
  // Kill existing process
  await killServiceOnPort(service.port);
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Start with TEST_MODE
  const servicePath = `microservices/${service.name}`;
  const serverPath = `${servicePath}/src/server.js`;
  
  // Check if service exists
  const fs = require('fs');
  if (!fs.existsSync(serverPath)) {
    console.log(`  ⚠️  ${service.name}: server.js not found`);
    return;
  }

  const env = {
    ...process.env,
    PORT: service.port,
    SERVICE_NAME: service.name,
    NODE_ENV: 'development',
    TEST_MODE: 'true',
    MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/etelios',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    JWT_SECRET: process.env.JWT_SECRET || 'test-secret-key-change-in-production'
  };

  // Start service
  const { spawn } = require('child_process');
  const child = spawn('node', [serverPath], {
    cwd: servicePath,
    env: env,
    stdio: ['ignore', 'ignore', 'ignore'],
    detached: true
  });

  child.unref();
  
  // Wait for service to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Check if started
  const http = require('http');
  const isRunning = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: service.port,
      path: '/health',
      timeout: 2000
    }, () => resolve(true));

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });

  if (isRunning) {
    console.log(`  ✅ ${service.name}: Restarted with TEST_MODE on port ${service.port}`);
  } else {
    console.log(`  ⚠️  ${service.name}: Started but health check failed`);
  }
}

async function main() {
  console.log('🔄 Restarting All Services with TEST_MODE...\n');
  console.log('='.repeat(80));

  for (const service of services) {
    await restartService(service);
  }

  console.log('\n✅ All services restarted');
  console.log('\n📝 Next: Run test script to verify APIs');
  console.log('   node test-all-apis-fixed-routes.js');
}

main().catch(console.error);

