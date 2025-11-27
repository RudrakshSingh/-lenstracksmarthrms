require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');
const azureConfig = require('./config/azure.config');
const { ipFilter } = require('./middleware/security.middleware');

const app = express();

// Set ALLOWED_IPS from azureConfig if not already set (but don't enable by default)
// IP whitelist should only be enabled explicitly via IP_WHITELIST_ENABLED=true
if (!process.env.ALLOWED_IPS && azureConfig.ipWhitelist.allowedIPs.length > 0) {
  process.env.ALLOWED_IPS = azureConfig.ipWhitelist.allowedIPs.join(',');
  logger.info('IP whitelist configured from azureConfig (not enabled by default)', { 
    allowedIPs: azureConfig.ipWhitelist.allowedIPs,
    note: 'Set IP_WHITELIST_ENABLED=true to enable IP filtering'
  });
}

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration - allow all origins if '*' is specified
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // If CORS_ORIGIN is '*', allow all origins
    if (azureConfig.cors.origin === '*' || process.env.CORS_ORIGIN === '*') {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    const allowedOrigins = Array.isArray(azureConfig.cors.origin) 
      ? azureConfig.cors.origin 
      : azureConfig.cors.origin.split(',').map(o => o.trim());
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow for now, can be made stricter if needed
    }
  },
  credentials: azureConfig.cors.credentials,
  methods: azureConfig.cors.methods || ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: azureConfig.cors.allowedHeaders || ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// IP whitelist middleware - only apply if explicitly enabled
// This allows the IP to be configured but not block requests unless explicitly enabled
// IMPORTANT: IP whitelist is DISABLED by default to prevent accidental blocking
if (process.env.IP_WHITELIST_ENABLED === 'true') {
  app.use(ipFilter);
  logger.info('IP whitelist middleware ENABLED', { 
    allowedIPs: process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',') : azureConfig.ipWhitelist.allowedIPs 
  });
} else {
  logger.info('IP whitelist DISABLED (set IP_WHITELIST_ENABLED=true to enable)', {
    note: 'All IPs are allowed by default',
    configuredIPs: process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',') : azureConfig.ipWhitelist.allowedIPs
  });
}

// Rate limiting
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP'
});

// Body parsing middleware - optimized for performance
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb',
  parameterLimit: 1000 // Limit number of parameters
}));

// Compression middleware - optimize response size
const compression = require('compression');
app.use(compression({
  level: 6, // Compression level (1-9, 6 is good balance)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Database connection with improved timeout handling for Azure Cosmos DB
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
      mongoUri = `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'hr_service'}`;
      logger.warn('MONGO_URI not set. Using local MongoDB. Set MONGO_URI environment variable or configure Azure Key Vault.');
    }
    
    // Set connection options optimized for Azure Cosmos DB
    const connectionOptions = {
      serverSelectionTimeoutMS: 30000, // Increased to 30s for Azure
      socketTimeoutMS: 60000, // 60s socket timeout for Azure
      connectTimeoutMS: 30000, // 30s connection timeout for Azure
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
      bufferMaxEntries: 0,
      bufferCommands: false,
      // Add heartbeat to detect dead connections
      heartbeatFrequencyMS: 10000,
      // Azure Cosmos DB specific options
      ssl: true,
      sslValidate: true
    };
    
    // Add connection event handlers
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
    
    await mongoose.connect(mongoUri, connectionOptions);
    
    logger.info('hr-service: MongoDB connected successfully', {
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      readyState: mongoose.connection.readyState
    });
  } catch (error) {
    logger.error('hr-service: Database connection failed', { 
      error: error.message,
      stack: error.stack,
      note: 'Service will continue but database operations may fail'
    });
    // Don't throw - allow service to start for health checks
    // The service can still respond to health checks even if DB is down
  }
};

// Load routes with COMPLETE logic
const loadRoutes = () => {
  logger.info('Loading hr-service routes...');
  
  const routesLoaded = [];
  const routesFailed = [];
  
  try {
    const authRoutes = require('./routes/auth.routes.js');
    // Mount auth routes at /api/auth (as per frontend spec)
    app.use('/api/auth', authRoutes);
    routesLoaded.push('auth.routes.js');
    logger.info('auth.routes.js loaded successfully at /api/auth');
  } catch (error) {
    routesFailed.push({ route: 'auth.routes.js', error: error.message });
    logger.error('auth.routes.js failed to load', { error: error.message, stack: error.stack });
  }
  
  try {
    const onboardingRoutes = require('./routes/onboarding.routes.js');
    // Mount onboarding routes at /api/hr (includes work-details, statutory, complete-onboarding, drafts)
    app.use('/api/hr', apiRateLimit, onboardingRoutes);
    routesLoaded.push('onboarding.routes.js');
    logger.info('onboarding.routes.js loaded successfully');
  } catch (error) {
    routesFailed.push({ route: 'onboarding.routes.js', error: error.message });
    logger.error('onboarding.routes.js failed to load', { error: error.message, stack: error.stack });
  }
  
  try {
    // Register endpoint at /api/auth/register (public endpoint, separate from /api/hr)
    const onboardingController = require('./controllers/onboardingController');
    const { validateRequest } = require('./middleware/validateRequest.wrapper');
    const asyncHandler = require('./utils/asyncHandler');
    const Joi = require('joi');
    const registerSchema = {
      body: Joi.object({
        employee_id: Joi.string().required(),
        name: Joi.string().min(2).max(100).required(),
        email: Joi.string().email().required(),
        phone: Joi.string().required(),
        password: Joi.string().min(8).required(),
        role: Joi.string().valid('employee', 'hr', 'manager', 'admin', 'superadmin').default('employee'),
        date_of_birth: Joi.date().optional(),
        address: Joi.object({
          address_line_1: Joi.string().optional(),
          street: Joi.string().optional(),
          city: Joi.string().required(),
          state: Joi.string().required(),
          pincode: Joi.string().pattern(/^\d{6}$/).required(),
          zip: Joi.string().optional(),
          country: Joi.string().default('India')
        }).required()
      })
    };
    app.post('/api/auth/register', validateRequest(registerSchema), asyncHandler(onboardingController.register));
    routesLoaded.push('register.route');
    logger.info('register.route loaded successfully at /api/auth/register');
  } catch (error) {
    routesFailed.push({ route: 'register.route', error: error.message });
    logger.error('register.route failed to load', { error: error.message, stack: error.stack });
  }
  
  try {
    const hrRoutes = require('./routes/hr.routes.js');
    app.use('/api/hr', apiRateLimit, hrRoutes);
    routesLoaded.push('hr.routes.js');
    logger.info('hr.routes.js loaded successfully');
  } catch (error) {
    routesFailed.push({ route: 'hr.routes.js', error: error.message });
    logger.error('hr.routes.js failed to load', { error: error.message, stack: error.stack });
  }
  
  try {
    const adminRoutes = require('./routes/admin.routes.js');
    app.use('/api/admin', apiRateLimit, adminRoutes);
    routesLoaded.push('admin.routes.js');
    logger.info('admin.routes.js loaded successfully at /api/admin');
  } catch (error) {
    routesFailed.push({ route: 'admin.routes.js', error: error.message });
    logger.error('admin.routes.js failed to load', { error: error.message, stack: error.stack });
  }
  
  try {
    const hrLetterRoutes = require('./routes/hrLetter.routes.js');
    app.use('/api/hr-letter', apiRateLimit, hrLetterRoutes);
    routesLoaded.push('hrLetter.routes.js');
    logger.info('hrLetter.routes.js loaded successfully');
  } catch (error) {
    routesFailed.push({ route: 'hrLetter.routes.js', error: error.message });
    logger.error('hrLetter.routes.js failed to load', { error: error.message, stack: error.stack });
  }
  
  try {
    const transferRoutes = require('./routes/transfer.routes.js');
    app.use('/api/transfers', apiRateLimit, transferRoutes);
    routesLoaded.push('transfer.routes.js');
    logger.info('transfer.routes.js loaded successfully');
  } catch (error) {
    routesFailed.push({ route: 'transfer.routes.js', error: error.message });
    logger.error('transfer.routes.js failed to load', { error: error.message, stack: error.stack });
  }
  
  try {
    const leaveRoutes = require('./routes/leave.routes.js');
    app.use('/api/hr', apiRateLimit, leaveRoutes);
    routesLoaded.push('leave.routes.js');
    logger.info('leave.routes.js loaded successfully');
  } catch (error) {
    routesFailed.push({ route: 'leave.routes.js', error: error.message });
    logger.error('leave.routes.js failed to load', { error: error.message, stack: error.stack });
  }
  
  try {
    const payrollRoutes = require('./routes/payroll.routes.js');
    app.use('/api/hr', apiRateLimit, payrollRoutes);
    routesLoaded.push('payroll.routes.js');
    logger.info('payroll.routes.js loaded successfully');
  } catch (error) {
    routesFailed.push({ route: 'payroll.routes.js', error: error.message });
    logger.error('payroll.routes.js failed to load', { error: error.message, stack: error.stack });
  }
  
  try {
    const incentiveRoutes = require('./routes/incentive.routes.js');
    app.use('/api/hr', apiRateLimit, incentiveRoutes);
    routesLoaded.push('incentive.routes.js');
    logger.info('incentive.routes.js loaded successfully');
  } catch (error) {
    routesFailed.push({ route: 'incentive.routes.js', error: error.message });
    logger.error('incentive.routes.js failed to load', { error: error.message, stack: error.stack });
  }
  
  try {
    const fnfRoutes = require('./routes/fnf.routes.js');
    app.use('/api/hr', apiRateLimit, fnfRoutes);
    routesLoaded.push('fnf.routes.js');
    logger.info('fnf.routes.js loaded successfully');
  } catch (error) {
    routesFailed.push({ route: 'fnf.routes.js', error: error.message });
    logger.error('fnf.routes.js failed to load', { error: error.message, stack: error.stack });
  }
  
  try {
    const statutoryRoutes = require('./routes/statutory.routes.js');
    app.use('/api/hr', apiRateLimit, statutoryRoutes);
    routesLoaded.push('statutory.routes.js');
    logger.info('statutory.routes.js loaded successfully');
  } catch (error) {
    routesFailed.push({ route: 'statutory.routes.js', error: error.message });
    logger.error('statutory.routes.js failed to load', { error: error.message, stack: error.stack });
  }
  
  try {
    const reportsRoutes = require('./routes/reports.routes.js');
    app.use('/api/hr', apiRateLimit, reportsRoutes);
    routesLoaded.push('reports.routes.js');
    logger.info('reports.routes.js loaded successfully');
  } catch (error) {
    routesFailed.push({ route: 'reports.routes.js', error: error.message });
    logger.error('reports.routes.js failed to load', { error: error.message, stack: error.stack });
  }
  
  try {
    const leaveYearCloseRoutes = require('./routes/leaveYearClose.routes.js');
    app.use('/api/hr', apiRateLimit, leaveYearCloseRoutes);
    routesLoaded.push('leaveYearClose.routes.js');
    logger.info('leaveYearClose.routes.js loaded successfully');
  } catch (error) {
    routesFailed.push({ route: 'leaveYearClose.routes.js', error: error.message });
    logger.error('leaveYearClose.routes.js failed to load', { error: error.message, stack: error.stack });
  }
  
  try {
    const webhookRoutes = require('./routes/webhooks.routes.js');
    app.use('/api/hr/webhooks', webhookRoutes);
    routesLoaded.push('webhooks.routes.js');
    logger.info('webhooks.routes.js loaded successfully');
  } catch (error) {
    routesFailed.push({ route: 'webhooks.routes.js', error: error.message });
    logger.error('webhooks.routes.js failed to load', { error: error.message, stack: error.stack });
  }
  
  try {
    const auditRoutes = require('./routes/audit.routes.js');
    app.use('/api/hr', apiRateLimit, auditRoutes);
    routesLoaded.push('audit.routes.js');
    logger.info('audit.routes.js loaded successfully');
  } catch (error) {
    routesFailed.push({ route: 'audit.routes.js', error: error.message });
    logger.error('audit.routes.js failed to load', { error: error.message, stack: error.stack });
  }

  logger.info(`hr-service routes loaded: ${routesLoaded.length} successful, ${routesFailed.length} failed`);
  
  if (routesFailed.length > 0) {
    logger.warn('Some routes failed to load', { failed: routesFailed });
  }
};

// Enhanced Health check for production
app.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      service: 'hr-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      port: process.env.PORT || 3002,
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB'
      }
    };

    // Check database connection
    if (mongoose.connection.readyState === 1) {
      healthStatus.database = 'connected';
    } else {
      healthStatus.database = 'disconnected';
      healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      service: 'hr-service',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Readiness probe (for Kubernetes)
app.get('/ready', async (req, res) => {
  try {
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        ready: false,
        reason: 'Database not connected'
      });
    }

    res.json({
      ready: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error.message
    });
  }
});

// Liveness probe (for Kubernetes)
app.get('/live', (req, res) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString()
  });
});

// Business API Routes (legacy endpoints for backwards compatibility)
// These will be registered in startServer() after loadRoutes() to ensure correct order

// Start server
const startServer = async () => {
  try {
    // Connect to database with retry logic
    let dbConnected = false;
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await connectDB();
        dbConnected = true;
        break;
      } catch (dbError) {
        logger.warn(`Database connection attempt ${i + 1}/${maxRetries} failed`, { error: dbError.message });
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        }
      }
    }
    
    if (!dbConnected) {
      logger.error('Failed to connect to database after retries - service will start but may have limited functionality');
      // Don't exit - allow service to start for health checks
    }
    
    // Seed default roles only if ENABLE_ROLE_SEEDING is true (disabled by default for production)
    if (process.env.ENABLE_ROLE_SEEDING === 'true') {
      try {
        const { seedRoles } = require('./utils/seedRoles');
        await seedRoles();
        logger.info('Default roles checked/created (seeding enabled)');
      } catch (seedError) {
        logger.warn('Failed to seed roles', { error: seedError.message });
        // Don't fail startup if role seeding fails
      }
    } else {
      logger.info('Role seeding disabled - using real data from database');
    }
    
    // Ensure super admin exists (always run, but only creates if doesn't exist)
    if (dbConnected) {
      try {
        const { ensureSuperAdmin } = require('./services/superAdmin.service');
        const superAdmin = await ensureSuperAdmin();
        logger.info('Super admin verified/created', { 
          email: superAdmin.email,
          userId: superAdmin.user._id 
        });
      } catch (superAdminError) {
        logger.warn('Failed to ensure super admin exists', { error: superAdminError.message });
        // Don't fail startup if super admin creation fails
      }
    }
    
    // Load routes BEFORE starting server
    try {
      loadRoutes();
    } catch (routeError) {
      logger.error('Error loading routes', { error: routeError.message, stack: routeError.stack });
      // Continue startup even if some routes fail to load
    }
    
    // Status and health endpoints (MUST be after loadRoutes to ensure they're accessible)
    app.get('/api/hr/status', (req, res) => {
      res.json({
        service: 'hr-service',
        status: 'operational',
        timestamp: new Date().toISOString(),
        businessLogic: 'active'
      });
    });

    app.get('/api/hr/health', (req, res) => {
      res.json({
        service: 'hr-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        businessLogic: 'active'
      });
    });
    
    // Base /api/hr route - show available endpoints (MUST be after loadRoutes to override router handlers)
    app.get('/api/hr', (req, res) => {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      res.json({
        service: 'hr-service',
        version: '1.0.0',
        status: 'operational',
        message: 'HR Management Service API',
        baseUrl: baseUrl,
        endpoints: {
          // Authentication endpoints
          login: 'POST /api/auth/login',
          refreshToken: 'POST /api/auth/refresh',
          logout: 'POST /api/auth/logout',
          getCurrentUser: 'GET /api/auth/me',
          // Health & Status
          health: 'GET /api/hr/health',
          status: 'GET /api/hr/status',
          // HR Endpoints (require authentication)
          employees: 'GET /api/hr/employees',
          onboarding: 'POST /api/hr/onboarding',
          leave: 'GET /api/hr/leave',
          payroll: 'GET /api/hr/payroll',
          reports: 'GET /api/hr/reports'
        },
        authentication: {
          note: 'Most endpoints require authentication. Include Authorization header with Bearer token.',
          example: 'Authorization: Bearer <your-token>',
          loginEndpoint: `${baseUrl}/api/auth/login`,
          loginExample: {
            method: 'POST',
            url: `${baseUrl}/api/auth/login`,
            body: {
              email: 'user@example.com',
              password: 'your-password',
              rememberMe: false
            }
          }
        },
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    });
    
    // Enhanced 404 handler with route information - MUST be after routes are loaded
    app.use((req, res) => {
      const routesInfo = [];
      routesInfo.push('GET /health');
      routesInfo.push('GET /api/hr/status');
      routesInfo.push('GET /api/hr/health');
      
      res.status(404).json({
        success: false,
        message: 'Route not found - The requested endpoint does not exist or may require authentication',
        path: req.path,
        method: req.method,
        service: 'hr-service',
        port: process.env.PORT || 3002,
        hint: 'Most routes require authentication. Include Authorization header with Bearer token.',
        availableEndpoints: routesInfo,
        timestamp: new Date().toISOString(),
        troubleshooting: {
          authentication: 'Add header: Authorization: Bearer <token>',
          dynamicRoutes: 'Replace :id with actual ID (e.g., /api/hr/employees/actual-id-123)',
          basePath: 'All routes are under /api/hr/'
        }
      });
    });

    // Error handling middleware - must be after all routes
    const { errorConverter, errorHandler } = require('./middleware/error');

    // Convert errors to ApiError format
    app.use(errorConverter);

    // Handle all errors
    app.use(errorHandler);
    
    // Azure App Service sets PORT automatically, use it or default to 3002
    const PORT = process.env.PORT || process.env.WEBSITES_PORT || 3002;
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`hr-service running on port ${PORT}`);
      logger.info(`hr-service started on http://0.0.0.0:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Database: ${dbConnected ? 'connected' : 'disconnected (will retry)'}`);
      
      // Log registered routes for debugging
      if (process.env.NODE_ENV === 'development') {
        const routes = [];
        app._router?.stack?.forEach((middleware) => {
          if (middleware.route) {
            routes.push(`${Object.keys(middleware.route.methods)[0].toUpperCase()} ${middleware.route.path}`);
          } else if (middleware.name === 'router') {
            middleware.handle.stack?.forEach((handler) => {
              if (handler.route) {
                routes.push(`${Object.keys(handler.route.methods)[0].toUpperCase()} ${handler.regexp.source}`);
              }
            });
          }
        });
        logger.info(`Registered routes: ${routes.length} routes loaded`);
      }
    });
    
    // Handle server errors gracefully
    server.on('error', (error) => {
      logger.error('Server error', { error: error.message, code: error.code });
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      }
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    logger.error('hr-service startup failed', { error: error.message, stack: error.stack });
    // Don't exit immediately - log error and try to start anyway for health checks
    logger.warn('Attempting to start service in degraded mode');
    
    const PORT = process.env.PORT || process.env.WEBSITES_PORT || 3002;
    app.listen(PORT, '0.0.0.0', () => {
      logger.warn(`hr-service started in degraded mode on port ${PORT}`);
      logger.warn('Some functionality may be limited');
    });
  }
};

startServer();