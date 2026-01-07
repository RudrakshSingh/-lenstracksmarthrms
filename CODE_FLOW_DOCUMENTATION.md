# Code Flow Documentation - Etelios HRMS

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser/Mobile App)                   │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP Request
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Port 3000)                      │
│  • Entry point for all requests                                 │
│  • Security, Rate Limiting, CORS                               │
│  • Load Balancing, Circuit Breaker                              │
│  • Request Routing to Microservices                             │
└────────────────────────────┬────────────────────────────────────┘
                             │ Proxy Request
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              MICROSERVICE (e.g., hr-service:3002)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Routes    │→ │ Controllers  │→ │   Services   │         │
│  └──────────────┘  └──────────────┘  └──────┬───────┘         │
│                                               │                 │
│                                               ▼                 │
│                                      ┌──────────────┐          │
│                                      │   Models     │          │
│                                      │  (Mongoose)  │          │
│                                      └──────┬───────┘          │
└─────────────────────────────────────────────┼──────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              DATABASE (Azure Cosmos DB - MongoDB API)           │
│  • auth_db (auth-service)                                       │
│  • hr-database (hr-service)                                     │
│  • attendance_db (attendance-service)                           │
│  • ... (17 more service-specific databases)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Request Flow - Complete Journey

### **1. Client Request**
```
Client → HTTP Request → API Gateway (Port 3000)
Example: POST http://api-gateway:3000/api/hr/employees
```

### **2. API Gateway Processing**

#### **Step 2.1: Security & Middleware Stack**
```javascript
1. CORS Handling (OPTIONS requests)
2. Security Headers (Helmet)
3. Compression
4. Rate Limiting (per endpoint type)
5. Body Parsing (JSON, URL-encoded)
6. Request Validation
```

#### **Step 2.2: Service Discovery & Routing**
```javascript
// src/server.js
1. Load services configuration (services.config.js)
2. Initialize load balancer
3. Apply circuit breaker middleware
4. Create proxy middleware for each service
5. Route request to appropriate microservice
```

#### **Step 2.3: Proxy Middleware**
```javascript
// Request: POST /api/hr/employees
// 1. Match basePath: /api/hr
// 2. Load balancer selects instance (if multiple)
// 3. Circuit breaker checks service health
// 4. Proxy request to: http://hr-service:3002/api/hr/employees
```

---

### **3. Microservice Processing (hr-service example)**

#### **Step 3.1: Request Reception**
```
Port: 3002
Endpoint: /api/hr/employees
Method: POST
```

#### **Step 3.2: Middleware Chain**
```javascript
// microservices/hr-service/src/routes/hr.routes.js
1. authenticate (JWT token validation)
   ↓
2. requireRole (RBAC permission check)
   ↓
3. validateRequest (Input validation with Joi)
   ↓
4. asyncHandler (Error handling wrapper)
   ↓
5. Controller function
```

#### **Step 3.3: Authentication Middleware**
```javascript
// microservices/hr-service/src/middleware/auth.middleware.js
1. Extract JWT token from Authorization header
2. Verify token signature
3. Decode user information
4. Attach user object to req.user
5. Continue to next middleware
```

#### **Step 3.4: RBAC Middleware**
```javascript
// microservices/hr-service/src/middleware/rbac.middleware.js
1. Check user role from req.user
2. Verify required permissions
3. Allow/deny request based on role
```

#### **Step 3.5: Validation Middleware**
```javascript
// microservices/hr-service/src/middleware/validateRequest.wrapper.js
1. Validate request body against Joi schema
2. Sanitize input data
3. Return 400 if validation fails
4. Continue if valid
```

#### **Step 3.6: Controller Layer**
```javascript
// microservices/hr-service/src/controllers/hrController.js
1. Parse request data (body, query, params)
2. Extract user information (req.user)
3. Call service layer
4. Format response
5. Send standardized JSON response
```

#### **Step 3.7: Service Layer**
```javascript
// microservices/hr-service/src/services/hr.service.js
1. Business logic processing
2. Data transformation
3. Call model layer for database operations
4. Handle business rules
5. Return processed data
```

#### **Step 3.8: Model Layer (Database)**
```javascript
// microservices/hr-service/src/models/User.model.js
1. Mongoose schema definition
2. Database query execution
3. Data validation at schema level
4. Return database results
```

#### **Step 3.9: Database Connection**
```javascript
// microservices/hr-service/src/config/database.js
1. Connect to MongoDB (Azure Cosmos DB)
2. Database: hr-database
3. Connection pooling (min: 2, max: 10)
4. Execute query
5. Return results
```

---

## 🔄 Complete Request-Response Cycle

### **Example: Create Employee**

```
1. CLIENT REQUEST
   POST /api/hr/employees
   Headers: { Authorization: "Bearer <JWT_TOKEN>" }
   Body: { email: "john@example.com", fullName: "John Doe", ... }

2. API GATEWAY (src/server.js)
   ├─ CORS check ✓
   ├─ Security headers ✓
   ├─ Rate limiting check ✓
   ├─ Body parsing ✓
   └─ Route to hr-service ✓

3. PROXY MIDDLEWARE
   ├─ Load balancer selection
   ├─ Circuit breaker check
   └─ Forward to: http://hr-service:3002/api/hr/employees

4. HR SERVICE (microservices/hr-service/src/server.js)
   ├─ Express app receives request
   └─ Route matching: /api/hr → hr.routes.js

5. ROUTE HANDLER (microservices/hr-service/src/routes/hr.routes.js)
   ├─ authenticate middleware
   │  └─ Verify JWT token
   │  └─ Extract user info → req.user
   ├─ requireRole middleware
   │  └─ Check role: HR/Admin/SuperAdmin
   │  └─ Check permission: user:create
   ├─ validateRequest middleware
   │  └─ Validate body against schema
   │  └─ Sanitize input
   └─ Controller: createEmployee

6. CONTROLLER (microservices/hr-service/src/controllers/hrController.js)
   ├─ Parse request body
   ├─ Extract createdBy from req.user
   ├─ Validate required fields
   └─ Call: HRService.createEmployee(employeeData, createdBy)

7. SERVICE (microservices/hr-service/src/services/hr.service.js)
   ├─ Check if email exists: User.findOne({ email })
   ├─ Find role: Role.findOne({ name: roleName })
   ├─ Find store: Store.findById(storeId)
   ├─ Create employee: new User({ ... })
   ├─ Save to database: employee.save()
   ├─ Invalidate cache
   ├─ Record audit log
   └─ Return employee object

8. DATABASE (Azure Cosmos DB)
   ├─ Connection: hr-database
   ├─ Collection: users
   ├─ Insert document
   └─ Return saved document

9. RESPONSE FLOW (Reverse)
   Service → Controller → Route → Proxy → Gateway → Client

10. CLIENT RESPONSE
    Status: 201 Created
    Body: {
      success: true,
      data: { employee object },
      message: "Employee created successfully"
    }
```

---

## 🔐 Authentication Flow

```
1. LOGIN REQUEST
   POST /api/auth/login
   Body: { email: "user@example.com", password: "password123" }

2. AUTH SERVICE
   ├─ Validate credentials
   ├─ Check password hash
   ├─ Generate JWT access token
   ├─ Generate refresh token
   ├─ Store refresh token (Redis/memory)
   └─ Return tokens

3. CLIENT STORAGE
   ├─ Access Token: Memory/localStorage
   └─ Refresh Token: Secure storage

4. SUBSEQUENT REQUESTS
   ├─ Include: Authorization: Bearer <access_token>
   ├─ Gateway validates token
   ├─ Extract user info
   └─ Attach to req.user

5. TOKEN REFRESH
   POST /api/auth/refresh
   Body: { refreshToken: "..." }
   └─ Generate new access token
```

---

## 🗄️ Database Connection Flow

```
1. SERVICE STARTUP
   ├─ Load environment variables
   ├─ Read MONGO_URI from secrets
   └─ Call connectDB()

2. DATABASE CONNECTION (microservices/hr-service/src/config/database.js)
   ├─ Parse connection string
   ├─ Extract database name (hr-database)
   ├─ Configure connection options:
   │  ├─ serverSelectionTimeoutMS: 30000
   │  ├─ socketTimeoutMS: 60000
   │  ├─ maxPoolSize: 10
   │  ├─ minPoolSize: 2
   │  └─ retryWrites: true
   ├─ Connect to Azure Cosmos DB
   └─ Log connection status

3. CONNECTION POOLING
   ├─ Maintain 2-10 connections
   ├─ Reuse connections
   └─ Handle connection failures

4. QUERY EXECUTION
   ├─ Model query (User.findOne())
   ├─ Mongoose translates to MongoDB query
   ├─ Execute via connection pool
   └─ Return results
```

---

## 🚀 Deployment Flow

```
1. CODE COMMIT
   └─ Push to Azure DevOps repository

2. AZURE DEVOPS PIPELINE (azure-pipelines.yml)
   ├─ Build Stage
   │  ├─ Docker build (repository root context)
   │  ├─ Build all microservices
   │  └─ Push to ACR
   ├─ Security Scan Stage
   │  ├─ Trivy vulnerability scan
   │  └─ SBOM generation
   └─ Deploy Stage
      ├─ Generate Kubernetes manifests
      ├─ Apply secrets
      ├─ Deploy to AKS
      └─ Health check verification

3. KUBERNETES DEPLOYMENT
   ├─ Pod creation
   ├─ Container startup
   ├─ Database connection
   ├─ Health checks (liveness/readiness)
   └─ Service ready

4. API GATEWAY DISCOVERY
   ├─ Service registry update
   ├─ Health check polling
   └─ Route activation
```

---

## 📁 File Structure & Flow

```
Repository Root
├── src/                          # API Gateway
│   ├── server.js                 # Main gateway server
│   ├── config/
│   │   └── services.config.js    # Service registry
│   └── middleware/
│       ├── circuit-breaker.js    # Resilience
│       └── load-balancer.js     # Load distribution
│
├── microservices/
│   ├── hr-service/
│   │   ├── src/
│   │   │   ├── server.js         # Express app setup
│   │   │   ├── routes/           # Route definitions
│   │   │   │   ├── hr.routes.js
│   │   │   │   └── auth.routes.js
│   │   │   ├── controllers/      # Request handlers
│   │   │   │   └── hrController.js
│   │   │   ├── services/         # Business logic
│   │   │   │   └── hr.service.js
│   │   │   ├── models/           # Database models
│   │   │   │   ├── User.model.js
│   │   │   │   └── Employee.model.js
│   │   │   ├── middleware/       # Auth, RBAC, validation
│   │   │   │   ├── auth.middleware.js
│   │   │   │   └── rbac.middleware.js
│   │   │   └── config/
│   │   │       └── database.js   # DB connection
│   │   └── Dockerfile            # Container definition
│   │
│   └── shared/                    # Shared utilities
│       ├── utils/
│       │   └── response.util.js  # Standardized responses
│       └── middleware/
│
└── k8s/                          # Kubernetes manifests
    ├── deployments/              # Service deployments
    ├── secrets.yaml              # Environment variables
    └── configmap.yaml            # Configuration
```

---

## 🔄 Error Handling Flow

```
1. ERROR OCCURS
   ├─ Service layer throws error
   └─ Controller catches error

2. ERROR PROCESSING
   ├─ Log error (Winston logger)
   ├─ Determine error type
   │  ├─ Validation error → 400
   │  ├─ Authentication error → 401
   │  ├─ Authorization error → 403
   │  ├─ Not found → 404
   │  ├─ Database error → 503
   │  └─ Server error → 500
   └─ Format error response

3. ERROR RESPONSE
   {
     success: false,
     error: "Error message",
     code: 400,
     timestamp: "2024-..."
   }

4. CIRCUIT BREAKER (if service unavailable)
   ├─ Open circuit after threshold failures
   ├─ Return 503 immediately
   └─ Retry after reset timeout
```

---

## 🎯 Key Design Patterns

### **1. Layered Architecture**
```
Routes → Controllers → Services → Models → Database
```

### **2. Middleware Chain**
```
Request → Security → Auth → RBAC → Validation → Controller
```

### **3. Service Discovery**
```
Gateway → Service Registry → Health Checks → Route Activation
```

### **4. Database-per-Service**
```
Each microservice → Own database → Data isolation
```

### **5. Circuit Breaker Pattern**
```
Service calls → Failure tracking → Circuit open → Fast fail
```

### **6. Load Balancing**
```
Multiple instances → Round-robin/Least-connections → Distribution
```

---

## 📊 Data Flow Summary

```
CLIENT
  ↓ HTTP Request
API GATEWAY
  ↓ Security, Rate Limiting, Routing
PROXY MIDDLEWARE
  ↓ Load Balancing, Circuit Breaker
MICROSERVICE
  ↓ Route Matching
MIDDLEWARE CHAIN
  ↓ Auth → RBAC → Validation
CONTROLLER
  ↓ Request Processing
SERVICE LAYER
  ↓ Business Logic
MODEL LAYER
  ↓ Database Queries
DATABASE
  ↓ Query Execution
MODEL LAYER
  ↓ Results
SERVICE LAYER
  ↓ Data Processing
CONTROLLER
  ↓ Response Formatting
MIDDLEWARE CHAIN
  ↓ Response Headers
PROXY MIDDLEWARE
  ↓ Response Forwarding
API GATEWAY
  ↓ Response Processing
CLIENT
  ↓ JSON Response
```

---

## 🔧 Configuration Flow

```
1. ENVIRONMENT VARIABLES
   ├─ .env (local development)
   ├─ Kubernetes Secrets (production)
   └─ Azure Key Vault (production secrets)

2. SERVICE CONFIGURATION
   ├─ services.config.js (gateway)
   ├─ database.js (each service)
   └─ jwt.js (authentication)

3. KUBERNETES CONFIGURATION
   ├─ deployments/*.yaml
   ├─ secrets.yaml
   └── configmap.yaml
```

---

**Last Updated:** December 25, 2025
**Architecture:** Microservices with API Gateway
**Database:** Azure Cosmos DB (MongoDB API)
**Deployment:** Azure Kubernetes Service (AKS)


