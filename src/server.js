// Load environment variables from .env in development; ignore missing module in production
try {
  // eslint-disable-next-line global-require
  require('dotenv').config();
} catch (err) {
  // eslint-disable-next-line no-console
  if (process.env.NODE_ENV !== 'production') {
    console.warn('dotenv not available, skipping .env loading:', err.message);
  }
}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const servicesConfig = require('./config/services.config');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Optimized logger - only log errors in production
const logger = winston.createLogger({
  level: isProduction ? 'error' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: isProduction ? [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' })
  ] : [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Response time tracking middleware
const responseTime = require('response-time');
app.use(responseTime((req, res, time) => {
  if (time > 40 && !isProduction) {
    logger.warn(`Slow request: ${req.method} ${req.path} took ${time.toFixed(2)}ms`);
  }
  res.setHeader('X-Response-Time', `${time.toFixed(2)}ms`);
}));

// CORS configuration - MUST be before security middleware to handle preflight
// Handle OPTIONS requests FIRST before any other middleware
// This MUST be the very first route handler to catch all OPTIONS requests
app.options('*', (req, res, next) => {
  const origin = req.headers.origin;
  // Always allow the request origin if present, otherwise allow all
  const allowedOrigin = origin || '*';
  
  // Set all CORS headers
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Requested-With, Origin, Accept, Cache-Control, Pragma');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  // Send 200 OK immediately - don't call next()
  return res.sendStatus(200);
});

// Production-grade security middleware
const { applyProductionSecurity } = require('./middleware/production-security');
const securityConfig = applyProductionSecurity(app);

// CORS configuration - optimized
// Allow frontend domains and all origins for flexibility
const corsOriginEnv = process.env.CORS_ORIGIN;
let allowedOrigins;

if (corsOriginEnv === '*') {
  // Allow all origins
  allowedOrigins = '*';
} else if (corsOriginEnv) {
  // Use configured origins
  allowedOrigins = corsOriginEnv.split(',').map(o => o.trim());
} else {
  // Default: Allow localhost for development
  // In production, set CORS_ORIGIN environment variable via ConfigMap
  allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    '*' // Allow all origins as fallback (configure via CORS_ORIGIN in production)
  ];
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // If wildcard, allow all origins
    if (allowedOrigins === '*') {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (Array.isArray(allowedOrigins)) {
      // Check if origin matches any allowed origin
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Check if wildcard is in the array (allow all)
      if (allowedOrigins.includes('*')) {
        return callback(null, true);
      }
    }
    
    // In production, always allow to prevent blocking (log warning)
    if (isProduction) {
      logger.warn(`CORS: Origin not in allowed list: ${origin}, but allowing anyway`);
      return callback(null, true);
    } else {
      // In development, be more strict
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Request-ID', 
    'X-Requested-With',
    'Origin',
    'Accept',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  maxAge: 86400 // 24 hours for preflight cache
}));

// Compression - only for responses > 1KB
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Apply rate limiting
app.use('/api/auth/login', securityConfig.rateLimiters.auth);
app.use('/api/auth/register', securityConfig.rateLimiters.auth);
app.use('/api/auth/change-password', securityConfig.rateLimiters.sensitive);
app.use('/api/auth/reset-password', securityConfig.rateLimiters.sensitive);
app.use('/api', securityConfig.rateLimiters.api);
app.use('/', securityConfig.rateLimiters.public);

// Body parsing - optimized
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000
}));

// Static files with aggressive caching
app.use('/public', express.static(path.join(__dirname, 'public'), {
  maxAge: '1y',
  immutable: true
}));

// Health check - optimized for speed
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Etelios Main Server',
    version: '1.0.0'
  });
});

// Cache utility
const cache = require('./utils/cache');

// Optimized service status check with aggressive caching and HTTPS support
// For single App Service architecture, all microservices run on localhost in the same container
const checkServiceStatus = async (serviceUrl) => {
  const cacheKey = `service_status:${serviceUrl}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  
  try {
    // For localhost services (single container architecture), use http://localhost
    // For external services, use HTTPS in production
    let healthUrl = serviceUrl;
    const isLocalhost = serviceUrl.includes('localhost') || serviceUrl.includes('127.0.0.1');
    
    // Don't convert localhost to HTTPS - services run on HTTP internally
    if (isProduction && !isLocalhost && serviceUrl.startsWith('http://')) {
      healthUrl = serviceUrl.replace('http://', 'https://');
    }
    
    const response = await axios.get(`${healthUrl}/health`, { 
      timeout: 3000, // Increased timeout for localhost services
      validateStatus: () => true,
      headers: { 
        'Connection': 'keep-alive',
        'Accept': 'application/json'
      },
      // Only use HTTPS agent for external services, not localhost
      httpsAgent: (isProduction && !isLocalhost) ? new (require('https').Agent)({
        rejectUnauthorized: false // Allow self-signed certs in development
      }) : undefined
    });
    
    const status = response.status === 200 ? 'online' : 'unhealthy';
    cache.set(cacheKey, status, 30); // Cache for 30 seconds
    return status;
  } catch (error) {
    const status = 'offline';
    cache.set(cacheKey, status, 60); // Cache offline for 60 seconds
    if (!isProduction) {
      logger.debug(`Service ${serviceUrl} health check failed:`, error.message);
    }
    return status;
  }
};

// Service registry
const serviceRegistry = {};

function initializeServiceRegistry() {
  const allServices = servicesConfig.getAllServices();
  Object.entries(allServices).forEach(([key, service]) => {
    serviceRegistry[key] = {
      name: service.name,
      port: service.port,
      basePath: service.basePath,
      url: service.url,
      isWebSocket: service.isWebSocket || false,
      status: 'unknown',
      lastChecked: null
    };
  });
}

// Optimized status update - non-blocking
// Updates all microservice statuses in parallel
async function updateServiceStatuses() {
  const updatePromises = Object.entries(serviceRegistry).map(async ([key, service]) => {
    try {
      if (!service.isWebSocket) {
        const status = await checkServiceStatus(service.url);
        serviceRegistry[key].status = status;
        serviceRegistry[key].lastChecked = Date.now();
      } else {
        // WebSocket services - mark as unknown (health check not applicable)
        serviceRegistry[key].status = 'unknown';
        serviceRegistry[key].lastChecked = Date.now();
      }
    } catch (error) {
      // If status check fails, mark as offline
      serviceRegistry[key].status = 'offline';
      serviceRegistry[key].lastChecked = Date.now();
      if (!isProduction) {
        logger.debug(`Failed to update status for ${service.name}:`, error.message);
      }
    }
  });
  await Promise.all(updatePromises);
}

initializeServiceRegistry();

let statusUpdateInterval = null;
let apiEndpointCache = null;
let apiEndpointCacheTime = 0;
const API_CACHE_TTL = 5000; // Cache /api endpoint for 5 seconds

// Root route - cached response
app.get('/', (req, res) => {
  // Use HTTPS in production, or respect X-Forwarded-Proto header if behind proxy
  const protocol = isProduction 
    ? 'https' 
    : (req.headers['x-forwarded-proto'] || req.protocol || 'http');
  const baseUrl = process.env.GATEWAY_URL || `${protocol}://${req.get('host')}`;
  res.json({
    service: 'Etelios API Gateway',
    version: '1.0.0',
    status: 'operational',
    baseUrl: baseUrl,
    endpoints: {
      health: '/health',
      api: '/api',
      admin: '/admin/services'
    },
    timestamp: new Date().toISOString()
  });
});

// IMPORTANT: Proxy middleware MUST be registered BEFORE the /api route
// Otherwise /api route will catch all /api/* requests

// Optimized proxy middleware creation
const allServices = servicesConfig.getAllServices();
const sortedServices = Object.entries(allServices).sort((a, b) => {
  return b[1].basePath.length - a[1].basePath.length;
});

sortedServices.forEach(([key, service]) => {
  const serviceUrl = service.url;
  const basePath = service.basePath;
  
  if (service.isWebSocket) {
    return;
  }
  
  // Use serviceUrl as-is (localhost for single App Service, or external URL if set via env var)
  let targetUrl = serviceUrl;
  // Don't change localhost URLs - they're correct for single App Service architecture
  
  // Optimized proxy middleware - minimal logging with HTTPS support
  // IMPORTANT: Forward the full path including basePath to the target service
  // Services expect full paths like /api/hr/employees, not just /employees
  const proxyMiddleware = createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    timeout: 10000,
    proxyTimeout: 10000,
    secure: false, // Allow self-signed certificates
    // Use pathRewrite to ensure full path is forwarded
    // When app.use(basePath, ...) is used, req.path is stripped, so we need to restore it
    pathRewrite: (path, req) => {
      // req.originalUrl contains the full path including basePath
      // Extract just the path part (without query string)
      const fullPath = req.originalUrl.split('?')[0];
      return fullPath;
    },
    headers: {
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=5, max=1000'
    },
    xfwd: true,
    protocolRewrite: isProduction && targetUrl.startsWith('https://') ? 'https' : undefined,
    onProxyReq: (proxyReq, req) => {
      // Set connection headers
      proxyReq.setHeader('Connection', 'keep-alive');
      
      // Forward ALL headers from original request (important for POST/PUT/PATCH)
      Object.keys(req.headers).forEach(key => {
        const lowerKey = key.toLowerCase();
        // Skip headers that shouldn't be forwarded
        if (lowerKey !== 'host' && lowerKey !== 'connection' && lowerKey !== 'content-length') {
          proxyReq.setHeader(key, req.headers[key]);
        }
      });
      
      // Ensure Content-Type is forwarded for POST/PUT/PATCH requests
      if (req.headers['content-type']) {
        proxyReq.setHeader('Content-Type', req.headers['content-type']);
      }
      
      // Ensure Authorization header is forwarded
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
      
      // Log proxy request with full path
      logger.info(`[Proxy] ${req.method} ${req.originalUrl} -> ${service.name} at ${targetUrl}${req.originalUrl}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      // Log error responses for debugging
      if (proxyRes.statusCode >= 400) {
        logger.error(`[Proxy Response Error] ${service.name} - ${req.method} ${req.originalUrl}:`, {
          statusCode: proxyRes.statusCode,
          service: service.name,
          path: req.path,
          method: req.method,
          headers: proxyRes.headers
        });
      }
      
      // Ensure CORS headers are present in proxy response
      // If target service doesn't set CORS headers, add them here
      const origin = req.headers.origin;
      if (origin) {
        // Check if CORS headers are already set by target service
        if (!proxyRes.headers['access-control-allow-origin']) {
          proxyRes.headers['Access-Control-Allow-Origin'] = origin;
        }
        if (!proxyRes.headers['access-control-allow-credentials']) {
          proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
        }
        if (!proxyRes.headers['access-control-allow-methods']) {
          proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD';
        }
        if (!proxyRes.headers['access-control-allow-headers']) {
          proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Request-ID, X-Requested-With, Origin, Accept';
        }
      }
      
      if (req.method === 'GET' && proxyRes.statusCode === 200) {
        if (!req.path.includes('/auth/') && !req.path.includes('/profile')) {
          proxyRes.headers['Cache-Control'] = 'public, max-age=60, s-maxage=60';
        }
      }
      proxyRes.headers['X-Content-Type-Options'] = 'nosniff';
      proxyRes.headers['X-Frame-Options'] = 'DENY';
    },
    onError: (err, req, res) => {
      logger.error(`[Proxy Error] ${service.name} - ${req.method} ${req.originalUrl}:`, {
        error: err.message,
        code: err.code,
        service: service.name,
        path: req.path,
        method: req.method
      });
      
      // Mark service as offline in registry
      if (serviceRegistry[key]) {
        serviceRegistry[key].status = 'offline';
        serviceRegistry[key].lastChecked = Date.now();
      }
      
      // Return error response if headers not sent
      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          message: `${service.name} is currently unavailable`,
          error: isProduction ? 'Service unavailable' : err.message,
          service: service.name,
          path: req.path,
          method: req.method,
          hint: 'Check service status at /api endpoint'
        });
      }
    },
    // Add log level for better debugging
    logLevel: isProduction ? 'warn' : 'debug'
  });
  
  // Handle OPTIONS requests for this service path BEFORE proxy
  // This is a more specific handler for service paths
  app.options(basePath + '*', (req, res, next) => {
    const origin = req.headers.origin || '*';
    
    // Set all CORS headers
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Requested-With, Origin, Accept, Cache-Control, Pragma');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    
    // Send 200 OK immediately - don't call next()
    return res.sendStatus(200);
  });
  
  // Register proxy middleware for all HTTP methods (GET, POST, PUT, PATCH, DELETE, etc.)
  // Use basePath - Express will match all sub-paths automatically (e.g., /api/hr matches /api/hr/employees)
  app.use(basePath, (req, res, next) => {
    // Handle OPTIONS requests directly (don't proxy them)
    // This is a fallback in case the app.options() handler above didn't catch it
    if (req.method === 'OPTIONS') {
      const origin = req.headers.origin || '*';
      
      // Set all CORS headers
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Requested-With, Origin, Accept, Cache-Control, Pragma');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '86400');
      
      // Send 200 OK immediately - don't call next()
      return res.sendStatus(200);
    }
    
    const registryService = serviceRegistry[key];
    
    // Check if service is offline - allow retry for localhost services (they may be starting up)
    if (registryService && registryService.status === 'offline') {
      // For localhost services, still try to proxy (service may be starting)
      // For external services, return 503 immediately
      const isLocalhost = serviceUrl.includes('localhost') || serviceUrl.includes('127.0.0.1');
      if (!isLocalhost) {
        return res.status(503).json({
          success: false,
          message: `${service.name} is currently offline`,
          service: service.name,
          path: req.originalUrl,
          method: req.method,
          hint: 'Check service status at /api endpoint'
        });
      }
    }
    
    // Log proxy request for debugging (always log for troubleshooting)
    logger.info(`[Gateway] Proxying ${req.method} ${req.originalUrl} to ${service.name} at ${targetUrl}${req.originalUrl}`, {
      body: req.method !== 'GET' ? req.body : undefined,
      headers: {
        'content-type': req.headers['content-type'],
        'authorization': req.headers['authorization'] ? '***' : undefined
      }
    });
    
    // Forward request to service via proxy middleware
    // Note: req.originalUrl contains the full path including basePath, which is what we want to forward
    proxyMiddleware(req, res, next);
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: isProduction ? 'Something went wrong' : err.message
  });
});

// Admin endpoint - cached
let adminCache = null;
let adminCacheTime = 0;
const ADMIN_CACHE_TTL = 10000; // 10 seconds

app.get('/admin/services', async (req, res) => {
  const now = Date.now();
  if (adminCache && (now - adminCacheTime) < ADMIN_CACHE_TTL) {
    return res.json(adminCache);
  }

  await updateServiceStatuses();
  
  const serviceStatus = Object.entries(serviceRegistry).map(([key, service]) => ({
    name: key,
    url: service.url,
    status: service.status,
    basePath: service.basePath,
    isWebSocket: service.isWebSocket,
    lastChecked: service.lastChecked
  }));
  
  const onlineCount = serviceStatus.filter(s => s.status === 'online').length;
  const offlineCount = serviceStatus.filter(s => s.status === 'offline').length;
  const unknownCount = serviceStatus.filter(s => s.status === 'unknown').length;
  
  const response = {
    totalServices: serviceStatus.length,
    onlineServices: onlineCount,
    offlineServices: offlineCount,
    unknownServices: unknownCount,
    services: serviceStatus,
    lastUpdated: new Date().toISOString()
  };

  adminCache = response;
  adminCacheTime = now;
  res.json(response);
});

// Manual service registration
app.post('/admin/services', (req, res) => {
  const { name, url, basePath, port, isWebSocket } = req.body;
  
  if (!name || !url || !basePath) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: name, url, basePath'
    });
  }
  
  serviceRegistry[name] = {
    name: `${name}-service`,
    port: port || 3000,
    basePath: basePath,
    url: url,
    isWebSocket: isWebSocket || false,
    status: 'unknown',
    lastChecked: null
  };
  
  // Invalidate caches
  apiEndpointCache = null;
  adminCache = null;
  
  res.json({
    success: true,
    message: `Service ${name} added successfully`,
    service: serviceRegistry[name]
  });
});

// Remove service
app.delete('/admin/services/:name', (req, res) => {
  const { name } = req.params;
  
  if (!serviceRegistry[name]) {
    return res.status(404).json({
      success: false,
      error: `Service ${name} not found in registry`
    });
  }
  
  delete serviceRegistry[name];
  apiEndpointCache = null;
  adminCache = null;
  
  res.json({
    success: true,
    message: `Service ${name} removed successfully`
  });
});

// Procurement alias
const purchaseService = servicesConfig.getServiceUrl('purchase');
if (purchaseService) {
  const procurementProxy = createProxyMiddleware({
    target: purchaseService,
    changeOrigin: true,
    pathRewrite: { '^/api/procurement': '/api/purchase' },
    timeout: 10000,
    proxyTimeout: 10000
  });
  
  app.use('/api/procurement', procurementProxy);
}

// API Discovery endpoint - MUST be after proxy middleware but before 404 handler
app.get('/api', async (req, res) => {
  const now = Date.now();
  if (apiEndpointCache && (now - apiEndpointCacheTime) < API_CACHE_TTL) {
    return res.json(apiEndpointCache);
  }

  // Update service statuses (non-blocking)
  updateServiceStatuses().catch(err => {
    if (!isProduction) logger.error('Error updating service statuses:', err);
  });

  // Use HTTPS in production, or respect X-Forwarded-Proto header if behind proxy
  const protocol = isProduction 
    ? 'https' 
    : (req.headers['x-forwarded-proto'] || req.protocol || 'http');
  const baseUrl = process.env.GATEWAY_URL || `${protocol}://${req.get('host')}`;
  
  const formattedServices = {};
  Object.entries(serviceRegistry).forEach(([key, service]) => {
    formattedServices[key] = {
      name: service.name,
      port: service.port,
      basePath: service.basePath,
      url: service.url,
      isWebSocket: service.isWebSocket,
      status: service.status,
      lastChecked: service.lastChecked ? new Date(service.lastChecked).toISOString() : null
    };
  });

  const serviceEndpoints = Object.values(serviceRegistry).map(s => s.basePath);
  
  const response = {
    service: 'Etelios API Gateway - All Microservices',
    version: '1.0.0',
    status: 'operational',
    message: 'Welcome to Etelios HRMS & ERP API Gateway',
    baseUrl: baseUrl,
    endpoints: {
      health: '/health',
      api: '/api',
      services: serviceEndpoints
    },
    services: formattedServices,
    documentation: {
      swagger: '/api-docs',
      postman: '/postman/HRMS-API-Collection.json',
      frontendGuide: 'See FRONTEND-API-ACCESS.md'
    },
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  };

  apiEndpointCache = response;
  apiEndpointCacheTime = now;
  res.json(response);
});

// AI Chat endpoint
app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Message is required'
    });
  }
  
  res.json({
    success: true,
    data: {
      response: `AI chat functionality will be implemented soon.`,
      timestamp: new Date().toISOString()
    }
  });
});

// Global search endpoints
const crmService = servicesConfig.getServiceUrl('crm');
const salesService = servicesConfig.getServiceUrl('sales');
const inventoryService = servicesConfig.getServiceUrl('inventory');

if (crmService) {
  app.get('/api/customers', createProxyMiddleware({
    target: crmService,
    changeOrigin: true,
    pathRewrite: { '^/api/customers': '/api/crm/customers' },
    timeout: 10000
  }));
}

if (inventoryService) {
  app.get('/api/products', createProxyMiddleware({
    target: inventoryService,
    changeOrigin: true,
    pathRewrite: { '^/api/products': '/api/inventory/products' },
    timeout: 10000
  }));
}

if (salesService) {
  app.get('/api/orders', createProxyMiddleware({
    target: salesService,
    changeOrigin: true,
    pathRewrite: { '^/api/orders': '/api/sales/orders' },
    timeout: 10000
  }));
}

// 404 handler
app.use('*', (req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`, {
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl
  });
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.originalUrl || req.path,
    method: req.method,
    hint: 'Check /api endpoint for available services'
  });
});

// Start server
const SERVER_PORT = process.env.PORT || process.env.WEBSITES_PORT || PORT;

let server;
try {
  server = app.listen(SERVER_PORT, '0.0.0.0', async () => {
    if (!isProduction) {
      logger.info(`Etelios Main Server started on port ${SERVER_PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    }
    
    await updateServiceStatuses();
    
    // Status updates every 60 seconds (reduced frequency)
    statusUpdateInterval = setInterval(() => {
      updateServiceStatuses().catch(() => {});
      // Invalidate caches
      apiEndpointCache = null;
      adminCache = null;
    }, 60000);
  });

  server.on('error', (error) => {
    logger.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${SERVER_PORT} is already in use`);
    }
    process.exit(1);
  });
} catch (error) {
  logger.error('Failed to start server:', error);
  process.exit(1);
}

// Graceful shutdown
const shutdown = () => {
  if (statusUpdateInterval) {
    clearInterval(statusUpdateInterval);
  }
  if (server) {
    server.close(() => {
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  shutdown();
});

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = app;
