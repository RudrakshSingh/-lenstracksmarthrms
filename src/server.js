require('dotenv').config();
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

// Production-grade security middleware
const { applyProductionSecurity } = require('./middleware/production-security');
const securityConfig = applyProductionSecurity(app);

// CORS configuration - optimized
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
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
const checkServiceStatus = async (serviceUrl) => {
  const cacheKey = `service_status:${serviceUrl}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  
  // Skip health check for localhost in production
  if (serviceUrl.includes('localhost') && isProduction) {
    const status = 'offline';
    cache.set(cacheKey, status, 300); // Cache for 5 minutes
    return status;
  }
  
  try {
    // Ensure HTTPS for production URLs
    let healthUrl = serviceUrl;
    if (isProduction && serviceUrl.startsWith('http://') && !serviceUrl.includes('localhost')) {
      healthUrl = serviceUrl.replace('http://', 'https://');
    }
    
    const response = await axios.get(`${healthUrl}/health`, { 
      timeout: 2000, // Increased timeout for HTTPS
      validateStatus: () => true,
      headers: { 
        'Connection': 'keep-alive',
        'Accept': 'application/json'
      },
      httpsAgent: isProduction ? new (require('https').Agent)({
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
async function updateServiceStatuses() {
  const updatePromises = Object.entries(serviceRegistry).map(async ([key, service]) => {
    if (!service.isWebSocket) {
      const status = await checkServiceStatus(service.url);
      serviceRegistry[key].status = status;
      serviceRegistry[key].lastChecked = Date.now();
    } else {
      serviceRegistry[key].status = 'unknown';
      serviceRegistry[key].lastChecked = Date.now();
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
  const baseUrl = process.env.GATEWAY_URL || `${req.protocol}://${req.get('host')}`;
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

// API endpoint - cached and optimized
app.get('/api', async (req, res) => {
  const now = Date.now();
  if (apiEndpointCache && (now - apiEndpointCacheTime) < API_CACHE_TTL) {
    return res.json(apiEndpointCache);
  }

  const baseUrl = process.env.GATEWAY_URL || `${req.protocol}://${req.get('host')}`;
  
  // Non-blocking status update
  updateServiceStatuses().catch(() => {});
  
  const formattedServices = {};
  Object.entries(serviceRegistry).forEach(([key, service]) => {
    formattedServices[key] = {
      name: service.name,
      port: service.port,
      basePath: service.basePath,
      url: service.url,
      isWebSocket: service.isWebSocket,
      status: service.status
    };
  });
  
  const serviceEndpoints = Object.values(serviceRegistry).map(s => s.basePath);
  
  const response = {
    service: 'Etelios API Gateway',
    version: '1.0.0',
    status: 'operational',
    baseUrl: baseUrl,
    endpoints: {
      health: '/health',
      api: '/api',
      services: serviceEndpoints
    },
    services: formattedServices,
    timestamp: new Date().toISOString()
  };

  apiEndpointCache = response;
  apiEndpointCacheTime = now;
  res.json(response);
});

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
  
  // Ensure HTTPS for production URLs
  let targetUrl = serviceUrl;
  if (isProduction && serviceUrl.startsWith('http://') && !serviceUrl.includes('localhost')) {
    targetUrl = serviceUrl.replace('http://', 'https://');
  }
  
  // Optimized proxy middleware - minimal logging with HTTPS support
  const proxyMiddleware = createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    timeout: 10000,
    proxyTimeout: 10000,
    secure: false, // Allow self-signed certificates
    headers: {
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=5, max=1000'
    },
    xfwd: true,
    protocolRewrite: isProduction && targetUrl.startsWith('https://') ? 'https' : undefined,
    onProxyReq: (proxyReq, req) => {
      proxyReq.setHeader('Connection', 'keep-alive');
      if (!isProduction && req.path.includes('/api/')) {
        logger.debug(`Proxy: ${req.method} ${req.path} -> ${service.name}`);
      }
    },
    onProxyRes: (proxyRes, req) => {
      if (req.method === 'GET' && proxyRes.statusCode === 200) {
        if (!req.path.includes('/auth/') && !req.path.includes('/profile')) {
          proxyRes.headers['Cache-Control'] = 'public, max-age=60, s-maxage=60';
        }
      }
      proxyRes.headers['X-Content-Type-Options'] = 'nosniff';
      proxyRes.headers['X-Frame-Options'] = 'DENY';
    },
    onError: (err, req, res) => {
      if (serviceRegistry[key]) {
        serviceRegistry[key].status = 'offline';
        serviceRegistry[key].lastChecked = Date.now();
      }
      
      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          message: `${service.name} is currently unavailable`,
          error: isProduction ? 'Service unavailable' : err.message
        });
      }
    }
  });
  
  app.use(basePath, (req, res, next) => {
    const registryService = serviceRegistry[key];
    if (registryService && registryService.status === 'offline' && isProduction) {
      return res.status(503).json({
        success: false,
        message: `${service.name} is currently offline`
      });
    }
    
    if (serviceUrl.includes('localhost') && isProduction) {
      return res.status(503).json({
        success: false,
        message: `${service.name} is not available`
      });
    }
    
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
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.path,
    method: req.method
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
