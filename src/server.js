require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const path = require('path');

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
    const axios = require('axios');
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
  // Use environment variables for service URLs, fallback to Azure App Service URLs
  const authServiceUrl = process.env.AUTH_SERVICE_URL || 
                        process.env.AUTH_SERVICE_APP_URL || 
                        'https://etelios-auth-service.azurewebsites.net';
  const hrServiceUrl = process.env.HR_SERVICE_URL || 
                      process.env.HR_SERVICE_APP_URL || 
                      'https://etelios-hr-service.azurewebsites.net';
  
  // Check service status
  const [authStatus, hrStatus] = await Promise.all([
    checkServiceStatus(authServiceUrl),
    checkServiceStatus(hrServiceUrl)
  ]);
  
  res.json({
    service: 'Etelios API Gateway - Auth & HR Services',
    version: '1.0.0',
    status: 'operational',
    message: 'Welcome to Etelios HRMS API - Running Auth and HR Services Only',
    baseUrl: baseUrl,
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
      hr: '/api/hr'
    },
    services: {
      auth: {
        url: authServiceUrl,
        endpoint: '/api/auth',
        status: authStatus,
        note: authStatus === 'offline' ? 'App Service not created or not running. Please create the App Service in Azure.' : null
      },
      hr: {
        url: hrServiceUrl,
        endpoint: '/api/hr',
        status: hrStatus,
        note: hrStatus === 'offline' ? 'App Service not created or not running. Please create the App Service in Azure.' : null
      }
    },
    documentation: {
      swagger: '/api-docs',
      postman: '/postman/HRMS-API-Collection.json'
    },
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    note: 'This API Gateway routes to Auth and HR services only. Other services are not available.'
  });
});

// API Documentation endpoint
app.get('/api', async (req, res) => {
  // Use environment variables for service URLs, fallback to Azure App Service URLs
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const authServiceUrl = process.env.AUTH_SERVICE_URL || 
                        process.env.AUTH_SERVICE_APP_URL || 
                        'https://etelios-auth-service.azurewebsites.net';
  const hrServiceUrl = process.env.HR_SERVICE_URL || 
                      process.env.HR_SERVICE_APP_URL || 
                      'https://etelios-hr-service.azurewebsites.net';
  
  // Check service status
  const [authStatus, hrStatus] = await Promise.all([
    checkServiceStatus(authServiceUrl),
    checkServiceStatus(hrServiceUrl)
  ]);
  
  res.json({
    message: 'Etelios HRMS API Gateway - Auth & HR Services Only',
    version: '1.0.0',
    gateway: {
      url: baseUrl,
      status: 'operational'
    },
    services: {
      'auth': {
        url: authServiceUrl,
        endpoint: '/api/auth',
        status: authStatus,
        note: authStatus === 'offline' ? 'App Service not created or not running' : null
      },
      'hr': {
        url: hrServiceUrl,
        endpoint: '/api/hr',
        status: hrStatus,
        note: hrStatus === 'offline' ? 'App Service not created or not running' : null
      }
    },
    endpoints: {
      'health': '/health',
      'api': '/api',
      'auth': '/api/auth',
      'hr': '/api/hr'
    },
    documentation: {
      'swagger': '/api-docs',
      'postman': '/postman/HRMS-API-Collection.json'
    },
    note: 'This API Gateway routes to Auth and HR services only. Other services are not available.'
  });
});

// Service proxy endpoints - Only Auth and HR Services
app.use('/api/auth', (req, res) => {
  // Use environment variables, fallback to Azure App Service URLs (not localhost)
  const authServiceUrl = process.env.AUTH_SERVICE_URL || 
                        process.env.AUTH_SERVICE_APP_URL || 
                        'https://etelios-auth-service.azurewebsites.net';
  
  // Check if Auth service URL is set and not localhost
  if (!authServiceUrl || authServiceUrl.includes('localhost')) {
    return res.status(503).json({
      success: false,
      message: 'Auth Service is not available',
      error: 'The Auth service App Service has not been created yet',
      hint: 'Please create the Auth service App Service or configure AUTH_SERVICE_URL environment variable',
      availableEndpoints: [
        'GET /',
        'GET /health',
        'GET /api'
      ]
    });
  }
  
  const targetUrl = `${authServiceUrl}${req.originalUrl}`;
  
  // Redirect to the actual service
  res.redirect(302, targetUrl);
});

app.use('/api/hr', (req, res) => {
  // Use environment variables, fallback to Azure App Service URLs (not localhost)
  const hrServiceUrl = process.env.HR_SERVICE_URL || 
                      process.env.HR_SERVICE_APP_URL || 
                      'https://etelios-hr-service.azurewebsites.net';
  
  // Check if HR service URL is set and not localhost
  if (!hrServiceUrl || hrServiceUrl.includes('localhost')) {
    return res.status(503).json({
      success: false,
      message: 'HR Service is not available',
      error: 'The HR service App Service has not been created yet',
      hint: 'Please create the HR service App Service or configure HR_SERVICE_URL environment variable',
      availableEndpoints: [
        'GET /',
        'GET /health',
        'GET /api'
      ]
    });
  }
  
  const targetUrl = `${hrServiceUrl}${req.originalUrl}`;
  
  // Redirect to the actual service
  res.redirect(302, targetUrl);
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
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api',
      'GET /api/auth',
      'GET /api/hr'
    ],
    hint: 'This API Gateway routes to Auth and HR services only. Use /api/auth or /api/hr endpoints.'
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
