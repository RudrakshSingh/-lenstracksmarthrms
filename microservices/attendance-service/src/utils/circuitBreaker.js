const logger = require('../config/logger');

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 60000; // 1 minute
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    
    // Statistics
    this.stats = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      lastReset: Date.now()
    };
    
    logger.info('Circuit breaker initialized', {
      name: this.name,
      failureThreshold: this.failureThreshold,
      resetTimeout: this.resetTimeout
    });
  }
  
  async execute(operation) {
    this.stats.totalRequests++;
    
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker moving to HALF_OPEN', { name: this.name });
      } else {
        const error = new Error(`Circuit breaker is OPEN for ${this.name}`);
        error.circuitBreakerOpen = true;
        throw error;
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.successCount++;
    this.stats.totalSuccesses++;
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      logger.info('Circuit breaker reset to CLOSED', { 
        name: this.name,
        successCount: this.successCount 
      });
    }
  }
  
  onFailure(error) {
    this.failureCount++;
    this.stats.totalFailures++;
    this.lastFailureTime = Date.now();
    
    logger.warn('Circuit breaker failure recorded', {
      name: this.name,
      failureCount: this.failureCount,
      threshold: this.failureThreshold,
      error: error.message
    });
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.error('Circuit breaker OPENED', {
        name: this.name,
        failureCount: this.failureCount,
        willResetAt: new Date(Date.now() + this.resetTimeout).toISOString()
      });
    }
  }
  
  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      stats: this.stats,
      isOpen: this.state === 'OPEN',
      nextResetTime: this.state === 'OPEN' 
        ? new Date(this.lastFailureTime + this.resetTimeout).toISOString()
        : null
    };
  }
  
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    logger.info('Circuit breaker manually reset', { name: this.name });
  }
}

// Create circuit breakers for different services
const hrServiceBreaker = new CircuitBreaker('HR_SERVICE', {
  failureThreshold: 2, // Lower threshold - fail fast after 2 timeouts
  resetTimeout: 10000, // 10 seconds - faster recovery
  monitoringPeriod: 30000 // 30 seconds monitoring window
});

const authServiceBreaker = new CircuitBreaker('AUTH_SERVICE', {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  monitoringPeriod: 60000
});

module.exports = {
  CircuitBreaker,
  hrServiceBreaker,
  authServiceBreaker
};