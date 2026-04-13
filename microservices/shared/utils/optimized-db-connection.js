/**
 * Optimized Database Connection Utility
 * 
 * This utility provides:
 * 1. High-performance connection pooling
 * 2. Automatic retry with exponential backoff
 * 3. Circuit breaker pattern
 * 4. Connection health monitoring
 * 5. Query timeout protection
 * 
 * Usage:
 * const { getOptimizedConnection } = require('../../shared/utils/optimized-db-connection');
 * const mongoose = await getOptimizedConnection();
 */

const mongoose = require('mongoose');
const logger = require('../config/logger');

// Circuit breaker state
const circuitBreaker = {
  state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
  failureCount: 0,
  lastFailureTime: null,
  successCount: 0,
  threshold: 5, // Open circuit after 5 failures
  timeout: 60000, // 60 seconds before trying again
  halfOpenMaxSuccess: 3 // Need 3 successes to close circuit
};

// Connection metrics
const connectionMetrics = {
  totalConnections: 0,
  activeConnections: 0,
  failedConnections: 0,
  queryCount: 0,
  slowQueries: 0,
  timeoutQueries: 0
};

/**
 * Get optimized connection options for maximum throughput
 */
const getOptimizedConnectionOptions = (isDocumentDB = false) => {
  const baseOptions = {
    // Connection Pool Settings - INCREASED for higher throughput
    maxPoolSize: 50, // Increased from 10 to 50 for high concurrency
    minPoolSize: 10, // Increased from 2 to 10 to maintain warm connections
    maxIdleTimeMS: 30000, // 30 seconds
    
    // Timeout Settings - BALANCED for reliability
    serverSelectionTimeoutMS: 15000, // 15 seconds - fail fast but not too fast
    socketTimeoutMS: 45000, // 45 seconds - enough for complex queries
    connectTimeoutMS: 15000, // 15 seconds connection timeout
    
    // Retry Settings
    retryWrites: false, // Disabled for DocumentDB compatibility
    retryReads: true, // Enable read retries for resilience
    
    // Performance Optimizations
    heartbeatFrequencyMS: 10000, // Check connection health every 10s
    directConnection: false, // Use replica set for load distribution
    
    // Buffer Settings - DISABLED for immediate failure detection
    // Note: bufferCommands and bufferMaxEntries removed - not supported in newer Mongoose
    
    // Compression (if supported)
    compressors: ['zlib'], // Enable compression for network efficiency
    
    // Read Preferences - DISTRIBUTE LOAD
    readPreference: 'secondaryPreferred', // Prefer secondary reads to reduce primary load
    
    // Write Concern - BALANCE PERFORMANCE AND DURABILITY
    w: 1, // Acknowledge write to primary only (faster)
    j: false, // Don't wait for journal (faster, but less durable)
    
    // Additional Performance Settings
    monitorCommands: false, // Disable command monitoring for performance
    autoIndex: false, // Disable auto-index creation (do it manually for better control)
    autoCreate: false // Disable auto-collection creation
  };

  // DocumentDB specific optimizations
  if (isDocumentDB) {
    baseOptions.tls = true;
    baseOptions.tlsInsecure = false;
    baseOptions.tlsCAFile = process.env.DOCDB_TLS_CA_FILE || '/etc/ssl/certs/ca-cert.pem';
    baseOptions.directConnection = false;
    baseOptions.readPreference = 'secondaryPreferred';
  }

  return baseOptions;
};

/**
 * Retry with exponential backoff
 */
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt);
      logger.warn(`Database operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, {
        error: error.message
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Check circuit breaker state
 */
const checkCircuitBreaker = () => {
  const now = Date.now();
  
  if (circuitBreaker.state === 'OPEN') {
    if (now - circuitBreaker.lastFailureTime > circuitBreaker.timeout) {
      circuitBreaker.state = 'HALF_OPEN';
      circuitBreaker.successCount = 0;
      logger.info('Circuit breaker: Moving to HALF_OPEN state');
      return true; // Allow one request through
    }
    return false; // Circuit is open, reject request
  }
  
  if (circuitBreaker.state === 'HALF_OPEN') {
    return true; // Allow requests in half-open state
  }
  
  return true; // Circuit is closed, allow requests
};

/**
 * Record circuit breaker success
 */
const recordSuccess = () => {
  if (circuitBreaker.state === 'HALF_OPEN') {
    circuitBreaker.successCount++;
    if (circuitBreaker.successCount >= circuitBreaker.halfOpenMaxSuccess) {
      circuitBreaker.state = 'CLOSED';
      circuitBreaker.failureCount = 0;
      logger.info('Circuit breaker: CLOSED - Service is healthy');
    }
  } else {
    circuitBreaker.failureCount = 0;
  }
};

/**
 * Record circuit breaker failure
 */
const recordFailure = () => {
  circuitBreaker.failureCount++;
  circuitBreaker.lastFailureTime = Date.now();
  connectionMetrics.failedConnections++;
  
  if (circuitBreaker.failureCount >= circuitBreaker.threshold) {
    circuitBreaker.state = 'OPEN';
    logger.error(`Circuit breaker: OPEN - Too many failures (${circuitBreaker.failureCount})`);
  }
};

/**
 * Get optimized database connection
 */
const getOptimizedConnection = async (mongoUri, dbName = null, serviceName = 'service') => {
  try {
    // Check circuit breaker
    if (!checkCircuitBreaker()) {
      throw new Error('Circuit breaker is OPEN - Database is unavailable');
    }

    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      logger.debug('Database already connected');
      return mongoose;
    }

    // Determine if DocumentDB
    const isDocumentDB = mongoUri.includes('docdb.amazonaws.com');
    
    // Get optimized connection options
    const connectionOptions = getOptimizedConnectionOptions(isDocumentDB);
    
    // Set database name if provided
    if (dbName) {
      connectionOptions.dbName = dbName;
    }

    // Connect with retry
    await retryWithBackoff(async () => {
      await mongoose.connect(mongoUri, connectionOptions);
    }, 3, 2000);

    // Set up connection event handlers
    setupConnectionHandlers(serviceName);

    // Record success
    recordSuccess();
    connectionMetrics.totalConnections++;
    connectionMetrics.activeConnections++;

    logger.info(`✅ ${serviceName}: Optimized database connection established`, {
      maxPoolSize: connectionOptions.maxPoolSize,
      minPoolSize: connectionOptions.minPoolSize,
      isDocumentDB
    });

    return mongoose;
  } catch (error) {
    recordFailure();
    logger.error(`${serviceName}: Database connection failed`, {
      error: error.message,
      circuitBreakerState: circuitBreaker.state
    });
    throw error;
  }
};

/**
 * Setup connection event handlers
 */
const setupConnectionHandlers = (serviceName) => {
  mongoose.connection.on('error', (err) => {
    logger.error(`${serviceName}: MongoDB connection error`, { error: err.message });
    recordFailure();
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn(`${serviceName}: MongoDB disconnected`);
    connectionMetrics.activeConnections = Math.max(0, connectionMetrics.activeConnections - 1);
  });

  mongoose.connection.on('reconnected', () => {
    logger.info(`${serviceName}: MongoDB reconnected`);
    connectionMetrics.activeConnections++;
    recordSuccess();
  });

  mongoose.connection.on('connected', () => {
    logger.info(`${serviceName}: MongoDB connected`);
    connectionMetrics.activeConnections++;
  });
};

/**
 * Execute query with timeout protection
 */
const executeWithTimeout = async (queryPromise, timeoutMs = 5000, queryName = 'query') => {
  const startTime = Date.now();
  connectionMetrics.queryCount++;

  try {
    const result = await Promise.race([
      queryPromise,
      new Promise((_, reject) =>
        setTimeout(() => {
          connectionMetrics.timeoutQueries++;
          reject(new Error(`Query timeout: ${queryName} exceeded ${timeoutMs}ms`));
        }, timeoutMs)
      )
    ]);

    const duration = Date.now() - startTime;
    
    // Log slow queries (> 1 second)
    if (duration > 1000) {
      connectionMetrics.slowQueries++;
      logger.warn(`Slow query detected: ${queryName} took ${duration}ms`);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Query failed: ${queryName}`, {
      error: error.message,
      duration: `${duration}ms`
    });
    throw error;
  }
};

/**
 * Get connection metrics
 */
const getConnectionMetrics = () => {
  return {
    ...connectionMetrics,
    circuitBreaker: { ...circuitBreaker },
    mongooseState: mongoose.connection.readyState,
    mongooseStateName: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
  };
};

/**
 * Health check
 */
const healthCheck = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return {
        healthy: false,
        state: 'disconnected',
        circuitBreaker: circuitBreaker.state
      };
    }

    // Quick ping to verify connection
    await mongoose.connection.db.admin().ping();
    
    return {
      healthy: true,
      state: 'connected',
      circuitBreaker: circuitBreaker.state,
      metrics: getConnectionMetrics()
    };
  } catch (error) {
    return {
      healthy: false,
      state: 'error',
      error: error.message,
      circuitBreaker: circuitBreaker.state
    };
  }
};

module.exports = {
  getOptimizedConnection,
  executeWithTimeout,
  getConnectionMetrics,
  healthCheck,
  getOptimizedConnectionOptions,
  retryWithBackoff
};
