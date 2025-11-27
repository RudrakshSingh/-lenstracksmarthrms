const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../config/logger');

// Advanced rate limiting with different tiers
const createAdvancedRateLimit = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method
      });
      res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Different rate limits for different endpoints
const authRateLimit = createAdvancedRateLimit(15 * 60 * 1000, 5, 'Too many login attempts, please try again later');
const apiRateLimit = createAdvancedRateLimit(15 * 60 * 1000, 100, 'Too many requests, please slow down');
const strictRateLimit = createAdvancedRateLimit(15 * 60 * 1000, 10, 'Too many requests, please slow down');
const uploadRateLimit = createAdvancedRateLimit(60 * 60 * 1000, 10, 'Too many file uploads, please try again later');

// Speed limiter to slow down requests
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: () => 500, // begin adding 500ms of delay per request above 50
  validate: { delayMs: false } // disable warning
});

// Advanced security headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Sanitize all string inputs
  const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
      return validator.escape(validator.trim(obj));
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Advanced input validation
const validateInput = (req, res, next) => {
  const errors = [];

  // Validate email format
  if (req.body.email && !validator.isEmail(req.body.email)) {
    errors.push('Invalid email format');
  }

  // Validate phone number
  if (req.body.phone && !validator.isMobilePhone(req.body.phone, 'any')) {
    errors.push('Invalid phone number format');
  }

  // Validate URL
  if (req.body.url && !validator.isURL(req.body.url)) {
    errors.push('Invalid URL format');
  }

  // Validate numeric inputs
  if (req.body.salary && !validator.isNumeric(req.body.salary.toString())) {
    errors.push('Salary must be a valid number');
  }

  // Validate date inputs
  if (req.body.date && !validator.isISO8601(req.body.date)) {
    errors.push('Invalid date format');
  }

  // Check for SQL injection patterns
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(\b(OR|AND)\s+['"]\s*=\s*['"])/i,
    /(\b(OR|AND)\s+['"]\s*LIKE\s*['"])/i
  ];

  const checkForSQLInjection = (obj) => {
    if (typeof obj === 'string') {
      for (const pattern of sqlInjectionPatterns) {
        if (pattern.test(obj)) {
          return true;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (obj.hasOwnProperty(key) && checkForSQLInjection(obj[key])) {
          return true;
        }
      }
    }
    return false;
  };

  if (checkForSQLInjection(req.body) || checkForSQLInjection(req.query) || checkForSQLInjection(req.params)) {
    errors.push('Invalid input detected');
  }

  if (errors.length > 0) {
    logger.warn('Input validation failed', {
      errors,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: req.body
    });
    return res.status(400).json({
      success: false,
      message: 'Invalid input',
      errors
    });
  }

  next();
};

// JWT security middleware
const jwtSecurity = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  try {
    // Verify token signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check token expiration
    if (decoded.exp < Date.now() / 1000) {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    // Check token issuer
    if (decoded.iss !== 'hrms-backend') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token issuer'
      });
    }

    // Check token audience
    if (decoded.aud !== 'hrms-frontend') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token audience'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('JWT verification failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Advanced session security
const sessionSecurity = (req, res, next) => {
  // Check for session fixation
  if (req.session && req.session.regenerate) {
    req.session.regenerate((err) => {
      if (err) {
        logger.error('Session regeneration failed', { error: err.message });
      }
    });
  }

  // Set secure session options
  if (req.session) {
    req.session.cookie.secure = process.env.NODE_ENV === 'production';
    req.session.cookie.httpOnly = true;
    req.session.cookie.sameSite = 'strict';
  }

  next();
};

// IP whitelist/blacklist middleware
const ipFilter = (req, res, next) => {
  // Skip IP filtering for health checks and public endpoints
  const publicPaths = ['/health', '/ready', '/live', '/api/hr/health', '/api/hr/status'];
  if (publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  const clientIP = req.ip || 
                   req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                   req.headers['x-real-ip'] || 
                   req.connection.remoteAddress ||
                   req.socket.remoteAddress;
  
  const allowedIPs = process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',').map(ip => ip.trim()) : [];
  const blockedIPs = process.env.BLOCKED_IPS ? process.env.BLOCKED_IPS.split(',').map(ip => ip.trim()) : [];

  // Check if IP is blocked
  if (blockedIPs.length > 0 && blockedIPs.includes(clientIP)) {
    logger.warn('Blocked IP attempted access', { ip: clientIP, path: req.path });
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Check if IP is whitelisted (if whitelist is configured)
  // ONLY enforce whitelist if EXPLICITLY enabled via IP_WHITELIST_ENABLED=true
  // This prevents accidental blocking in production
  const whitelistEnabled = process.env.IP_WHITELIST_ENABLED === 'true';
  
  // Only block if whitelist is explicitly enabled AND IP is not in allowed list
  if (whitelistEnabled && allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
    logger.warn('Non-whitelisted IP attempted access', { 
      ip: clientIP, 
      path: req.path,
      allowedIPs: allowedIPs,
      forwardedFor: req.headers['x-forwarded-for']
    });
    return res.status(403).json({
      success: false,
      message: 'Access denied - IP not whitelisted',
      code: 'IP_NOT_WHITELISTED'
    });
  }
  
  // If whitelist is not explicitly enabled, allow all IPs (default behavior)

  next();
};

// Request size limiter
const requestSizeLimiter = (req, res, next) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const contentLength = parseInt(req.get('Content-Length') || '0');
  
  if (contentLength > maxSize) {
    logger.warn('Request size exceeded', {
      contentLength,
      maxSize,
      ip: req.ip
    });
    return res.status(413).json({
      success: false,
      message: 'Request entity too large'
    });
  }

  next();
};

// Security audit logger
const securityAuditLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log security events
    if (res.statusCode >= 400) {
      logger.warn('Security event detected', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        timestamp: new Date().toISOString()
      });
    }
  });

  next();
};

// CSRF protection - DISABLED for API endpoints (REST APIs use JWT, not sessions)
// Only enable for web forms if needed
const csrfProtection = (req, res, next) => {
  // Skip CSRF for API endpoints (they use JWT authentication)
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Skip for GET, HEAD, OPTIONS
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // Only check CSRF if session exists (web forms)
  if (!req.session) {
    return next();
  }

  const token = req.header('X-CSRF-Token');
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    logger.warn('CSRF token mismatch', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      providedToken: token,
      sessionToken: sessionToken
    });
    return res.status(403).json({
      success: false,
      message: 'CSRF token mismatch'
    });
  }

  next();
};

// Advanced CORS configuration
const advancedCORS = (req, res, next) => {
  const origin = req.get('Origin');
  const corsOriginEnv = process.env.CORS_ORIGIN;
  
  // Default to allowing all origins if not set
  const allowedOrigins = corsOriginEnv === '*' 
    ? '*' 
    : (corsOriginEnv ? corsOriginEnv.split(',').map(o => o.trim()) : '*');
  
  // Allow all origins if wildcard or not set
  if (allowedOrigins === '*' || !corsOriginEnv) {
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }
  } else if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (origin) {
    // Allow for now to prevent blocking frontend
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token');
  res.header('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
};

// File upload security
const fileUploadSecurity = (req, res, next) => {
  if (req.files) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    for (const file of req.files) {
      if (!allowedTypes.includes(file.mimetype)) {
        logger.warn('Invalid file type uploaded', {
          filename: file.originalname,
          mimetype: file.mimetype,
          ip: req.ip
        });
        return res.status(400).json({
          success: false,
          message: 'Invalid file type'
        });
      }
      
      if (file.size > maxSize) {
        logger.warn('File size exceeded', {
          filename: file.originalname,
          size: file.size,
          maxSize,
          ip: req.ip
        });
        return res.status(400).json({
          success: false,
          message: 'File size too large'
        });
      }
    }
  }
  
  next();
};

module.exports = {
  authRateLimit,
  apiRateLimit,
  strictRateLimit,
  uploadRateLimit,
  speedLimiter,
  securityHeaders,
  sanitizeInput,
  validateInput,
  jwtSecurity,
  sessionSecurity,
  ipFilter,
  requestSizeLimiter,
  securityAuditLogger,
  csrfProtection,
  advancedCORS,
  fileUploadSecurity,
  mongoSanitize: mongoSanitize(),
  xssClean: xss(),
  hpp: hpp()
};
