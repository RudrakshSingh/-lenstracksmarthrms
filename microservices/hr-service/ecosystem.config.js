/**
 * PM2 Ecosystem Configuration for HR Service
 * Used by Azure App Service to start the service
 * 
 * Usage:
 *   pm2-runtime ecosystem.config.js  (for production)
 */

module.exports = {
  apps: [
    {
      name: 'hr-service',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || process.env.WEBSITES_PORT || 3002,
        SERVICE_NAME: 'hr-service'
      },
      error_file: './logs/hr-error.log',
      out_file: './logs/hr-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      // Wait for graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
};

