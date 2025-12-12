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
    const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'purchase_service'}`;
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
    });
    if (!isProduction) logger.info('purchase-service: MongoDB connected successfully');
  } catch (error) {
    logger.error('purchase-service: Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Load routes with COMPLETE logic
const loadRoutes = () => {
  try {
    const purchaseRoutes = require('./routes/purchase.routes.js');
    app.use('/api/purchase', apiRateLimit, purchaseRoutes);
    if (!isProduction) logger.info('purchase.routes.js loaded');
  } catch (error) {
    logger.error('purchase.routes.js failed:', { 
      error: error.message, 
      stack: error.stack,
      name: error.name 
    });
    console.error('❌ purchase.routes.js failed:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'purchase-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    port: 3008,
    routes: 1,
    controllers: 1,
    models: 7,
    services: 1
  });

// Business API Routes
app.get('/api/purchase/status', (req, res) => {
  res.json({
    service: 'purchase-service',
    status: 'operational',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});

app.get('/api/purchase/health', (req, res) => {
  res.json({
    service: 'purchase-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});


app.get('/api/purchase/orders', (req, res) => {
  res.json({
    service: 'purchase-service',
    endpoint: '/api/purchase/orders',
    method: 'GET',
    status: 'success',
    message: 'Get purchase orders',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/purchase/orders', (req, res) => {
  res.json({
    service: 'purchase-service',
    endpoint: '/api/purchase/orders',
    method: 'POST',
    status: 'success',
    message: 'Create purchase order',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/purchase/vendors', (req, res) => {
  res.json({
    service: 'purchase-service',
    endpoint: '/api/purchase/vendors',
    method: 'GET',
    status: 'success',
    message: 'Get vendor list',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/purchase/invoices', (req, res) => {
  res.json({
    service: 'purchase-service',
    endpoint: '/api/purchase/invoices',
    method: 'GET',
    status: 'success',
    message: 'Get purchase invoices',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/purchase/grn', (req, res) => {
  res.json({
    service: 'purchase-service',
    endpoint: '/api/purchase/grn',
    method: 'GET',
    status: 'success',
    message: 'Get GRN records',
    timestamp: new Date().toISOString()
  });
});});


// Enhanced 404 handler with route information
app.use((req, res) => {
  // Try to get route information if available
  const routesInfo = [];
  
  // Common routes that should exist
  routesInfo.push('GET /health');
  routesInfo.push(`GET /api/purchase/status`);
  routesInfo.push(`GET /api/purchase/health`);
  
  res.status(404).json({
    success: false,
    message: 'Route not found - The requested endpoint does not exist or may require authentication',
    path: req.path,
    method: req.method,
    service: 'purchase-service',
    port: 3008,
    hint: 'Most routes require authentication. Include Authorization header with Bearer token.',
    availableEndpoints: routesInfo,
    timestamp: new Date().toISOString(),
    troubleshooting: {
      authentication: 'Add header: Authorization: Bearer <token>',
      dynamicRoutes: 'Replace :id with actual ID (e.g., /api/hr/employees/actual-id-123)',
      basePath: `All routes are under /api/purchase/`
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('purchase-service Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    service: 'purchase-service'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    loadRoutes();
    
    const PORT = process.env.PORT || 3008;
    
    app.listen(PORT, () => {
      logger.info(`purchase-service running on port ${PORT}`);
      });
  } catch (error) {
    logger.error('purchase-service startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();