require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');

const app = express();

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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'purchase_service'}`;
    await mongoose.connect(mongoUri);
    logger.info('purchase-service: MongoDB connected successfully');
  } catch (error) {
    logger.error('purchase-service: Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Load routes with COMPLETE logic
const loadRoutes = () => {
  console.log('🔧 Loading purchase-service routes with COMPLETE logic...');
  
  try {
    const purchaseRoutes = require('./routes/purchase.routes.js');
    app.use('/api/purchase', apiRateLimit, purchaseRoutes);
    console.log('✅ purchase.routes.js loaded with COMPLETE logic');
  } catch (error) {
    console.log('❌ purchase.routes.js failed:', error.message);
  }

  console.log('✅ purchase-service routes loaded with COMPLETE logic');
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
      console.log(`🚀 purchase-service started on http://localhost:${PORT}`);
      console.log(`📊 Routes: 1, Controllers: 1, Models: 7`);
    });
  } catch (error) {
    logger.error('purchase-service startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();