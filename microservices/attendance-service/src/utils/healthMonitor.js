const logger = require('../config/logger');
const mongoose = require('mongoose');

class HealthMonitor {
  constructor() {
    this.services = new Map();
    this.lastHealthCheck = null;
    this.healthCheckInterval = 30000; // 30 seconds
    
    this.startMonitoring();
  }
  
  registerService(name, healthCheckFn, options = {}) {
    this.services.set(name, {
      name,
      healthCheck: healthCheckFn,
      timeout: options.timeout || 5000,
      lastCheck: null,
      status: 'unknown',
      consecutiveFailures: 0,
      maxFailures: options.maxFailures || 3
    });
    
    logger.info('Service registered for health monitoring', { name });
  }
  
  async checkService(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) return { status: 'not_registered' };
    
    try {
      const startTime = Date.now();
      
      const result = await Promise.race([
        service.healthCheck(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), service.timeout)
        )
      ]);
      
      const duration = Date.now() - startTime;
      
      service.status = 'healthy';
      service.lastCheck = new Date();
      service.consecutiveFailures = 0;
      
      logger.debug('Service health check passed', {
        service: serviceName,
        duration: `${duration}ms`
      });
      
      return { status: 'healthy', duration, result };
    } catch (error) {
      service.status = 'unhealthy';
      service.lastCheck = new Date();
      service.consecutiveFailures++;
      
      logger.warn('Service health check failed', {
        service: serviceName,
        error: error.message,
        consecutiveFailures: service.consecutiveFailures
      });
      
      return { 
        status: 'unhealthy', 
        error: error.message,
        consecutiveFailures: service.consecutiveFailures
      };
    }
  }
  
  async checkAllServices() {
    const results = {};
    
    for (const [name] of this.services) {
      results[name] = await this.checkService(name);
    }
    
    this.lastHealthCheck = new Date();
    return results;
  }
  
  startMonitoring() {
    setInterval(async () => {
      try {
        await this.checkAllServices();
      } catch (error) {
        logger.error('Health monitoring error', { error: error.message });
      }
    }, this.healthCheckInterval);
    
    logger.info('Health monitoring started', { 
      interval: `${this.healthCheckInterval}ms` 
    });
  }
  
  getOverallHealth() {
    const services = Array.from(this.services.values());
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const totalCount = services.length;
    
    return {
      overall: healthyCount === totalCount ? 'healthy' : 'degraded',
      services: services.map(s => ({
        name: s.name,
        status: s.status,
        lastCheck: s.lastCheck,
        consecutiveFailures: s.consecutiveFailures
      })),
      healthyCount,
      totalCount,
      lastCheck: this.lastHealthCheck
    };
  }
}

// Create global health monitor
const healthMonitor = new HealthMonitor();

// Register database health check
healthMonitor.registerService('DATABASE', async () => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database not connected');
  }
  
  // Simple ping test
  await mongoose.connection.db.admin().ping();
  return { status: 'connected', readyState: mongoose.connection.readyState };
});

// Register HR service health check
healthMonitor.registerService('HR_SERVICE', async () => {
  const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';
  const { hrServiceClient } = require('./httpClient');
  
  const response = await hrServiceClient.get(`${HR_SERVICE_URL}/api/hr/health`, {
    timeout: 3000
  });
  
  if (response.status !== 200) {
    throw new Error(`HR service returned status ${response.status}`);
  }
  
  return { status: 'healthy', responseTime: response.duration };
});

module.exports = {
  HealthMonitor,
  healthMonitor
};