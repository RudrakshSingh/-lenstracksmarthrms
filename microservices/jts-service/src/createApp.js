/**
 * Build Express app with all routes (no DB connect, no listen).
 * Used by smoke tests and tooling.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const logger = require('./config/logger');
const { buildErrorBody } = require('./utils/apiError.util');
const { toErrorPayload } = require('./utils/errorResponse');

function createApp() {
  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
  );

  const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tenant-Id']
  };
  app.use(cors(corsOptions));

  const apiRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Too many requests from this IP'
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Response normalization: enforce standard envelope meta object on JSON responses.
  app.use((req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        const out = { ...body };
        if (!Object.prototype.hasOwnProperty.call(out, 'meta')) {
          const maybePagination = out.pagination && typeof out.pagination === 'object' ? out.pagination : {};
          out.meta = maybePagination;
        }
        return originalJson(out);
      }
      return originalJson(body);
    };
    next();
  });

  app.use(
    compression({
      level: 6,
      threshold: 1024
    })
  );

  if (process.env.NODE_ENV !== 'test') {
    app.use(
      morgan('combined', {
        stream: {
          write: (message) => logger.info(message.trim())
        }
      })
    );
  }

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

  const loadRoutes = () => {
    const routesLoaded = [];
    const routesFailed = [];

    const mountHrmsJtsTaskStack = (tasksBase, timerBase) => {
      try {
        const selfTaskRoutes = require('./routes/selfTask.routes.js');
        app.use(`${tasksBase}/self`, apiRateLimit, selfTaskRoutes);
        routesLoaded.push(`selfTask.routes.js@${tasksBase}`);
      } catch (error) {
        routesFailed.push({ route: `selfTask.routes.js@${tasksBase}`, error: error.message });
        logger.error('selfTask.routes.js failed to load', { error: error.message, tasksBase });
      }

      try {
        const taskCollaborationRoutes = require('./routes/taskCollaboration.routes.js');
        app.use(tasksBase, apiRateLimit, taskCollaborationRoutes);
        routesLoaded.push(`taskCollaboration.routes.js@${tasksBase}`);
      } catch (error) {
        routesFailed.push({ route: `taskCollaboration.routes.js@${tasksBase}`, error: error.message });
        logger.error('taskCollaboration.routes.js failed to load', { error: error.message, tasksBase });
      }

      try {
        const taskRoutes = require('./routes/task.routes.js');
        app.use(tasksBase, apiRateLimit, taskRoutes);
        routesLoaded.push(`task.routes.js@${tasksBase}`);
      } catch (error) {
        routesFailed.push({ route: `task.routes.js@${tasksBase}`, error: error.message });
        logger.error('task.routes.js failed to load', { error: error.message, tasksBase });
      }

      try {
        const timerRoutes = require('./routes/timer.routes.js');
        app.use(timerBase, apiRateLimit, timerRoutes);
        routesLoaded.push(`timer.routes.js@${timerBase}`);
      } catch (error) {
        routesFailed.push({ route: `timer.routes.js@${timerBase}`, error: error.message });
        logger.error('timer.routes.js failed to load', { error: error.message, timerBase });
      }
    };

    try {
      const internalJtsRoutes = require('./routes/internalJts.routes.js');
      app.use('/api/jts/internal', internalJtsRoutes);
      routesLoaded.push('internalJts.routes.js@/api/jts/internal');
    } catch (error) {
      routesFailed.push({ route: 'internalJts.routes.js', error: error.message });
      logger.error('internalJts.routes.js failed to load', { error: error.message });
    }

    try {
      const hrmsJtsCompatRoutes = require('./routes/hrmsJtsCompat.routes.js');
      app.use('/api/jts', apiRateLimit, hrmsJtsCompatRoutes);
      routesLoaded.push('hrmsJtsCompat.routes.js');
    } catch (error) {
      routesFailed.push({ route: 'hrmsJtsCompat.routes.js', error: error.message });
      logger.error('hrmsJtsCompat.routes.js failed to load', { error: error.message });
    }

    mountHrmsJtsTaskStack('/api/jts/tasks', '/api/jts');
    mountHrmsJtsTaskStack('/api/v1/tasks', '/api/v1');

    try {
      const jtsAdminRoutes = require('./routes/jtsAdmin.routes.js');
      app.use('/api/v1/jts/catalog', apiRateLimit, jtsAdminRoutes);
      app.use('/api/jts/catalog', apiRateLimit, jtsAdminRoutes);
      routesLoaded.push('jtsAdmin.routes.js');
    } catch (error) {
      routesFailed.push({ route: 'jtsAdmin.routes.js', error: error.message });
      logger.error('jtsAdmin.routes.js failed to load', { error: error.message });
    }

    try {
      const recurrenceRoutes = require('./routes/recurrence.routes.js');
      app.use('/api/v1/jts/recurrence-rules', apiRateLimit, recurrenceRoutes);
      app.use('/api/jts/recurrence-rules', apiRateLimit, recurrenceRoutes);
      routesLoaded.push('recurrence.routes.js');
    } catch (error) {
      routesFailed.push({ route: 'recurrence.routes.js', error: error.message });
      logger.error('recurrence.routes.js failed to load', { error: error.message });
    }

    try {
      const performanceManagementRoutes = require('./routes/performanceManagement.routes.js');
      app.use('/api/v1/jts/performance', apiRateLimit, performanceManagementRoutes);
      app.use('/api/jts/performance', apiRateLimit, performanceManagementRoutes);
      routesLoaded.push('performanceManagement.routes.js');
    } catch (error) {
      routesFailed.push({ route: 'performanceManagement.routes.js', error: error.message });
      logger.error('performanceManagement.routes.js failed to load', { error: error.message });
    }

    /**
     * ALB ingress (api.etelios.com) uses path prefix /jts → jts-service.
     * Mirror the same routers so external URLs work without /api.
     */
    try {
      const internalJtsIngress = require('./routes/internalJts.routes.js');
      app.use('/jts/internal', internalJtsIngress);
      routesLoaded.push('internalJts.routes.js@/jts/internal');
    } catch (error) {
      routesFailed.push({ route: 'internalJts.routes.js@/jts', error: error.message });
      logger.error('internalJts /jts mount failed', { error: error.message });
    }
    try {
      const hrmsJtsIngress = require('./routes/hrmsJtsCompat.routes.js');
      app.use('/jts', apiRateLimit, hrmsJtsIngress);
      routesLoaded.push('hrmsJtsCompat.routes.js@/jts');
    } catch (error) {
      routesFailed.push({ route: 'hrmsJtsCompat.routes.js@/jts', error: error.message });
      logger.error('hrmsJtsCompat /jts mount failed', { error: error.message });
    }
    mountHrmsJtsTaskStack('/jts/tasks', '/jts');
    try {
      const jtsAdminIngress = require('./routes/jtsAdmin.routes.js');
      app.use('/jts/catalog', apiRateLimit, jtsAdminIngress);
      routesLoaded.push('jtsAdmin.routes.js@/jts/catalog');
    } catch (error) {
      routesFailed.push({ route: 'jtsAdmin.routes.js@/jts/catalog', error: error.message });
      logger.error('jtsAdmin /jts/catalog mount failed', { error: error.message });
    }
    try {
      const recurrenceIngress = require('./routes/recurrence.routes.js');
      app.use('/jts/recurrence-rules', apiRateLimit, recurrenceIngress);
      routesLoaded.push('recurrence.routes.js@/jts/recurrence-rules');
    } catch (error) {
      routesFailed.push({ route: 'recurrence.routes.js@/jts', error: error.message });
      logger.error('recurrence /jts mount failed', { error: error.message });
    }
    try {
      const perfIngress = require('./routes/performanceManagement.routes.js');
      app.use('/jts/performance', apiRateLimit, perfIngress);
      routesLoaded.push('performanceManagement.routes.js@/jts/performance');
    } catch (error) {
      routesFailed.push({ route: 'performanceManagement.routes.js@/jts/performance', error: error.message });
      logger.error('performance /jts/performance mount failed', { error: error.message });
    }

    try {
      const notificationRoutes = require('./routes/notification.routes.js');
      app.use('/api/v1/notifications', apiRateLimit, notificationRoutes);
      routesLoaded.push('notification.routes.js');
    } catch (error) {
      routesFailed.push({ route: 'notification.routes.js', error: error.message });
      logger.error('notification.routes.js failed to load', { error: error.message });
    }

    logger.info(`Routes loaded: ${routesLoaded.length} successful, ${routesFailed.length} failed`);
    if (routesFailed.length > 0) {
      logger.warn('Failed routes', { failed: routesFailed });
    }
  };

  const setupFallbackHandlers = () => {
    app.use((req, res) => {
      res
        .status(404)
        .json(
          buildErrorBody({
            code: 'ROUTE_NOT_FOUND',
            message: 'Route not found',
            extra: {
              path: req.path,
              method: req.method,
              service: 'jts-service'
            }
          })
        );
    });

    app.use((err, req, res, next) => {
      logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        mongoCode: err.code
      });

      const mapped = toErrorPayload(err, 'INTERNAL_ERROR');
      const body = {
        ...mapped.body,
        ...(process.env.NODE_ENV === 'development' ? { meta: { stack: err.stack } } : {})
      };
      res.status(mapped.status).json(body);
    });
  };

  loadRoutes();
  setupFallbackHandlers();

  return app;
}

module.exports = { createApp };
