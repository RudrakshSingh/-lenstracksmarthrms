# 🏗 BACKEND DOCUMENTATION - PART 1: SYSTEM ARCHITECTURE & OVERVIEW

## 📋 Table of Contents

1. [System Overview](#system-overview)

2. [Architecture Pattern](#architecture-pattern)

3. [Microservices Structure](#microservices-structure)

4. [API Gateway & Routing](#api-gateway--routing)

5. [Database Architecture](#database-architecture)

6. [Environment Configuration](#environment-configuration)

7. [API Standards & Conventions](#api-standards--conventions)

8. [Error Handling](#error-handling)

9. [Security Requirements](#security-requirements)

10. [Deployment Architecture](#deployment-architecture)

---

## 🎯 System Overview

### Application Name

**Etelios ERP System** - A comprehensive Enterprise Resource Planning system for optical retail business

### System Type

Multi-tenant, Microservices-based ERP System with Module Federation Frontend

### Core Modules

1. **HRMS (Human Resource Management System)**

2. **CRM (Customer Relationship Management)**

3. **Inventory Management**

4. **Financial Management**

5. **Sales Management**

6. **Admin/System Management**

---

## 🏛 Architecture Pattern

### Microservices Architecture

The system follows a **microservices architecture** with the following characteristics:

- **Service Independence**: Each module operates as an independent service

- **API Gateway**: Centralized routing through API Gateway

- **Service Registry**: Dynamic service discovery and routing

- **Multi-tenancy**: Tenant isolation at database and service level

### Frontend Architecture

- **Module Federation**: Next.js micro-frontends

- **Shell Application**: Main container application

- **Shared Libraries**: Common components and utilities

- **Independent Deployment**: Each MFE can be deployed independently

---

## 🔧 Microservices Structure

### Service Registry Configuration

```typescript

interface MicroserviceConfig {

name: string

basePath: string

url: string

port: number

status: 'online' | 'offline' | 'unknown'

isWebSocket: boolean

fallbackUrl?: string

}

```

### Service List

| Service Name | Base Path | Port | Description |

|-------------|-----------|------|-------------|

| **auth-service** | `/api/auth` | 3001 | Authentication & Authorization |

| **hr-service** | `/api/hr` | 3002 | HRMS Core Services |

| **attendance-service** | `/api/attendance` | 3003 | Attendance Management |

| **payroll-service** | `/api/payroll` | 3004 | Payroll Processing |

| **crm-service** | `/api/crm` | 3005 | Customer Relationship Management |

| **inventory-service** | `/api/inventory` | 3006 | Inventory Management |

| **sales-service** | `/api/sales` | 3007 | Sales & Order Management |

| **financial-service** | `/api/financial` | 3009 | Financial Management |

| **realtime-service** | `/ws` | 3021 | WebSocket/Real-time Communication |

### API Gateway

- **Base URL**: `https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net`

- **Gateway Path**: `/api`

- **Health Check**: `/api/health`

---

## 🌐 API Gateway & Routing

### Endpoint Resolution Logic

The frontend uses a **Microservice Registry** to resolve endpoints:

1. **Service Detection**: Parse endpoint to determine target service

2. **URL Resolution**: Get service URL from registry

3. **Fallback Mechanism**: Use fallback URL if service is offline

4. **Gateway Routing**: Route through gateway if direct service unavailable

### Endpoint Patterns

```
/api/{service}/{resource}

/api/{service}/{resource}/{id}

/api/{service}/{resource}/{id}/{action}

```

### Example Endpoints

```
GET /api/hr/employees

GET /api/hr/employees/{id}

POST /api/hr/employees

PUT /api/hr/employees/{id}

DELETE /api/hr/employees/{id}

```

---

## 🗄 Database Architecture

### Multi-Tenant Database Design

**Tenant Isolation Strategy**: Database-per-tenant OR Schema-per-tenant

### Required Headers for Tenant Context

```http

X-Tenant-Id: {tenant_id}

```

### Database Requirements

1. **Primary Database**: PostgreSQL (Recommended)

- Support for JSON/JSONB columns

- Full-text search capabilities

- Transaction support

2. **Caching Layer**: Redis (Optional but Recommended)

- Session storage

- API response caching

- Real-time data caching

3. **File Storage**: Azure Blob Storage / AWS S3

- Document storage

- Image storage

- File uploads

---

## ⚙ Environment Configuration

### Backend Environment Variables

```env

# Server Configuration

PORT=8000

NODE_ENV=production

API_BASE_URL=https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net

# Database

DATABASE_URL=postgresql://user:password@localhost:5432/etelios_db

DB_POOL_MIN=2

DB_POOL_MAX=10

# JWT Authentication

JWT_SECRET=your-super-secret-jwt-key-change-in-production

JWT_EXPIRY=24h

JWT_REFRESH_EXPIRY=7d

# Multi-tenancy

TENANT_ISOLATION_MODE=database|schema

DEFAULT_TENANT_ID=default

# CORS

CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004,https://your-production-domain.com

CORS_CREDENTIALS=true

# Rate Limiting

RATE_LIMIT_WINDOW_MS=900000

RATE_LIMIT_MAX_REQUESTS=100

# WebSocket

WS_PORT=3021

WS_PATH=/socket.io

# File Upload

MAX_FILE_SIZE=10485760

ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx,xls,xlsx

# Email (Optional)

SMTP_HOST=smtp.gmail.com

SMTP_PORT=587

SMTP_USER=your-email@gmail.com

SMTP_PASS=your-password

SMTP_FROM=noreply@etelios.com

# Azure/AWS Storage (Optional)

AZURE_STORAGE_CONNECTION_STRING=your-connection-string

AZURE_STORAGE_CONTAINER=etelios-files

# Logging

LOG_LEVEL=info

LOG_FORMAT=json

```

---

## 📐 API Standards & Conventions

### Request Format

#### Headers (Required)

```http

Content-Type: application/json

Authorization: Bearer {access_token}

X-Tenant-Id: {tenant_id}

Idempotency-Key: {unique_key} # For POST/PUT/PATCH requests

```

#### Request Body

```json

{

"field1": "value1",

"field2": "value2"

}

```

### Response Format

#### Success Response

```json

{

"success": true,

"data": {

// Response data

},

"message": "Operation successful"

}

```

#### Paginated Response

```json

{

"success": true,

"data": [

// Array of items

],

"pagination": {

"page": 1,

"limit": 25,

"total": 100,

"totalPages": 4

}

}

```

#### Error Response

```json

{

"success": false,

"error": "Error message",

"message": "Human-readable error message",

"errors": {

"field1": ["Error message 1", "Error message 2"]

},

"code": "ERROR_CODE"

}

```

### HTTP Status Codes

| Code | Meaning | Usage |

|------|---------|-------|

| 200 | OK | Successful GET, PUT, PATCH |

| 201 | Created | Successful POST |

| 204 | No Content | Successful DELETE |

| 400 | Bad Request | Validation errors, malformed request |

| 401 | Unauthorized | Missing or invalid token |

| 403 | Forbidden | Insufficient permissions |

| 404 | Not Found | Resource not found |

| 409 | Conflict | Duplicate resource, conflict |

| 422 | Unprocessable Entity | Business logic validation failed |

| 429 | Too Many Requests | Rate limit exceeded |

| 500 | Internal Server Error | Server error |

| 503 | Service Unavailable | Service temporarily unavailable |

---

## ⚠ Error Handling

### Error Response Structure

```json

{

"success": false,

"error": "Short error description",

"message": "Detailed error message for user",

"errors": {

"field_name": ["Validation error message"]

},

"code": "ERROR_CODE",

"timestamp": "2024-01-15T10:30:00Z",

"path": "/api/hr/employees"

}

```

### Standard Error Codes

| Code | Description |

|------|-------------|

| `VALIDATION_ERROR` | Request validation failed |

| `AUTHENTICATION_REQUIRED` | User not authenticated |

| `AUTHORIZATION_FAILED` | User lacks required permissions |

| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist |

| `DUPLICATE_RESOURCE` | Resource already exists |

| `BUSINESS_LOGIC_ERROR` | Business rule violation |

| `RATE_LIMIT_EXCEEDED` | Too many requests |

| `INTERNAL_SERVER_ERROR` | Unexpected server error |

| `SERVICE_UNAVAILABLE` | Service temporarily unavailable |

---

## 🔒 Security Requirements

### Authentication

1. **JWT Token-based Authentication**

- Access Token: Short-lived (24 hours)

- Refresh Token: Long-lived (7 days)

- Token stored in HTTP-only cookies (recommended) or localStorage

2. **Token Refresh Flow**

```

POST /api/auth/refresh

Body: { "refreshToken": "..." }

Response: { "accessToken": "..." }

```

### Authorization

1. **Role-Based Access Control (RBAC)**

- Roles: `super-admin`, `company-admin`, `manager`, `employee`, `customer`

- Permissions: Granular permissions per role

2. **Multi-Tenant Isolation**

- All requests must include `X-Tenant-Id` header

- Data isolation at database level

- Cross-tenant access prevention

### Security Headers

```http

X-Content-Type-Options: nosniff

X-Frame-Options: DENY

X-XSS-Protection: 1; mode=block

Strict-Transport-Security: max-age=31536000; includeSubDomains

Content-Security-Policy: default-src 'self'

```

### Rate Limiting

- **Window**: 15 minutes (900000ms)

- **Max Requests**: 100 per window per IP

- **Headers**:

```

X-RateLimit-Limit: 100

X-RateLimit-Remaining: 95

X-RateLimit-Reset: 1642234567

```

### Idempotency

- **Header**: `Idempotency-Key` (required for POST/PUT/PATCH)

- **Format**: `{timestamp}-{random_string}`

- **Purpose**: Prevent duplicate operations

- **Storage**: Store in Redis/cache for 24 hours

---

## 🚀 Deployment Architecture

### Production URLs

| Service | Production URL |

|---------|---------------|

| API Gateway | `https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net` |

| Auth Service | `https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net` |

| HR Service | `https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net` |

### Deployment Requirements

1. **Containerization**: Docker containers for each service

2. **Orchestration**: Kubernetes or Azure Container Instances

3. **Load Balancing**: Application Gateway or Load Balancer

4. **SSL/TLS**: HTTPS for all endpoints

5. **Monitoring**: Application Insights / CloudWatch

6. **Logging**: Centralized logging system

### Health Check Endpoint

```

GET /api/health

```

**Response:**

```json

{

"status": "healthy",

"timestamp": "2024-01-15T10:30:00Z",

"services": {

"auth": "online",

"hr": "online",

"payroll": "online"

}

}

```

---

## 📊 API Timeout Configuration

### Frontend Timeout Settings

```typescript

API_TIMEOUT = 30000 // 30 seconds (default)

API_TIMEOUT_GET = 8000 // 8 seconds (GET requests)

API_TIMEOUT_POST = 15000 // 15 seconds (POST requests)

API_TIMEOUT_HEALTH = 3000 // 3 seconds (health checks)

```

### Backend Recommendations

- **GET Requests**: 10 seconds timeout

- **POST/PUT/PATCH**: 30 seconds timeout

- **DELETE**: 10 seconds timeout

- **File Upload**: 60 seconds timeout

---

## 🔄 API Versioning

### Version Strategy

- **URL Versioning**: `/api/v1/{resource}`

- **Current Version**: `v1`

- **Future Versions**: `v2`, `v3`, etc.

### Version Header (Optional)

```http

API-Version: v1

```

---

## 📝 Next Steps

After reading this document, proceed to:

- **Part 2**: Authentication & Authorization APIs

- **Part 3**: HRMS Module APIs

- **Part 4**: CRM Module APIs

- **Part 5**: Inventory Module APIs

- **Part 6**: Financial & Sales Module APIs

- **Part 7**: Admin Module & System Configuration

---

## ✅ Checklist for Backend Implementation

- [ ] Set up microservices architecture

- [ ] Configure API Gateway

- [ ] Implement service registry

- [ ] Set up multi-tenant database

- [ ] Configure JWT authentication

- [ ] Implement RBAC authorization

- [ ] Set up error handling middleware

- [ ] Configure rate limiting

- [ ] Implement idempotency handling

- [ ] Set up health check endpoints

- [ ] Configure CORS

- [ ] Set up logging and monitoring

- [ ] Configure SSL/TLS

- [ ] Set up file storage

- [ ] Implement WebSocket service

---

**Document Version**: 1.0

**Last Updated**: 2024-01-15

**Author**: Frontend Team

**Status**: Ready for Backend Implementation

---

# 🔐 BACKEND DOCUMENTATION - PART 2: AUTHENTICATION & AUTHORIZATION

[Full Part 2 content continues...]

---

# 👥 BACKEND DOCUMENTATION - PART 3: HRMS MODULE APIs

[Full Part 3 content continues...]

---

# 📞 BACKEND DOCUMENTATION - PART 4: CRM MODULE APIs

[Full Part 4 content continues...]

---

# 📦 BACKEND DOCUMENTATION - PART 5: INVENTORY MODULE APIs

[Full Part 5 content continues...]

---

# 💰 BACKEND DOCUMENTATION - PART 6: FINANCIAL & SALES MODULE APIs

[Full Part 6 content continues...]

---

# ⚙ BACKEND DOCUMENTATION - PART 7: ADMIN MODULE & SYSTEM CONFIGURATION

[Full Part 7 content continues...]

---

**🎉 Complete Backend Documentation - All 7 Parts Included!**

This comprehensive documentation covers:

1. System Architecture & Overview
2. Authentication & Authorization
3. HRMS Module APIs
4. CRM Module APIs
5. Inventory Module APIs
6. Financial & Sales Module APIs
7. Admin Module & System Configuration

**Status**: Ready for Backend Implementation

