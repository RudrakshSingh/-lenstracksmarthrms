# Codebase Overview - Etelios HRMS & ERP System

**Generated:** 2025-01-20  
**System:** Microservices-based HRMS and ERP Platform

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Microservices Structure](#microservices-structure)
4. [Key Components](#key-components)
5. [Deployment Architecture](#deployment-architecture)
6. [Current Issues & Status](#current-issues--status)
7. [Code Organization](#code-organization)
8. [Configuration & Environment](#configuration--environment)

---

## Architecture Overview

### System Type
**Microservices Architecture** - Distributed system with 16+ independent services

### Main Components

1. **API Gateway** (`src/server.js`)
   - Central entry point for all API requests
   - Routes requests to appropriate microservices
   - Service discovery and health monitoring
   - Port: 3000 (default)

2. **Microservices** (16 services)
   - Each service runs independently on its own port
   - Communicates via HTTP/REST and Kafka events
   - Shared utilities and middleware in `microservices/shared/`

3. **Infrastructure Services**
   - MongoDB (primary database)
   - Redis (caching, sessions)
   - Kafka/Azure Event Hubs (event streaming)
   - Azure Key Vault (secrets management)

### Communication Patterns

- **Synchronous**: HTTP/REST via API Gateway
- **Asynchronous**: Kafka event bus for cross-service events
- **Service Discovery**: Environment-based URL configuration

---

## Technology Stack

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Cache**: Redis (ioredis)
- **Message Queue**: Kafka (kafkajs) / Azure Event Hubs
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Joi, express-validator

### Infrastructure & DevOps
- **Containerization**: Docker
- **Orchestration**: Kubernetes (AKS), Docker Compose
- **Cloud Platform**: Microsoft Azure
- **CI/CD**: Azure Pipelines
- **Secrets**: Azure Key Vault
- **Monitoring**: Winston logging, custom monitoring service

### Security
- **Authentication**: JWT tokens, session management
- **Authorization**: Role-based access control (RBAC)
- **Security Middleware**: Helmet, CORS, rate limiting, input sanitization
- **Encryption**: bcryptjs for passwords, Azure Key Vault for secrets

### File Storage
- **Cloud Storage**: Cloudinary, Azure Blob Storage
- **File Upload**: Multer middleware

### Additional Services
- **Email**: Nodemailer, SendGrid
- **SMS**: Twilio
- **Document Signing**: DocuSign
- **PDF Generation**: PDFKit
- **Excel**: ExcelJS

---

## Microservices Structure

### Core Services (Ports 3001-3016)

| Service | Port | Description | Status |
|---------|------|-------------|--------|
| **auth-service** | 3001 | Authentication, user management, permissions | ⚠️ Deployment issues |
| **hr-service** | 3002 | HR management, employees, departments, transfers | ⚠️ Deployment issues |
| **attendance-service** | 3003 | Attendance tracking, geofencing, clock in/out | ✅ |
| **payroll-service** | 3004 | Payroll, salary management | ✅ |
| **crm-service** | 3005 | Customer relationship management | ✅ |
| **inventory-service** | 3006 | Inventory, products, stock management | ✅ |
| **sales-service** | 3007 | Sales orders, transactions | ✅ |
| **purchase-service** | 3008 | Purchase orders, vendor management | ✅ |
| **financial-service** | 3009 | Financial management, accounting | ✅ |
| **document-service** | 3010 | Document management, e-signatures | ✅ |
| **service-management** | 3011 | Service & SLA management | ✅ |
| **cpp-service** | 3012 | Customer Protection Plan | ✅ |
| **prescription-service** | 3013 | Prescription management | ✅ |
| **analytics-service** | 3014 | Analytics, reporting, dashboards | ✅ |
| **notification-service** | 3015 | Notifications, communications | ✅ |
| **monitoring-service** | 3016 | Health checks, monitoring | ✅ |

### Additional Services

| Service | Port | Description |
|---------|------|-------------|
| **tenant-registry-service** | 3020 | Multi-tenant registry |
| **tenant-management-service** | 3017 | Tenant administration |
| **realtime-service** | 3021 | WebSocket service |

### Service Structure (Standard Pattern)

Each microservice follows this structure:
```
service-name/
├── src/
│   ├── config/          # Configuration (database, logger, etc.)
│   ├── controllers/     # Request handlers
│   ├── models/          # Mongoose models
│   ├── routes/          # Express routes
│   ├── services/        # Business logic
│   ├── middleware/      # Custom middleware
│   ├── utils/           # Utility functions
│   ├── consumers/       # Kafka event consumers
│   └── server.js        # Service entry point
├── Dockerfile
├── docker-compose.yml
├── package.json
└── logs/
```

---

## Key Components

### 1. API Gateway (`src/server.js`)

**Responsibilities:**
- Request routing to microservices
- Service health monitoring
- Request/response caching
- Rate limiting
- HTTPS/HTTP protocol handling
- Service discovery

**Key Features:**
- Dynamic service registry
- Health check aggregation
- Proxy middleware with error handling
- Service status caching (5-60 seconds)

### 2. Shared Utilities (`microservices/shared/`)

**Config:**
- `database.js` - MongoDB connection management
- `logger.js` - Winston logging configuration
- `jwt.js` - JWT token utilities
- `redis.js` - Redis client
- `kafka.config.js` - Kafka configuration
- `security.config.js` - Security settings

**Middleware:**
- `auth.middleware.js` - Authentication
- `security.middleware.js` - Security headers, input validation
- `rateLimiter.middleware.js` - Rate limiting
- `error.js` - Error handling
- `upload.middleware.js` - File upload handling

**Services:**
- `kafka.service.js` - Kafka producer/consumer wrapper

**Utils:**
- `response.util.js` - Standardized API responses
- `email.js` - Email utilities
- `sms.js` - SMS utilities
- `encryption.js` - Encryption utilities

### 3. Authentication System

**Components:**
- JWT-based authentication
- Refresh token support
- Role-based access control (RBAC)
- Permission-based authorization
- Session management
- Emergency lock system
- Greywall emergency system

**Endpoints:**
- `/api/auth/login` - User login
- `/api/auth/register` - User registration
- `/api/auth/mock-login` - Mock login for testing
- `/api/auth/mock-login-fast` - Fast mock login (no DB writes)
- `/api/auth/refresh` - Token refresh
- `/api/auth/logout` - User logout

### 4. Event Bus (Kafka)

**Implementation:**
- `microservices/shared/services/kafka.service.js` - Shared Kafka service
- `etelios-microservices/shared/events/EventBus.js` - Alternative EventBus

**Features:**
- Azure Event Hubs support (SASL_SSL)
- Local Kafka support
- Producer/Consumer pattern
- Event publishing and subscription
- Automatic reconnection and retry

**Event Topics:**
- User events (created, updated, deleted)
- Employee events
- Attendance events
- Notification events
- Audit events

### 5. Database Architecture

**Pattern:**
- Each service has its own database (or database namespace)
- MongoDB connection pooling
- Replica set support
- Multi-tenant database routing (tenant-registry-service)

**Connection Management:**
- Shared database config in `microservices/shared/config/database.js`
- Service-specific database configs
- Connection pooling (maxPoolSize: 10)
- Timeout configurations optimized for Azure

---

## Deployment Architecture

### Environments

1. **Local Development**
   - Docker Compose for services
   - Local MongoDB, Redis, Kafka
   - Port mapping: 3000-3021

2. **Azure App Services**
   - Each service deployed as separate App Service
   - Azure Database for MongoDB
   - Azure Redis Cache
   - Azure Event Hubs (Kafka-compatible)

3. **Kubernetes (AKS)**
   - Kubernetes manifests in `k8s/` directory
   - ConfigMaps and Secrets
   - Service mesh ready
   - Horizontal pod autoscaling

### Deployment Files

**Docker:**
- `Dockerfile` - Main application
- `docker-compose.yml` - Local development
- `docker-compose.production.yml` - Production setup
- Service-specific Dockerfiles

**Kubernetes:**
- `k8s/deployments/*.yaml` - Service deployments
- `k8s/configmap.yaml` - Configuration
- `k8s/secrets.yaml.template` - Secrets template
- `k8s/ingress.yaml` - Ingress configuration
- `k8s/namespace.yaml` - Namespace definition

**CI/CD:**
- `azure-pipelines.yml` - Main pipeline
- `azure-pipelines-combined.yml` - Combined services
- Service-specific pipelines

---

## Current Issues & Status

### Critical Issues (From Documentation)

1. **Services Running Wrong Code** ⚠️ CRITICAL
   - Auth service and HR service App Services running API Gateway code
   - Root cause: Docker build context issue (fixed in code, not deployed)
   - Status: Code fixed, awaiting deployment

2. **Proxy Not Forwarding** ⚠️ CRITICAL
   - API Gateway not forwarding requests to services
   - Returns API Gateway response instead of service response
   - Status: Code fixed, awaiting deployment

3. **Mock Login Timeout** ⚠️
   - `/api/auth/mock-login` timing out (408 Request Timeout)
   - Azure Load Balancer timeout (10-11 seconds)
   - Solution: Use `/api/auth/mock-login-fast` endpoint
   - Status: Fast endpoint implemented

4. **404 Errors on Endpoints**
   - Endpoints returning 404 instead of 401 for auth errors
   - Most endpoints require authentication
   - Status: Need to test with valid tokens

### Recent Changes (Git Status)

**Modified Files:**
- `etelios-microservices/shared/events/EventBus.js` - Kafka EventBus updates
- `microservices/attendance-service/src/controllers/attendanceController.js` - Controller updates
- `microservices/attendance-service/src/routes/attendance.routes.js` - Route updates
- `microservices/hr-service/src/controllers/hrController.js` - Controller updates
- `microservices/hr-service/src/routes/hr.routes.js` - Route updates
- `microservices/hr-service/src/services/hr.service.js` - Service updates
- `microservices/shared/services/kafka.service.js` - Kafka service updates
- `src/utils/keyVault.js` - Key Vault configuration

**Untracked Files:**
- `MOCK-LOGIN-CREDENTIALS-HR.md` - Mock login documentation

---

## Code Organization

### Root Directory Structure

```
lenstracksmarthrms/
├── src/                          # Main API Gateway
│   ├── config/                   # Gateway configuration
│   ├── middleware/               # Gateway middleware
│   ├── utils/                    # Gateway utilities
│   └── server.js                 # Gateway entry point
├── microservices/                # All microservices
│   ├── auth-service/             # Authentication service
│   ├── hr-service/               # HR service
│   ├── attendance-service/       # Attendance service
│   ├── ...                       # Other services
│   └── shared/                   # Shared utilities
├── etelios-microservices/        # Alternative microservices structure
├── lenstrack-ecommerce/          # E-commerce application
├── lenstrack-training-app/       # Training application
├── k8s/                          # Kubernetes manifests
├── docker/                       # Docker configurations
├── docs/                         # Documentation
├── postman/                      # API collections
├── tests/                        # Test files
└── logs/                         # Application logs
```

### Shared Code Patterns

**Response Format:**
```javascript
{
  success: true/false,
  message: "Description",
  data: {...},
  pagination: {...},  // Optional
  error: "Error message"  // On error
}
```

**Error Handling:**
- Standardized error responses
- Error middleware in shared utilities
- HTTP status codes: 200, 201, 400, 401, 403, 404, 500, 503

**Authentication:**
- JWT tokens in `Authorization: Bearer <token>` header
- Token verification in middleware
- User object attached to `req.user`

**Logging:**
- Winston logger
- Structured logging with context
- Log levels: error, warn, info, debug
- File and console transports

---

## Configuration & Environment

### Environment Variables

**Core:**
- `NODE_ENV` - Environment (development/production)
- `PORT` - Service port
- `SERVICE_NAME` - Service identifier

**Database:**
- `MONGO_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string

**Authentication:**
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - Refresh token secret

**Services:**
- `AUTH_SERVICE_URL` - Auth service URL
- `NOTIFICATION_SERVICE_URL` - Notification service URL
- `HR_SERVICE_URL` - HR service URL
- ... (one per service)

**Kafka:**
- `KAFKA_BROKERS` - Kafka broker addresses
- `EVENTHUB_CONNECTION_STRING` - Azure Event Hubs connection
- `KAFKA_SECURITY_PROTOCOL` - Security protocol (SASL_SSL)

**Azure:**
- `AZURE_KEY_VAULT_URL` - Key Vault URL
- `USE_KEY_VAULT` - Enable Key Vault (true/false)
- `AZURE_STORAGE_CONNECTION_STRING` - Blob storage

### Configuration Files

- `microservices/env.example` - Environment template
- `production.env` - Production environment
- `microservices/azure.env` - Azure-specific config
- `src/config/services.config.js` - Service registry

### Secrets Management

**Azure Key Vault Integration:**
- `src/utils/keyVault.js` - Key Vault client
- Automatic secret loading
- Fallback to environment variables
- Secret caching (5 minutes)

**Secret Mapping:**
- Environment variables mapped to Key Vault secret names
- Pattern: `kv-{env-var-name-lowercase-with-dashes}`

---

## Key Features

### 1. Multi-Tenancy
- Tenant registry service
- Tenant-specific database routing
- Tenant isolation

### 2. Event-Driven Architecture
- Kafka event bus
- Cross-service event publishing
- Event consumers in services

### 3. Security Features
- JWT authentication
- RBAC authorization
- Rate limiting
- Input validation and sanitization
- Emergency lock system
- Audit logging

### 4. Monitoring & Observability
- Health check endpoints
- Service status monitoring
- Structured logging
- Performance tracking

### 5. Scalability
- Microservices architecture
- Horizontal scaling support
- Database connection pooling
- Caching with Redis

---

## Development Workflow

### Starting Services Locally

1. **Start Infrastructure:**
   ```bash
   docker-compose up -d mongodb redis
   ```

2. **Start All Services:**
   ```bash
   cd microservices
   node start-all-services.js
   ```

3. **Start Individual Service:**
   ```bash
   cd microservices/auth-service
   npm install
   npm start
   ```

### Testing

- **Unit Tests**: Jest framework
- **API Tests**: Postman collections in `postman/`
- **Health Checks**: `/health` endpoint on each service
- **Service Status**: `/api` endpoint on API Gateway

### Deployment

1. **Docker Build:**
   ```bash
   docker build -t service-name .
   ```

2. **Azure Deployment:**
   - Azure Pipelines automatically deploy on push
   - Manual deployment via Azure CLI

3. **Kubernetes Deployment:**
   ```bash
   kubectl apply -f k8s/
   ```

---

## Documentation Files

The codebase includes extensive documentation:

- **Status Reports**: `CURRENT-STATUS-REPORT.md`, `ISSUES-STATUS.md`
- **Issue Analysis**: `COMPLETE-ISSUE-ANALYSIS.md`, `BACKEND-ISSUES-SUMMARY.md`
- **Deployment Guides**: `DEPLOYMENT-STATUS.md`, `k8s/RAJVEER-AKS-DEPLOYMENT-GUIDE.md`
- **Kafka Setup**: `KAFKA-IMPLEMENTATION-GUIDE.md`, `KAFKA-SETUP-SUMMARY.md`
- **API Documentation**: `MOCK-LOGIN-API.md`, `FRONTEND-MOCK-LOGIN-GUIDE.md`
- **Fix Documentation**: Multiple `FIX-*.md` files

---

## Next Steps & Recommendations

### Immediate Actions

1. **Deploy Fixed Code**
   - Deploy auth-service with correct build context
   - Deploy hr-service with correct build context
   - Verify API Gateway proxy forwarding

2. **Test Authentication**
   - Use `/api/auth/mock-login-fast` for testing
   - Verify token generation and validation
   - Test protected endpoints with tokens

3. **Monitor Service Health**
   - Check service status via `/api` endpoint
   - Verify all services are online
   - Monitor logs for errors

### Long-term Improvements

1. **Code Quality**
   - Standardize error responses (401 vs 404)
   - Improve error handling consistency
   - Add comprehensive unit tests

2. **Documentation**
   - API documentation (OpenAPI/Swagger)
   - Architecture decision records
   - Deployment runbooks

3. **Monitoring**
   - Implement distributed tracing
   - Add metrics collection
   - Set up alerting

4. **Security**
   - Security audit
   - Penetration testing
   - Dependency vulnerability scanning

---

## Summary

This is a **production-grade microservices-based HRMS and ERP system** built with Node.js, Express, MongoDB, and deployed on Azure. The system consists of 16+ microservices communicating via HTTP and Kafka events, with a centralized API Gateway for routing.

**Current State:**
- ✅ Code structure is well-organized
- ✅ Microservices architecture is sound
- ⚠️ Some deployment issues need resolution
- ⚠️ Some services need code deployment fixes

**Strengths:**
- Comprehensive microservices architecture
- Good separation of concerns
- Extensive documentation
- Production-ready security features
- Scalable design

**Areas for Improvement:**
- Resolve deployment issues
- Standardize error handling
- Improve test coverage
- Enhance monitoring and observability

---

*Last Updated: 2025-01-20*

