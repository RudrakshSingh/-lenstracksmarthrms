/**
 * Azure Configuration
 * Centralized configuration for Azure services and backend URLs
 */

module.exports = {
  // Backend Base URL
  backendUrl: process.env.AZURE_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3000',
  
  // API Gateway URL (Kubernetes service name in AKS, localhost for development)
  apiGatewayUrl: process.env.API_GATEWAY_URL || (process.env.K8S_ENV === 'true' ? 'http://api-gateway:3000' : 'http://localhost:3000'),
  
  // Service URLs for inter-service communication
  // Uses Kubernetes service names in AKS, localhost for development
  services: {
    auth: process.env.AUTH_SERVICE_URL || (process.env.K8S_ENV === 'true' ? 'http://auth-service:3001' : 'http://localhost:3001'),
    sales: process.env.SALES_SERVICE_URL || (process.env.K8S_ENV === 'true' ? 'http://sales-service:3007' : 'http://localhost:3007'),
    inventory: process.env.INVENTORY_SERVICE_URL || (process.env.K8S_ENV === 'true' ? 'http://inventory-service:3006' : 'http://localhost:3006'),
    payroll: process.env.PAYROLL_SERVICE_URL || (process.env.K8S_ENV === 'true' ? 'http://payroll-service:3004' : 'http://localhost:3004'),
    attendance: process.env.ATTENDANCE_SERVICE_URL || (process.env.K8S_ENV === 'true' ? 'http://attendance-service:3003' : 'http://localhost:3003'),
    document: process.env.DOCUMENT_SERVICE_URL || (process.env.K8S_ENV === 'true' ? 'http://document-service:3010' : 'http://localhost:3010'),
    notification: process.env.NOTIFICATION_SERVICE_URL || (process.env.K8S_ENV === 'true' ? 'http://notification-service:3015' : 'http://localhost:3015')
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
  isKubernetes: process.env.KUBERNETES_SERVICE_HOST !== undefined || process.env.K8S_ENV === 'true'
};

