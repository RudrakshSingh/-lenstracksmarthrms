# Tenant Management Service

Admin MFE Backend API for multi-tenant SaaS platform management.

## Overview

This microservice provides comprehensive tenant management functionality including:
- Tenant CRUD operations
- Platform metrics and analytics
- Billing and subscription management
- Security incident tracking
- Audit logging

## API Endpoints

### Base URL
```
/api/admin/v1
```

### Tenant Management
- `POST /api/admin/v1/tenants` - Create tenant
- `GET /api/admin/v1/tenants` - List all tenants
- `GET /api/admin/v1/tenants/:tenantId` - Get tenant by ID
- `PUT /api/admin/v1/tenants/:tenantId` - Update tenant
- `DELETE /api/admin/v1/tenants/:tenantId` - Delete/deactivate tenant

### Platform Metrics
- `GET /api/admin/v1/platform/metrics` - Get platform-wide metrics

### Health & Status
- `GET /health` - Health check
- `GET /api/admin/v1/health` - Service health
- `GET /api/admin/v1/status` - Service status

## Environment Variables

```env
PORT=3017
NODE_ENV=production
MONGO_URI=mongodb://localhost:27017/etelios_tenant_management
AUTH_SERVICE_URL=http://auth-service:3001
JWT_SECRET=your-secret-key
CORS_ORIGIN=*
BASE_DOMAIN=yourdomain.com
```

## Running Locally

```bash
# Install dependencies
npm install

# Start service
npm start

# Development mode
npm run dev
```

## Docker

```bash
# Build image
docker build -t tenant-management-service .

# Run with docker-compose
docker-compose up
```

## Database Models

- **Tenant** - Tenant information and configuration
- **Subscription** - Subscription plans and billing cycles
- **Invoice** - Billing invoices
- **AuditLog** - System audit logs
- **SecurityIncident** - Security incident tracking

## Authentication

All endpoints (except health checks) require JWT authentication with `super_admin` role.

## License

Proprietary

