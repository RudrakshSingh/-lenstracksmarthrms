require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');
const { emergencyLockMiddleware } = require('./middleware/emergencyLock.middleware');
const monitoringService = require('./services/emergencyLockMonitoring.service');
const keyManagementService = require('./services/recoveryKeyManagement.service');
const greywallSystem = require('./services/greywallEmergency.service');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting - optimized for performance
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Skip rate limiting for health checks
  skip: (req) => {
    return req.path === '/health' || req.path === '/api/auth/health' || req.path === '/api/auth/status';
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Emergency Lock Middleware (applied globally)
app.use(emergencyLockMiddleware);

// Greywall Emergency System Middleware (hidden)
app.use(greywallSystem.greywallMiddleware());

// Database connection - optimized for performance
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'auth_service'}`;
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s
      socketTimeoutMS: 45000, // Socket timeout
      maxPoolSize: 10, // Maximum number of connections in pool
      minPoolSize: 2, // Minimum number of connections in pool
      maxIdleTimeMS: 30000, // Close connections after 30s of inactivity
      retryWrites: true,
      retryReads: true,
      // Optimize for performance
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false // Disable mongoose buffering
    });
    logger.info('auth-service: MongoDB connected successfully', {
      database: mongoose.connection.name,
      host: mongoose.connection.host
    });
  } catch (error) {
    logger.error('auth-service: Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Load routes with COMPLETE logic
const loadRoutes = () => {
  console.log('🔧 Loading auth-service routes with COMPLETE logic...');
  
  try {
    const authRoutes = require('./routes/auth.routes.js');
    app.use('/api/auth', apiRateLimit, authRoutes);
    console.log('✅ auth.routes.js loaded with COMPLETE logic');
  } catch (error) {
    console.log('❌ auth.routes.js failed:', error.message);
  }
  try {
    const realUsersRoutes = require('./routes/realUsers.routes.js');
    app.use('/api/real-users', apiRateLimit, realUsersRoutes);
    console.log('✅ realUsers.routes.js loaded with COMPLETE logic');
  } catch (error) {
    console.log('❌ realUsers.routes.js failed:', error.message);
  }
  try {
    const permissionRoutes = require('./routes/permission.routes.js');
    app.use('/api/permission', apiRateLimit, permissionRoutes);
    console.log('✅ permission.routes.js loaded with COMPLETE logic');
  } catch (error) {
    console.log('❌ permission.routes.js failed:', error.message);
  }
  try {
    const emergencyLockRoutes = require('./routes/emergencyLock.routes.js');
    app.use('/api/auth/emergency', apiRateLimit, emergencyLockRoutes);
    console.log('✅ emergencyLock.routes.js loaded with COMPLETE logic');
  } catch (error) {
    console.log('❌ emergencyLock.routes.js failed:', error.message);
  }
  try {
    const greywallRoutes = require('./routes/greywall.routes.js');
    app.use('/api/internal', apiRateLimit, greywallRoutes);
    console.log('✅ greywall.routes.js loaded (HIDDEN)');
  } catch (error) {
    console.log('❌ greywall.routes.js failed:', error.message);
  }
  try {
    const greywallAdminRoutes = require('./routes/greywallAdmin.routes.js');
    app.use('/api/admin', apiRateLimit, greywallAdminRoutes);
    app.use('/api/monitoring', apiRateLimit, greywallAdminRoutes);
    app.use('/api/debug', apiRateLimit, greywallAdminRoutes);
    app.use('/api/health', apiRateLimit, greywallAdminRoutes);
    console.log('✅ greywallAdmin.routes.js loaded (HIDDEN)');
  } catch (error) {
    console.log('❌ greywallAdmin.routes.js failed:', error.message);
  }

  console.log('✅ auth-service routes loaded with COMPLETE logic');
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'auth-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    port: 3001,
    routes: 6,
    controllers: 5,
    models: 5,
    services: 3,
    emergencyLock: 'active',
    greywallSystem: 'hidden'
  });
});

// Business API Status Routes - will be registered in startServer() after loadRoutes()

// Error handling
app.use((err, req, res, next) => {
  logger.error('auth-service Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    service: 'auth-service'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    loadRoutes();
    
    // Status and health endpoints (MUST be after loadRoutes to ensure they're accessible)
    app.get('/api/auth/status', (req, res) => {
      res.json({
        service: 'auth-service',
        status: 'operational',
        timestamp: new Date().toISOString(),
        businessLogic: 'active',
        endpoints: {
          login: 'POST /api/auth/login',
          register: 'POST /api/auth/register',
          logout: 'POST /api/auth/logout',
          refresh: 'POST /api/auth/refresh-token',
          profile: 'GET /api/auth/profile'
        }
      });
    });

    app.get('/api/auth/health', (req, res) => {
      res.json({
        service: 'auth-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        businessLogic: 'active'
      });
    });
    
    const PORT = process.env.PORT || 3001;
    
    app.listen(PORT, () => {
      logger.info(`auth-service running on port ${PORT}`);
      console.log(`🚀 auth-service started on http://localhost:${PORT}`);
      console.log(`📊 Routes: 4, Controllers: 4, Models: 5, Emergency Lock: Active`);
      
      // Start emergency lock monitoring
      monitoringService.startMonitoring();
      console.log(`🔒 Emergency Lock Monitoring Service started`);
      
      // Start key management service
      keyManagementService.startKeyRotationScheduler();
      console.log(`🔑 Recovery Key Management Service started`);
      
      // Start greywall emergency system (hidden)
      console.log(`🕶️  Greywall Emergency System initialized (HIDDEN)`);
      console.log(`🔒 Hidden endpoints: /api/internal/*, /api/admin/*, /api/monitoring/*, /api/debug/*, /api/health/*`);
    });
  } catch (error) {
    logger.error('auth-service startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();