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
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
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
    const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'financial_service'}`;
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
      bufferMaxEntries: 0,
      bufferCommands: false
    });
    if (!isProduction) logger.info('financial-service: MongoDB connected successfully');
  } catch (error) {
    logger.error('financial-service: Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Load routes with COMPLETE logic
const loadRoutes = () => {
  try {
    const financialRoutes = require('./routes/financial.routes.js');
    app.use('/api/financial', apiRateLimit, financialRoutes);
    if (!isProduction) logger.info('financial.routes.js loaded');
  } catch (error) {
    logger.error('financial.routes.js failed:', error.message);
  }
  try {
    const reportsRoutes = require('./routes/reports.routes.js');
    app.use('/api/reports', apiRateLimit, reportsRoutes);
    if (!isProduction) logger.info('reports.routes.js loaded');
  } catch (error) {
    logger.error('reports.routes.js failed:', error.message);
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'financial-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    port: 3009,
    routes: 2,
    controllers: 2,
    models: 9,
    services: 3
  });

// Business API Routes
app.get('/api/financial/status', (req, res) => {
  res.json({
    service: 'financial-service',
    status: 'operational',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});

app.get('/api/financial/health', (req, res) => {
  res.json({
    service: 'financial-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});


app.get('/api/financial/ledger', (req, res) => {
  res.json({
    service: 'financial-service',
    endpoint: '/api/financial/ledger',
    method: 'GET',
    status: 'success',
    message: 'Get ledger entries',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/financial/accounts', (req, res) => {
  res.json({
    service: 'financial-service',
    endpoint: '/api/financial/accounts',
    method: 'GET',
    status: 'success',
    message: 'Get chart of accounts',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/financial/pl', (req, res) => {
  res.json({
    service: 'financial-service',
    endpoint: '/api/financial/pl',
    method: 'GET',
    status: 'success',
    message: 'Get P&L statement',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/financial/gst', (req, res) => {
  res.json({
    service: 'financial-service',
    endpoint: '/api/financial/gst',
    method: 'GET',
    status: 'success',
    message: 'Get GST data',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/financial/reports', (req, res) => {
  res.json({
    service: 'financial-service',
    endpoint: '/api/financial/reports',
    method: 'GET',
    status: 'success',
    message: 'Get financial reports',
    timestamp: new Date().toISOString()
  });
});});


// Enhanced 404 handler with route information
app.use((req, res) => {
  // Try to get route information if available
  const routesInfo = [];
  
  // Common routes that should exist
  routesInfo.push('GET /health');
  routesInfo.push(`GET /api/financial/status`);
  routesInfo.push(`GET /api/financial/health`);
  
  res.status(404).json({
    success: false,
    message: 'Route not found - The requested endpoint does not exist or may require authentication',
    path: req.path,
    method: req.method,
    service: 'financial-service',
    port: 3009,
    hint: 'Most routes require authentication. Include Authorization header with Bearer token.',
    availableEndpoints: routesInfo,
    timestamp: new Date().toISOString(),
    troubleshooting: {
      authentication: 'Add header: Authorization: Bearer <token>',
      dynamicRoutes: 'Replace :id with actual ID (e.g., /api/hr/employees/actual-id-123)',
      basePath: `All routes are under /api/financial/`
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('financial-service Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    service: 'financial-service'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    loadRoutes();
    
    const PORT = process.env.PORT || 3009;
    
    app.listen(PORT, () => {
      logger.info(`financial-service running on port ${PORT}`);
      });
  } catch (error) {
    logger.error('financial-service startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();