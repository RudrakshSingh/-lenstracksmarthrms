/**
 * Production-Grade Performance Optimization Middleware
 * Implements caching, compression, and performance best practices
 */

const compression = require('compression');
const responseTime = require('response-time');
const winston = require('winston');

// Performance logger
const performanceLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/performance.log' })
  ]
});

/**
 * Advanced Compression Configuration
 * Optimized for different content types
 */
const compressionConfig = compression({
  filter: (req, res) => {
    // Don't compress responses if this request-header is present
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Default compression filter - compress text-based content
    const contentType = res.getHeader('content-type') || '';
    return /text|json|javascript|css|xml|html|svg/i.test(contentType);
  },
  level: 6, // Compression level (0-9, 6 is a good balance)
  threshold: 1024, // Only compress responses larger than 1KB
  memLevel: 8 // Memory level for compression
});

/**
 * Response Time Middleware
 * Logs response times for performance monitoring
 */
const responseTimeMiddleware = responseTime((req, res, time) => {
  // Log slow requests (> 1 second)
  if (time > 1000) {
    performanceLogger.warn('Slow request detected', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      responseTime: `${time.toFixed(2)}ms`,
      statusCode: res.statusCode,
      timestamp: new Date().toISOString()
    });
  }
  
  // Add response time header
  res.setHeader('X-Response-Time', `${time.toFixed(2)}ms`);
});

/**
 * Cache Control Headers
 * Sets appropriate cache headers based on content type
 */
const cacheControl = (req, res, next) => {
  // Don't cache authenticated requests
  if (req.headers.authorization) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return next();
  }
  
  // Cache static assets
  if (req.path.match(/\.(jpg|jpeg|png|gif|ico|svg|css|js|woff|woff2|ttf|eot)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return next();
  }
  
  // Cache public API responses
  if (req.method === 'GET' && !req.path.includes('/auth/') && !req.path.includes('/profile')) {
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
    res.setHeader('Vary', 'Accept-Encoding');
    return next();
  }
  
  // No cache for dynamic content
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
};

/**
 * Connection Keep-Alive Optimization
 */
const keepAlive = (req, res, next) => {
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=5, max=1000');
  next();
};

/**
 * Request ID Propagation
 * Ensures request ID is available for tracing
 */
const requestIdPropagation = (req, res, next) => {
  if (!req.id) {
    req.id = require('crypto').randomUUID();
  }
  res.setHeader('X-Request-ID', req.id);
  next();
};

/**
 * Performance Metrics Collection
 */
const performanceMetrics = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    const metrics = {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      memory: {
        heapUsed: `${((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${((endMemory.heapTotal - startMemory.heapTotal) / 1024 / 1024).toFixed(2)}MB`,
        rss: `${((endMemory.rss - startMemory.rss) / 1024 / 1024).toFixed(2)}MB`
      },
      timestamp: new Date().toISOString()
    };
    
    // Log metrics for analysis
    if (duration > 500 || (endMemory.heapUsed - startMemory.heapUsed) > 10 * 1024 * 1024) {
      performanceLogger.info('Performance metrics', metrics);
    }
  });
  
  next();
};

module.exports = {
  compressionConfig,
  responseTimeMiddleware,
  cacheControl,
  keepAlive,
  requestIdPropagation,
  performanceMetrics,
  performanceLogger
};

