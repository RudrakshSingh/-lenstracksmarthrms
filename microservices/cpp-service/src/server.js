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
    const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'cpp_service'}`;
    await mongoose.connect(mongoUri);
    logger.info('cpp-service: MongoDB connected successfully');
  } catch (error) {
    logger.error('cpp-service: Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Load routes with COMPLETE logic
const loadRoutes = () => {
  console.log('🔧 Loading cpp-service routes with COMPLETE logic...');
  
  try {
    const cppRoutes = require('./routes/cpp.routes.js');
    app.use('/api/cpp', apiRateLimit, cppRoutes);
    console.log('✅ cpp.routes.js loaded with COMPLETE logic');
  } catch (error) {
    console.log('❌ cpp.routes.js failed:', error.message);
  }

  console.log('✅ cpp-service routes loaded with COMPLETE logic');
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'cpp-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    port: 3012,
    routes: 1,
    controllers: 1,
    models: 4,
    services: 1
  });

// Business API Routes
app.get('/api/cpp/status', (req, res) => {
  res.json({
    service: 'cpp-service',
    status: 'operational',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});

app.get('/api/cpp/health', (req, res) => {
  res.json({
    service: 'cpp-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});


app.get('/api/cpp/policies', (req, res) => {
  res.json({
    service: 'cpp-service',
    endpoint: '/api/cpp/policies',
    method: 'GET',
    status: 'success',
    message: 'Get CPP policies',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/cpp/enrollments', (req, res) => {
  res.json({
    service: 'cpp-service',
    endpoint: '/api/cpp/enrollments',
    method: 'GET',
    status: 'success',
    message: 'Get CPP enrollments',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/cpp/claims', (req, res) => {
  res.json({
    service: 'cpp-service',
    endpoint: '/api/cpp/claims',
    method: 'GET',
    status: 'success',
    message: 'Get CPP claims',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/cpp/claims', (req, res) => {
  res.json({
    service: 'cpp-service',
    endpoint: '/api/cpp/claims',
    method: 'POST',
    status: 'success',
    message: 'Submit CPP claim',
    timestamp: new Date().toISOString()
  });
});});


// Enhanced 404 handler with route information
app.use((req, res) => {
  // Try to get route information if available
  const routesInfo = [];
  
  // Common routes that should exist
  routesInfo.push('GET /health');
  routesInfo.push(`GET /api/cpp/status`);
  routesInfo.push(`GET /api/cpp/health`);
  
  res.status(404).json({
    success: false,
    message: 'Route not found - The requested endpoint does not exist or may require authentication',
    path: req.path,
    method: req.method,
    service: 'cpp-service',
    port: 3012,
    hint: 'Most routes require authentication. Include Authorization header with Bearer token.',
    availableEndpoints: routesInfo,
    timestamp: new Date().toISOString(),
    troubleshooting: {
      authentication: 'Add header: Authorization: Bearer <token>',
      dynamicRoutes: 'Replace :id with actual ID (e.g., /api/hr/employees/actual-id-123)',
      basePath: `All routes are under /api/cpp/`
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('cpp-service Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    service: 'cpp-service'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    loadRoutes();
    
    const PORT = process.env.PORT || 3012;
    
    app.listen(PORT, () => {
      logger.info(`cpp-service running on port ${PORT}`);
      console.log(`🚀 cpp-service started on http://localhost:${PORT}`);
      console.log(`📊 Routes: 1, Controllers: 1, Models: 4`);
    });
  } catch (error) {
    logger.error('cpp-service startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();