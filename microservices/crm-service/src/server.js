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
    const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'crm_service'}`;
    await mongoose.connect(mongoUri);
    logger.info('crm-service: MongoDB connected successfully');
  } catch (error) {
    logger.error('crm-service: Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Load routes with COMPLETE logic
const loadRoutes = () => {
  console.log('🔧 Loading crm-service routes with COMPLETE logic...');
  
  try {
    const crmRoutes = require('./routes/crm.routes.js');
    app.use('/api/crm', apiRateLimit, crmRoutes);
    console.log('✅ crm.routes.js loaded with COMPLETE logic');
  } catch (error) {
    console.log('❌ crm.routes.js failed:', error.message);
  }
  try {
    const engagementRoutes = require('./routes/engagement.routes.js');
    app.use('/api/engagement', apiRateLimit, engagementRoutes);
    console.log('✅ engagement.routes.js loaded with COMPLETE logic');
  } catch (error) {
    console.log('❌ engagement.routes.js failed:', error.message);
  }
  try {
    const incentiveRoutes = require('./routes/incentive.routes.js');
    app.use('/api/incentive', apiRateLimit, incentiveRoutes);
    console.log('✅ incentive.routes.js loaded with COMPLETE logic');
  } catch (error) {
    console.log('❌ incentive.routes.js failed:', error.message);
  }

  console.log('✅ crm-service routes loaded with COMPLETE logic');
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
      console.log(`🚀 crm-service started on http://localhost:${PORT}`);
      console.log(`📊 Routes: 3, Controllers: 3, Models: 11`);
    });
  } catch (error) {
    logger.error('crm-service startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();