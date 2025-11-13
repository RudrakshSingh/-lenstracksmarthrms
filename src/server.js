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

// Root route - API information
app.get('/', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  // Use environment variables for service URLs, fallback to Azure App Service URLs
  const authServiceUrl = process.env.AUTH_SERVICE_URL || 
                        process.env.AUTH_SERVICE_APP_URL || 
                        'https://etelios-auth-service.azurewebsites.net';
  const hrServiceUrl = process.env.HR_SERVICE_URL || 
                      process.env.HR_SERVICE_APP_URL || 
                      'https://etelios-hr-service.azurewebsites.net';
  
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
        status: 'active'
      },
      hr: {
        url: hrServiceUrl,
        endpoint: '/api/hr',
        status: 'active'
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
app.get('/api', (req, res) => {
  // Use environment variables for service URLs, fallback to Azure App Service URLs
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const authServiceUrl = process.env.AUTH_SERVICE_URL || 
                        process.env.AUTH_SERVICE_APP_URL || 
                        'https://etelios-auth-service.azurewebsites.net';
  const hrServiceUrl = process.env.HR_SERVICE_URL || 
                      process.env.HR_SERVICE_APP_URL || 
                      'https://etelios-hr-service.azurewebsites.net';
  
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
        status: 'active'
      },
      'hr': {
        url: hrServiceUrl,
        endpoint: '/api/hr',
        status: 'active'
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
  const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
  const targetUrl = `${authServiceUrl}${req.originalUrl}`;
  
  // Use proxy or redirect based on environment
  if (process.env.USE_PROXY === 'true') {
    // For production, you might want to use http-proxy-middleware
    // For now, redirect to the service
    res.redirect(302, targetUrl);
  } else {
    res.redirect(302, targetUrl);
  }
});

app.use('/api/hr', (req, res) => {
  const hrServiceUrl = process.env.HR_SERVICE_URL || 'http://localhost:3002';
  const targetUrl = `${hrServiceUrl}${req.originalUrl}`;
  
  // Use proxy or redirect based on environment
  if (process.env.USE_PROXY === 'true') {
    // For production, you might want to use http-proxy-middleware
    // For now, redirect to the service
    res.redirect(302, targetUrl);
  } else {
    res.redirect(302, targetUrl);
  }
});

// Error handling middleware
app.use((err, req, res) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
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
const server = app.listen(SERVER_PORT, '0.0.0.0', () => {
  logger.info(`🚀 Etelios Main Server started on port ${SERVER_PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check: http://0.0.0.0:${SERVER_PORT}/health`);
  logger.info(`API docs: http://0.0.0.0:${SERVER_PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully.');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully.');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

module.exports = app;
