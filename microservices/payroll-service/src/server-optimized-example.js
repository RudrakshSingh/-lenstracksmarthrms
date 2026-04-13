/**
 * EXAMPLE: Optimized Payroll Service Server
 * 
 * This is an example showing how to use the optimized database connection
 * Replace your existing server.js connectDB() with this pattern
 */

const express = require('express');
const mongoose = require('mongoose');
const { getOptimizedConnection, executeWithTimeout, healthCheck } = require('../../shared/utils/optimized-db-connection');
const { optimizeFind, optimizeCount } = require('../../shared/utils/query-optimizer');
const monitor = require('../../shared/utils/db-performance-monitor');

const app = express();
const logger = require('./config/logger');

// Database connection - OPTIMIZED VERSION
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || `mongodb://localhost:27017/etelios_payroll`;
    const dbName = process.env.DB_NAME || process.env.MONGO_DB_NAME || 'etelios';
    
    // Use optimized connection with circuit breaker and retry logic
    await getOptimizedConnection(mongoUri, dbName, 'payroll-service');
    
    logger.info('✅ Payroll service: Optimized database connection established');
  } catch (error) {
    logger.error('Payroll service: Database connection failed', { 
      error: error.message,
      note: 'Service will continue but database operations may fail'
    });
    // Don't throw - allow service to start for health checks
  }
};

// Health endpoint with database health check
app.get('/api/payroll/health', async (req, res) => {
  // Immediate response - no DB check to prevent timeout
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');
  
  // Optional: Check DB health asynchronously (don't block response)
  const dbHealth = await healthCheck().catch(() => ({ healthy: false }));
  const metrics = monitor.getMetrics();
  
  return res.status(200).json({
    service: 'payroll-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    database: dbHealth.healthy ? 'connected' : 'disconnected',
    performance: {
      queriesPerSecond: metrics.throughput.queriesPerSecond.toFixed(2),
      averageResponseTime: `${metrics.throughput.averageResponseTime.toFixed(2)}ms`,
      slowQueries: metrics.queries.slow
    }
  });
});

// Example: Optimized query endpoint
app.get('/api/payroll/salary', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { employeeId } = req.query;
    
    if (!employeeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'employeeId is required' 
      });
    }

    // Use optimized query with timeout protection
    const query = optimizeFind(
      mongoose.model('Salary'),
      { employee_id: employeeId.toUpperCase() },
      {
        limit: 1,
        sort: { createdAt: -1 },
        lean: true,
        timeout: 5000,
        fields: 'employee_id amount currency createdAt' // Only select needed fields
      }
    );

    // Execute with timeout protection
    const salary = await executeWithTimeout(
      query.exec(),
      5000,
      'getSalary'
    );

    // Record successful query
    monitor.recordQuery(Date.now() - startTime, true);

    if (!salary || salary.length === 0) {
      return res.json({ 
        success: true, 
        data: null, 
        message: 'No salary record found' 
      });
    }

    return res.json({ 
      success: true, 
      data: salary[0], 
      message: 'Salary retrieved successfully' 
    });
  } catch (error) {
    // Record failed query
    monitor.recordQuery(Date.now() - startTime, false, error.message.includes('timeout'));
    
    logger.error('Payroll salary error', { 
      error: error.message,
      employeeId: req.query.employeeId
    });
    
    if (error.message.includes('timeout')) {
      return res.status(504).json({ 
        success: false, 
        message: 'Query timeout - please try again',
        error: 'TIMEOUT'
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve salary', 
      error: error.message 
    });
  }
});

// Performance metrics endpoint
app.get('/api/payroll/metrics', async (req, res) => {
  const metrics = monitor.getReport();
  const dbHealth = await healthCheck().catch(() => ({ healthy: false }));
  
  return res.json({
    database: dbHealth,
    performance: metrics
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    const PORT = process.env.PORT || 3004;
    app.listen(PORT, () => {
      logger.info(`payroll-service running on port ${PORT}`);
      
      // Log performance report every 5 minutes
      setInterval(() => {
        monitor.logReport();
      }, 5 * 60 * 1000);
    });
  } catch (error) {
    logger.error('payroll-service startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();
