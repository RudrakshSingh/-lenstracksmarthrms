#!/usr/bin/env node

/**
 * Start All Microservices with Node.js
 * Starts all 16 microservices individually
 */

const { spawn } = require('child_process');
const path = require('path');

class MicroservicesStarter {
  constructor() {
    this.services = [
      { name: 'auth-service', port: 3001, description: 'Authentication & User Management' },
      { name: 'hr-service', port: 3002, description: 'HR Management & Employee Data' },
      { name: 'attendance-service', port: 3003, description: 'Attendance & Geofencing' },
      { name: 'payroll-service', port: 3004, description: 'Payroll & Salary Management' },
      { name: 'crm-service', port: 3005, description: 'Customer Management & Engagement' },
      { name: 'inventory-service', port: 3006, description: 'ERP & Inventory Management' },
      { name: 'sales-service', port: 3007, description: 'Sales & Order Management' },
      { name: 'purchase-service', port: 3008, description: 'Purchase & Vendor Management' },
      { name: 'financial-service', port: 3009, description: 'Financial Management & Accounting' },
      { name: 'document-service', port: 3010, description: 'Document & E-signature Management' },
      { name: 'service-management', port: 3011, description: 'Service & SLA Management' },
      { name: 'cpp-service', port: 3012, description: 'Customer Protection Plan' },
      { name: 'prescription-service', port: 3013, description: 'Prescription Management' },
      { name: 'analytics-service', port: 3014, description: 'Analytics & Reporting' },
      { name: 'notification-service', port: 3015, description: 'Notifications & Communications' },
      { name: 'monitoring-service', port: 3016, description: 'Monitoring & Health Checks' }
    ];
    
    this.processes = [];
    this.runningServices = [];
  }

  async installDependencies(serviceName) {
    return new Promise((resolve, reject) => {
      const servicePath = path.join(__dirname, serviceName);
      console.log(`📦 Installing dependencies for ${serviceName}...`);
      
      const npm = spawn('npm', ['install'], {
        cwd: servicePath,
        stdio: 'pipe'
      });
      
      npm.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Dependencies installed for ${serviceName}`);
          resolve();
        } else {
          console.log(`❌ Failed to install dependencies for ${serviceName}`);
          reject(new Error(`npm install failed with code ${code}`));
        }
      });
      
      npm.on('error', (error) => {
        console.log(`❌ Error installing dependencies for ${serviceName}: ${error.message}`);
        reject(error);
      });
    });
  }

  async startService(service) {
    try {
      const servicePath = path.join(__dirname, service.name);
      const serverPath = path.join(servicePath, 'src', 'server.js');
      
      console.log(`🚀 Starting ${service.name} on port ${service.port}...`);
      
      // Set environment variables - CRITICAL: Each service gets its own SERVICE_NAME
      const env = {
        ...process.env,
        PORT: service.port,
        SERVICE_NAME: service.name,  // ← Each service gets correct SERVICE_NAME
        NODE_ENV: process.env.NODE_ENV || 'development',
        USE_KEY_VAULT: process.env.USE_KEY_VAULT || 'false',
        AZURE_KEY_VAULT_URL: process.env.AZURE_KEY_VAULT_URL || '',
        AZURE_KEY_VAULT_NAME: process.env.AZURE_KEY_VAULT_NAME || '',
        CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
      };
      
      const child = spawn('node', [serverPath], {
        cwd: servicePath,
        env: env,
        stdio: 'pipe'
      });
      
      child.stdout.on('data', (data) => {
        console.log(`[${service.name}] ${data.toString().trim()}`);
      });
      
      child.stderr.on('data', (data) => {
        console.log(`[${service.name}] ERROR: ${data.toString().trim()}`);
      });
      
      child.on('close', (code) => {
        console.log(`[${service.name}] Process exited with code ${code}`);
        this.runningServices = this.runningServices.filter(s => s.name !== service.name);
      });
      
      child.on('error', (error) => {
        console.log(`[${service.name}] Failed to start: ${error.message}`);
      });
      
      this.processes.push(child);
      this.runningServices.push(service);
      
      // Wait a bit for the service to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return child;
    } catch (error) {
      console.log(`❌ Failed to start ${service.name}: ${error.message}`);
      return null;
    }
  }

  async startAllServices() {
    console.log('🚀 Starting All Microservices...\n');
    console.log('=' .repeat(60));
    
    for (const service of this.services) {
      try {
        // Try to install dependencies first
        try {
          await this.installDependencies(service.name);
        } catch (error) {
          console.log(`⚠️  Skipping dependency installation for ${service.name}`);
        }
        
        // Start the service
        await this.startService(service);
        
        console.log(`✅ ${service.name} started on port ${service.port}`);
        console.log('');
        
      } catch (error) {
        console.log(`❌ Failed to start ${service.name}: ${error.message}`);
        console.log('');
      }
    }
    
    console.log('📊 Services Status:');
    console.log('=' .repeat(60));
    console.log(`Total Services: ${this.services.length}`);
    console.log(`Running Services: ${this.runningServices.length}`);
    console.log(`Processes Started: ${this.processes.length}`);
    
    if (this.runningServices.length > 0) {
      console.log('\n✅ Running Services:');
      this.runningServices.forEach(service => {
        console.log(`  🌐 ${service.name}: http://localhost:${service.port}`);
      });
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Wait 30 seconds for all services to fully start');
    console.log('2. Run: node quick-api-check.js');
    console.log('3. Run: node test-all-microservices-apis.js');
    console.log('\n💡 Press Ctrl+C to stop all services');
    
    // Keep the script running
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping all services...');
      this.processes.forEach(process => {
        process.kill();
      });
      process.exit(0);
    });
    
    // Keep alive
    setInterval(() => {
      // Keep the script running
    }, 1000);
  }

  async run() {
    try {
      await this.startAllServices();
    } catch (error) {
      console.error('❌ Failed to start services:', error.message);
    }
  }
}

// Run the starter
if (require.main === module) {
  const starter = new MicroservicesStarter();
  starter.run().catch(console.error);
}

module.exports = MicroservicesStarter;
