// Load environment variables from .env in development; ignore missing module in production
try {
  // eslint-disable-next-line global-require
  require('dotenv').config();
} catch (err) {
  if (process.env.NODE_ENV !== 'production') {
    // logger is not initialized yet at this point, use stderr intentionally.
    process.stderr.write(`dotenv not available for attendance-service, skipping .env loading: ${err.message}\n`);
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
const { getEmployeePayroll } = require('./utils/payrollServiceClient');

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
  // AWS ALB URL (removed Azure IP)
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

// Rate limiting - Increased for testing and production
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10000, // limit each IP to 10000 requests per windowMs (configurable via env)
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for authenticated admin users
  skip: (req) => {
    return req.user && (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'hr');
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection - optimized for AWS DocumentDB (same pattern as HR service)
const connectDB = async () => {
  try {
    // Support both MONGO_URI and MONGODB_URI (common variations)
    let mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    // If MONGO_URI is just an endpoint (from secret), construct full connection string
    if (mongoUri && !mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      // MONGO_URI is just endpoint, construct full connection string
      const mongoUsername = process.env.MONGO_USERNAME;
      const mongoPassword = process.env.MONGO_PASSWORD;
      const mongoEndpoint = mongoUri; // This is the endpoint
      const dbName = process.env.MONGO_DB_NAME || process.env.DB_NAME || 'etelios';
      
      if (mongoUsername && mongoPassword && mongoEndpoint) {
        // Construct DocumentDB connection string
        mongoUri = `mongodb://${mongoUsername}:${mongoPassword}@${mongoEndpoint}/${dbName}?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false`;
        logger.info('Constructed MongoDB connection string from endpoint and credentials', {
          endpoint: mongoEndpoint,
          database: dbName
        });
      } else {
        logger.warn('MONGO_URI is endpoint but missing username/password. Using as-is.');
      }
    }
    
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
        logger.warn('⚠️  Database name in connection string differs from target. Forcing to target database.', {
          uriDbName: existingDbName,
          targetDbName: targetDbName
        });
        url.pathname = `/${targetDbName}`;
        mongoUri = url.toString();
        logger.info('✅ Database name forced to target database', { database: targetDbName });
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
    
    // AWS MongoDB connection options (optimized for AWS DocumentDB or regular MongoDB)
    // Check if this is AWS DocumentDB (connection string contains docdb.amazonaws.com)
    const isDocumentDB = mongoUri.includes('docdb.amazonaws.com');
    
    // Set connection options optimized for AWS MongoDB/DocumentDB
    const connectionOptions = {
      serverSelectionTimeoutMS: 15000, // 15s for AWS
      socketTimeoutMS: 45000, // 45s socket timeout for AWS
      connectTimeoutMS: 15000, // 15s connection timeout for AWS
      maxPoolSize: 50, // Increased for AWS (was 10)
      minPoolSize: 10, // Increased for AWS (was 2)
      maxIdleTimeMS: 30000,
      retryWrites: false, // DocumentDB doesn't support retryable writes
      retryReads: true,
      dbName: targetDbName, // Explicitly set the database name
      heartbeatFrequencyMS: 10000 // Detect dead connections faster
    };
    
    // AWS DocumentDB specific options (only if DocumentDB)
    if (isDocumentDB) {
      connectionOptions.tls = true;
      connectionOptions.tlsInsecure = false;
      connectionOptions.tlsCAFile = process.env.DOCDB_TLS_CA_FILE || '/etc/ssl/certs/ca-cert.pem';
      connectionOptions.retryWrites = false; // DocumentDB requirement
      logger.info('Connecting to AWS DocumentDB', {
        dbName: targetDbName
      });
    } else {
      logger.info('Connecting to MongoDB on AWS', {
        dbName: targetDbName
      });
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
    const { authenticate } = require('./middleware/auth.middleware');
    const { requireRole } = require('./middleware/rbac.middleware');
    const asyncHandler = require('./utils/asyncHandler');
    const {
      getAttendanceRecords,
      getAttendanceSummary,
      bulkUpdateAttendance
    } = require('./controllers/attendanceController');
    
    // CRITICAL: Add direct routes FIRST (before mounting router) to ensure they work
    // GET /api/attendance/summary - Get attendance summary (MUST be before /api/attendance)
    // Note: Validation is handled in controller, so we don't need validateRequest here
    app.get('/api/attendance/summary',
      apiRateLimit,
      authenticate,
      asyncHandler(getAttendanceSummary)
    );
    
    // Add store and department routes directly BEFORE mounting router
    const {
      getAttendanceByStore,
      getAttendanceByDepartment
    } = require('./controllers/attendanceController');
    
    // Store-wise attendance (Admin/HR only) - MUST be before /:id route
    app.get('/api/attendance/store/:storeId',
      apiRateLimit,
      authenticate,
      requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['attendance:read']),
      asyncHandler(getAttendanceByStore)
    );
    
    // Department-wise attendance (Admin/HR only) - MUST be before /:id route
    app.get('/api/attendance/department/:departmentId',
      apiRateLimit,
      authenticate,
      requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['attendance:read']),
      asyncHandler(getAttendanceByDepartment)
    );
    
    // GET /api/attendance/records - Alternative route for attendance records
    // NO PERMISSION CHECK - controller handles role-based filtering
    app.get('/api/attendance/records',
      apiRateLimit,
      authenticate,
      // No permission check - controller handles role-based filtering
      asyncHandler(getAttendanceRecords)
    );

    // POST /api/attendance/bulk - direct mount to avoid route conflicts in some deployments
    app.post('/api/attendance/bulk',
      apiRateLimit,
      authenticate,
      requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['attendance:update']),
      asyncHandler(bulkUpdateAttendance)
    );
    
    // GET /api/attendance - Get attendance records (MUST be before router mount)
    // NO PERMISSION CHECK - controller handles role-based filtering
    // Employees can only see their own, Admin/HR can see all
    app.get('/api/attendance',
      apiRateLimit,
      authenticate,
      // No permission check - controller handles role-based filtering
      asyncHandler(getAttendanceRecords)
    );
    
    // Mount routes AFTER direct routes (router has its own routes, but direct routes take precedence)
    // This ensures direct routes work even if router has issues
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
    logger.error('Attendance routes failed to load', { error: error.message });
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
    logger.warn('Geofencing routes skipped - service will continue without them');
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
    logger.warn('Security routes skipped - service will continue without them');
  }
  
  logger.info(`Routes summary: ${routesLoaded} loaded, ${routesFailed} skipped (optional)`);
  logger.info(`Attendance service starting with ${routesLoaded}/${routesLoaded + routesFailed} routes`);
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

// Circuit breaker metrics endpoint
app.get('/api/attendance/health/circuit-breakers', (req, res) => {
  try {
    const { hrServiceBreaker, authServiceBreaker } = require('./utils/circuitBreaker');
    return res.json({
      service: 'attendance-service',
      timestamp: new Date().toISOString(),
      circuitBreakers: {
        hrService: hrServiceBreaker.getState(),
        authService: authServiceBreaker.getState()
      }
    });
  } catch (error) {
    return res.status(500).json({
      service: 'attendance-service',
      error: 'Failed to get circuit breaker state',
      message: error.message
    });
  }
});

// Scheduler status endpoint
app.get('/api/attendance/scheduler/status', (req, res) => {
  try {
    const attendanceScheduler = require('./jobs/attendanceScheduler');
    const status = attendanceScheduler.getStatus();
    return res.json({
      service: 'attendance-service',
      timestamp: new Date().toISOString(),
      scheduler: status
    });
  } catch (error) {
    return res.status(500).json({
      service: 'attendance-service',
      error: 'Failed to get scheduler status',
      message: error.message
    });
  }
});


// Legacy mock routes can bypass auth/tenant guards if enabled in production.
// Keep disabled by default; only allow explicitly for local debugging.
if (process.env.ALLOW_LEGACY_MOCK_ROUTES === 'true') {
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
}

// Attendance -> Payroll integration endpoint (auth/tenant headers forwarded)
app.get('/api/attendance/payroll/:employeeCode/:month/:year', async (req, res) => {
  try {
    const { employeeCode, month, year } = req.params;
    const authorization = req.headers.authorization || req.headers.Authorization;
    const tenantId = req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'] || req.user?.tenantId;
    const requestId = req.headers['x-request-id'] || req.headers['X-Request-ID'];

    const payroll = await getEmployeePayroll({
      employeeCode,
      month: Number(month),
      year: Number(year),
      authorization,
      tenantId,
      requestId
    });

    const payload = payroll && payroll.data != null ? payroll.data : null;

    return res.status(200).json({
      success: true,
      message: payload ? 'Payroll data fetched via payroll-service' : 'Payroll data unavailable',
      data: payload
    });
  } catch (error) {
    logger.error('Attendance payroll integration failed', { error: error.message });
    return res.status(500).json({ success: false, message: 'Attendance payroll integration failed' });
  }
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

// Add store and department routes EARLY (before loadRoutes) to ensure they're registered first
// These routes must be registered before the router's /:id route
const addStoreAndDepartmentRoutes = () => {
  try {
    const { authenticate } = require('./middleware/auth.middleware');
    const { requireRole } = require('./middleware/rbac.middleware');
    const asyncHandler = require('./utils/asyncHandler');
    const {
      getAttendanceByStore,
      getAttendanceByDepartment
    } = require('./controllers/attendanceController');
    
    // Store-wise attendance (Admin/HR only) - MUST be before /:id route
    app.get('/api/attendance/store/:storeId',
      apiRateLimit,
      authenticate,
      requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['attendance:read']),
      asyncHandler(getAttendanceByStore)
    );
    
    // Department-wise attendance (Admin/HR only) - MUST be before /:id route
    app.get('/api/attendance/department/:departmentId',
      apiRateLimit,
      authenticate,
      requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['attendance:read']),
      asyncHandler(getAttendanceByDepartment)
    );
    
    logger.info('✅ Store and department routes added directly to app');
  } catch (error) {
    logger.error('Failed to add store and department routes', { error: error.message });
  }
};

// Register routes early (before startServer)
addStoreAndDepartmentRoutes();

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    // Initialize AWS S3 for selfie uploads
    const { initializeS3Storage } = require('./config/s3Storage');
    await initializeS3Storage();
    
    // Start attendance scheduler with all cron jobs
    try {
      const attendanceScheduler = require('./jobs/attendanceScheduler');
      attendanceScheduler.start();
      logger.info('✅ Attendance scheduler started with all cron jobs');
      
      // Log scheduler status
      const status = attendanceScheduler.getStatus();
      logger.info('Scheduler status', status);
    } catch (error) {
      logger.error('Failed to start attendance scheduler', { error: error.message, stack: error.stack });
      // Don't fail server startup if scheduler fails to start
    }
    
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

    // Error handler MUST be registered after all routes (including loadRoutes), otherwise
    // next(err) from POST /clock-in etc. falls through to Express default HTML error pages.
    app.use((err, req, res, next) => {
      if (res.headersSent) {
        return next(err);
      }
      logger.error('attendance-service Error', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
      });

      const status = Number(err.status || err.statusCode) || 500;
      res.status(status).json({
        success: false,
        message: err.message || 'Internal server error',
        service: 'attendance-service',
        ...(err.errors && { errors: err.errors })
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
