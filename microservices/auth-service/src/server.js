// Load environment variables from .env in development; ignore missing module in production
try {
  // eslint-disable-next-line global-require
  require('dotenv').config();
} catch (err) {
  // eslint-disable-next-line no-console
  if (process.env.NODE_ENV !== 'production') {
    console.warn('dotenv not available for auth-service, skipping .env loading:', err.message);
  }
}
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');

// Load SSL utility for HTTPS support
let createServer;
try {
  const sslUtils = require('../../shared/utils/ssl');
  createServer = sslUtils.createServer;
} catch (error) {
  logger.warn('SSL utility not available, using HTTP only', { error: error.message });
  createServer = null;
}
const { emergencyLockMiddleware } = require('./middleware/emergencyLock.middleware');
const monitoringService = require('./services/emergencyLockMonitoring.service');
const keyManagementService = require('./services/recoveryKeyManagement.service');
const greywallSystem = require('./services/greywallEmergency.service');

const app = express();

// Security middleware
app.use(helmet());
// CORS configuration - explicitly allow localhost origins for frontend development
const corsOrigin = process.env.CORS_ORIGIN || '*';
const allowedOrigins = [
  'https://98.70.245.87', // Azure IP
  'http://localhost:3000', // Frontend dev server
  'http://localhost:3002', // Frontend dev server (if proxying)
  'http://localhost:3001'  // Frontend dev server (if proxying)
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    // If CORS_ORIGIN is '*', allow all origins
    if (corsOrigin === '*') {
      return callback(null, true);
    }
    
    // Check configured origins
    const configured = corsOrigin.split(',').map(o => o.trim());
    const allAllowed = [...allowedOrigins, ...configured];
    
    if (allAllowed.includes(origin) || corsOrigin === '*') {
      callback(null, true);
    } else {
      callback(null, true); // Allow for now to prevent blocking
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Requested-With', 'Origin', 'Cache-Control'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400 // 24 hours for preflight caching
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
    // Get MONGODB_URI from environment (support both MONGO_URI and MONGODB_URI)
    // Use global MONGODB_URI - connection string used as-is, dbName specified in options
    let mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    // If not in environment, try Key Vault (only if enabled)
    if (!mongoUri && process.env.USE_KEY_VAULT === 'true') {
      try {
        const keyVault = require('../../shared/utils/keyVault');
        mongoUri = await keyVault.getSecret('MONGO_URI') || await keyVault.getSecret('MONGODB_URI');
      } catch (error) {
        logger.warn('Key Vault not available, falling back to default');
      }
    }
    
    // Fallback to local MongoDB for development
    if (!mongoUri) {
      mongoUri = `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'auth_service'}`;
      logger.warn('MONGODB_URI not set. Using local MongoDB. Set MONGODB_URI environment variable.');
    }
    
    // Get target database name - use auth-db for auth service
    let targetDbName = process.env.DB_NAME || process.env.MONGO_DB_NAME || 'auth-db';
    
    // Ensure we're not using test database
    if (targetDbName.toLowerCase().includes('test')) {
      targetDbName = 'auth-db';
      logger.error('ERROR: DB_NAME contains "test"! Using main production database instead.', {
        provided: process.env.DB_NAME || process.env.MONGO_DB_NAME,
        using: targetDbName
      });
    }
    
    // Use connection string as-is - don't modify it
    // Database name will be specified in connection options
    logger.info('Using MONGODB_URI from environment', {
      hasUri: !!mongoUri,
      dbName: targetDbName,
      uriSource: process.env.MONGODB_URI ? 'MONGODB_URI' : (process.env.MONGO_URI ? 'MONGO_URI' : 'fallback')
    });
    
    // Determine if this is Cosmos DB (connection string contains cosmos.azure.com or documents.azure.com)
    const isCosmosDB = mongoUri.includes('cosmos.azure.com') || mongoUri.includes('documents.azure.com');
    
    const connectionOptions = {
      serverSelectionTimeoutMS: 30000, // Increased to 30s for Azure
      socketTimeoutMS: 60000, // Increased to 60s
      connectTimeoutMS: 30000, // Explicit connect timeout
      maxPoolSize: 10, // Maximum number of connections in pool
      minPoolSize: 2, // Minimum number of connections in pool
      maxIdleTimeMS: 30000, // Close connections after 30s of inactivity
      retryWrites: true, // Cosmos DB supports retrywrites (override connection string if needed)
      retryReads: true,
      dbName: targetDbName, // Explicitly set the database name
    };
    
    // Azure Cosmos DB specific options (only if Cosmos DB)
    if (isCosmosDB) {
      // Use tls options instead of deprecated sslValidate for Node.js 22
      connectionOptions.tls = true;
      connectionOptions.tlsInsecure = false; // Validate certificates
      // Cosmos DB requires retrywrites=true for write operations
      connectionOptions.retryWrites = true;
      logger.info('Connecting to Azure Cosmos DB (MongoDB API)');
    }
    
    await mongoose.connect(mongoUri, connectionOptions);
    
    const actualDbName = mongoose.connection.name;
    logger.info('===========================================================');
    logger.info('auth-service: MongoDB connected successfully');
    logger.info('===========================================================', {
      database: actualDbName,
      targetDatabase: targetDbName,
      host: mongoose.connection.host,
      readyState: mongoose.connection.readyState
    });
    
    if (actualDbName.toLowerCase().includes('test')) {
      logger.error('CRITICAL ERROR: Connected to TEST database!', {
        database: actualDbName,
        expected: targetDbName
      });
    } else if (actualDbName !== targetDbName) {
      logger.warn('WARNING: Database name mismatch!', {
        actual: actualDbName,
        expected: targetDbName
      });
    } else {
      logger.info('Database connection verified - using MAIN database', {
        database: actualDbName
      });
    }
  } catch (error) {
    logger.error('auth-service: Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Load routes - OPTIONAL: Service continues even if routes fail
const loadRoutes = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  let routesLoaded = 0;
  
  try {
    const authRoutes = require('./routes/auth.routes.js');
    app.use('/api/auth', apiRateLimit, authRoutes);
    routesLoaded++;
    logger.info('auth.routes.js loaded successfully', { 
      routesCount: authRoutes.stack?.length || 'unknown',
      production: isProduction 
    });
  } catch (error) {
    logger.error('auth.routes.js FAILED to load', { 
      error: error.message, 
      stack: error.stack,
      name: error.name 
    });
    console.error('Auth routes failed to load:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
    // Don't continue if auth routes fail - this is critical
    throw error;
  }
  try {
    const realUsersRoutes = require('./routes/realUsers.routes.js');
    app.use('/api/real-users', apiRateLimit, realUsersRoutes);
    if (!isProduction) logger.info('realUsers.routes.js loaded');
  } catch (error) {
    logger.error('realUsers.routes.js failed:', { 
      error: error.message, 
      stack: error.stack,
      name: error.name 
    });
    console.error('realUsers.routes.js failed:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
  }
  try {
    const permissionRoutes = require('./routes/permission.routes.js');
    app.use('/api/permission', apiRateLimit, permissionRoutes);
    app.use('/api/user', apiRateLimit, permissionRoutes);
    if (!isProduction) logger.info('permission.routes.js loaded');
  } catch (error) {
    logger.error('permission.routes.js failed:', { 
      error: error.message, 
      stack: error.stack,
      name: error.name 
    });
    console.error('permission.routes.js failed:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
  }
  try {
    const emergencyLockRoutes = require('./routes/emergencyLock.routes.js');
    app.use('/api/auth/emergency', apiRateLimit, emergencyLockRoutes);
    if (!isProduction) logger.info('emergencyLock.routes.js loaded');
  } catch (error) {
    logger.error('emergencyLock.routes.js failed:', { 
      error: error.message, 
      stack: error.stack,
      name: error.name 
    });
    console.error('emergencyLock.routes.js failed:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
  }
  try {
    const greywallRoutes = require('./routes/greywall.routes.js');
    app.use('/api/internal', apiRateLimit, greywallRoutes);
  } catch (error) {
    logger.error('greywall.routes.js failed:', { 
      error: error.message, 
      stack: error.stack,
      name: error.name 
    });
    console.error('greywall.routes.js failed:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
  }
  try {
    const greywallAdminRoutes = require('./routes/greywallAdmin.routes.js');
    app.use('/api/admin', apiRateLimit, greywallAdminRoutes);
    app.use('/api/monitoring', apiRateLimit, greywallAdminRoutes);
    app.use('/api/debug', apiRateLimit, greywallAdminRoutes);
    app.use('/api/health', apiRateLimit, greywallAdminRoutes);
  } catch (error) {
    logger.error('greywallAdmin.routes.js failed:', { 
      error: error.message, 
      stack: error.stack,
      name: error.name 
    });
    console.error('greywallAdmin.routes.js failed:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
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
    method: req.method,
    body: req.body
  });
  
  // Don't expose internal errors in production
  const isProduction = process.env.NODE_ENV === 'production';
  const message = isProduction && err.status >= 500 
    ? 'Internal server error' 
    : (err.message || 'Internal server error');
  
  res.status(err.status || 500).json({
    success: false,
    message: message,
    service: 'auth-service',
    ...(isProduction ? {} : { error: err.message, stack: err.stack })
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
    
    // 404 handler for unmatched routes (MUST be after all routes are registered)
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.path}`,
        error: 'ROUTE_NOT_FOUND',
        service: 'auth-service'
      });
    });
    
    const PORT = process.env.PORT || 3001;
    const HOST = '0.0.0.0';
    
    // Use SSL utility if available, otherwise fallback to standard HTTP
    const server = createServer 
      ? createServer(app, PORT, HOST)
      : app.listen(PORT, HOST, () => {
          logger.info(`auth-service running on port ${PORT}`);
        });
    
    if (server) {
      logger.info(`auth-service started on ${process.env.ENABLE_SSL === 'true' ? 'https' : 'http'}://${HOST}:${PORT}`);
      
      monitoringService.startMonitoring();
      keyManagementService.startKeyRotationScheduler();
    }
  } catch (error) {
    logger.error('auth-service startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();