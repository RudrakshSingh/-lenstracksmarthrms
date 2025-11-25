require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger = require('./config/logger');

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tenant-Id']
};

app.use(cors(corsOptions));

// Rate limiting
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP'
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression({
  level: 6,
  threshold: 1024
}));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'jts-service',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'jts-service',
    timestamp: new Date().toISOString()
  });
});

// Load routes
const loadRoutes = () => {
  logger.info('Loading JTS service routes...');
  
  const routesLoaded = [];
  const routesFailed = [];

  try {
    const taskRoutes = require('./routes/task.routes.js');
    app.use('/api/v1/tasks', apiRateLimit, taskRoutes);
    routesLoaded.push('task.routes.js');
    logger.info('task.routes.js loaded successfully');
  } catch (error) {
    routesFailed.push({ route: 'task.routes.js', error: error.message });
    logger.error('task.routes.js failed to load', { error: error.message });
  }

  try {
    const selfTaskRoutes = require('./routes/selfTask.routes.js');
    app.use('/api/v1/tasks/self', apiRateLimit, selfTaskRoutes);
    routesLoaded.push('selfTask.routes.js');
    logger.info('selfTask.routes.js loaded successfully');
  } catch (error) {
    routesFailed.push({ route: 'selfTask.routes.js', error: error.message });
    logger.error('selfTask.routes.js failed to load', { error: error.message });
  }

  try {
    const timerRoutes = require('./routes/timer.routes.js');
    app.use('/api/v1', apiRateLimit, timerRoutes);
    routesLoaded.push('timer.routes.js');
    logger.info('timer.routes.js loaded successfully');
  } catch (error) {
    routesFailed.push({ route: 'timer.routes.js', error: error.message });
    logger.error('timer.routes.js failed to load', { error: error.message });
  }

  logger.info(`Routes loaded: ${routesLoaded.length} successful, ${routesFailed.length} failed`);
  if (routesFailed.length > 0) {
    logger.warn('Failed routes', { failed: routesFailed });
  }
};

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method,
    service: 'jts-service'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    logger.info('Database connected');

    // Connect to Redis
    connectRedis();
    logger.info('Redis connected');

    // Load routes
    loadRoutes();

    // Start background jobs
    if (process.env.ENABLE_BACKGROUND_JOBS !== 'false') {
      const escalationCheckerJob = require('./jobs/escalationChecker.job');
      escalationCheckerJob.start();

      const performanceCalculatorJob = require('./jobs/performanceCalculator.job');
      performanceCalculatorJob.start();

      logger.info('Background jobs started');
    }

    // Start server
    const PORT = process.env.PORT || process.env.WEBSITES_PORT || 3018;
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`JTS Service running on port ${PORT}`);
      logger.info(`JTS Service started on http://0.0.0.0:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Handle server errors
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
    logger.error('JTS Service startup failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;

