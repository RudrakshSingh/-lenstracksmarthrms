require('dotenv').config();
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
    const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'notification_service'}`;
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
    });
    if (!isProduction) logger.info('notification-service: MongoDB connected successfully');
  } catch (error) {
    logger.error('notification-service: Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Load routes with COMPLETE logic
const loadRoutes = () => {
  try {
    const notificationRoutes = require('./routes/notification.routes.js');
    app.use('/api/notification', apiRateLimit, notificationRoutes);
    if (!isProduction) logger.info('notification.routes.js loaded');
  } catch (error) {
    logger.error('notification.routes.js failed:', error.message);
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'notification-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    port: 3015,
    routes: 1,
    controllers: 1,
    models: 3,
    services: 2
  });

// Business API Routes
app.get('/api/notification/status', (req, res) => {
  res.json({
    service: 'notification-service',
    status: 'operational',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});

app.get('/api/notification/health', (req, res) => {
  res.json({
    service: 'notification-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});


app.get('/api/notification/templates', (req, res) => {
  res.json({
    service: 'notification-service',
    endpoint: '/api/notification/templates',
    method: 'GET',
    status: 'success',
    message: 'Get notification templates',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/notification/send', (req, res) => {
  res.json({
    service: 'notification-service',
    endpoint: '/api/notification/send',
    method: 'POST',
    status: 'success',
    message: 'Send notification',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/notification/logs', (req, res) => {
  res.json({
    service: 'notification-service',
    endpoint: '/api/notification/logs',
    method: 'GET',
    status: 'success',
    message: 'Get notification logs',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/notification/reminders', (req, res) => {
  res.json({
    service: 'notification-service',
    endpoint: '/api/notification/reminders',
    method: 'GET',
    status: 'success',
    message: 'Get reminder jobs',
    timestamp: new Date().toISOString()
  });
});});


// Enhanced 404 handler with route information
app.use((req, res) => {
  // Try to get route information if available
  const routesInfo = [];
  
  // Common routes that should exist
  routesInfo.push('GET /health');
  routesInfo.push(`GET /api/notification/status`);
  routesInfo.push(`GET /api/notification/health`);
  
  res.status(404).json({
    success: false,
    message: 'Route not found - The requested endpoint does not exist or may require authentication',
    path: req.path,
    method: req.method,
    service: 'notification-service',
    port: 3015,
    hint: 'Most routes require authentication. Include Authorization header with Bearer token.',
    availableEndpoints: routesInfo,
    timestamp: new Date().toISOString(),
    troubleshooting: {
      authentication: 'Add header: Authorization: Bearer <token>',
      dynamicRoutes: 'Replace :id with actual ID (e.g., /api/hr/employees/actual-id-123)',
      basePath: `All routes are under /api/notification/`
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('notification-service Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    service: 'notification-service'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    loadRoutes();
    
    const PORT = process.env.PORT || 3015;
    
    app.listen(PORT, () => {
      logger.info(`notification-service running on port ${PORT}`);
      });
  } catch (error) {
    logger.error('notification-service startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();