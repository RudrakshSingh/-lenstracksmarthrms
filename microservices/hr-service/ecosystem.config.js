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
      cwd: process.cwd(),
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production',
        PORT: process.env.PORT || process.env.WEBSITES_PORT || 3002,
        SERVICE_NAME: 'hr-service'
      },
      // Use absolute paths or disable file logging if directory doesn't exist
      error_file: '/dev/stderr',  // Use stderr instead of file
      out_file: '/dev/stdout',    // Use stdout instead of file
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      // Wait for graceful shutdown
      kill_timeout: 5000,
      wait_ready: false,  // Disable wait_ready to avoid timeout issues
      listen_timeout: 30000,  // Increase timeout
      // Ignore watch for production
      watch: false,
      // Ignore signals that might cause issues
      ignore_watch: ['node_modules', 'logs', 'storage']
    }
  ]
};

