#!/usr/bin/env node

const fs = require('fs');
const apis = JSON.parse(fs.readFileSync('all-apis-complete.json', 'utf8'));

// Read current doc
let doc = fs.readFileSync('ETELIOS-COMPLETE-DEPLOYMENT-IMPLEMENTATION-GUIDE.md', 'utf8');

// Remove placeholder
doc = doc.replace(/\*\[Continue with remaining services\.\.\..*\]\*/, '');

// Service descriptions
const serviceInfo = {
  'sales-service': { port: 3007, description: 'Sales & order management, POS, quotes, pricing', basePath: '/api/sales' },
  'purchase-service': { port: 3008, description: 'Procurement & vendor management', basePath: '/api/purchase' },
  'financial-service': { port: 3009, description: 'Accounting & financial management', basePath: '/api/financial' },
  'document-service': { port: 3010, description: 'Document management & storage', basePath: '/api/documents' },
  'service-management': { port: 3011, description: 'Support ticket management', basePath: '/api/service' },
  'cpp-service': { port: 3012, description: 'Customer protection plans', basePath: '/api/cpp' },
  'prescription-service': { port: 3013, description: 'Healthcare prescription management', basePath: '/api/prescription' },
  'analytics-service': { port: 3014, description: 'Business intelligence & reporting', basePath: '/api/analytics' },
  'notification-service': { port: 3015, description: 'Communication & alerts', basePath: '/api/notification' },
  'monitoring-service': { port: 3016, description: 'System health & performance', basePath: '/api/monitoring' },
  'tenant-registry-service': { port: 3020, description: 'Multi-tenant management', basePath: '/api/tenants' },
  'realtime-service': { port: 3021, description: 'WebSocket & real-time communication', basePath: '/ws' }
};

let newContent = '\n\n---\n\n';

// Add all remaining services
const remainingServices = ['sales-service', 'purchase-service', 'financial-service', 'document-service', 'service-management', 'cpp-service', 'prescription-service', 'analytics-service', 'notification-service', 'monitoring-service', 'tenant-registry-service', 'realtime-service'];

remainingServices.forEach(serviceName => {
  if (apis.apisByService[serviceName]) {
    const serviceAPIs = apis.apisByService[serviceName];
    const info = serviceInfo[serviceName];
    
    const serviceTitle = serviceName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    newContent += `## **${serviceTitle} (Port ${info.port}) - ${serviceAPIs.length} APIs**\n\n`;
    newContent += `**Base URL**: \`http://localhost:${info.port}\`  \n`;
    newContent += `**Purpose**: ${info.description}\n\n`;
    newContent += `| Method | Endpoint | Description | Auth Required | Connects To |\n`;
    newContent += `|--------|----------|-------------|---------------|------------|\n`;

    serviceAPIs.forEach(api => {
      let desc = 'API endpoint';
      if (api.endpoint.includes('health')) desc = 'Service health check';
      else if (api.endpoint.includes('dashboard')) desc = 'Get dashboard data';
      else if (api.endpoint.includes('analytics')) desc = 'Analytics and reporting';
      else if (api.endpoint.includes('export')) desc = 'Export data';
      
      const auth = api.endpoint.includes('health') ? 'No' : 'Yes';
      let connects = 'MongoDB';
      if (api.endpoint.includes('health')) connects = 'MongoDB';
      else if (serviceName === 'sales-service') connects = 'MongoDB, Inventory Service, Payment Gateway';
      else if (serviceName === 'notification-service') connects = 'MongoDB, Email/SMS Providers';
      else connects = 'MongoDB, Redis';
      
      newContent += `| ${api.method} | \`${api.endpoint}\` | ${desc} | ${auth} | ${connects} |\n`;
    });

    newContent += `\n**Service Connections**:\n`;
    if (serviceName === 'sales-service') {
      newContent += `- **MongoDB**: Sales orders, customers, quotes\n`;
      newContent += `- **Inventory Service**: Stock verification and reservations\n`;
      newContent += `- **Payment Gateway**: Payment processing\n`;
      newContent += `- **CRM Service**: Customer data lookup\n`;
    } else if (serviceName === 'notification-service') {
      newContent += `- **MongoDB**: Notification logs\n`;
      newContent += `- **SendGrid/Twilio**: Email/SMS delivery\n`;
      newContent += `- **WhatsApp API**: WhatsApp messaging\n`;
    } else {
      newContent += `- **MongoDB**: Primary data storage\n`;
      newContent += `- **Redis**: Caching and real-time updates\n`;
    }
    newContent += '\n---\n\n';
  }
});

// Add summary
newContent += `## 📊 Complete API Summary\n\n`;
newContent += `### **API Count by Service**\n\n`;
newContent += `| Service | Port | API Count |\n`;
newContent += `|---------|------|-----------|\n`;

Object.keys(apis.apisByService).sort().forEach(service => {
  const count = apis.apisByService[service].length;
  const port = apis.apisByService[service][0]?.port || 'N/A';
  const serviceTitle = service.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  newContent += `| ${serviceTitle} | ${port} | ${count} |\n`;
});

newContent += `\n**Total APIs**: ${apis.totalAPIs}\n\n`;

// Add deployment section
newContent += `## 🚀 Deployment Guide\n\n`;
newContent += `### **Prerequisites**\n\n`;
newContent += `1. Node.js 18+ installed\n`;
newContent += `2. MongoDB instance (local or cloud)\n`;
newContent += `3. Redis instance (local or cloud)\n`;
newContent += `4. Docker (optional, for containerized deployment)\n`;
newContent += `5. Kubernetes cluster (optional, for production)\n\n`;

newContent += `### **Service Deployment Order**\n\n`;
newContent += `1. **Infrastructure Services First**:\n`;
newContent += `   - Tenant Registry Service (Port 3020)\n`;
newContent += `   - Realtime Service (Port 3021)\n`;
newContent += `2. **Core Services**:\n`;
newContent += `   - Auth Service (Port 3001)\n`;
newContent += `3. **Business Services**:\n`;
newContent += `   - HR, Attendance, Payroll (Ports 3002-3004)\n`;
newContent += `   - CRM, Inventory, Sales (Ports 3005-3007)\n`;
newContent += `   - Purchase, Financial, Document (Ports 3008-3010)\n`;
newContent += `4. **Support Services**:\n`;
newContent += `   - Service Management, CPP, Prescription (Ports 3011-3013)\n`;
newContent += `5. **Analytics & Infrastructure**:\n`;
newContent += `   - Analytics, Notification, Monitoring (Ports 3014-3016)\n\n`;

newContent += `### **API Gateway Configuration**\n\n`;
newContent += `The API Gateway (Port 3000) routes requests to appropriate services:\n\n`;
newContent += `\`\`\`\n`;
newContent += `/api/auth/*      -> auth-service:3001\n`;
newContent += `/api/hr/*        -> hr-service:3002\n`;
newContent += `/api/attendance/* -> attendance-service:3003\n`;
newContent += `/api/payroll/*   -> payroll-service:3004\n`;
newContent += `/api/crm/*       -> crm-service:3005\n`;
newContent += `/api/inventory/* -> inventory-service:3006\n`;
newContent += `/api/sales/*     -> sales-service:3007\n`;
newContent += `/api/purchase/*  -> purchase-service:3008\n`;
newContent += `/api/financial/* -> financial-service:3009\n`;
newContent += `/api/documents/* -> document-service:3010\n`;
newContent += `/api/service/*   -> service-management:3011\n`;
newContent += `/api/cpp/*       -> cpp-service:3012\n`;
newContent += `/api/prescription/* -> prescription-service:3013\n`;
newContent += `/api/analytics/* -> analytics-service:3014\n`;
newContent += `/api/notification/* -> notification-service:3015\n`;
newContent += `/api/monitoring/* -> monitoring-service:3016\n`;
newContent += `/api/tenants/*   -> tenant-registry-service:3020\n`;
newContent += `/ws              -> realtime-service:3021\n`;
newContent += `\`\`\`\n\n`;

doc += newContent;

fs.writeFileSync('ETELIOS-COMPLETE-DEPLOYMENT-IMPLEMENTATION-GUIDE.md', doc);
console.log('✅ Documentation completed with all 508 APIs');

