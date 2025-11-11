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
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  },
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isAzure: process.env.WEBSITE_SITE_NAME !== undefined || process.env.AZURE_REGION !== undefined
};

