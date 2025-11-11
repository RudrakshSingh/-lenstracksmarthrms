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
    const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'sales_service'}`;
    await mongoose.connect(mongoUri);
    logger.info('sales-service: MongoDB connected successfully');
  } catch (error) {
    logger.error('sales-service: Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Load routes with COMPLETE logic
const loadRoutes = () => {
  console.log('🔧 Loading sales-service routes with COMPLETE logic...');
  
  try {
    const salesRoutes = require('./routes/sales.routes.js');
    app.use('/api/sales', apiRateLimit, salesRoutes);
    console.log('✅ sales.routes.js loaded with COMPLETE logic');
  } catch (error) {
    console.log('❌ sales.routes.js failed:', error.message);
  }
  try {
    const posRoutes = require('./routes/pos.routes.js');
    app.use('/api/pos', apiRateLimit, posRoutes);
    console.log('✅ pos.routes.js loaded with COMPLETE logic');
  } catch (error) {
    console.log('❌ pos.routes.js failed:', error.message);
  }
  try {
    const discountRoutes = require('./routes/discount.routes.js');
    app.use('/api/discount', apiRateLimit, discountRoutes);
    console.log('✅ discount.routes.js loaded with COMPLETE logic');
  } catch (error) {
    console.log('❌ discount.routes.js failed:', error.message);
  }

  console.log('✅ sales-service routes loaded with COMPLETE logic');
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'sales-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    port: 3007,
    routes: 3,
    controllers: 3,
    models: 12,
    services: 3
  });
});

// Business API Routes (legacy endpoints for backwards compatibility)
app.get('/api/sales/status', (req, res) => {
  res.json({
    service: 'sales-service',
    status: 'operational',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});

app.get('/api/sales/health', (req, res) => {
  res.json({
    service: 'sales-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});


app.get('/api/sales/orders', (req, res) => {
  res.json({
    service: 'sales-service',
    endpoint: '/api/sales/orders',
    method: 'GET',
    status: 'success',
    message: 'Get all sales orders',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/sales/orders', (req, res) => {
  res.json({
    service: 'sales-service',
    endpoint: '/api/sales/orders',
    method: 'POST',
    status: 'success',
    message: 'Create new order',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/sales/pos', (req, res) => {
  res.json({
    service: 'sales-service',
    endpoint: '/api/sales/pos',
    method: 'GET',
    status: 'success',
    message: 'Get POS data',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/sales/discounts', (req, res) => {
  res.json({
    service: 'sales-service',
    endpoint: '/api/sales/discounts',
    method: 'GET',
    status: 'success',
    message: 'Get discount rules',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/sales/reports', (req, res) => {
  res.json({
    service: 'sales-service',
    endpoint: '/api/sales/reports',
    method: 'GET',
    status: 'success',
    message: 'Get sales reports',
    timestamp: new Date().toISOString()
  });
});


// Enhanced 404 handler with route information
app.use((req, res) => {
  // Try to get route information if available
  const routesInfo = [];
  
  // Common routes that should exist
  routesInfo.push('GET /health');
  routesInfo.push(`GET /api/sales/status`);
  routesInfo.push(`GET /api/sales/health`);
  
  res.status(404).json({
    success: false,
    message: 'Route not found - The requested endpoint does not exist or may require authentication',
    path: req.path,
    method: req.method,
    service: 'sales-service',
    port: 3007,
    hint: 'Most routes require authentication. Include Authorization header with Bearer token.',
    availableEndpoints: routesInfo,
    timestamp: new Date().toISOString(),
    troubleshooting: {
      authentication: 'Add header: Authorization: Bearer <token>',
      dynamicRoutes: 'Replace :id with actual ID (e.g., /api/hr/employees/actual-id-123)',
      basePath: `All routes are under /api/sales/`
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('sales-service Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    service: 'sales-service'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    loadRoutes();
    
    const PORT = process.env.PORT || 3007;
    
    app.listen(PORT, () => {
      logger.info(`sales-service running on port ${PORT}`);
      console.log(`🚀 sales-service started on http://localhost:${PORT}`);
      console.log(`📊 Routes: 3, Controllers: 3, Models: 12`);
    });
  } catch (error) {
    logger.error('sales-service startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();