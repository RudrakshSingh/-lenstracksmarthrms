require('dotenv').config();
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger = require('./config/logger');
const { createApp } = require('./createApp');

const app = createApp();

const startServer = async () => {
  try {
    await connectDB();
    logger.info('Database connected');

    connectRedis();
    logger.info('Redis connected');

    if (process.env.ENABLE_BACKGROUND_JOBS !== 'false') {
      const escalationCheckerJob = require('./jobs/escalationChecker.job');
      escalationCheckerJob.start();

      const performanceCalculatorJob = require('./jobs/performanceCalculator.job');
      performanceCalculatorJob.start();

      const notificationDispatcherJob = require('./jobs/notificationDispatcher.job');
      notificationDispatcherJob.start();

      const slaAndRecurrenceJob = require('./jobs/slaAndRecurrence.job');
      slaAndRecurrenceJob.start();

      const slaAdminDigestJob = require('./jobs/slaAdminDigest.job');
      slaAdminDigestJob.start();

      logger.info('Background jobs started');
    }

    const PORT = process.env.PORT || process.env.WEBSITES_PORT || 3018;

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`JTS Service running on port ${PORT}`);
      logger.info(`JTS Service started on http://0.0.0.0:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    server.on('error', (error) => {
      logger.error('Server error', { error: error.message, code: error.code });
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      }
    });

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

startServer();

module.exports = app;
