# Etelios Smart HRMS - Complete Codebase Overview

**Last Updated:** December 30, 2025  
**Version:** 1.0.0  
**Architecture:** Microservices on Azure Kubernetes Service (AKS)

---

## 📊 Codebase Statistics

- **Total Size:** ~34 MB (excluding node_modules)
- **Microservices:** 20 independent services
- **Main Server:** 988 lines (API Gateway)
- **Kubernetes Deployments:** 19 YAML manifests
- **Documentation Files:** 20+ MD files
- **Languages:** Node.js (v22+), JavaScript

---

## 🏗️ Architecture Overview

### **Deployment Model**
```
┌─────────────────────────────────────────────────────────────┐
│                    Azure Cloud (Production)                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Azure Kubernetes Service (AKS)                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │  │
│  │  │ Namespace:   │  │ Namespace:   │  │  Istio     │  │  │
│  │  │ etelios-     │  │ etelios-     │  │  Service   │  │  │
│  │  │ backend-prod │  │ backend-dev  │  │  Mesh      │  │  │
│  │  └──────────────┘  └──────────────┘  └────────────┘  │  │
│  │                                                        │  │
│  │  ┌────────────────────────────────────────────────┐   │  │
│  │  │  API Gateway (Optional)                        │   │  │
│  │  │  - Routes to microservices                     │   │  │
│  │  │  - Circuit breaker, load balancing             │   │  │
│  │  │  - Can be replaced by Istio                    │   │  │
│  │  └────────────────────────────────────────────────┘   │  │
│  │                                                        │  │
│  │  ┌────────────────────────────────────────────────┐   │  │
│  │  │  20 Microservices (Independent Pods)           │   │  │
│  │  │  - auth, hr, attendance, payroll, etc.         │   │  │
│  │  │  - Each with own DB, Redis, resources          │   │  │
│  │  └────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Azure Container Registry (ACR)                       │  │
│  │  - eteliosacr-hvawabdbgge7e0fu.azurecr.io            │  │
│  │  - Stores all Docker images                          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Azure Key Vault                                      │  │
│  │  - etelios-keyvault.vault.azure.net                  │  │
│  │  - Secrets, connection strings, API keys             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Directory Structure

```
lenstracksmarthrms/
├── app.js                          # Entry point (loads src/server.js)
├── src/
│   ├── server.js                   # API Gateway (988 lines)
│   ├── config/
│   │   └── services.config.js      # Microservices registry
│   ├── middleware/
│   │   ├── circuit-breaker.js      # Resilience patterns
│   │   ├── load-balancer.js        # Service distribution
│   │   └── production-security.js  # Security headers
│   └── utils/                      # Shared utilities
│
├── microservices/                  # 20 Independent Services
│   ├── auth-service/               # Authentication & User Management
│   ├── hr-service/                 # HR & Employee Data
│   ├── attendance-service/         # Attendance & Geofencing
│   ├── payroll-service/            # Payroll & Salary
│   ├── financial-service/          # Financial Management
│   ├── crm-service/                # Customer Relationship
│   ├── inventory-service/          # Inventory Management
│   ├── sales-service/              # Sales Operations
│   ├── purchase-service/           # Purchase Management
│   ├── document-service/           # Document Storage
│   ├── notification-service/       # Notifications (Email/SMS)
│   ├── analytics-service/          # Analytics & Reporting
│   ├── monitoring-service/         # System Monitoring
│   ├── prescription-service/       # Prescription Management
│   ├── cpp-service/                # CPP Operations
│   ├── service-management/         # Service Operations
│   ├── tenant-registry-service/    # Multi-tenancy
│   ├── tenant-management-service/  # Tenant Admin
│   ├── realtime-service/           # WebSocket/Real-time
│   ├── jts-service/                # JTS Operations
│   └── shared/                     # Shared libraries
│       ├── config/                 # Common configs
│       ├── middleware/             # Shared middleware
│       └── utils/                  # Common utilities
│
├── k8s/                            # Kubernetes Manifests
│   ├── deployments/                # 19 service deployments
│   ├── prod/                       # Production configs
│   │   ├── auth-service.yaml
│   │   ├── hr-service.yaml
│   │   ├── attendance-service.yaml
│   │   └── configmap.yaml
│   ├── dev/                        # Development configs
│   ├── istio/                      # Istio Service Mesh
│   │   ├── gateway.yaml            # Ingress gateway
│   │   ├── virtual-services.yaml  # Routing rules
│   │   ├── destination-rules.yaml # Load balancing, circuit breaking
│   │   ├── peer-authentication.yaml # mTLS
│   │   └── namespace-labels.yaml
│   ├── ingress.yaml                # Nginx Ingress
│   ├── configmap.yaml              # Environment variables
│   ├── secrets.yaml                # Kubernetes secrets
│   └── *.sh                        # Deployment scripts
│
├── ecosystem.config.js             # PM2 configuration (180 lines)
├── Dockerfile                      # Multi-stage build (138 lines)
├── docker-compose.yml              # Local development
├── azure-pipelines.yml             # CI/CD pipeline
│
├── docs/                           # Documentation
│   ├── ISTIO_DEPLOYMENT_GUIDE.md
│   ├── ELIMINATE_API_GATEWAY_GUIDE.md
│   ├── AZURE_DEPLOYMENT_FLOW.md
│   ├── DOCKER_BUILD_GUIDE.md
│   └── ... (20+ documentation files)
│
├── scripts/                        # Automation scripts
├── postman/                        # API collections
└── storage/                        # File storage
    ├── documents/
    ├── images/
    ├── backups/
    └── temp/
```

---

## 🔧 Core Components

### **1. API Gateway (`src/server.js`)**
**Purpose:** Central entry point for all API requests (optional, can be replaced by Istio)

**Key Features:**
- **Routing:** Proxies requests to appropriate microservices
- **Circuit Breaker:** Prevents cascading failures (using Opossum)
- **Load Balancing:** Distributes traffic across service instances
- **Security:**
  - Helmet.js for security headers
  - CORS configuration
  - Rate limiting (100 req/min per IP)
  - Request/response logging
- **Monitoring:**
  - Response time tracking
  - Health checks (`/health`)
  - Winston logging (console + file)

**Port:** 3000 (configurable via `PORT` env var)

**Configuration:**
```javascript
// All microservices are registered in src/config/services.config.js
services: {
  'auth': { name: 'auth-service', port: 3001, basePath: '/api/auth' },
  'hr': { name: 'hr-service', port: 3002, basePath: '/api/hr' },
  'attendance': { name: 'attendance-service', port: 3003 },
  // ... 17 more services
}
```

---

### **2. Microservices (20 Services)**

Each microservice follows this structure:
```
<service-name>/
├── src/
│   ├── server.js              # Entry point
│   ├── config/                # Service-specific config
│   │   ├── database.js        # MongoDB connection
│   │   ├── redis.js           # Redis cache
│   │   ├── logger.js          # Winston logger
│   │   └── jwt.js             # JWT config
│   ├── controllers/           # Business logic
│   ├── models/                # Mongoose models
│   ├── routes/                # Express routes
│   ├── middleware/            # Auth, validation, etc.
│   ├── services/              # Service layer
│   └── utils/                 # Helpers
├── Dockerfile                 # Independent build
├── package.json               # Dependencies
└── docker-compose.yml         # Local testing
```

**Service Ports:**
| Service | Port | Base Path |
|---------|------|-----------|
| auth-service | 3001 | `/api/auth` |
| hr-service | 3002 | `/api/hr` |
| attendance-service | 3003 | `/api/attendance` |
| payroll-service | 3004 | `/api/payroll` |
| crm-service | 3005 | `/api/crm` |
| inventory-service | 3006 | `/api/inventory` |
| sales-service | 3007 | `/api/sales` |
| purchase-service | 3008 | `/api/purchase` |
| financial-service | 3009 | `/api/financial` |
| document-service | 3010 | `/api/documents` |
| service-management | 3011 | `/api/service` |
| cpp-service | 3012 | `/api/cpp` |
| prescription-service | 3013 | `/api/prescription` |
| analytics-service | 3014 | `/api/analytics` |
| notification-service | 3015 | `/api/notification` |
| monitoring-service | 3016 | `/api/monitoring` |
| tenant-management | 3017 | `/api/admin/v1` |
| tenant-registry | 3020 | `/api/tenants` |
| realtime-service | 3021 | `/ws` |
| jts-service | 3022 | `/api/jts` |

---

### **3. Kubernetes Deployment**

**Namespaces:**
- `etelios-backend-prod` - Production environment
- `etelios-backend-dev` - Development environment
- `istio-system` - Istio Service Mesh

**Deployment Pattern (per service):**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: <service-name>
  namespace: etelios-backend-prod
  labels:
    app: <service-name>
    version: v1
  annotations:
    sidecar.istio.io/inject: "true"
    prometheus.io/scrape: "true"
spec:
  replicas: 2-3
  selector:
    matchLabels:
      app: <service-name>
      version: v1
  template:
    spec:
      containers:
      - name: <service-name>
        image: eteliosacr-hvawabdbgge7e0fu.azurecr.io/<service-name>:latest
        ports:
        - containerPort: <port>
        env:
        - name: NODE_ENV
          value: "production"
        - name: K8S_ENV
          value: "true"
        envFrom:
        - configMapRef:
            name: etelios-config-prod
        - secretRef:
            name: etelios-secrets-prod
        resources:
          requests:
            memory: "128Mi"
            cpu: "50m"
          limits:
            memory: "256Mi"
            cpu: "100m"
        livenessProbe:
          httpGet:
            path: /health
            port: <port>
        readinessProbe:
          httpGet:
            path: /health
            port: <port>
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
```

---

### **4. Istio Service Mesh (Planned/In Progress)**

**Features Being Implemented:**
- **mTLS:** Mutual TLS between all services
- **Traffic Management:**
  - Canary routing (10-20% dev, 80-90% prod)
  - Traffic mirroring (prod → dev)
  - Circuit breaking
  - Retries and timeouts
- **Load Balancing:** Round-robin, least connections
- **Observability:** Prometheus, Grafana, Kiali
- **Gateway:** External traffic management

**Configuration Files:**
- `k8s/istio/gateway.yaml` - Ingress gateway
- `k8s/istio/virtual-services.yaml` - Routing rules
- `k8s/istio/destination-rules.yaml` - Traffic policies
- `k8s/istio/peer-authentication.yaml` - mTLS enforcement

---

## 🚀 CI/CD Pipeline

### **Azure DevOps Pipeline (`azure-pipelines.yml`)**

**Trigger:**
- Branches: `main`, `develop`
- Excludes: `*.md`, `docs/*`

**Stages:**

**1. Build Stage**
- Build API Gateway Docker image
- Build 20 microservices in parallel (4 jobs)
- Push to Azure Container Registry (ACR)
- Tag: `latest` and `$(Build.BuildId)`

**2. Deploy Stage**
- Connect to AKS cluster
- Apply Kubernetes manifests
- Update deployments with new images
- Verify pod health

**Build Matrix (Parallel):**
```yaml
strategy:
  matrix:
    batch1: [auth, hr, attendance, payroll, crm]
    batch2: [inventory, sales, purchase, financial, document]
    batch3: [notification, analytics, monitoring, prescription, cpp]
    batch4: [service-management, tenant-registry, tenant-management, realtime, jts]
  maxParallel: 4
```

---

## 🔐 Security & Configuration

### **Azure Key Vault Integration**
- **URL:** `https://etelios-keyvault.vault.azure.net/`
- **Secrets Stored:**
  - MongoDB connection strings
  - Redis credentials
  - JWT secrets
  - API keys (Cloudinary, Twilio, SendGrid)
  - Azure Storage keys

### **Environment Variables (ConfigMap)**
```yaml
NODE_ENV: production
K8S_ENV: "true"
CORS_ORIGIN: "*"
USE_KEY_VAULT: "true"
AZURE_KEY_VAULT_URL: https://etelios-keyvault.vault.azure.net/
LOG_LEVEL: info
```

### **Secrets (Kubernetes Secret)**
```yaml
MONGODB_URI: <encrypted>
REDIS_PASSWORD: <encrypted>
JWT_SECRET: <encrypted>
JWT_REFRESH_SECRET: <encrypted>
```

---

## 📦 Docker Configuration

### **Dockerfile (Multi-stage Build)**

**Stage 1: Builder**
- Base: `node:22-slim`
- Install production dependencies only
- Copy source code
- Install microservices dependencies

**Stage 2: Runtime**
- Base: `node:22-slim`
- Install PM2 globally
- Copy from builder
- Expose port 8080
- Run with PM2

**Build Command:**
```bash
docker build -t etelios-backend:latest .
```

**Size Optimization:**
- Multi-stage build
- `--omit=dev` flag
- npm cache clean
- Minimal base image

---

## 🛠️ PM2 Configuration (`ecosystem.config.js`)

**Features:**
- Manages API Gateway + 20 microservices
- Environment-specific configs
- Log management (stdout/stderr for K8s)
- Auto-restart on failure
- Graceful shutdown

**Modes:**
1. **Gateway Only:** `RUN_ONLY_GATEWAY=true`
2. **All Services:** `RUN_ALL_SERVICES=true` (default)

**Logging:**
- All logs to `/dev/stdout` and `/dev/stderr`
- Kubernetes captures logs automatically
- No file-based logging (permission issues)

---

## 🧪 Testing & Development

### **Local Development**
```bash
# Start all services with Docker Compose
docker-compose up -d

# Start individual microservice
cd microservices/auth-service
npm run dev

# Start API Gateway
npm run dev
```

### **Testing**
```bash
# Run tests
npm test

# Health check all services
node check-all-apis.js

# Test specific endpoint
curl http://localhost:3001/health
```

---

## 📊 Monitoring & Observability

### **Health Checks**
All services expose `/health` endpoint:
```json
{
  "status": "ok",
  "service": "auth-service",
  "timestamp": "2025-12-30T10:00:00Z",
  "uptime": 3600,
  "memory": { "used": 50, "total": 256 }
}
```

### **Logging**
- **Winston** for structured logging
- Log levels: error, warn, info, debug
- Formats: JSON (production), colorized (development)
- Outputs: Console, file (`logs/combined.log`, `logs/error.log`)

### **Metrics (Planned)**
- Prometheus scraping
- Grafana dashboards
- Kiali service mesh visualization

---

## 🔄 Service Communication

### **Internal Communication (Kubernetes)**
Services communicate using Kubernetes service names:
```javascript
// In Kubernetes
http://auth-service:3001/api/auth/verify
http://hr-service:3002/api/hr/employees

// Detected by: process.env.KUBERNETES_SERVICE_HOST || process.env.K8S_ENV
```

### **External Access**
```
Internet → Nginx Ingress → API Gateway → Microservices
         (api.etelios.com)
```

---

## 📝 Key Documentation Files

| File | Purpose |
|------|---------|
| `ISTIO_DEPLOYMENT_GUIDE.md` | Complete Istio setup guide |
| `ELIMINATE_API_GATEWAY_GUIDE.md` | Remove API Gateway, use Istio |
| `AZURE_DEPLOYMENT_FLOW.md` | Azure deployment process |
| `DOCKER_BUILD_GUIDE.md` | Docker build instructions |
| `PIPELINE_TROUBLESHOOTING.md` | CI/CD debugging |
| `KUBECTL_COMMANDS.md` | Kubernetes command reference |
| `RUN_MICROSERVICES_LOCALLY.md` | Local development setup |

---

## 🚨 Current Issues & TODOs

### **Resolved:**
✅ PM2 logging to stdout/stderr for Kubernetes  
✅ Deployment selector label immutability  
✅ Azure pipeline ACR authentication  
✅ Codebase cleanup (removed logs, temp files)

### **In Progress:**
🔄 Istio Service Mesh installation (resource constraints)  
🔄 Webhook certificate issues (`istiod` vs `istiod-default`)  
🔄 Pod pending due to insufficient CPU on AKS nodes

### **Pending:**
⏳ Complete Istio deployment with mTLS  
⏳ Canary routing and traffic mirroring  
⏳ Prometheus/Grafana integration  
⏳ Scale AKS nodes or optimize resource requests

---

## 🎯 Architecture Decisions

### **Why Microservices?**
- **Scalability:** Scale services independently
- **Resilience:** Failure isolation
- **Technology flexibility:** Different tech per service
- **Team autonomy:** Independent development

### **Why Kubernetes?**
- **Orchestration:** Auto-scaling, self-healing
- **Service discovery:** Built-in DNS
- **Load balancing:** ClusterIP services
- **Rolling updates:** Zero-downtime deployments

### **Why Istio? (Planned)**
- **Traffic management:** Advanced routing
- **Security:** mTLS, RBAC
- **Observability:** Distributed tracing
- **Replace API Gateway:** Eliminate single point of failure

---

## 📞 Support & Resources

- **Azure Portal:** https://portal.azure.com
- **ACR:** eteliosacr-hvawabdbgge7e0fu.azurecr.io
- **Key Vault:** etelios-keyvault.vault.azure.net
- **AKS Cluster:** Etelios-AKS (Resource Group: Etelios-AKS-RG)

---

**End of Codebase Overview**

