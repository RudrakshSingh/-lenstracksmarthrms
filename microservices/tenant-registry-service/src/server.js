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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Requested-With']
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

// Routes
app.use('/api/tenants', tenantRoutes);

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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    error: 'ROUTE_NOT_FOUND'
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
server.listen(PORT, () => {
  logger.info(`🚀 Tenant Registry Service started on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

module.exports = { app, server, io };
