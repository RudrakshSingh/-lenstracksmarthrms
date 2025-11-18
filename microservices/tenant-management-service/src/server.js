require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const logger = require('./config/logger');
const connectDB = require('./config/database');
const { errorConverter, errorHandler } = require('./middleware/error');

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Rate limiting
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === '/health' || req.path === '/api/admin/v1/health';
  }
});

app.use(apiRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Health check (before routes)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'tenant-management-service',
    timestamp: new Date().toISOString()
  });
});

// Database connection with retry logic
const connectDBWithRetry = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await connectDB();
      logger.info('Database connected successfully');
      return;
    } catch (error) {
      logger.warn(`Database connection attempt ${i + 1} failed:`, error.message);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        logger.error('Failed to connect to database after all retries');
        throw error;
      }
    }
  }
};

// Load routes
const loadRoutes = () => {
  logger.info('Loading tenant-management-service routes...');
  
  try {
    const tenantRoutes = require('./routes/tenant.routes.js');
    app.use('/api/admin/v1/tenants', tenantRoutes);
    logger.info('✅ tenant.routes.js loaded successfully');
  } catch (error) {
    logger.error('❌ tenant.routes.js failed to load:', error.message);
  }

  try {
    const platformRoutes = require('./routes/platform.routes.js');
    app.use('/api/admin/v1/platform', platformRoutes);
    logger.info('✅ platform.routes.js loaded successfully');
  } catch (error) {
    logger.error('❌ platform.routes.js failed to load:', error.message);
  }
};

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDBWithRetry();

    // Load routes
    loadRoutes();

    // Status and health endpoints
    app.get('/api/admin/v1/status', (req, res) => {
      res.json({
        service: 'tenant-management-service',
        status: 'operational',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
    });

    app.get('/api/admin/v1/health', (req, res) => {
      res.json({
        service: 'tenant-management-service',
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    });

    // Base route
    app.get('/api/admin/v1', (req, res) => {
      res.json({
        service: 'tenant-management-service',
        version: '1.0.0',
        message: 'Admin MFE Backend API',
        endpoints: {
          tenants: 'GET /api/admin/v1/tenants',
          platform: 'GET /api/admin/v1/platform/metrics',
          health: 'GET /api/admin/v1/health',
          status: 'GET /api/admin/v1/status'
        }
      });
    });

    // Error handling middleware
    app.use(errorConverter);
    app.use(errorHandler);

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'The requested resource was not found',
          path: req.path,
          method: req.method
        }
      });
    });

    // Start server
    const PORT = process.env.PORT || 3017;
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Tenant Management Service started on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://0.0.0.0:${PORT}/health`);
      logger.info(`API docs: http://0.0.0.0:${PORT}/api/admin/v1`);
    });

    // Handle server errors
    server.on('error', (error) => {
      logger.error('Server error:', error);
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      }
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully.');
      server.close(() => {
        logger.info('Process terminated');
        mongoose.connection.close();
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received. Shutting down gracefully.');
      server.close(() => {
        logger.info('Process terminated');
        mongoose.connection.close();
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      server.close(() => {
        process.exit(1);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;

