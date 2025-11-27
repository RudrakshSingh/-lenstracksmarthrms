/**
 * Azure Configuration
 * Centralized configuration for Azure services and backend URLs
 */

module.exports = {
  // Azure Backend Base URL
  backendUrl: process.env.AZURE_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3000',
  
  // Azure App Service URL (if this service is deployed on Azure)
  appServiceUrl: process.env.AZURE_APP_SERVICE_URL || process.env.WEBSITE_URL || '',
  
  // API Gateway URL (if using API Gateway)
  apiGatewayUrl: process.env.AZURE_API_GATEWAY_URL || process.env.API_GATEWAY_URL || '',
  
  // Service URLs for inter-service communication
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    sales: process.env.SALES_SERVICE_URL || 'http://localhost:3003',
    inventory: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3004',
    payroll: process.env.PAYROLL_SERVICE_URL || 'http://localhost:3005',
    attendance: process.env.ATTENDANCE_SERVICE_URL || 'http://localhost:3006',
    document: process.env.DOCUMENT_SERVICE_URL || 'http://localhost:3007',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008'
  },
  
  // Azure Storage Configuration
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'azure',
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
    container: process.env.AZURE_STORAGE_CONTAINER || 'hrms-documents',
    accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || ''
  },
  
  // Azure Key Vault Configuration
  keyVault: {
    enabled: process.env.AZURE_KEY_VAULT_ENABLED === 'true',
    name: process.env.AZURE_KEY_VAULT_NAME || '',
    clientId: process.env.AZURE_CLIENT_ID || '',
    clientSecret: process.env.AZURE_CLIENT_SECRET || '',
    tenantId: process.env.AZURE_TENANT_ID || ''
  },
  
  // CORS Configuration - defaults to allow all origins for frontend compatibility
  cors: {
    origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '*', // Allow all origins by default for Azure
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key']
  },
  
  // IP Whitelist Configuration
  ipWhitelist: {
    enabled: process.env.IP_WHITELIST_ENABLED === 'true',
    allowedIPs: process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',').map(ip => ip.trim()) : ['20.192.170.10'],
    blockedIPs: process.env.BLOCKED_IPS ? process.env.BLOCKED_IPS.split(',').map(ip => ip.trim()) : []
  },
  
  // Redis Configuration
  redis: {
    connectionString: process.env.REDIS_URI || 
                     process.env.REDIS_CONNECTION_STRING || 
                     process.env.REDIS_PRIMARY_CONNECTION_STRING || '',
    host: process.env.REDIS_HOST || '',
    port: parseInt(process.env.REDIS_PORT) || 6380,
    password: process.env.REDIS_PASSWORD || '',
    ssl: process.env.REDIS_TLS === 'true' || process.env.REDIS_TLS === '1' || false,
    db: parseInt(process.env.REDIS_DB) || 0
  },
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isAzure: process.env.WEBSITE_SITE_NAME !== undefined || process.env.AZURE_REGION !== undefined
};

