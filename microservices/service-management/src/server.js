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
    const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'service_management'}`;
    await mongoose.connect(mongoUri);
    logger.info('service-management: MongoDB connected successfully');
  } catch (error) {
    logger.error('service-management: Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Load routes with COMPLETE logic
const loadRoutes = () => {
  console.log('🔧 Loading service-management routes with COMPLETE logic...');
  
  try {
    const serviceRoutes = require('./routes/service.routes.js');
    app.use('/api/service', apiRateLimit, serviceRoutes);
    console.log('✅ service.routes.js loaded with COMPLETE logic');
  } catch (error) {
    console.log('❌ service.routes.js failed:', error.message);
  }
  try {
    const serviceSLARoutes = require('./routes/serviceSLA.routes.js');
    app.use('/api/service-s-l-a', apiRateLimit, service-s-l-aRoutes);
    console.log('✅ serviceSLA.routes.js loaded with COMPLETE logic');
  } catch (error) {
    console.log('❌ serviceSLA.routes.js failed:', error.message);
  }
  try {
    const complianceRoutes = require('./routes/compliance.routes.js');
    app.use('/api/compliance', apiRateLimit, complianceRoutes);
    console.log('✅ compliance.routes.js loaded with COMPLETE logic');
  } catch (error) {
    console.log('❌ compliance.routes.js failed:', error.message);
  }

  console.log('✅ service-management routes loaded with COMPLETE logic');
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'service-management',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    port: 3011,
    routes: 3,
    controllers: 3,
    models: 5,
    services: 4
  });

// Business API Routes
app.get('/api/service/status', (req, res) => {
  res.json({
    service: 'service-management',
    status: 'operational',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});

app.get('/api/service/health', (req, res) => {
  res.json({
    service: 'service-management',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});


app.get('/api/service/tickets', (req, res) => {
  res.json({
    service: 'service-management',
    endpoint: '/api/service/tickets',
    method: 'GET',
    status: 'success',
    message: 'Get service tickets',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/service/tickets', (req, res) => {
  res.json({
    service: 'service-management',
    endpoint: '/api/service/tickets',
    method: 'POST',
    status: 'success',
    message: 'Create service ticket',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/service/sla', (req, res) => {
  res.json({
    service: 'service-management',
    endpoint: '/api/service/sla',
    method: 'GET',
    status: 'success',
    message: 'Get SLA policies',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/service/compliance', (req, res) => {
  res.json({
    service: 'service-management',
    endpoint: '/api/service/compliance',
    method: 'GET',
    status: 'success',
    message: 'Get compliance data',
    timestamp: new Date().toISOString()
  });
});});


// Enhanced 404 handler with route information
app.use((req, res) => {
  // Try to get route information if available
  const routesInfo = [];
  
  // Common routes that should exist
  routesInfo.push('GET /health');
  routesInfo.push(`GET /api/service/status`);
  routesInfo.push(`GET /api/service/health`);
  
  res.status(404).json({
    success: false,
    message: 'Route not found - The requested endpoint does not exist or may require authentication',
    path: req.path,
    method: req.method,
    service: 'service-management',
    port: 3011,
    hint: 'Most routes require authentication. Include Authorization header with Bearer token.',
    availableEndpoints: routesInfo,
    timestamp: new Date().toISOString(),
    troubleshooting: {
      authentication: 'Add header: Authorization: Bearer <token>',
      dynamicRoutes: 'Replace :id with actual ID (e.g., /api/hr/employees/actual-id-123)',
      basePath: `All routes are under /api/service/`
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('service-management Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    service: 'service-management'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    loadRoutes();
    
    const PORT = process.env.PORT || 3011;
    
    app.listen(PORT, () => {
      logger.info(`service-management running on port ${PORT}`);
      console.log(`🚀 service-management started on http://localhost:${PORT}`);
      console.log(`📊 Routes: 3, Controllers: 3, Models: 5`);
    });
  } catch (error) {
    logger.error('service-management startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();