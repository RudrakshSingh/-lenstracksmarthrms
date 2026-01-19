const CircuitBreaker = require('opossum');
const logger = require('../utils/logger');

// Circuit breaker configurations for different services
const circuitBreakerConfigs = {
  // Fast-failing services (auth, critical)
  critical: {
    timeout: 5000, // 5 seconds
    errorThresholdPercentage: 50,
    resetTimeout: 30000, // 30 seconds
    rollingCountTimeout: 10000, // 10 seconds
    rollingCountBuckets: 10,
    volumeThreshold: 5
  },
  // Standard services (most microservices)
  standard: {
    timeout: 10000, // 10 seconds
    errorThresholdPercentage: 60,
    resetTimeout: 60000, // 1 minute
    rollingCountTimeout: 15000, // 15 seconds
    rollingCountBuckets: 10,
    volumeThreshold: 10
  },
  // Slow services (analytics, reporting)
  slow: {
    timeout: 30000, // 30 seconds
    errorThresholdPercentage: 70,
    resetTimeout: 120000, // 2 minutes
    rollingCountTimeout: 30000, // 30 seconds
    rollingCountBuckets: 10,
    volumeThreshold: 5
  }
};

// Service type mapping
const serviceTypes = {
  'auth-service': 'critical',
  'hr-service': 'critical',
  'attendance-service': 'critical',
  'payroll-service': 'standard',
  'crm-service': 'standard',
  'inventory-service': 'standard',
  'sales-service': 'standard',
  'purchase-service': 'standard',
  'financial-service': 'standard',
  'document-service': 'standard',
  'service-management': 'standard',
  'cpp-service': 'standard',
  'prescription-service': 'standard',
  'analytics-service': 'slow',
  'notification-service': 'standard',
  'monitoring-service': 'standard',
  'tenant-registry-service': 'standard',
  'realtime-service': 'critical'
};

// Circuit breaker instances storage
const circuitBreakers = new Map();

// Create circuit breaker for a service
function createCircuitBreaker(serviceName, serviceUrl) {
  const serviceType = serviceTypes[serviceName] || 'standard';
  const config = circuitBreakerConfigs[serviceType];

  const breaker = new CircuitBreaker(async (url, options) => {
    // This function will be called by the circuit breaker
    // We'll use axios or node-fetch for HTTP calls
    const axios = require('axios');

    const response = await axios({
      url,
      ...options,
      timeout: config.timeout
    });
    return response;
  }, config);

  // Event listeners for circuit breaker state changes
  breaker.on('open', () => {
    logger.warn(`Circuit breaker OPENED for ${serviceName}`, {
      service: serviceName,
      url: serviceUrl,
      state: 'open'
    });
  });

  breaker.on('close', () => {
    logger.info(`Circuit breaker CLOSED for ${serviceName}`, {
      service: serviceName,
      url: serviceUrl,
      state: 'close'
    });
  });

  breaker.on('halfOpen', () => {
    logger.info(`Circuit breaker HALF-OPEN for ${serviceName}`, {
      service: serviceName,
      url: serviceUrl,
      state: 'half-open'
    });
  });

  breaker.on('fallback', (result) => {
    logger.warn(`Circuit breaker FALLBACK triggered for ${serviceName}`, {
      service: serviceName,
      url: serviceUrl,
      fallback: true
    });
  });

  return breaker;
}

// Get or create circuit breaker for a service
function getCircuitBreaker(serviceName, serviceUrl) {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, createCircuitBreaker(serviceName, serviceUrl));
  }
  return circuitBreakers.get(serviceName);
}

// Middleware function for Express
function circuitBreakerMiddleware(serviceName, serviceUrl) {
  return async (req, res, next) => {
    const breaker = getCircuitBreaker(serviceName, serviceUrl);

    // Check if circuit breaker is open
    if (breaker.opened) {
      logger.warn(`Circuit breaker is OPEN for ${serviceName}, returning fallback response`, {
        service: serviceName,
        url: serviceUrl,
        circuitState: 'open'
      });

      return res.status(503).json({
        error: 'Service temporarily unavailable',
        service: serviceName,
        message: 'Circuit breaker is open - service is experiencing issues',
        retryAfter: Math.ceil(breaker.resetTimeout / 1000)
      });
    }

    // Store original send method
    const originalSend = res.send;
    let responseSent = false;

    // Override res.send to track successful responses
    res.send = function(data) {
      if (!responseSent) {
        responseSent = true;
        // If we get here, the request was successful
        // The circuit breaker will automatically track this as a success
      }
      return originalSend.call(this, data);
    };

    next();
  };
}

// Health check function for circuit breakers
function getCircuitBreakerHealth() {
  const health = {};

  for (const [serviceName, breaker] of circuitBreakers) {
    health[serviceName] = {
      state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
      stats: {
        successes: breaker.stats.successes,
        failures: breaker.stats.failures,
        timeouts: breaker.stats.timeouts,
        fallbacks: breaker.stats.fallbacks,
        errorRate: breaker.stats.errorRate,
        latencyMean: breaker.stats.latencyMean
      }
    };
  }

  return health;
}

// Force reset circuit breaker (for admin use)
function resetCircuitBreaker(serviceName) {
  const breaker = circuitBreakers.get(serviceName);
  if (breaker) {
    breaker.reset();
    logger.info(`Circuit breaker manually reset for ${serviceName}`);
    return true;
  }
  return false;
}

module.exports = {
  circuitBreakerMiddleware,
  getCircuitBreakerHealth,
  resetCircuitBreaker,
  getCircuitBreaker
};
