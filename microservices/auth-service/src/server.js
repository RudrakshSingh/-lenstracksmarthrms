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

// Database connection - optimized for performance and Azure Cosmos DB
const connectDB = async () => {
  try {
    // Get MONGO_URI from Azure Key Vault or environment variable
    // Never hardcode connection strings in code!
    let mongoUri = process.env.MONGO_URI;
    
    // If not in environment, try Key Vault (only if enabled)
    if (!mongoUri && process.env.USE_KEY_VAULT === 'true') {
      try {
        const keyVault = require('../../shared/utils/keyVault');
        mongoUri = await keyVault.getSecret('MONGO_URI');
      } catch (error) {
        logger.warn('Key Vault not available, falling back to default');
      }
    }
    
    // Fallback to local MongoDB for development
    if (!mongoUri) {
      mongoUri = `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'auth_service'}`;
      logger.warn('MONGO_URI not set. Using local MongoDB. Set MONGO_URI environment variable or configure Azure Key Vault.');
    }
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000, // Increased to 30s for Azure
      socketTimeoutMS: 60000, // Increased to 60s
      connectTimeoutMS: 30000, // Explicit connect timeout
      maxPoolSize: 10, // Maximum number of connections in pool
      minPoolSize: 2, // Minimum number of connections in pool
      maxIdleTimeMS: 30000, // Close connections after 30s of inactivity
      retryWrites: true,
      retryReads: true,
      // Optimize for performance
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
      // Azure Cosmos DB specific options
      ssl: true,
      sslValidate: true
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

// Load routes - optimized
const loadRoutes = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  try {
    const authRoutes = require('./routes/auth.routes.js');
    app.use('/api/auth', apiRateLimit, authRoutes);
    if (!isProduction) logger.info('auth.routes.js loaded');
  } catch (error) {
    logger.error('auth.routes.js failed:', error.message);
  }
  try {
    const realUsersRoutes = require('./routes/realUsers.routes.js');
    app.use('/api/real-users', apiRateLimit, realUsersRoutes);
    if (!isProduction) logger.info('realUsers.routes.js loaded');
  } catch (error) {
    logger.error('realUsers.routes.js failed:', error.message);
  }
  try {
    const permissionRoutes = require('./routes/permission.routes.js');
    app.use('/api/permission', apiRateLimit, permissionRoutes);
    app.use('/api/user', apiRateLimit, permissionRoutes);
    if (!isProduction) logger.info('permission.routes.js loaded');
  } catch (error) {
    logger.error('permission.routes.js failed:', error.message);
  }
  try {
    const emergencyLockRoutes = require('./routes/emergencyLock.routes.js');
    app.use('/api/auth/emergency', apiRateLimit, emergencyLockRoutes);
    if (!isProduction) logger.info('emergencyLock.routes.js loaded');
  } catch (error) {
    logger.error('emergencyLock.routes.js failed:', error.message);
  }
  try {
    const greywallRoutes = require('./routes/greywall.routes.js');
    app.use('/api/internal', apiRateLimit, greywallRoutes);
  } catch (error) {
    logger.error('greywall.routes.js failed:', error.message);
  }
  try {
    const greywallAdminRoutes = require('./routes/greywallAdmin.routes.js');
    app.use('/api/admin', apiRateLimit, greywallAdminRoutes);
    app.use('/api/monitoring', apiRateLimit, greywallAdminRoutes);
    app.use('/api/debug', apiRateLimit, greywallAdminRoutes);
    app.use('/api/health', apiRateLimit, greywallAdminRoutes);
  } catch (error) {
    logger.error('greywallAdmin.routes.js failed:', error.message);
  }
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
      
      monitoringService.startMonitoring();
      keyManagementService.startKeyRotationScheduler();
    });
  } catch (error) {
    logger.error('auth-service startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();