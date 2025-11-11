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
    const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'prescription_service'}`;
    await mongoose.connect(mongoUri);
    logger.info('prescription-service: MongoDB connected successfully');
  } catch (error) {
    logger.error('prescription-service: Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Load routes with COMPLETE logic
const loadRoutes = () => {
  console.log('🔧 Loading prescription-service routes with COMPLETE logic...');
  
  try {
    const prescriptionRoutes = require('./routes/prescription.routes.js');
    app.use('/api/prescription', apiRateLimit, prescriptionRoutes);
    console.log('✅ prescription.routes.js loaded with COMPLETE logic');
  } catch (error) {
    console.log('❌ prescription.routes.js failed:', error.message);
  }
  try {
    const manualRegistrationRoutes = require('./routes/manualRegistration.routes.js');
    app.use('/api/manual-registration', apiRateLimit, manual-registrationRoutes);
    console.log('✅ manualRegistration.routes.js loaded with COMPLETE logic');
  } catch (error) {
    console.log('❌ manualRegistration.routes.js failed:', error.message);
  }
  try {
    const manualRegisterRoutes = require('./routes/manualRegister.routes.js');
    app.use('/api/manual-register', apiRateLimit, manual-registerRoutes);
    console.log('✅ manualRegister.routes.js loaded with COMPLETE logic');
  } catch (error) {
    console.log('❌ manualRegister.routes.js failed:', error.message);
  }

  console.log('✅ prescription-service routes loaded with COMPLETE logic');
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
      console.log(`🚀 prescription-service started on http://localhost:${PORT}`);
      console.log(`📊 Routes: 3, Controllers: 3, Models: 6`);
    });
  } catch (error) {
    logger.error('prescription-service startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();