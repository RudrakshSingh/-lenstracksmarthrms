const express = require('express');
const compression = require('compression');
const responseTime = require('response-time');
const { createServer } = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const realtimeService = require('./services/realtime.service');
const logger = require('./utils/logger');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const server = createServer(app);

const PORT = process.env.PORT || 3021;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize real-time service
realtimeService.initialize(server)
  .then(() => {
    logger.info('Real-time service initialized successfully');
  })
  .catch((error) => {
    logger.error('Failed to initialize real-time service:', error);
    process.exit(1);
  });

// Compression
app.use(compression({ level: 6, threshold: 1024 }));

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = realtimeService.getStatistics();
  
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'realtime-service',
    version: '1.0.0',
    statistics: stats
  });
});

// Statistics endpoint
app.get('/api/statistics', (req, res) => {
  const stats = realtimeService.getStatistics();
  
  res.json({
    success: true,
    data: stats
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
  await realtimeService.close();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await realtimeService.close();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  if (!isProduction) logger.info(`Real-time Service started on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

module.exports = { app, server };
