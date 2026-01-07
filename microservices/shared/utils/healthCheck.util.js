const mongoose = require("mongoose");

/**
 * Comprehensive Health Check Utility
 * Performs detailed health checks for services and dependencies
 */

class HealthChecker {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.checks = [];
    this.dependencies = {};
  }

  /**
   * Check database connectivity
   */
  async checkDatabase() {
    try {
      const state = mongoose.connection.readyState;
      const isConnected = state === 1;

      if (!isConnected) {
        return {
          status: "unhealthy",
          details: { state, message: "Database not connected" }
        };
      }

      return {
        status: "healthy",
        details: {
          state,
          database: mongoose.connection.name,
          host: mongoose.connection.host
        }
      };
    } catch (error) {
      return { status: "unhealthy", details: { error: error.message } };
    }
  }

  /**
   * Check system resources
   */
  checkSystemResources() {
    const memUsage = process.memoryUsage();
    const memoryMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024)
    };

    return {
      status: "healthy",
      details: {
        memory: memoryMB,
        uptime: process.uptime(),
        nodeVersion: process.version
      }
    };
  }

  /**
   * Run all health checks
   */
  async runHealthChecks() {
    const results = {
      service: this.serviceName,
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      checks: {}
    };

    results.checks.database = await this.checkDatabase();
    results.checks.system = this.checkSystemResources();

    // Determine overall status
    if (Object.values(results.checks).some(check => check.status === "unhealthy")) {
      results.status = "unhealthy";
    }

    return results;
  }
}

module.exports = HealthChecker;
