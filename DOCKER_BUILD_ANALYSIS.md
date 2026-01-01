# Docker Build Context Analysis

## Current Project Structure

### Repository Root
```
/Users/rudrakshsingh/Desktop/lenstracksmarthrms/
```

### Services Directory
```
microservices/
├── shared/                    # Shared utilities (available to all services)
│   ├── config/               # 9 files
│   ├── middleware/           # 10 files
│   ├── services/             # Kafka service
│   └── utils/                # 14 files
├── api-gateway/              # API Gateway service
├── auth-service/             # Authentication service
├── hr-service/               # HR Management service
├── attendance-service/       # Attendance tracking service
├── analytics-service/        # Analytics service
├── cpp-service/              # C++ service
├── crm-service/              # CRM service
├── document-service/         # Document management service
├── financial-service/        # Financial service
├── inventory-service/        # Inventory management service
├── monitoring-service/       # Monitoring service
├── notification-service/     # Notification service
├── payroll-service/          # Payroll service
├── prescription-service/     # Prescription service
├── purchase-service/         # Purchase service
├── realtime-service/         # Real-time service
├── sales-service/            # Sales service
├── service-management/       # Service management
├── tenant-registry-service/  # Tenant registry service
└── tenant-management-service/ # Tenant management service
```

### Services with Dockerfiles Found:
1. `microservices/analytics-service/Dockerfile`
2. `microservices/attendance-service/Dockerfile`
3. `microservices/auth-service/Dockerfile`
4. `microservices/cpp-service/Dockerfile`
5. `microservices/crm-service/Dockerfile`
6. `microservices/document-service/Dockerfile`
7. `microservices/financial-service/Dockerfile`
8. `microservices/hr-service/Dockerfile` ✅
9. `microservices/inventory-service/Dockerfile`
10. `microservices/monitoring-service/Dockerfile`
11. `microservices/notification-service/Dockerfile`
12. `microservices/payroll-service/Dockerfile`
13. `microservices/prescription-service/Dockerfile`
14. `microservices/purchase-service/Dockerfile`
15. `microservices/realtime-service/Dockerfile`
16. `microservices/sales-service/Dockerfile`
17. `microservices/service-management/Dockerfile`
18. `microservices/tenant-management-service/Dockerfile`
19. `microservices/tenant-registry-service/Dockerfile`

**Total: 19 services with Dockerfiles**

## Current Build Context Issues

### Azure DevOps Pipeline Analysis

**File:** `azure-pipelines.yml`

#### Build Context Problems:

1. **API Gateway** (Lines 79-84):
   ```bash
   docker build -f Dockerfile -t $ACR_LOGIN_SERVER/api-gateway:$IMAGE_TAG .
   # Context: Repository root (.) ✅ CORRECT
   ```

2. **HR Service** (Lines 164-169):
   ```bash
   if [ "$SERVICE" = "hr-service" ]; then
     docker build -f microservices/$SERVICE/Dockerfile .
     # Context: Repository root (.) ✅ CORRECT
   ```

3. **All Other Services** (Lines 172-177):
   ```bash
   else
     docker build -f microservices/$SERVICE/Dockerfile microservices/$SERVICE/
     # Context: Service directory ❌ WRONG
   ```

### Dockerfile COPY Statement Issues

#### Services with Problematic COPY Statements:

1. **hr-service/Dockerfile** (Line 36):
   ```dockerfile
   COPY --chown=nodejs:nodejs ../shared ./shared
   ```
   - **Issue:** Uses `../shared` which assumes service directory context
   - **Current Context:** Repository root (pipeline override)
   - **Status:** Works due to pipeline override, but inconsistent

#### Services Missing Shared Directory Access:

**All other services** are missing shared directory access:
- No `COPY shared ./shared` statements
- Services cannot access shared utilities
- This is a **functional issue** - services may fail at runtime

### Current Build Context Strategy

```yaml
# Current (BROKEN) Strategy:
if [ "$SERVICE" = "hr-service" ]; then
  # Repository root context
  docker build -f microservices/hr-service/Dockerfile .
else
  # Service directory context (WRONG!)
  docker build -f microservices/$SERVICE/Dockerfile microservices/$SERVICE/
fi
```

## Required Fixes

### 1. Dockerfiles Need Updates

**For ALL services**, update Dockerfiles to use repository root context:

```dockerfile
# BEFORE (Service directory context):
COPY package*.json ./
COPY . .
COPY ../shared ./shared  # FAILS

# AFTER (Repository root context):
COPY microservices/auth-service/package*.json ./
COPY microservices/auth-service/src ./src
COPY shared ./shared  # WORKS
```

### 2. Pipeline Needs Updates

**Change ALL builds to use repository root context:**

```yaml
# FIX: All services use repository root context
docker build \
  -f microservices/$SERVICE/Dockerfile \
  .
```

### 3. Consistent Build Strategy

```yaml
# FIXED Strategy:
# ALL services use repository root context
docker build -f microservices/$SERVICE/Dockerfile .
```

## Impact Assessment

### Services Affected:
- **19 services** need Dockerfile updates
- **17 services** need shared directory access added
- **1 service** (hr-service) needs COPY path correction
- **Azure DevOps pipeline** needs build context fix

### Risk Level:
- **HIGH**: Services without shared access may fail at runtime
- **MEDIUM**: Inconsistent build contexts cause confusion
- **LOW**: Breaking changes to deployment process

## Execution Plan

1. **Phase 1**: Update all Dockerfiles for repository root context
2. **Phase 2**: Fix Azure DevOps pipeline build contexts
3. **Phase 3**: Create local build scripts
4. **Phase 4**: Update documentation and validation
5. **Phase 5**: Test all builds and deployments

## Success Criteria

- ✅ All Dockerfiles build without `"/shared": not found` errors
- ✅ Shared directory accessible in all service containers
- ✅ Azure DevOps pipeline builds all services successfully
- ✅ Local development builds work with `docker-compose`
- ✅ All services start correctly with shared utilities
- ✅ Consistent build context across all environments
