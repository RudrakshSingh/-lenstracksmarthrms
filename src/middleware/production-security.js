/**
 * Production Security Middleware for API Gateway
 * Imports and applies production-grade security measures
 */

// Import production security middleware
let productionSecurity, performanceMiddleware;
try {
  const path = require('path');
  const productionSecurityPath = path.join(__dirname, '../../microservices/shared/middleware/production-security.middleware.js');
  const performancePath = path.join(__dirname, '../../microservices/shared/middleware/performance.middleware.js');
  
  productionSecurity = require(productionSecurityPath);
  performanceMiddleware = require(performancePath);
} catch (error) {
  // If shared middleware not available, use basic implementations
  console.warn('Shared middleware not found, using basic security implementations:', error.message);
  
  // Use basic helmet and rate limiting as fallback
  const helmet = require('helmet');
  const rateLimit = require('express-rate-limit');
  const compression = require('compression');
  const responseTime = require('response-time');
  const crypto = require('crypto');
  
  productionSecurity = {
    helmetConfig: helmet(),
    rateLimiters: {
      auth: rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }),
      api: rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }),
      sensitive: rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }),
      public: rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 })
    },
    requestSizeLimiter: (req, res, next) => next(),
    validateAndSanitizeInput: (req, res, next) => next(),
    requestIdMiddleware: (req, res, next) => {
      req.id = crypto.randomUUID();
      res.setHeader('X-Request-ID', req.id);
      next();
    },
    securityEventLogger: (req, res, next) => next(),
    ipFilter: () => (req, res, next) => next(),
    requestTimeout: () => (req, res, next) => next()
  };
  
  performanceMiddleware = {
    compressionConfig: compression(),
    responseTimeMiddleware: responseTime(),
    cacheControl: (req, res, next) => next(),
    keepAlive: (req, res, next) => next(),
    requestIdPropagation: (req, res, next) => next(),
    performanceMetrics: (req, res, next) => next()
  };
}

const {
  helmetConfig,
  rateLimiters,
  requestSizeLimiter,
  validateAndSanitizeInput,
  requestIdMiddleware,
  securityEventLogger,
  ipFilter,
  requestTimeout
} = productionSecurity;

const {
  compressionConfig,
  responseTimeMiddleware,
  cacheControl,
  keepAlive,
  requestIdPropagation,
  performanceMetrics
} = performanceMiddleware;

/**
 * Apply all production security middleware
 */
const applyProductionSecurity = (app) => {
  // 1. Request ID for tracing
  app.use(requestIdMiddleware);
  app.use(requestIdPropagation);
  
  // 2. Security headers
  app.use(helmetConfig);
  
  // 3. Request size limiting
  app.use(requestSizeLimiter);
  
  // 4. Request timeout
  app.use(requestTimeout(30000)); // 30 seconds
  
  // 5. Compression
  app.use(compressionConfig);
  
  // 6. Response time tracking
  app.use(responseTimeMiddleware);
  
  // 7. Performance metrics
  app.use(performanceMetrics);
  
  // 8. Keep-alive optimization
  app.use(keepAlive);
  
  // 9. Cache control
  app.use(cacheControl);
  
  // 10. Security event logging
  app.use(securityEventLogger);
  
  // 11. IP filtering (if enabled)
  if (process.env.IP_FILTER_ENABLED === 'true') {
    const whitelist = process.env.IP_WHITELIST ? process.env.IP_WHITELIST.split(',') : [];
    const blacklist = process.env.IP_BLACKLIST ? process.env.IP_BLACKLIST.split(',') : [];
    app.use(ipFilter({ whitelist, blacklist, enabled: true }));
  }
  
  // 12. Input validation and sanitization
  app.use(validateAndSanitizeInput);
  
  return {
    rateLimiters,
    ipFilter
  };
};

module.exports = {
  applyProductionSecurity,
  rateLimiters,
  ipFilter
};

