require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const responseTime = require('response-time');
const logger = require('./config/logger');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Response time tracking
app.use(responseTime((req, res, time) => {
  if (time > 40 && !isProduction) {
    logger.warn(`Slow request: ${req.method} ${req.path} took ${time.toFixed(2)}ms`);
  }
  res.setHeader('X-Response-Time', `${time.toFixed(2)}ms`);
}));

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Compression
app.use(compression({ level: 6, threshold: 1024 }));

// Rate limiting
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP'
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection - optimized
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'attendance_service'}`;
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
    if (!isProduction) if (!isProduction) logger.info('attendance-service: MongoDB connected successfully');
  } catch (error) {
    logger.error('attendance-service: Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Load routes - optimized
const loadRoutes = () => {
  try {
    const attendanceRoutes = require('./routes/attendance.routes.js');
    app.use('/api/attendance', apiRateLimit, attendanceRoutes);
    if (!isProduction) logger.info('attendance.routes.js loaded');
  } catch (error) {
    logger.error('attendance.routes.js failed:', error.message);
  }
  try {
    const geofencingRoutes = require('./routes/geofencing.routes.js');
    app.use('/api/geofencing', apiRateLimit, geofencingRoutes);
    if (!isProduction) logger.info('geofencing.routes.js loaded');
  } catch (error) {
    logger.error('geofencing.routes.js failed:', error.message);
  }
  try {
    const securityRoutes = require('./routes/security.routes.js');
    app.use('/api/security', apiRateLimit, securityRoutes);
    if (!isProduction) logger.info('security.routes.js loaded');
  } catch (error) {
    logger.error('security.routes.js failed:', error.message);
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'attendance-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    port: 3003,
    routes: 2,
    controllers: 2,
    models: 3,
    services: 2
  });
});

// Business API Routes
app.get('/api/attendance/status', (req, res) => {
  res.json({
    service: 'attendance-service',
    status: 'operational',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});

app.get('/api/attendance/health', (req, res) => {
  res.json({
    service: 'attendance-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});


app.post('/api/attendance/checkin', (req, res) => {
  res.json({
    service: 'attendance-service',
    endpoint: '/api/attendance/checkin',
    method: 'POST',
    status: 'success',
    message: 'Employee check-in',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/attendance/checkout', (req, res) => {
  res.json({
    service: 'attendance-service',
    endpoint: '/api/attendance/checkout',
    method: 'POST',
    status: 'success',
    message: 'Employee check-out',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/attendance/records', (req, res) => {
  res.json({
    service: 'attendance-service',
    endpoint: '/api/attendance/records',
    method: 'GET',
    status: 'success',
    message: 'Get attendance records',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/attendance/reports', (req, res) => {
  res.json({
    service: 'attendance-service',
    endpoint: '/api/attendance/reports',
    method: 'GET',
    status: 'success',
    message: 'Get attendance reports',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/attendance/geofencing', (req, res) => {
  res.json({
    service: 'attendance-service',
    endpoint: '/api/attendance/geofencing',
    method: 'GET',
    status: 'success',
    message: 'Get geofencing data',
    timestamp: new Date().toISOString()
  });
});});


// Enhanced 404 handler with route information
app.use((req, res) => {
  // Try to get route information if available
  const routesInfo = [];
  
  // Common routes that should exist
  routesInfo.push('GET /health');
  routesInfo.push(`GET /api/attendance/status`);
  routesInfo.push(`GET /api/attendance/health`);
  
  res.status(404).json({
    success: false,
    message: 'Route not found - The requested endpoint does not exist or may require authentication',
    path: req.path,
    method: req.method,
    service: 'attendance-service',
    port: 3003,
    hint: 'Most routes require authentication. Include Authorization header with Bearer token.',
    availableEndpoints: routesInfo,
    timestamp: new Date().toISOString(),
    troubleshooting: {
      authentication: 'Add header: Authorization: Bearer <token>',
      dynamicRoutes: 'Replace :id with actual ID (e.g., /api/hr/employees/actual-id-123)',
      basePath: `All routes are under /api/attendance/`
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('attendance-service Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    service: 'attendance-service'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    loadRoutes();
    
    const PORT = process.env.PORT || 3003;
    
    app.listen(PORT, () => {
      if (!isProduction) logger.info(`attendance-service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('attendance-service startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();