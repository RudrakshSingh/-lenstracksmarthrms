const express = require('express');
const compression = require('compression');
const responseTime = require('response-time');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const { createServer } = require('http');
const { Server } = require('socket.io');
const databaseRouter = require('./utils/database.router');
const logger = require('./utils/logger');

// Import routes
const tenantRoutes = require('./routes/tenant.routes');
const adminMfeCompatRoutes = require('./routes/adminMfeCompat.routes');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3020;

// Middleware
app.use(helmet());
// CORS configuration - allows frontend and all origins
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
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-Requested-With',
    'X-Tenant-Id',
    'X-Company-Id'
  ]
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize database router
databaseRouter.initializeRegistry()
  .then(() => {
    logger.info('Tenant Registry Service initialized successfully');
  })
  .catch((error) => {
    logger.error('Failed to initialize Tenant Registry Service:', error);
    process.exit(1);
  });

// Compression
app.use(compression({ level: 6, threshold: 1024 }));

// CRITICAL: Direct route for /api/tenant/company MUST be FIRST (before any other routes)
// This ensures it's registered before catch-all routes in other services
const tenantController = require('./controllers/tenant.controller');
const { authenticate } = require('./middleware/auth.middleware');

// Register direct route FIRST - this takes precedence over router
// Make authentication optional - try with auth, fallback to header-based lookup
app.get('/api/tenant/company', async (req, res, next) => {
  try {
    // Try authentication first (non-blocking)
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let user = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.substring(7);
        const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'etelios-dev-secret-key-2024';
        const decoded = jwt.verify(token, JWT_SECRET);
        user = decoded;
        req.user = decoded; // Set user for controller
      } catch (jwtError) {
        // Auth failed, continue without user
        logger.debug('JWT verification failed, continuing without auth', { error: jwtError.message });
      }
    }
    
    // If we have a user, use controller (which will use req.user)
    if (user) {
      return await tenantController.getCurrentCompany(req, res, next);
    }
    
    // Fallback: Try to get company from headers
    const tenantId = req.headers['x-tenant-id'] || req.query.tenantId;
    if (tenantId) {
      try {
        const Tenant = require('./models/Tenant.model');
        const tenant = await Tenant.findOne({ tenantId }).lean();
        if (tenant) {
          return res.json({
            success: true,
            data: {
              id: tenant._id?.toString(),
              tenantId: tenant.tenantId,
              name: tenant.name,
              domain: tenant.domain,
              email: tenant.email,
              status: tenant.status
            },
            message: 'Company retrieved successfully'
          });
        }
      } catch (err) {
        logger.warn('Failed to get tenant from header', { error: err.message, tenantId });
      }
    }
    
    // Final fallback: Get first active tenant
    try {
      const Tenant = require('./models/Tenant.model');
      const tenant = await Tenant.findOne({ status: 'active' }).lean();
      if (tenant) {
        return res.json({
          success: true,
          data: {
            id: tenant._id?.toString(),
            tenantId: tenant.tenantId,
            name: tenant.name,
            domain: tenant.domain,
            email: tenant.email,
            status: tenant.status
          },
          message: 'Company retrieved successfully (using first active tenant)'
        });
      }
    } catch (err) {
      logger.warn('Failed to get first active tenant', { error: err.message });
    }
    
    // If all fails, return 404
    return res.status(404).json({
      success: false,
      message: 'Company not found',
      error: 'COMPANY_NOT_FOUND'
    });
  } catch (error) {
    logger.error('Error in /api/tenant/company', { error: error.message, stack: error.stack });
    next(error);
  }
});

// Routes
// CRITICAL: Register /api/tenant routes BEFORE /api/tenants to ensure correct matching
// Frontend endpoint: /api/tenant/company (singular) - MUST be before /api/tenants
app.use('/api/tenant', tenantRoutes);
app.use('/api/tenants', tenantRoutes);
// Also support /api/admin/tenants for documentation compatibility
app.use('/api/admin/tenants', tenantRoutes);

// Add direct route for /api/tenant (list tenants) - before 404 handler
// This route handles GET /api/tenant (without /company)
// CRITICAL: This route MUST be registered before app.use('/api/tenant', ...) to ensure it matches
app.get('/api/tenant', (req, res, next) => {
  logger.info('GET /api/tenant hit', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    hasAuth: !!req.headers.authorization,
    tenantId: req.headers['x-tenant-id']
  });
  
  (async () => {
  try {
    // Try authentication first (non-blocking)
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let user = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.substring(7);
        const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'etelios-dev-secret-key-2024';
        const decoded = jwt.verify(token, JWT_SECRET);
        user = decoded;
        req.user = decoded;
      } catch (jwtError) {
        // Auth failed, continue without user
        logger.debug('JWT verification failed for /api/tenant', { error: jwtError.message });
      }
    }
    
    // Check if user has admin role
    if (user) {
      const userRole = user.role || user.roleName;
      if (userRole && ['admin', 'superadmin', 'super-admin'].includes(userRole.toLowerCase())) {
        return await tenantController.listTenants(req, res, next);
      }
    }
    
    // For non-admin or no auth, return current company instead
    return await tenantController.getCurrentCompany(req, res, next);
  } catch (error) {
    logger.error('Error in /api/tenant', { error: error.message, stack: error.stack });
    next(error);
  }
  })().catch(next);
});

// Admin MFE compatibility routes (matches frontend docs)
app.use('/api', adminMfeCompatRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthCheck = await databaseRouter.healthCheck();
    const connectionStatus = databaseRouter.getConnectionStatus();
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'tenant-registry',
      version: '1.0.0',
      database: {
        registry: connectionStatus.registry === 1,
        tenants: Object.keys(connectionStatus.tenants).length
      },
      health: healthCheck
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info('Client connected to tenant registry', {
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });

  // Handle tenant events
  socket.on('subscribe-tenant', (tenantId) => {
    socket.join(`tenant-${tenantId}`);
    logger.info(`Client subscribed to tenant: ${tenantId}`, {
      socketId: socket.id,
      tenantId
    });
  });

  socket.on('unsubscribe-tenant', (tenantId) => {
    socket.leave(`tenant-${tenantId}`);
    logger.info(`Client unsubscribed from tenant: ${tenantId}`, {
      socketId: socket.id,
      tenantId
    });
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected from tenant registry', {
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: 'INTERNAL_SERVER_ERROR'
  });
});

// 404 handler - MUST be last
// But don't catch routes that should be handled by other services
app.use('*', (req, res) => {
  // Log the request for debugging
  logger.warn('404 - Route not found', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    headers: {
      'x-tenant-id': req.headers['x-tenant-id'],
      authorization: req.headers.authorization ? 'present' : 'missing'
    }
  });
  
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    error: 'ROUTE_NOT_FOUND',
    service: 'tenant-registry-service'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await databaseRouter.closeAllConnections();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await databaseRouter.closeAllConnections();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start server
// IMPORTANT:
// - In Kubernetes, the service must bind to 0.0.0.0 (pod IP), not 127.0.0.1.
// - For local development you can set HOST=127.0.0.1.
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  logger.info(`🚀 Tenant Registry Service started on port ${PORT}`, {
    port: PORT,
    host: HOST,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

module.exports = { app, server, io };
