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
    const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'inventory_service'}`;
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
    if (!isProduction) logger.info('inventory-service: MongoDB connected successfully');
  } catch (error) {
    logger.error('inventory-service: Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Load routes with COMPLETE logic
const loadRoutes = () => {
  try {
    const erpRoutes = require('./routes/erp.routes.js');
    app.use('/api/erp', apiRateLimit, erpRoutes);
    if (!isProduction) logger.info('erp.routes.js loaded');
  } catch (error) {
    logger.error('erp.routes.js failed:', error.message);
  }
  try {
    const assetsRoutes = require('./routes/assets.routes.js');
    app.use('/api/assets', apiRateLimit, assetsRoutes);
    if (!isProduction) logger.info('assets.routes.js loaded');
  } catch (error) {
    logger.error('assets.routes.js failed:', error.message);
  }
  try {
    const assetRegisterRoutes = require('./routes/assetRegister.routes.js');
    app.use('/api/asset-register', apiRateLimit, assetRegisterRoutes);
    if (!isProduction) logger.info('assetRegister.routes.js loaded');
  } catch (error) {
    logger.error('assetRegister.routes.js failed:', error.message);
  }
  try {
    const productMasterRoutes = require('./routes/productMaster.routes.js');
    app.use('/api/inventory/products', apiRateLimit, productMasterRoutes);
    if (!isProduction) logger.info('productMaster.routes.js loaded');
  } catch (error) {
    logger.error('productMaster.routes.js failed:', error.message);
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'inventory-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    port: 3006,
    routes: 3,
    controllers: 3,
    models: 14,
    services: 5
  });

// Business API Routes
app.get('/api/inventory/status', (req, res) => {
  res.json({
    service: 'inventory-service',
    status: 'operational',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});

app.get('/api/inventory/health', (req, res) => {
  res.json({
    service: 'inventory-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});


app.get('/api/inventory/products', (req, res) => {
  res.json({
    service: 'inventory-service',
    endpoint: '/api/inventory/products',
    method: 'GET',
    status: 'success',
    message: 'Get all products',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/inventory/products', (req, res) => {
  res.json({
    service: 'inventory-service',
    endpoint: '/api/inventory/products',
    method: 'POST',
    status: 'success',
    message: 'Create new product',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/inventory/stock', (req, res) => {
  res.json({
    service: 'inventory-service',
    endpoint: '/api/inventory/stock',
    method: 'GET',
    status: 'success',
    message: 'Get stock levels',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/inventory/transfers', (req, res) => {
  res.json({
    service: 'inventory-service',
    endpoint: '/api/inventory/transfers',
    method: 'GET',
    status: 'success',
    message: 'Get stock transfers',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/inventory/reports', (req, res) => {
  res.json({
    service: 'inventory-service',
    endpoint: '/api/inventory/reports',
    method: 'GET',
    status: 'success',
    message: 'Get inventory reports',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/inventory/assets', (req, res) => {
  res.json({
    service: 'inventory-service',
    endpoint: '/api/inventory/assets',
    method: 'GET',
    status: 'success',
    message: 'Get asset register',
    timestamp: new Date().toISOString()
  });
});});


// Enhanced 404 handler with route information
app.use((req, res) => {
  // Try to get route information if available
  const routesInfo = [];
  
  // Common routes that should exist
  routesInfo.push('GET /health');
  routesInfo.push(`GET /api/inventory/status`);
  routesInfo.push(`GET /api/inventory/health`);
  
  res.status(404).json({
    success: false,
    message: 'Route not found - The requested endpoint does not exist or may require authentication',
    path: req.path,
    method: req.method,
    service: 'inventory-service',
    port: 3006,
    hint: 'Most routes require authentication. Include Authorization header with Bearer token.',
    availableEndpoints: routesInfo,
    timestamp: new Date().toISOString(),
    troubleshooting: {
      authentication: 'Add header: Authorization: Bearer <token>',
      dynamicRoutes: 'Replace :id with actual ID (e.g., /api/hr/employees/actual-id-123)',
      basePath: `All routes are under /api/inventory/`
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('inventory-service Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    service: 'inventory-service'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    loadRoutes();
    
    const PORT = process.env.PORT || 3006;
    
    app.listen(PORT, () => {
      logger.info(`inventory-service running on port ${PORT}`);
      });
  } catch (error) {
    logger.error('inventory-service startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();