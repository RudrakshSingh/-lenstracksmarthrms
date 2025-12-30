# Exact Configuration Guide for Etelios HRMS Codebase

## 📋 Table of Contents
1. [Infrastructure Requirements](#infrastructure-requirements)
2. [Kubernetes Cluster Configuration](#kubernetes-cluster-configuration)
3. [Service Configuration](#service-configuration)
4. [Database Configuration](#database-configuration)
5. [Secrets & Environment Variables](#secrets--environment-variables)
6. [Network & Ingress Configuration](#network--ingress-configuration)
7. [Resource Requirements](#resource-requirements)
8. [Deployment Strategy](#deployment-strategy)

---

## 🏗️ Infrastructure Requirements

### Minimum Kubernetes Cluster
```yaml
Cluster Type: Azure Kubernetes Service (AKS)
Node Pool: Standard_D2s_v3 (2 vCPU, 8GB RAM) minimum
Node Count: 2 nodes minimum (for high availability)
Kubernetes Version: 1.28+ (recommended)
```

### Recommended Production Setup
```yaml
Node Pool 1 (System):
  - Size: Standard_D2s_v3
  - Count: 2 nodes
  - Purpose: System pods, ingress, monitoring

Node Pool 2 (Application):
  - Size: Standard_D4s_v3 (4 vCPU, 16GB RAM)
  - Count: 3-5 nodes
  - Purpose: Application microservices
  - Auto-scaling: Enabled (min: 3, max: 10)
```

---

## ☸️ Kubernetes Cluster Configuration

### 1. Namespaces
```bash
# Create namespaces
kubectl create namespace etelios-backend-prod
kubectl create namespace etelios-backend-dev
kubectl create namespace istio-system  # If using Istio
```

### 2. Required Add-ons
```yaml
Required:
  - NGINX Ingress Controller
  - Azure Container Registry (ACR) integration
  - Azure Key Vault integration (for secrets)
  - Metrics Server (for HPA)

Optional (Recommended):
  - Istio Service Mesh
  - Prometheus + Grafana
  - Cert-Manager (for SSL certificates)
```

---

## 🔧 Service Configuration

### Current Active Services (3)
```yaml
1. auth-service
   - Port: 3001
   - Replicas: 1-3 (currently 1 for resource optimization)
   - Resources:
     - Requests: CPU 50m, Memory 128Mi
     - Limits: CPU 100m, Memory 256Mi

2. hr-service
   - Port: 3002
   - Replicas: 1-3 (currently 1 for resource optimization)
   - Resources:
     - Requests: CPU 50m, Memory 128Mi
     - Limits: CPU 100m, Memory 256Mi

3. attendance-service
   - Port: 3003
   - Replicas: 1-3 (currently 1 for resource optimization)
   - Resources:
     - Requests: CPU 50m, Memory 128Mi
     - Limits: CPU 100m, Memory 256Mi
```

### Recommended Production Configuration
```yaml
Replicas per Service: 2-3 (for high availability)
Resource Requests:
  - CPU: 100m per service
  - Memory: 256Mi per service
Resource Limits:
  - CPU: 500m per service
  - Memory: 512Mi per service

Total Cluster Resources Needed:
  - CPU: ~1.5 cores (3 services × 500m)
  - Memory: ~1.5GB (3 services × 512Mi)
  - Plus overhead: ~500m CPU, ~1GB Memory
  - Total: ~2 cores, ~2.5GB minimum
```

---

## 🗄️ Database Configuration

### Azure Cosmos DB (MongoDB API)
```yaml
Database Type: Azure Cosmos DB for MongoDB
Connection Mode: Connection String
SSL: Required (true)

Database Names:
  - auth-service: etelios_auth
  - hr-service: etelios_hr
  - attendance-service: etelios_attendance

Connection String Format:
  mongodb://[username]:[password]@[host]:[port]/[DATABASE_NAME]?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@[account-name]@

Important:
  - Database name MUST be in connection string (before ?)
  - retrywrites=true is required for Cosmos DB
  - maxIdleTimeMS should be set to prevent connection timeouts
```

### Redis (Optional - for caching)
```yaml
Redis Host: redis-service (if deployed in cluster)
Redis Port: 6379
Redis TLS: false (for internal cluster communication)
Redis Disabled: false
```

---

## 🔐 Secrets & Environment Variables

### Required Kubernetes Secrets
```yaml
Secret Name: etelios-secrets-prod
Namespace: etelios-backend-prod

Required Keys:
  - AUTH_SERVICE_DB_URI: MongoDB connection string for auth service
  - HR_SERVICE_DB_URI: MongoDB connection string for HR service
  - ATTENDANCE_SERVICE_DB_URI: MongoDB connection string for attendance service
  - JWT_SECRET: 64-character JWT secret key
  - JWT_REFRESH_SECRET: 64-character JWT refresh secret key
  - REDIS_URL: Redis connection string (if using)
  - CLOUDINARY_API_KEY: Cloudinary API key (for file uploads)
  - CLOUDINARY_API_SECRET: Cloudinary API secret
  - CLOUDINARY_CLOUD_NAME: Cloudinary cloud name
```

### ConfigMap Configuration
```yaml
ConfigMap Name: etelios-config-prod
Namespace: etelios-backend-prod

Required Variables:
  NODE_ENV: "production"
  K8S_ENV: "true"
  CORS_ORIGIN: "*"  # Or specific origins: "https://frontend.com,http://localhost:3000"
  USE_KEY_VAULT: "true"
  AZURE_KEY_VAULT_URL: "https://etelios-keyvault.vault.azure.net/"
  AZURE_KEY_VAULT_NAME: "etelios-keyvault"
  LOG_LEVEL: "info"
  
Service URLs (Internal Kubernetes DNS):
  AUTH_SERVICE_URL: "http://auth-service:3001"
  HR_SERVICE_URL: "http://hr-service:3002"
  ATTENDANCE_SERVICE_URL: "http://attendance-service:3003"
  
Redis Configuration:
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  REDIS_TLS: "0"
  REDIS_DISABLED: "0"
```

### Per-Service Environment Variables
```yaml
auth-service:
  - PORT: "3001"
  - SERVICE_NAME: "auth-service"
  - MONGODB_URI: (from secret)
  - DB_NAME: "auth_db"

hr-service:
  - PORT: "3002"
  - SERVICE_NAME: "hr-service"
  - MONGO_URI: (from secret)
  - MONGODB_URI: (from secret)
  - DB_NAME: "hr-database"

attendance-service:
  - PORT: "3003"
  - SERVICE_NAME: "attendance-service"
  - MONGODB_URI: (from secret)
  - DB_NAME: "attendance_db"
```

---

## 🌐 Network & Ingress Configuration

### Ingress Controller
```yaml
Type: NGINX Ingress Controller
External IP: 98.70.245.87 (current)
Host: api.etelios.com (for production)

Required Annotations:
  - kubernetes.io/ingress.class: nginx
  - nginx.ingress.kubernetes.io/ssl-redirect: "true"
  - cert-manager.io/cluster-issuer: "letsencrypt-prod"
  - nginx.ingress.kubernetes.io/proxy-body-size: "10m"
  - nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
```

### Ingress Routes
```yaml
Routes:
  - /api/auth → auth-service:3001
  - /api/hr → hr-service:3002
  - /api/attendance → attendance-service:3003
  - /api/documents → hr-service:3002
  - /api/geofencing → attendance-service:3003
```

### Service Types
```yaml
All Services: ClusterIP (internal only)
External Access: Via Ingress Controller
Load Balancer: Not needed (using Ingress)
```

---

## 💾 Resource Requirements

### Minimum Cluster Resources
```yaml
For 3 Services (Current Setup):
  Total CPU Request: 150m (3 × 50m)
  Total CPU Limit: 300m (3 × 100m)
  Total Memory Request: 384Mi (3 × 128Mi)
  Total Memory Limit: 768Mi (3 × 256Mi)
  
Plus System Overhead:
  - Ingress Controller: ~100m CPU, 128Mi Memory
  - System Pods: ~200m CPU, 256Mi Memory
  
Total Minimum:
  - CPU: ~450m (0.45 cores)
  - Memory: ~768Mi (~0.75GB)
  
Recommended:
  - CPU: 2 cores
  - Memory: 4GB
```

### Production Resource Requirements
```yaml
For 3 Services with 2 replicas each:
  Total CPU Request: 600m (6 × 100m)
  Total CPU Limit: 3000m (6 × 500m)
  Total Memory Request: 1536Mi (6 × 256Mi)
  Total Memory Limit: 3072Mi (6 × 512Mi)
  
Plus System Overhead:
  - Ingress: 200m CPU, 256Mi Memory
  - Monitoring: 200m CPU, 512Mi Memory
  - System: 500m CPU, 1GB Memory
  
Total Production:
  - CPU: ~4 cores
  - Memory: ~5GB
```

---

## 🚀 Deployment Strategy

### 1. Azure Container Registry (ACR)
```yaml
Registry Name: eteliosacr-hvawabdbgge7e0fu.azurecr.io
Authentication: Admin credentials or Service Principal
Image Tag Strategy: latest (or Build.BuildId for versioning)
```

### 2. Build & Deploy Pipeline
```yaml
Pipeline: Azure DevOps
Trigger: Push to main branch
Build Strategy: Parallel builds (4 groups)
Build Time: ~10-15 minutes per service
Deploy Time: ~2-3 minutes per service

Build Steps:
  1. Login to ACR
  2. Build Docker image (platform: linux/amd64)
  3. Push to ACR
  4. Update Kubernetes deployment
  5. Wait for rollout
```

### 3. Deployment Configuration
```yaml
Deployment Strategy: Rolling Update
Max Surge: 1
Max Unavailable: 0 (zero-downtime)

Health Checks:
  - Liveness Probe: /health (every 10-20s)
  - Readiness Probe: /health or /ready (every 5-10s)
  - Initial Delay: 15-30s
  - Timeout: 5s
  - Failure Threshold: 3
```

---

## ✅ Exact Configuration Checklist

### Pre-Deployment
- [ ] AKS cluster created with 2+ nodes
- [ ] ACR registry created and accessible
- [ ] Azure Key Vault created with secrets
- [ ] Cosmos DB created with 3 databases
- [ ] NGINX Ingress Controller installed
- [ ] Namespaces created (etelios-backend-prod)

### Secrets Setup
- [ ] `etelios-secrets-prod` ConfigMap created
- [ ] Database connection strings in secrets
- [ ] JWT secrets configured
- [ ] Cloudinary credentials (if using file uploads)

### Service Deployment
- [ ] auth-service deployment created
- [ ] hr-service deployment created
- [ ] attendance-service deployment created
- [ ] All services have ClusterIP services
- [ ] Ingress routes configured

### Verification
- [ ] All pods running (kubectl get pods)
- [ ] All services healthy (kubectl get svc)
- [ ] Ingress accessible (curl with Host header)
- [ ] Health endpoints responding
- [ ] Database connections working

---

## 🔧 Current Working Configuration

### Active Services
```yaml
Services Running: 3
  - auth-service: 1 pod (4h+ old)
  - hr-service: 1 pod (4h+ old)
  - attendance-service: 1 pod (10h+ old)

Resource Usage:
  - CPU: ~150m total
  - Memory: ~384Mi total
  - Status: Optimized for minimal resources
```

### External Access
```yaml
IP: 98.70.245.87
Host: api.etelios.com
Protocol: HTTPS (with SSL certificate)
Port: 443 (HTTPS), 80 (HTTP redirects to HTTPS)
```

### Database
```yaml
Type: Azure Cosmos DB (MongoDB API)
Connection: Via Azure Key Vault secrets
Status: Connected and working
```

---

## 📝 Configuration Files Location

```bash
Kubernetes Manifests:
  - k8s/prod/auth-service.yaml
  - k8s/prod/hr-service.yaml
  - k8s/prod/attendance-service.yaml
  - k8s/prod/configmap.yaml
  - k8s/ingress.yaml

Environment Configuration:
  - microservices/env.example (template)
  - k8s/prod/configmap.yaml (production values)

Pipeline Configuration:
  - azure-pipelines.yml
  - azure-pipelines-aks.yml
```

---

## 🎯 Recommended Production Setup

### For 100% Reliability
```yaml
1. Increase Replicas:
   - Each service: 2-3 replicas
   - Total pods: 6-9

2. Increase Resources:
   - CPU: 200m request, 500m limit per pod
   - Memory: 256Mi request, 512Mi limit per pod

3. Enable Auto-scaling:
   - HPA: Min 2, Max 5 replicas per service
   - Scale on CPU > 70% or Memory > 80%

4. Add Monitoring:
   - Prometheus for metrics
   - Grafana for dashboards
   - Alerting for failures

5. Add Backup:
   - Database backups (Cosmos DB automatic)
   - Configuration backups
   - Disaster recovery plan
```

---

## ⚠️ Important Notes

1. **Image Platform**: Always build for `linux/amd64` (not ARM64)
2. **Database Name**: Must be in connection string (before `?`)
3. **CORS**: Set to `*` for development, specific origins for production
4. **Secrets**: Never commit to Git, use Azure Key Vault
5. **Resource Limits**: Set appropriately to prevent OOM kills
6. **Health Checks**: Configure properly for zero-downtime deployments
7. **Ingress Host**: Frontend must send `Host: api.etelios.com` header

---

## 🚨 Common Issues & Solutions

### Issue 1: ImagePullBackOff
```yaml
Solution:
  - Check ACR authentication
  - Verify image exists in registry
  - Check imagePullPolicy (should be Always)
  - Verify ACR credentials in Kubernetes secrets
```

### Issue 2: Insufficient CPU/Memory
```yaml
Solution:
  - Scale down unused services
  - Increase node pool size
  - Reduce resource requests/limits
  - Add more nodes to cluster
```

### Issue 3: Database Connection Errors
```yaml
Solution:
  - Verify connection string format
  - Check database name in connection string
  - Verify Azure Key Vault secrets
  - Check network connectivity
```

### Issue 4: 500 Errors from Validation
```yaml
Solution:
  - Accept both uppercase and lowercase status
  - Increase limit max to 1000
  - Return 400 instead of 500 for validation errors
  - Normalize input before validation
```

---

## 📞 Support

For issues:
1. Check pod logs: `kubectl logs -n etelios-backend-prod -l app=<service-name>`
2. Check pod status: `kubectl get pods -n etelios-backend-prod`
3. Check service endpoints: `kubectl get svc -n etelios-backend-prod`
4. Check ingress: `kubectl describe ingress -n etelios-backend-prod`

---

**Last Updated**: 2025-12-30
**Configuration Version**: 1.0
**Status**: Production Ready ✅

