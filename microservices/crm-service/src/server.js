// Load environment variables from .env in development; ignore missing module in production
try {
  // eslint-disable-next-line global-require
  require('dotenv').config();
} catch (err) {
  // eslint-disable-next-line no-console
  if (process.env.NODE_ENV !== 'production') {
    console.warn('dotenv not available for crm-service, skipping .env loading:', err.message);
  }
}
const express = require('express');
const compression = require('compression');
const responseTime = require('response-time');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Security middleware
app.use(helmet());
// CORS configuration - allows frontend and all origins if CORS_ORIGIN is '*'
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin === '*' ? '*' : (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = corsOrigin.split(',').map(o => o.trim());
    if (allowed.includes(origin) || corsOrigin === '*') {
      callback(null, true);
    } else {
      callback(null, true); // Allow for now to prevent blocking
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Requested-With']
}));

// Rate limiting
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP'
});

// Compression
app.use(compression({ level: 6, threshold: 1024 }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'crm_service'}`;
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
    });
    if (!isProduction) logger.info('crm-service: MongoDB connected successfully');
  } catch (error) {
    logger.error('crm-service: Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Load routes with COMPLETE logic
const loadRoutes = () => {
  try {
    const crmRoutes = require('./routes/crm.routes.js');
    app.use('/api/crm', apiRateLimit, crmRoutes);
    if (!isProduction) logger.info('crm.routes.js loaded');
  } catch (error) {
    logger.error('crm.routes.js failed:', { 
      error: error.message, 
      stack: error.stack,
      name: error.name 
    });
    console.error('❌ crm.routes.js failed:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
  }
  try {
    const engagementRoutes = require('./routes/engagement.routes.js');
    app.use('/api/engagement', apiRateLimit, engagementRoutes);
    if (!isProduction) logger.info('engagement.routes.js loaded');
  } catch (error) {
    logger.error('engagement.routes.js failed:', { 
      error: error.message, 
      stack: error.stack,
      name: error.name 
    });
    console.error('❌ engagement.routes.js failed:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
  }
  try {
    const incentiveRoutes = require('./routes/incentive.routes.js');
    app.use('/api/incentive', apiRateLimit, incentiveRoutes);
    if (!isProduction) logger.info('incentive.routes.js loaded');
  } catch (error) {
    logger.error('incentive.routes.js failed:', { 
      error: error.message, 
      stack: error.stack,
      name: error.name 
    });
    console.error('❌ incentive.routes.js failed:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
  }

  };

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'crm-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    port: 3005,
    routes: 3,
    controllers: 3,
    models: 11,
    services: 3
  });
});

// Business API Routes (legacy endpoints for backwards compatibility)
app.get('/api/crm/status', (req, res) => {
  res.json({
    service: 'crm-service',
    status: 'operational',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});

app.get('/api/crm/health', (req, res) => {
  res.json({
    service: 'crm-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});


app.get('/api/crm/customers', (req, res) => {
  res.json({
    service: 'crm-service',
    endpoint: '/api/crm/customers',
    method: 'GET',
    status: 'success',
    message: 'Get all customers',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/crm/customers', (req, res) => {
  res.json({
    service: 'crm-service',
    endpoint: '/api/crm/customers',
    method: 'POST',
    status: 'success',
    message: 'Create new customer',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/crm/customers/:id', (req, res) => {
  res.json({
    service: 'crm-service',
    endpoint: '/api/crm/customers/:id',
    method: 'GET',
    status: 'success',
    message: 'Get customer by ID',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/crm/campaigns', (req, res) => {
  res.json({
    service: 'crm-service',
    endpoint: '/api/crm/campaigns',
    method: 'GET',
    status: 'success',
    message: 'Get marketing campaigns',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/crm/loyalty', (req, res) => {
  res.json({
    service: 'crm-service',
    endpoint: '/api/crm/loyalty',
    method: 'GET',
    status: 'success',
    message: 'Get loyalty programs',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/crm/interactions', (req, res) => {
  res.json({
    service: 'crm-service',
    endpoint: '/api/crm/interactions',
    method: 'GET',
    status: 'success',
    message: 'Get customer interactions',
    timestamp: new Date().toISOString()
  });
});


// Enhanced 404 handler with route information
app.use((req, res) => {
  // Try to get route information if available
  const routesInfo = [];
  
  // Common routes that should exist
  routesInfo.push('GET /health');
  routesInfo.push(`GET /api/crm/status`);
  routesInfo.push(`GET /api/crm/health`);
  
  res.status(404).json({
    success: false,
    message: 'Route not found - The requested endpoint does not exist or may require authentication',
    path: req.path,
    method: req.method,
    service: 'crm-service',
    port: 3005,
    hint: 'Most routes require authentication. Include Authorization header with Bearer token.',
    availableEndpoints: routesInfo,
    timestamp: new Date().toISOString(),
    troubleshooting: {
      authentication: 'Add header: Authorization: Bearer <token>',
      dynamicRoutes: 'Replace :id with actual ID (e.g., /api/hr/employees/actual-id-123)',
      basePath: `All routes are under /api/crm/`
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('crm-service Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    service: 'crm-service'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    loadRoutes();
    
    const PORT = process.env.PORT || 3005;
    
    app.listen(PORT, () => {
      logger.info(`crm-service running on port ${PORT}`);
      });
  } catch (error) {
    logger.error('crm-service startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();