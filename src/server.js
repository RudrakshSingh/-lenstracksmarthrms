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

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Helper function to check service status
const checkServiceStatus = async (serviceUrl) => {
  try {
    const response = await axios.get(`${serviceUrl}/health`, { 
      timeout: 3000,
      validateStatus: () => true // Don't throw on any status code
    });
    return response.status === 200 ? 'online' : 'unhealthy';
  } catch (error) {
    return 'offline';
  }
};

// Root route - API information
app.get('/', async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const allServices = servicesConfig.getAllServices();
  
  // Check status for all services
  const serviceStatuses = {};
  const statusChecks = Object.entries(allServices).map(async ([key, service]) => {
    if (!service.isWebSocket) {
      const status = await checkServiceStatus(service.url);
      serviceStatuses[key] = {
        ...service,
        status: status,
        note: status === 'offline' && service.url.includes('localhost') 
          ? 'Service not deployed to Azure yet. Configure service URL via environment variable.' 
          : null
      };
    } else {
      serviceStatuses[key] = {
        ...service,
        status: 'unknown',
        note: 'WebSocket service - status check not available'
      };
    }
  });
  
  await Promise.all(statusChecks);
  
  res.json({
    service: 'Etelios API Gateway - All Microservices',
    version: '1.0.0',
    status: 'operational',
    message: 'Welcome to Etelios HRMS & ERP API Gateway',
    baseUrl: baseUrl,
    endpoints: {
      health: '/health',
      api: '/api',
      services: Object.values(serviceStatuses).map(s => s.basePath)
    },
    services: serviceStatuses,
    documentation: {
      swagger: '/api-docs',
      postman: '/postman/HRMS-API-Collection.json',
      frontendGuide: 'See FRONTEND-API-ACCESS.md for frontend integration guide'
    },
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Documentation endpoint
app.get('/api', async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const allServices = servicesConfig.getAllServices();
  
  // Check status for all services
  const serviceStatuses = {};
  const statusChecks = Object.entries(allServices).map(async ([key, service]) => {
    if (!service.isWebSocket) {
      const status = await checkServiceStatus(service.url);
      serviceStatuses[key] = {
        ...service,
        status: status,
        note: status === 'offline' && service.url.includes('localhost') 
          ? 'Service not deployed to Azure yet' 
          : null
      };
    } else {
      serviceStatuses[key] = {
        ...service,
        status: 'unknown',
        note: 'WebSocket service'
      };
    }
  });
  
  await Promise.all(statusChecks);
  
  res.json({
    message: 'Etelios HRMS & ERP API Gateway',
    version: '1.0.0',
    gateway: {
      url: baseUrl,
      status: 'operational'
    },
    services: serviceStatuses,
    endpoints: {
      'health': '/health',
      'api': '/api',
      ...Object.fromEntries(Object.entries(allServices).map(([key, s]) => [key, s.basePath]))
    },
    documentation: {
      'swagger': '/api-docs',
      'postman': '/postman/HRMS-API-Collection.json',
      'frontendGuide': 'See FRONTEND-API-ACCESS.md'
    }
  });
});

// Create proxy middleware for each service
const allServices = servicesConfig.getAllServices();

Object.entries(allServices).forEach(([key, service]) => {
  const serviceUrl = service.url;
  const basePath = service.basePath;
  const serviceConfig = servicesConfig.services[key];
  
  // Skip WebSocket services for now (they need special handling)
  if (service.isWebSocket) {
    logger.info(`WebSocket service ${key} configured at ${basePath} - requires WebSocket proxy setup`);
    return;
  }
  
  // Create proxy middleware for main base path
  const proxyMiddleware = createProxyMiddleware({
    target: serviceUrl,
    changeOrigin: true,
    pathRewrite: {
      [`^${basePath}`]: '', // Remove base path when forwarding to service
    },
    timeout: 30000, // 30 second timeout
    proxyTimeout: 30000,
    onProxyReq: (proxyReq, req, res) => {
      // Log proxy requests
      logger.info(`Proxying ${req.method} ${req.originalUrl} to ${serviceUrl}${req.path}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      // Log successful proxy responses
      logger.info(`Proxied ${req.method} ${req.originalUrl} - Status: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${service.name}:`, err.message);
      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          message: `${service.name} is currently unavailable`,
          error: err.message,
          service: service.name,
          url: serviceUrl
        });
      }
    }
  });
  
  // Apply proxy middleware to base path
  app.use(basePath, (req, res, next) => {
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
  
  logger.info(`Proxy route configured: ${basePath} -> ${serviceUrl}`);
  
  // Handle sub-routes (like geofencing for attendance service)
  if (serviceConfig.subRoutes && Array.isArray(serviceConfig.subRoutes)) {
    serviceConfig.subRoutes.forEach(subRoute => {
      const subRouteProxy = createProxyMiddleware({
        target: serviceUrl,
        changeOrigin: true,
        pathRewrite: {
          [`^${subRoute}`]: subRoute, // Keep the path as-is when forwarding
        },
        timeout: 30000,
        proxyTimeout: 30000,
        onError: (err, req, res) => {
          logger.error(`Proxy error for ${service.name} sub-route ${subRoute}:`, err.message);
          if (!res.headersSent) {
            res.status(503).json({
              success: false,
              message: `${service.name} is currently unavailable`,
              error: err.message
            });
          }
        }
      });
      
      app.use(subRoute, (req, res, next) => {
        if (serviceUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
          return res.status(503).json({
            success: false,
            message: `${service.name} is not available`,
            error: 'The service App Service has not been created yet'
          });
        }
        subRouteProxy(req, res, next);
      });
      
      logger.info(`Sub-route proxy configured: ${subRoute} -> ${serviceUrl}`);
    });
  }
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

// 404 handler
app.use('*', (req, res) => {
  const allServices = servicesConfig.getAllServices();
  const availableEndpoints = [
    'GET /',
    'GET /health',
    'GET /api',
    ...Object.values(allServices).map(s => `${s.basePath}/*`)
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
  server = app.listen(SERVER_PORT, '0.0.0.0', () => {
    logger.info(`🚀 Etelios Main Server started on port ${SERVER_PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Health check: http://0.0.0.0:${SERVER_PORT}/health`);
    logger.info(`API docs: http://0.0.0.0:${SERVER_PORT}/api`);
    
    // Log all configured proxy routes
    const allServices = servicesConfig.getAllServices();
    logger.info(`Configured ${Object.keys(allServices).length} microservices:`);
    Object.entries(allServices).forEach(([key, service]) => {
      logger.info(`  - ${service.basePath} -> ${service.url}`);
    });
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
