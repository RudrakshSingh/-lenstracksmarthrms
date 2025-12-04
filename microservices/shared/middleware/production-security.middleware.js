/**
 * Production-Grade Security Middleware
 * Microsoft SDL (Security Development Lifecycle) Compliant
 * Implements defense-in-depth security strategy
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
// Removed express-mongo-sanitize, xss-clean, hpp - deprecated/not needed
const validator = require('validator');
const crypto = require('crypto');
const winston = require('winston');

// Logger for security events
const securityLogger = winston.createLogger({
  level: 'warn',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/security.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Enhanced Helmet Configuration
 * Implements comprehensive security headers
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: 'no-referrer' },
  xssFilter: true,
});

/**
 * Advanced Rate Limiting
 * Multiple tiers for different endpoint types
 */
const createRateLimiter = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: message || 'Too many requests, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skip: (req) => {
      // Skip rate limiting for health checks and internal services
      return req.path === '/health' || 
             req.path === '/ready' || 
             req.path === '/metrics' ||
             req.ip === '127.0.0.1' ||
             req.ip === '::1';
    },
    handler: (req, res) => {
      securityLogger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: message || 'Too many requests, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Different rate limiters for different use cases
const rateLimiters = {
  // Strict rate limiter for authentication endpoints
  auth: createRateLimiter(15 * 60 * 1000, 5, 'Too many authentication attempts. Please try again later.', true),
  
  // Standard API rate limiter
  api: createRateLimiter(15 * 60 * 1000, 100, 'Too many requests. Please try again later.'),
  
  // Strict rate limiter for sensitive operations
  sensitive: createRateLimiter(60 * 60 * 1000, 10, 'Too many sensitive operations. Please try again later.', true),
  
  // Lenient rate limiter for public endpoints
  public: createRateLimiter(15 * 60 * 1000, 1000, 'Too many requests. Please try again later.')
};

/**
 * Request Size Limiter
 * Prevents DoS attacks via large payloads
 */
const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.get('content-length') || '0', 10);
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (contentLength > maxSize) {
    securityLogger.warn('Request size exceeded', {
      ip: req.ip,
      path: req.path,
      contentLength,
      maxSize,
      timestamp: new Date().toISOString()
    });
    return res.status(413).json({
      success: false,
      error: 'PAYLOAD_TOO_LARGE',
      message: 'Request payload too large. Maximum size is 10MB.'
    });
  }
  
  next();
};

/**
 * Advanced Input Sanitization
 * Prevents NoSQL injection, XSS, and other injection attacks
 */
const sanitizeInput = (obj, depth = 0, maxDepth = 10) => {
  if (depth > maxDepth) {
    return null; // Prevent deep nesting attacks
  }
  
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    // Remove null bytes
    let sanitized = obj.replace(/\0/g, '');
    
    // Remove control characters except newline and tab
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Limit string length (prevent DoS)
    if (sanitized.length > 10000) {
      sanitized = sanitized.substring(0, 10000);
    }
    
    return sanitized;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeInput(item, depth + 1, maxDepth));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Sanitize key
        const sanitizedKey = sanitizeInput(key, depth + 1, maxDepth);
        if (sanitizedKey) {
          sanitized[sanitizedKey] = sanitizeInput(obj[key], depth + 1, maxDepth);
        }
      }
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * Comprehensive Input Validation
 * Validates and sanitizes all input types
 */
const validateAndSanitizeInput = (req, res, next) => {
  const errors = [];
  
  // Sanitize all inputs
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  if (req.params) {
    req.params = sanitizeInput(req.params);
  }
  
  // Validate email format
  if (req.body?.email && !validator.isEmail(req.body.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }
  
  // Validate phone number
  if (req.body?.phone && !validator.isMobilePhone(req.body.phone, 'any', { strictMode: true })) {
    errors.push({ field: 'phone', message: 'Invalid phone number format' });
  }
  
  // Validate URL
  if (req.body?.url && !validator.isURL(req.body.url, { protocols: ['http', 'https'], require_protocol: true })) {
    errors.push({ field: 'url', message: 'Invalid URL format' });
  }
  
  // Validate numeric inputs
  if (req.body?.salary !== undefined && !validator.isNumeric(req.body.salary.toString())) {
    errors.push({ field: 'salary', message: 'Salary must be a valid number' });
  }
  
  // Validate date inputs
  if (req.body?.date && !validator.isISO8601(req.body.date)) {
    errors.push({ field: 'date', message: 'Invalid date format. Use ISO 8601 format' });
  }
  
  // Check for NoSQL injection patterns
  const nosqlInjectionPatterns = [
    /\$where/i,
    /\$ne/i,
    /\$gt/i,
    /\$lt/i,
    /\$gte/i,
    /\$lte/i,
    /\$in/i,
    /\$nin/i,
    /\$regex/i,
    /\$exists/i,
    /\$type/i,
    /\$mod/i,
    /\$text/i,
    /\$search/i,
    /\$elemMatch/i,
    /\$size/i,
    /\$all/i,
    /\$or/i,
    /\$and/i,
    /\$not/i,
    /\$nor/i
  ];
  
  const checkForNoSQLInjection = (obj) => {
    if (typeof obj === 'string') {
      for (const pattern of nosqlInjectionPatterns) {
        if (pattern.test(obj)) {
          return true;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          // Check key for MongoDB operators
          if (key.startsWith('$')) {
            return true;
          }
          if (checkForNoSQLInjection(obj[key])) {
            return true;
          }
        }
      }
    }
    return false;
  };
  
  if (checkForNoSQLInjection(req.body) || checkForNoSQLInjection(req.query) || checkForNoSQLInjection(req.params)) {
    securityLogger.warn('NoSQL injection attempt detected', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    errors.push({ field: 'input', message: 'Invalid input detected' });
  }
  
  // Check for XSS patterns
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]+src[^>]*=.*javascript:/gi,
    /<svg[^>]*onload/gi
  ];
  
  const checkForXSS = (obj) => {
    if (typeof obj === 'string') {
      for (const pattern of xssPatterns) {
        if (pattern.test(obj)) {
          return true;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          if (checkForXSS(obj[key])) {
            return true;
          }
        }
      }
    }
    return false;
  };
  
  if (checkForXSS(req.body) || checkForXSS(req.query) || checkForXSS(req.params)) {
    securityLogger.warn('XSS attempt detected', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    errors.push({ field: 'input', message: 'Potentially malicious input detected' });
  }
  
  if (errors.length > 0) {
    securityLogger.warn('Input validation failed', {
      errors,
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Input validation failed',
      errors
    });
  }
  
  next();
};

/**
 * Request ID Middleware
 * Adds unique request ID for tracing
 */
const requestIdMiddleware = (req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
};

/**
 * Security Event Logging
 * Logs all security-relevant events
 */
const securityEventLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log security events
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log failed authentication attempts
    if (req.path.includes('/login') && res.statusCode === 401) {
      securityLogger.warn('Failed authentication attempt', {
        requestId: req.id,
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        duration,
        timestamp: new Date().toISOString()
      });
    }
    
    // Log authorization failures
    if (res.statusCode === 403) {
      securityLogger.warn('Authorization failure', {
        requestId: req.id,
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        duration,
        timestamp: new Date().toISOString()
      });
    }
    
    // Log server errors
    if (res.statusCode >= 500) {
      securityLogger.error('Server error', {
        requestId: req.id,
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        duration,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  next();
};

/**
 * IP Whitelist/Blacklist Middleware
 * Allows blocking or allowing specific IPs
 */
const ipFilter = (options = {}) => {
  const whitelist = options.whitelist || [];
  const blacklist = options.blacklist || [];
  const enabled = options.enabled !== false;
  
  return (req, res, next) => {
    if (!enabled) {
      return next();
    }
    
    const clientIP = req.ip || 
                     req.connection.remoteAddress || 
                     req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                     req.socket.remoteAddress;
    
    // Check blacklist first
    if (blacklist.length > 0 && blacklist.includes(clientIP)) {
      securityLogger.warn('Blocked request from blacklisted IP', {
        ip: clientIP,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Access denied'
      });
    }
    
    // Check whitelist if configured
    if (whitelist.length > 0 && !whitelist.includes(clientIP)) {
      securityLogger.warn('Blocked request from non-whitelisted IP', {
        ip: clientIP,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Access denied'
      });
    }
    
    next();
  };
};

/**
 * Request Timeout Middleware
 * Prevents slowloris attacks
 */
const requestTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    req.setTimeout(timeoutMs, () => {
      securityLogger.warn('Request timeout', {
        requestId: req.id,
        ip: req.ip,
        path: req.path,
        method: req.method,
        timeout: timeoutMs,
        timestamp: new Date().toISOString()
      });
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: 'REQUEST_TIMEOUT',
          message: 'Request timeout. Please try again.'
        });
      }
    });
    next();
  };
};

module.exports = {
  helmetConfig,
  rateLimiters,
  requestSizeLimiter,
  validateAndSanitizeInput,
  requestIdMiddleware,
  securityEventLogger,
  ipFilter,
  requestTimeout,
  securityLogger
};

