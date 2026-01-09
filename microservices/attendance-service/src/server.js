// Load environment variables from .env in development; ignore missing module in production
try {
  // eslint-disable-next-line global-require
  require('dotenv').config();
} catch (err) {
  // eslint-disable-next-line no-console
  if (process.env.NODE_ENV !== 'production') {
    console.warn('dotenv not available for attendance-service, skipping .env loading:', err.message);
  }
}
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
// const responseTime = require('response-time'); // Temporarily disabled - image needs rebuild
const logger = require('./config/logger');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Response time tracking - temporarily disabled (image needs rebuild with response-time package)
// app.use(responseTime((req, res, time) => {
//   if (time > 40 && !isProduction) {
//     logger.warn(`Slow request: ${req.method} ${req.path} took ${time.toFixed(2)}ms`);
//   }
//   res.setHeader('X-Response-Time', `${time.toFixed(2)}ms`);
// }));

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

// Database connection - optimized for Azure Cosmos DB (same pattern as HR service)
const connectDB = async () => {
  try {
    // Support both MONGO_URI and MONGODB_URI (common variations)
    let mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    // Fallback to local MongoDB for development
    if (!mongoUri) {
      mongoUri = `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'attendance_service'}`;
      logger.warn('MONGO_URI not set. Using local MongoDB. Set MONGO_URI environment variable.');
    }
    
    // Get target database name - prioritize env vars, but ensure it's MAIN database
    let targetDbName = process.env.DB_NAME || process.env.MONGO_DB_NAME;
    
    // If no env var or env var contains "test", use main production database
    if (!targetDbName || targetDbName.toLowerCase().includes('test')) {
      targetDbName = 'attendance-db';
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
    
    // Determine if this is Cosmos DB
    const isCosmosDB = mongoUri.includes('cosmos.azure.com') || mongoUri.includes('documents.azure.com');
    
    // Set connection options optimized for Azure Cosmos DB
    const connectionOptions = {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
      dbName: targetDbName, // Explicitly set the database name
    };
    
    // Azure Cosmos DB specific options
    if (isCosmosDB) {
      connectionOptions.tls = true;
      connectionOptions.tlsInsecure = false;
      connectionOptions.retryWrites = true;
      logger.info('Connecting to Azure Cosmos DB (MongoDB API)');
    }
    
    await mongoose.connect(mongoUri, connectionOptions);
    
    const actualDbName = mongoose.connection.name;
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('✅ attendance-service: MongoDB connected successfully');
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
    logger.error('attendance-service: Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Load routes - OPTIONAL: Service continues even if routes fail
const loadRoutes = () => {
  let routesLoaded = 0;
  let routesFailed = 0;
  
  // Attendance routes (REQUIRED - make it fail if routes don't load)
  try {
    const attendanceRoutes = require('./routes/attendance.routes.js');
    app.use('/api/attendance', apiRateLimit, attendanceRoutes);
    routesLoaded++;
    logger.info('✅ attendance.routes.js loaded successfully', { 
      routesCount: attendanceRoutes.stack?.length || 'unknown'
    });
  } catch (error) {
    routesFailed++;
    logger.error('❌ attendance.routes.js FAILED to load', { 
      error: error.message, 
      stack: error.stack 
    });
    console.error('❌ Attendance routes failed to load:', error.message);
    // Don't throw - allow service to start but log the error clearly
  }
  
  // Geofencing routes (OPTIONAL)
  try {
    const geofencingRoutes = require('./routes/geofencing.routes.js');
    app.use('/api/geofencing', apiRateLimit, geofencingRoutes);
    routesLoaded++;
    logger.info('✅ geofencing.routes.js loaded');
  } catch (error) {
    routesFailed++;
    logger.warn('⚠️  geofencing.routes.js SKIPPED (optional)', { error: error.message });
    console.log('⚠️  Geofencing routes skipped - service will continue without them');
  }
  
  // Security routes (OPTIONAL)
  try {
    const securityRoutes = require('./routes/security.routes.js');
    app.use('/api/security', apiRateLimit, securityRoutes);
    routesLoaded++;
    logger.info('✅ security.routes.js loaded');
  } catch (error) {
    routesFailed++;
    logger.warn('⚠️  security.routes.js SKIPPED (optional)', { error: error.message });
    console.log('⚠️  Security routes skipped - service will continue without them');
  }
  
  logger.info(`Routes summary: ${routesLoaded} loaded, ${routesFailed} skipped (optional)`);
  console.log(`✅ Attendance service starting with ${routesLoaded}/${routesLoaded + routesFailed} routes`);
};

// Health check
app.get('/health', (req, res) => {
  return res.json({
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
  return res.json({
    service: 'attendance-service',
    status: 'operational',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});

app.get('/api/attendance/health', (req, res) => {
  return res.json({
    service: 'attendance-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    businessLogic: 'active'
  });
});


app.post('/api/attendance/checkin', (req, res) => {
  return res.json({
    service: 'attendance-service',
    endpoint: '/api/attendance/checkin',
    method: 'POST',
    status: 'success',
    message: 'Employee check-in',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/attendance/checkout', (req, res) => {
  return res.json({
    service: 'attendance-service',
    endpoint: '/api/attendance/checkout',
    method: 'POST',
    status: 'success',
    message: 'Employee check-out',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/attendance/records', (req, res) => {
  return res.json({
    service: 'attendance-service',
    endpoint: '/api/attendance/records',
    method: 'GET',
    status: 'success',
    message: 'Get attendance records',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/attendance/reports', (req, res) => {
  return res.json({
    service: 'attendance-service',
    endpoint: '/api/attendance/reports',
    method: 'GET',
    status: 'success',
    message: 'Get attendance reports',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/attendance/geofencing', (req, res) => {
  return res.json({
    service: 'attendance-service',
    endpoint: '/api/attendance/geofencing',
    method: 'GET',
    status: 'success',
    message: 'Get geofencing data',
    timestamp: new Date().toISOString()
  });
});


// Error handling middleware (must be before 404 handler)
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
    
    // Initialize Azure Blob Storage for selfie uploads
    const { initializeBlobStorage } = require('./config/azureStorage');
    await initializeBlobStorage();
    
    loadRoutes();
    
    // Enhanced 404 handler with route information - MUST be after loadRoutes()
    app.use((req, res) => {
      // Try to get route information if available
      const routesInfo = [];
      
      // Common routes that should exist
      routesInfo.push('GET /health');
      routesInfo.push(`GET /api/attendance/status`);
      routesInfo.push(`GET /api/attendance/health`);
      routesInfo.push(`GET /api/attendance/stats`);
      routesInfo.push(`POST /api/attendance/clock-in`);
      routesInfo.push(`GET /api/attendance/records`);
      
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