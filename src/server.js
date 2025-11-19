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

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
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

// Production-grade security middleware
const { applyProductionSecurity, rateLimiters } = require('./middleware/production-security');
const securityConfig = applyProductionSecurity(app);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

// Apply rate limiting based on endpoint type
app.use('/api/auth/login', securityConfig.rateLimiters.auth);
app.use('/api/auth/register', securityConfig.rateLimiters.auth);
app.use('/api/auth/change-password', securityConfig.rateLimiters.sensitive);
app.use('/api/auth/reset-password', securityConfig.rateLimiters.sensitive);
app.use('/api', securityConfig.rateLimiters.api);
app.use('/', securityConfig.rateLimiters.public);

// Body parsing middleware - optimized for performance
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for signature verification if needed
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000 // Limit number of parameters
}));

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Etelios Main Server',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Cache utility for service status
const cache = require('./utils/cache');

// Helper function to check service status with caching
const checkServiceStatus = async (serviceUrl) => {
  const cacheKey = `service_status:${serviceUrl}`;
  
  // Try to get from cache first (5 second TTL for service status)
  const cached = cache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  
  try {
    const response = await axios.get(`${serviceUrl}/health`, { 
      timeout: 2000, // Reduced timeout for faster failure
      validateStatus: () => true, // Don't throw on any status code
      headers: {
        'Connection': 'keep-alive' // Reuse connections
      }
    });
    const status = response.status === 200 ? 'online' : 'unhealthy';
    // Cache for 5 seconds
    cache.set(cacheKey, status, 5);
    return status;
  } catch (error) {
    const status = 'offline';
    // Cache offline status for 10 seconds (longer to avoid hammering offline services)
    cache.set(cacheKey, status, 10);
    return status;
  }
};

// Service registry for dynamic management
const serviceRegistry = {};

// Initialize service registry from config
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
      note: null,
      lastChecked: null
    };
  });
}

// Update service statuses in registry
async function updateServiceStatuses() {
  const updatePromises = Object.entries(serviceRegistry).map(async ([key, service]) => {
    if (!service.isWebSocket) {
      const status = await checkServiceStatus(service.url);
      serviceRegistry[key].status = status;
      serviceRegistry[key].lastChecked = new Date().toISOString();
      serviceRegistry[key].note = status === 'offline' && service.url.includes('localhost') 
        ? 'Service not deployed to Azure yet. Configure service URL via environment variable.' 
        : null;
    } else {
      serviceRegistry[key].status = 'unknown';
      serviceRegistry[key].note = 'WebSocket service - status check not available';
      serviceRegistry[key].lastChecked = new Date().toISOString();
    }
  });
  
  await Promise.all(updatePromises);
  logger.info('Service statuses updated');
}

// Initialize registry on startup (before routes)
initializeServiceRegistry();

// Variable to hold status update interval (started after server is ready)
let statusUpdateInterval = null;

// Root route - API information (redirects to /api for consistency)
app.get('/', async (req, res) => {
  // Redirect to /api endpoint for service discovery
  const baseUrl = process.env.GATEWAY_URL || `${req.protocol}://${req.get('host')}`;
  
  // Quick status update (non-blocking)
  updateServiceStatuses().catch(err => logger.error('Error updating service statuses:', err));
  
  res.json({
    service: 'Etelios API Gateway - All Microservices',
    version: '1.0.0',
    status: 'operational',
    message: 'Welcome to Etelios HRMS & ERP API Gateway',
    baseUrl: baseUrl,
    endpoints: {
      health: '/health',
      api: '/api',
      admin: '/admin/services'
    },
    note: 'Use /api endpoint for complete service discovery',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Documentation endpoint - Frontend Discovery Endpoint
app.get('/api', async (req, res) => {
  const baseUrl = process.env.GATEWAY_URL || `${req.protocol}://${req.get('host')}`;
  
  // Update service statuses before responding (with timeout to avoid blocking)
  const statusUpdatePromise = updateServiceStatuses();
  const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2000)); // Max 2 seconds
  await Promise.race([statusUpdatePromise, timeoutPromise]);
  
  // Format services for frontend
  const formattedServices = {};
  Object.entries(serviceRegistry).forEach(([key, service]) => {
    formattedServices[key] = {
      name: service.name,
      port: service.port,
      basePath: service.basePath,
      url: service.url,
      isWebSocket: service.isWebSocket,
      status: service.status,
      note: service.note
    };
  });
  
  // Get all service base paths for endpoints list
  const serviceEndpoints = Object.values(serviceRegistry).map(s => s.basePath);
  
  res.json({
    "service": "Etelios API Gateway - All Microservices",
    "version": "1.0.0",
    "status": "operational",
    "message": "Welcome to Etelios HRMS & ERP API Gateway",
    "baseUrl": baseUrl,
    "endpoints": {
      "health": "/health",
      "api": "/api",
      "services": serviceEndpoints
    },
    "services": formattedServices,
    "documentation": {
      "swagger": "/api-docs",
      "postman": "/postman/HRMS-API-Collection.json",
      "frontendGuide": "See FRONTEND-API-ACCESS.md"
    },
    "timestamp": new Date().toISOString(),
    "environment": process.env.NODE_ENV || "development"
  });
});

// Create proxy middleware for each service
// IMPORTANT: Order matters - more specific paths should be registered first
// So /api/hr-letter and /api/transfers should come before /api/hr

// First, get all services and sort by path specificity (longer paths first)
const allServices = servicesConfig.getAllServices();
const sortedServices = Object.entries(allServices).sort((a, b) => {
  // Sort by path length (longer = more specific = should come first)
  return b[1].basePath.length - a[1].basePath.length;
});

// Create proxy middleware for each service
// IMPORTANT: Order matters - more specific paths should be registered first
sortedServices.forEach(([key, service]) => {
  const serviceUrl = service.url;
  const basePath = service.basePath;
  const serviceConfig = servicesConfig.services[key];
  
  // Skip WebSocket services for now (they need special handling)
  if (service.isWebSocket) {
    logger.info(`WebSocket service ${key} configured at ${basePath} - requires WebSocket proxy setup`);
    return;
  }
  
  // Create proxy middleware for main base path - optimized for performance
  // Note: We don't rewrite the path because services expect the full path (e.g., /api/auth/login)
  const proxyMiddleware = createProxyMiddleware({
    target: serviceUrl,
    changeOrigin: true,
    // No pathRewrite - forward the full path as services mount routes at /api/auth, /api/hr, etc.
    timeout: 30000, // Increased to 30 seconds to handle slow Azure responses
    proxyTimeout: 30000,
    // Optimize headers
    headers: {
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=5, max=1000'
    },
    // Enable HTTP/2 if supported
    xfwd: true, // Add X-Forwarded-* headers
    // Optimize request handling
    onProxyReq: (proxyReq, req, res) => {
      // Set keep-alive for better connection reuse
      proxyReq.setHeader('Connection', 'keep-alive');
      
      // Log proxy requests for debugging
      logger.info(`[Proxy] ${req.method} ${req.originalUrl} -> ${serviceUrl}${req.path}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      // Add caching headers for GET requests
      if (req.method === 'GET' && proxyRes.statusCode === 200) {
        // Cache public GET requests for 60 seconds
        if (!req.path.includes('/auth/') && !req.path.includes('/profile')) {
          proxyRes.headers['Cache-Control'] = 'public, max-age=60, s-maxage=60';
        }
      }
      
      // Add performance headers
      proxyRes.headers['X-Content-Type-Options'] = 'nosniff';
      proxyRes.headers['X-Frame-Options'] = 'DENY';
      
      // Log proxy responses for debugging
      logger.info(`[Proxy] ${req.method} ${req.originalUrl} <- ${proxyRes.statusCode} from ${service.name}`);
    },
    onError: (err, req, res) => {
      logger.error(`[Proxy Error] ${service.name} - ${req.method} ${req.originalUrl}:`, err.message);
      
      // Update service status in registry
      if (serviceRegistry[key]) {
        serviceRegistry[key].status = 'offline';
        serviceRegistry[key].lastChecked = new Date().toISOString();
      }
      
      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          message: `${service.name} is currently unavailable`,
          error: err.message,
          service: service.name,
          url: serviceUrl,
          path: req.path,
          originalUrl: req.originalUrl
        });
      }
    }
  });
  
  // Apply proxy middleware using Express path matching
  // Express app.use('/api/auth', ...) automatically matches /api/auth and all sub-paths like /api/auth/status
  // No wildcard needed - Express handles this automatically
  app.use(basePath, (req, res, next) => {
    // Check service status from registry
    const registryService = serviceRegistry[key];
    if (registryService && registryService.status === 'offline' && process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        success: false,
        message: `${service.name} is currently offline`,
        error: 'Service is not available',
        hint: `Check service status at /api endpoint`,
        availableEndpoints: [
          'GET /',
          'GET /health',
          'GET /api',
          'GET /admin/services'
        ]
      });
    }
    
    // Log the request for debugging
    logger.info(`[Gateway] Proxying ${req.method} ${req.originalUrl} to ${service.name} at ${serviceUrl}${req.path}`);
    
    // Check if service URL is localhost (not deployed) in production
    if (serviceUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        success: false,
        message: `${service.name} is not available`,
        error: 'The service App Service has not been created yet',
        hint: `Please create the ${service.name} App Service or configure ${serviceConfig.envVar} environment variable`,
        availableEndpoints: [
          'GET /',
          'GET /health',
          'GET /api'
        ]
      });
    }
    
    // Use the proxy middleware
    proxyMiddleware(req, res, next);
  });
  
  logger.info(`Proxy route configured: ${basePath}* -> ${serviceUrl}`);
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Admin endpoint for service monitoring
app.get('/admin/services', async (req, res) => {
  // Update statuses before responding
  await updateServiceStatuses();
  
  const serviceStatus = Object.entries(serviceRegistry).map(([key, service]) => ({
    name: key,
    url: service.url,
    status: service.status,
    basePath: service.basePath,
    isWebSocket: service.isWebSocket,
    lastChecked: service.lastChecked,
    note: service.note
  }));
  
  const onlineCount = serviceStatus.filter(s => s.status === 'online').length;
  const offlineCount = serviceStatus.filter(s => s.status === 'offline').length;
  const unknownCount = serviceStatus.filter(s => s.status === 'unknown').length;
  
  res.json({
    totalServices: serviceStatus.length,
    onlineServices: onlineCount,
    offlineServices: offlineCount,
    unknownServices: unknownCount,
    services: serviceStatus,
    lastUpdated: new Date().toISOString()
  });
});

// Manual service registration endpoint (for admin use)
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
    note: 'Manually added service',
    lastChecked: null
  };
  
  logger.info(`Service ${name} manually added to registry`);
  
  res.json({
    success: true,
    message: `Service ${name} added successfully`,
    service: serviceRegistry[name]
  });
});

// Remove service endpoint (for admin use)
app.delete('/admin/services/:name', (req, res) => {
  const { name } = req.params;
  
  if (!serviceRegistry[name]) {
    return res.status(404).json({
      success: false,
      error: `Service ${name} not found in registry`
    });
  }
  
  delete serviceRegistry[name];
  logger.info(`Service ${name} removed from registry`);
  
  res.json({
    success: true,
    message: `Service ${name} removed successfully`
  });
});

// 404 handler
app.use('*', (req, res) => {
  const availableEndpoints = [
    'GET /',
    'GET /health',
    'GET /api',
    'GET /admin/services',
    ...Object.values(serviceRegistry).map(s => `${s.basePath}/*`)
  ];
  
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.path,
    method: req.method,
    availableEndpoints: availableEndpoints,
    hint: 'Check /api endpoint for all available services and their endpoints'
  });
});

// Start server
// Azure App Service sets PORT automatically, use it or default to 3000
const SERVER_PORT = process.env.PORT || process.env.WEBSITES_PORT || PORT;

let server;
try {
  server = app.listen(SERVER_PORT, '0.0.0.0', async () => {
    logger.info(`🚀 Etelios Main Server started on port ${SERVER_PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Health check: http://0.0.0.0:${SERVER_PORT}/health`);
    logger.info(`API docs: http://0.0.0.0:${SERVER_PORT}/api`);
    logger.info(`Admin services: http://0.0.0.0:${SERVER_PORT}/admin/services`);
    
    // Log all configured proxy routes
    const allServices = servicesConfig.getAllServices();
    logger.info(`Configured ${Object.keys(allServices).length} microservices:`);
    Object.entries(allServices).forEach(([key, service]) => {
      logger.info(`  - ${service.basePath} -> ${service.url}`);
    });
    
    // Initial service status update
    logger.info('Performing initial service status check...');
    await updateServiceStatuses();
    logger.info('Initial service status check completed');
    
    // Start periodic status updates (every 30 seconds)
    statusUpdateInterval = setInterval(async () => {
      await updateServiceStatuses();
      const statusSummary = Object.entries(serviceRegistry)
        .map(([key, service]) => `${key}: ${service.status}`)
        .join(', ');
      logger.info(`Service statuses: ${statusSummary}`);
    }, 30000);
  });

  // Handle server errors
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

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully.');
  if (statusUpdateInterval) {
    clearInterval(statusUpdateInterval);
  }
  if (server) {
    server.close(() => {
      logger.info('Process terminated');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully.');
  if (statusUpdateInterval) {
    clearInterval(statusUpdateInterval);
  }
  if (server) {
    server.close(() => {
      logger.info('Process terminated');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

module.exports = app;
