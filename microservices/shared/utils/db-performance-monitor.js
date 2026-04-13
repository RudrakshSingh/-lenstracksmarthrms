/**
 * Database Performance Monitor
 * 
 * Monitors and logs database performance metrics:
 * 1. Query execution time
 * 2. Slow query detection
 * 3. Connection pool usage
 * 4. Error rates
 * 5. Throughput metrics
 */

const logger = require('../config/logger');

class DatabasePerformanceMonitor {
  constructor() {
    this.metrics = {
      queries: {
        total: 0,
        slow: 0, // > 1 second
        verySlow: 0, // > 5 seconds
        failed: 0,
        timeout: 0
      },
      connections: {
        total: 0,
        active: 0,
        idle: 0,
        max: 0
      },
      throughput: {
        queriesPerSecond: 0,
        averageResponseTime: 0
      },
      errors: {
        connection: 0,
        query: 0,
        timeout: 0
      }
    };

    this.queryTimes = [];
    this.startTime = Date.now();
    this.slowQueryThreshold = 1000; // 1 second
    this.verySlowQueryThreshold = 5000; // 5 seconds
  }

  /**
   * Record query execution
   */
  recordQuery(duration, success = true, timeout = false) {
    this.metrics.queries.total++;
    this.queryTimes.push(duration);

    if (!success) {
      this.metrics.queries.failed++;
      if (timeout) {
        this.metrics.queries.timeout++;
        this.metrics.errors.timeout++;
      } else {
        this.metrics.errors.query++;
      }
    } else {
      if (duration > this.verySlowQueryThreshold) {
        this.metrics.queries.verySlow++;
        logger.warn(`Very slow query detected: ${duration}ms`);
      } else if (duration > this.slowQueryThreshold) {
        this.metrics.queries.slow++;
        logger.warn(`Slow query detected: ${duration}ms`);
      }
    }

    // Keep only last 1000 query times for average calculation
    if (this.queryTimes.length > 1000) {
      this.queryTimes.shift();
    }

    // Update throughput metrics
    this.updateThroughput();
  }

  /**
   * Record connection event
   */
  recordConnection(type, count) {
    if (type === 'active') {
      this.metrics.connections.active = count;
    } else if (type === 'idle') {
      this.metrics.connections.idle = count;
    } else if (type === 'max') {
      this.metrics.connections.max = count;
    }
    this.metrics.connections.total = this.metrics.connections.active + this.metrics.connections.idle;
  }

  /**
   * Record error
   */
  recordError(type) {
    if (type === 'connection') {
      this.metrics.errors.connection++;
    } else if (type === 'query') {
      this.metrics.errors.query++;
    } else if (type === 'timeout') {
      this.metrics.errors.timeout++;
    }
  }

  /**
   * Update throughput metrics
   */
  updateThroughput() {
    const elapsed = (Date.now() - this.startTime) / 1000; // seconds
    if (elapsed > 0) {
      this.metrics.throughput.queriesPerSecond = this.metrics.queries.total / elapsed;
    }

    if (this.queryTimes.length > 0) {
      const sum = this.queryTimes.reduce((a, b) => a + b, 0);
      this.metrics.throughput.averageResponseTime = sum / this.queryTimes.length;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    this.updateThroughput();
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      slowQueryPercentage: this.metrics.queries.total > 0
        ? (this.metrics.queries.slow / this.metrics.queries.total) * 100
        : 0,
      errorRate: this.metrics.queries.total > 0
        ? (this.metrics.queries.failed / this.metrics.queries.total) * 100
        : 0
    };
  }

  /**
   * Get performance report
   */
  getReport() {
    const metrics = this.getMetrics();
    
    return {
      summary: {
        totalQueries: metrics.queries.total,
        queriesPerSecond: metrics.throughput.queriesPerSecond.toFixed(2),
        averageResponseTime: `${metrics.throughput.averageResponseTime.toFixed(2)}ms`,
        slowQueries: metrics.queries.slow,
        verySlowQueries: metrics.queries.verySlow,
        failedQueries: metrics.queries.failed,
        timeoutQueries: metrics.queries.timeout,
        errorRate: `${metrics.errorRate.toFixed(2)}%`,
        slowQueryRate: `${metrics.slowQueryPercentage.toFixed(2)}%`
      },
      connections: {
        active: metrics.connections.active,
        idle: metrics.connections.idle,
        total: metrics.connections.total,
        max: metrics.connections.max,
        utilization: metrics.connections.max > 0
          ? `${((metrics.connections.active / metrics.connections.max) * 100).toFixed(2)}%`
          : '0%'
      },
      errors: {
        connection: metrics.errors.connection,
        query: metrics.errors.query,
        timeout: metrics.errors.timeout,
        total: metrics.errors.connection + metrics.errors.query + metrics.errors.timeout
      },
      uptime: `${(metrics.uptime / 1000 / 60).toFixed(2)} minutes`
    };
  }

  /**
   * Log performance report
   */
  logReport() {
    const report = this.getReport();
    logger.info('Database Performance Report', report);
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      queries: { total: 0, slow: 0, verySlow: 0, failed: 0, timeout: 0 },
      connections: { total: 0, active: 0, idle: 0, max: 0 },
      throughput: { queriesPerSecond: 0, averageResponseTime: 0 },
      errors: { connection: 0, query: 0, timeout: 0 }
    };
    this.queryTimes = [];
    this.startTime = Date.now();
  }
}

// Singleton instance
const monitor = new DatabasePerformanceMonitor();

module.exports = monitor;
