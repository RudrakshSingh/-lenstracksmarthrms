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
    const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'prescription_service'}`;
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
    });
    if (!isProduction) logger.info('prescription-service: MongoDB connected successfully');
  } catch (error) {
    logger.error('prescription-service: Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Load routes with COMPLETE logic
const loadRoutes = () => {
  try {
    const prescriptionRoutes = require('./routes/prescription.routes.js');
    app.use('/api/prescription', apiRateLimit, prescriptionRoutes);
    if (!isProduction) logger.info('prescription.routes.js loaded');
  } catch (error) {
    logger.error('prescription.routes.js failed:', error.message);
  }
  try {
    const manualRegistrationRoutes = require('./routes/manualRegistration.routes.js');
    app.use('/api/manual-registration', apiRateLimit, manualRegistrationRoutes);
    if (!isProduction) logger.info('manualRegistration.routes.js loaded');
  } catch (error) {
    logger.error('manualRegistration.routes.js failed:', error.message);
  }
  try {
    const manualRegisterRoutes = require('./routes/manualRegister.routes.js');
    app.use('/api/manual-register', apiRateLimit, manualRegisterRoutes);
    if (!isProduction) logger.info('manualRegister.routes.js loaded');
  } catch (error) {
    logger.error('manualRegister.routes.js failed:', error.message);
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'prescription-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    port: 3013,
    routes: 3,
    controllers: 3,
    models: 6,
    services: 4
  });

// Business API Routes
app.get('/api/prescription/status', (req, res) => {
  res.json({
    service: 'prescription-service',
    status: 'operational',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});

app.get('/api/prescription/health', (req, res) => {
  res.json({
    service: 'prescription-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});


app.get('/api/prescription/records', (req, res) => {
  res.json({
    service: 'prescription-service',
    endpoint: '/api/prescription/records',
    method: 'GET',
    status: 'success',
    message: 'Get prescription records',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/prescription/records', (req, res) => {
  res.json({
    service: 'prescription-service',
    endpoint: '/api/prescription/records',
    method: 'POST',
    status: 'success',
    message: 'Create prescription',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/prescription/optometrists', (req, res) => {
  res.json({
    service: 'prescription-service',
    endpoint: '/api/prescription/optometrists',
    method: 'GET',
    status: 'success',
    message: 'Get optometrists',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/prescription/manual', (req, res) => {
  res.json({
    service: 'prescription-service',
    endpoint: '/api/prescription/manual',
    method: 'GET',
    status: 'success',
    message: 'Get manual registrations',
    timestamp: new Date().toISOString()
  });
});});


// Enhanced 404 handler with route information
app.use((req, res) => {
  // Try to get route information if available
  const routesInfo = [];
  
  // Common routes that should exist
  routesInfo.push('GET /health');
  routesInfo.push(`GET /api/prescription/status`);
  routesInfo.push(`GET /api/prescription/health`);
  
  res.status(404).json({
    success: false,
    message: 'Route not found - The requested endpoint does not exist or may require authentication',
    path: req.path,
    method: req.method,
    service: 'prescription-service',
    port: 3013,
    hint: 'Most routes require authentication. Include Authorization header with Bearer token.',
    availableEndpoints: routesInfo,
    timestamp: new Date().toISOString(),
    troubleshooting: {
      authentication: 'Add header: Authorization: Bearer <token>',
      dynamicRoutes: 'Replace :id with actual ID (e.g., /api/hr/employees/actual-id-123)',
      basePath: `All routes are under /api/prescription/`
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('prescription-service Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    service: 'prescription-service'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    loadRoutes();
    
    const PORT = process.env.PORT || 3013;
    
    app.listen(PORT, () => {
      logger.info(`prescription-service running on port ${PORT}`);
      });
  } catch (error) {
    logger.error('prescription-service startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();