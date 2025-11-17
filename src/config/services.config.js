/**
 * Microservices Configuration
 * Maps service names to their App Service URLs
 * Can be overridden via environment variables
 */

module.exports = {
  services: {
    'auth': {
      name: 'auth-service',
      port: 3001,
      basePath: '/api/auth',
      defaultUrl: 'https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net',
      envVar: 'AUTH_SERVICE_URL'
    },
    'hr': {
      name: 'hr-service',
      port: 3002,
      basePath: '/api/hr',
      defaultUrl: 'https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net',
      envVar: 'HR_SERVICE_URL'
    },
    'attendance': {
      name: 'attendance-service',
      port: 3003,
      basePath: '/api/attendance',
      defaultUrl: process.env.ATTENDANCE_SERVICE_URL || 'http://localhost:3003',
      envVar: 'ATTENDANCE_SERVICE_URL',
      subRoutes: ['/api/geofencing'] // Geofencing is part of attendance service
    },
    'payroll': {
      name: 'payroll-service',
      port: 3004,
      basePath: '/api/payroll',
      defaultUrl: process.env.PAYROLL_SERVICE_URL || 'http://localhost:3004',
      envVar: 'PAYROLL_SERVICE_URL'
    },
    'crm': {
      name: 'crm-service',
      port: 3005,
      basePath: '/api/crm',
      defaultUrl: process.env.CRM_SERVICE_URL || 'http://localhost:3005',
      envVar: 'CRM_SERVICE_URL'
    },
    'inventory': {
      name: 'inventory-service',
      port: 3006,
      basePath: '/api/inventory',
      defaultUrl: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3006',
      envVar: 'INVENTORY_SERVICE_URL'
    },
    'sales': {
      name: 'sales-service',
      port: 3007,
      basePath: '/api/sales',
      defaultUrl: process.env.SALES_SERVICE_URL || 'http://localhost:3007',
      envVar: 'SALES_SERVICE_URL'
    },
    'purchase': {
      name: 'purchase-service',
      port: 3008,
      basePath: '/api/purchase',
      defaultUrl: process.env.PURCHASE_SERVICE_URL || 'http://localhost:3008',
      envVar: 'PURCHASE_SERVICE_URL'
    },
    'financial': {
      name: 'financial-service',
      port: 3009,
      basePath: '/api/financial',
      defaultUrl: process.env.FINANCIAL_SERVICE_URL || 'http://localhost:3009',
      envVar: 'FINANCIAL_SERVICE_URL'
    },
    'document': {
      name: 'document-service',
      port: 3010,
      basePath: '/api/documents',
      defaultUrl: process.env.DOCUMENT_SERVICE_URL || 'http://localhost:3010',
      envVar: 'DOCUMENT_SERVICE_URL'
    },
    'service-management': {
      name: 'service-management',
      port: 3011,
      basePath: '/api/service',
      defaultUrl: process.env.SERVICE_MANAGEMENT_URL || 'http://localhost:3011',
      envVar: 'SERVICE_MANAGEMENT_URL'
    },
    'cpp': {
      name: 'cpp-service',
      port: 3012,
      basePath: '/api/cpp',
      defaultUrl: process.env.CPP_SERVICE_URL || 'http://localhost:3012',
      envVar: 'CPP_SERVICE_URL'
    },
    'prescription': {
      name: 'prescription-service',
      port: 3013,
      basePath: '/api/prescription',
      defaultUrl: process.env.PRESCRIPTION_SERVICE_URL || 'http://localhost:3013',
      envVar: 'PRESCRIPTION_SERVICE_URL'
    },
    'analytics': {
      name: 'analytics-service',
      port: 3014,
      basePath: '/api/analytics',
      defaultUrl: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3014',
      envVar: 'ANALYTICS_SERVICE_URL'
    },
    'notification': {
      name: 'notification-service',
      port: 3015,
      basePath: '/api/notification',
      defaultUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3015',
      envVar: 'NOTIFICATION_SERVICE_URL'
    },
    'monitoring': {
      name: 'monitoring-service',
      port: 3016,
      basePath: '/api/monitoring',
      defaultUrl: process.env.MONITORING_SERVICE_URL || 'http://localhost:3016',
      envVar: 'MONITORING_SERVICE_URL'
    },
    'tenant-registry': {
      name: 'tenant-registry-service',
      port: 3020,
      basePath: '/api/tenants',
      defaultUrl: process.env.TENANT_REGISTRY_SERVICE_URL || 'http://localhost:3020',
      envVar: 'TENANT_REGISTRY_SERVICE_URL'
    },
    'realtime': {
      name: 'realtime-service',
      port: 3021,
      basePath: '/ws',
      defaultUrl: process.env.REALTIME_SERVICE_URL || 'http://localhost:3021',
      envVar: 'REALTIME_SERVICE_URL',
      isWebSocket: true
    }
  },

  /**
   * Get service URL from environment variable or default
   */
  getServiceUrl(serviceKey) {
    const service = this.services[serviceKey];
    if (!service) return null;
    
    return process.env[service.envVar] || service.defaultUrl;
  },

  /**
   * Get all services with their URLs
   */
  getAllServices() {
    const result = {};
    for (const [key, service] of Object.entries(this.services)) {
      result[key] = {
        name: service.name,
        port: service.port,
        basePath: service.basePath,
        url: this.getServiceUrl(key),
        isWebSocket: service.isWebSocket || false
      };
    }
    return result;
  }
};

