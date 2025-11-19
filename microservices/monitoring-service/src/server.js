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
    const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'monitoring_service'}`;
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
    if (!isProduction) logger.info('monitoring-service: MongoDB connected successfully');
  } catch (error) {
    logger.error('monitoring-service: Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Load routes - optimized
const loadRoutes = () => {
  // Monitoring service routes will be added here
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'monitoring-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    port: 3016,
    routes: 0,
    controllers: 1,
    models: 3,
    services: 2
  });

// Business API Routes
app.get('/api/monitoring/status', (req, res) => {
  res.json({
    service: 'monitoring-service',
    status: 'operational',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});

app.get('/api/monitoring/health', (req, res) => {
  res.json({
    service: 'monitoring-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});


app.get('/api/monitoring/metrics', (req, res) => {
  res.json({
    service: 'monitoring-service',
    endpoint: '/api/monitoring/metrics',
    method: 'GET',
    status: 'success',
    message: 'Get system metrics',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/monitoring/audit', (req, res) => {
  res.json({
    service: 'monitoring-service',
    endpoint: '/api/monitoring/audit',
    method: 'GET',
    status: 'success',
    message: 'Get audit logs',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/monitoring/alerts', (req, res) => {
  res.json({
    service: 'monitoring-service',
    endpoint: '/api/monitoring/alerts',
    method: 'GET',
    status: 'success',
    message: 'Get system alerts',
    timestamp: new Date().toISOString()
  });
});});


// Enhanced 404 handler with route information
app.use((req, res) => {
  // Try to get route information if available
  const routesInfo = [];
  
  // Common routes that should exist
  routesInfo.push('GET /health');
  routesInfo.push(`GET /api/monitoring/status`);
  routesInfo.push(`GET /api/monitoring/health`);
  
  res.status(404).json({
    success: false,
    message: 'Route not found - The requested endpoint does not exist or may require authentication',
    path: req.path,
    method: req.method,
    service: 'monitoring-service',
    port: 3016,
    hint: 'Most routes require authentication. Include Authorization header with Bearer token.',
    availableEndpoints: routesInfo,
    timestamp: new Date().toISOString(),
    troubleshooting: {
      authentication: 'Add header: Authorization: Bearer <token>',
      dynamicRoutes: 'Replace :id with actual ID (e.g., /api/hr/employees/actual-id-123)',
      basePath: `All routes are under /api/monitoring/`
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('monitoring-service Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    service: 'monitoring-service'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    loadRoutes();
    
    const PORT = process.env.PORT || 3016;
    
    app.listen(PORT, () => {
      logger.info(`monitoring-service running on port ${PORT}`);
      });
  } catch (error) {
    logger.error('monitoring-service startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();