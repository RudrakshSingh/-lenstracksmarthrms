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
    
    // Get target database name - prioritize env vars, but ensure it's MAIN database
    let targetDbName = process.env.DB_NAME || process.env.MONGO_DB_NAME;
    
    // If no env var or env var contains "test", use main production database
    if (!targetDbName || targetDbName.toLowerCase().includes('test')) {
      targetDbName = 'auth-db';
      if (process.env.MONGO_DB_NAME && process.env.MONGO_DB_NAME.toLowerCase().includes('test')) {
        logger.error('⚠️  ERROR: MONGO_DB_NAME contains "test"! Using main production database instead.', {
          provided: process.env.MONGO_DB_NAME,
          using: targetDbName
        });
      }
    }
    
    // Parse connection string to extract and set database name
    try {
      const url = new URL(mongoUri);
      const existingDbName = url.pathname ? url.pathname.substring(1).split('?')[0] : '';
      
      // Check if existing database name is test or empty
      if (!existingDbName || existingDbName.trim() === '' || existingDbName.toLowerCase().includes('test')) {
        if (existingDbName && existingDbName.toLowerCase().includes('test')) {
          logger.error('⚠️  ERROR: Connection string points to TEST database! Replacing with main production database.', {
            testDbName: existingDbName,
            mainDbName: targetDbName
          });
        }
        url.pathname = `/${targetDbName}`;
        mongoUri = url.toString();
        logger.info('✅ Database name set in connection string', { 
          database: targetDbName,
          wasTestDb: existingDbName && existingDbName.toLowerCase().includes('test'),
          wasEmpty: !existingDbName || existingDbName.trim() === ''
        });
      } else if (existingDbName !== targetDbName) {
        logger.warn('⚠️  Database name in connection string differs from target. Forcing to main database.', {
          uriDbName: existingDbName,
          targetDbName: targetDbName
        });
        url.pathname = `/${targetDbName}`;
        mongoUri = url.toString();
        logger.info('✅ Database name forced to main database', { database: targetDbName });
      } else {
        logger.info('✅ Database name already correct', { database: existingDbName });
      }
    } catch (urlError) {
      logger.warn('URL parsing failed, using regex-based database name extraction', { error: urlError.message });
      const dbNameMatch = mongoUri.match(/\/([^/?]+)(\?|$)/);
      const existingDbName = dbNameMatch ? dbNameMatch[1] : null;
      
      if (!existingDbName || existingDbName.trim() === '' || existingDbName.toLowerCase().includes('test')) {
        if (mongoUri.includes('?')) {
          mongoUri = mongoUri.replace(/\/(\?)/, `/${targetDbName}$1`);
        } else if (mongoUri.endsWith('/')) {
          mongoUri = `${mongoUri}${targetDbName}`;
        } else {
          const lastSlashIndex = mongoUri.lastIndexOf('/');
          if (lastSlashIndex !== -1) {
            const beforeSlash = mongoUri.substring(0, lastSlashIndex + 1);
            const afterSlash = mongoUri.substring(lastSlashIndex + 1);
            if (afterSlash.includes('@') || afterSlash.includes('?')) {
              mongoUri = `${beforeSlash}${targetDbName}${afterSlash.includes('?') ? '' : '?'}${afterSlash.includes('?') ? afterSlash.substring(afterSlash.indexOf('?')) : ''}`;
            } else {
              mongoUri = `${beforeSlash}${targetDbName}`;
            }
          } else {
            mongoUri = `${mongoUri}/${targetDbName}`;
          }
        }
        logger.info('✅ Database name set using regex method', { database: targetDbName });
      }
    }
    
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
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('✅ auth-service: MongoDB connected successfully');
    logger.info('═══════════════════════════════════════════════════════', {
      database: actualDbName,
      targetDatabase: targetDbName,
      host: mongoose.connection.host,
      readyState: mongoose.connection.readyState
    });
    
    if (actualDbName.toLowerCase().includes('test')) {
      logger.error('❌ CRITICAL ERROR: Connected to TEST database!', {
        database: actualDbName,
        expected: targetDbName
      });
    } else if (actualDbName !== targetDbName) {
      logger.warn('⚠️  WARNING: Database name mismatch!', {
        actual: actualDbName,
        expected: targetDbName
      });
    } else {
      logger.info('✅ Database connection verified - using MAIN database', {
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
    if (!isProduction) logger.info('✅ auth.routes.js loaded');
  } catch (error) {
    logger.warn('⚠️  auth.routes.js SKIPPED (optional)', { error: error.message });
    console.log('⚠️  Auth routes skipped - service will continue');
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
    console.error('❌ realUsers.routes.js failed:', error.message);
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
    console.error('❌ permission.routes.js failed:', error.message);
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
    console.error('❌ emergencyLock.routes.js failed:', error.message);
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
    console.error('❌ greywall.routes.js failed:', error.message);
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
    console.error('❌ greywallAdmin.routes.js failed:', error.message);
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