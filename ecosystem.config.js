/**
 * PM2 Ecosystem Configuration for Etelios Microservices
 * Manages all microservices in a single App Service
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2-runtime ecosystem.config.js  (for production)
 */

module.exports = {
  apps: [
    // API Gateway - Routes requests to microservices
    {
      name: 'api-gateway',
      script: 'src/server.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        USE_KEY_VAULT: 'true',
        AZURE_KEY_VAULT_URL: 'https://etelios-keyvault.vault.azure.net/',
        AZURE_KEY_VAULT_NAME: 'etelios-keyvault',
        CORS_ORIGIN: '*'
        // NO SERVICE_NAME - API Gateway doesn't need it
      },
      error_file: './logs/gateway-error.log',
      out_file: './logs/gateway-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    
    // Auth Service - Authentication & User Management
    {
      name: 'auth-service',
      script: 'src/server.js',
      cwd: './microservices/auth-service',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        SERVICE_NAME: 'auth-service',  // ← CRITICAL: Set per service
        USE_KEY_VAULT: 'true',
        AZURE_KEY_VAULT_URL: 'https://etelios-keyvault.vault.azure.net/',
        AZURE_KEY_VAULT_NAME: 'etelios-keyvault',
        CORS_ORIGIN: '*'
      },
      error_file: './logs/auth-error.log',
      out_file: './logs/auth-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    
    // HR Service - HR Management & Employee Data
    {
      name: 'hr-service',
      script: 'src/server.js',
      cwd: './microservices/hr-service',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        SERVICE_NAME: 'hr-service',  // ← CRITICAL: Set per service
        USE_KEY_VAULT: 'true',
        AZURE_KEY_VAULT_URL: 'https://etelios-keyvault.vault.azure.net/',
        AZURE_KEY_VAULT_NAME: 'etelios-keyvault',
        CORS_ORIGIN: '*'
      },
      error_file: './logs/hr-error.log',
      out_file: './logs/hr-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    
    // Attendance Service - Attendance & Geofencing
    {
      name: 'attendance-service',
      script: 'src/server.js',
      cwd: './microservices/attendance-service',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        SERVICE_NAME: 'attendance-service',
        USE_KEY_VAULT: 'true',
        AZURE_KEY_VAULT_URL: 'https://etelios-keyvault.vault.azure.net/',
        AZURE_KEY_VAULT_NAME: 'etelios-keyvault',
        CORS_ORIGIN: '*'
      },
      error_file: './logs/attendance-error.log',
      out_file: './logs/attendance-out.log',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    
    // Payroll Service
    {
      name: 'payroll-service',
      script: 'src/server.js',
      cwd: './microservices/payroll-service',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
        SERVICE_NAME: 'payroll-service',
        USE_KEY_VAULT: 'true',
        AZURE_KEY_VAULT_URL: 'https://etelios-keyvault.vault.azure.net/',
        AZURE_KEY_VAULT_NAME: 'etelios-keyvault',
        CORS_ORIGIN: '*'
      },
      error_file: './logs/payroll-error.log',
      out_file: './logs/payroll-out.log',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    
    // CRM Service
    {
      name: 'crm-service',
      script: 'src/server.js',
      cwd: './microservices/crm-service',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
        SERVICE_NAME: 'crm-service',
        USE_KEY_VAULT: 'true',
        AZURE_KEY_VAULT_URL: 'https://etelios-keyvault.vault.azure.net/',
        AZURE_KEY_VAULT_NAME: 'etelios-keyvault',
        CORS_ORIGIN: '*'
      },
      error_file: './logs/crm-error.log',
      out_file: './logs/crm-out.log',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
    
    // Add more services as needed...
    // Uncomment and configure when ready to deploy:
    
    /*
    {
      name: 'inventory-service',
      script: 'src/server.js',
      cwd: './microservices/inventory-service',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3006,
        SERVICE_NAME: 'inventory-service',
        USE_KEY_VAULT: 'true',
        AZURE_KEY_VAULT_URL: 'https://etelios-keyvault.vault.azure.net/',
        AZURE_KEY_VAULT_NAME: 'etelios-keyvault',
        CORS_ORIGIN: '*'
      },
      error_file: './logs/inventory-error.log',
      out_file: './logs/inventory-out.log',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
    */
  ]
};

