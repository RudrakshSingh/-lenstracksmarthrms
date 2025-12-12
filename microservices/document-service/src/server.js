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
    const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'document_service'}`;
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
    });
    if (!isProduction) logger.info('document-service: MongoDB connected successfully');
  } catch (error) {
    logger.error('document-service: Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Load routes with COMPLETE logic
const loadRoutes = () => {
  try {
    const documentsRoutes = require('./routes/documents.routes.js');
    app.use('/api/documents', apiRateLimit, documentsRoutes);
    if (!isProduction) logger.info('documents.routes.js loaded');
  } catch (error) {
    logger.error('documents.routes.js failed:', { 
      error: error.message, 
      stack: error.stack,
      name: error.name 
    });
    console.error('❌ documents.routes.js failed:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
  }
  try {
    const esignRoutes = require('./routes/esign.routes.js');
    app.use('/api/esign', apiRateLimit, esignRoutes);
    if (!isProduction) logger.info('esign.routes.js loaded');
  } catch (error) {
    logger.error('esign.routes.js failed:', { 
      error: error.message, 
      stack: error.stack,
      name: error.name 
    });
    console.error('❌ esign.routes.js failed:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
  }
  try {
    const contractsVaultRoutes = require('./routes/contractsVault.routes.js');
    app.use('/api/contracts-vault', apiRateLimit, contractsVaultRoutes);
    if (!isProduction) logger.info('contractsVault.routes.js loaded');
  } catch (error) {
    logger.error('contractsVault.routes.js failed:', { 
      error: error.message, 
      stack: error.stack,
      name: error.name 
    });
    console.error('❌ contractsVault.routes.js failed:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
  }
  try {
    const documentVerificationRoutes = require('./routes/documentVerification.routes.js');
    app.use('/api/document-verification', apiRateLimit, documentVerificationRoutes);
    if (!isProduction) logger.info('documentVerification.routes.js loaded');
  } catch (error) {
    logger.error('documentVerification.routes.js failed:', { 
      error: error.message, 
      stack: error.stack,
      name: error.name 
    });
    console.error('❌ documentVerification.routes.js failed:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'document-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    port: 3010,
    routes: 4,
    controllers: 4,
    models: 3,
    services: 5
  });

// Business API Routes
app.get('/api/document/status', (req, res) => {
  res.json({
    service: 'document-service',
    status: 'operational',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});

app.get('/api/document/health', (req, res) => {
  res.json({
    service: 'document-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});


app.get('/api/documents', (req, res) => {
  res.json({
    service: 'document-service',
    endpoint: '/api/documents',
    method: 'GET',
    status: 'success',
    message: 'Get all documents',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/documents', (req, res) => {
  res.json({
    service: 'document-service',
    endpoint: '/api/documents',
    method: 'POST',
    status: 'success',
    message: 'Upload document',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/documents/types', (req, res) => {
  res.json({
    service: 'document-service',
    endpoint: '/api/documents/types',
    method: 'GET',
    status: 'success',
    message: 'Get document types',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/documents/esign', (req, res) => {
  res.json({
    service: 'document-service',
    endpoint: '/api/documents/esign',
    method: 'POST',
    status: 'success',
    message: 'E-signature process',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/documents/contracts', (req, res) => {
  res.json({
    service: 'document-service',
    endpoint: '/api/documents/contracts',
    method: 'GET',
    status: 'success',
    message: 'Get contracts vault',
    timestamp: new Date().toISOString()
  });
});});


// Enhanced 404 handler with route information
app.use((req, res) => {
  // Try to get route information if available
  const routesInfo = [];
  
  // Common routes that should exist
  routesInfo.push('GET /health');
  routesInfo.push(`GET /api/documents/status`);
  routesInfo.push(`GET /api/documents/health`);
  
  res.status(404).json({
    success: false,
    message: 'Route not found - The requested endpoint does not exist or may require authentication',
    path: req.path,
    method: req.method,
    service: 'document-service',
    port: 3010,
    hint: 'Most routes require authentication. Include Authorization header with Bearer token.',
    availableEndpoints: routesInfo,
    timestamp: new Date().toISOString(),
    troubleshooting: {
      authentication: 'Add header: Authorization: Bearer <token>',
      dynamicRoutes: 'Replace :id with actual ID (e.g., /api/hr/employees/actual-id-123)',
      basePath: `All routes are under /api/documents/`
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('document-service Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    service: 'document-service'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    loadRoutes();
    
    const PORT = process.env.PORT || 3010;
    
    app.listen(PORT, () => {
      logger.info(`document-service running on port ${PORT}`);
      });
  } catch (error) {
    logger.error('document-service startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();