# Azure AKS Deployment Flow - Complete Guide

## 🚀 What Happens When You Push Code to Azure

### Step-by-Step Deployment Process

---

## 1️⃣ **Code Push Triggers Pipeline**

When you push code to the `main` or `develop` branch:

```bash
git push origin main
```

**Azure DevOps Pipeline** (`azure-pipelines-aks.yml`) automatically triggers.

---

## 2️⃣ **Build Stage: Docker Images**

### What Happens:
1. **Login to Azure Container Registry (ACR)**
   - ACR Name: `eteliosacr.azurecr.io`
   - Pipeline authenticates using service connection

2. **Build Docker Images**
   - API Gateway: `eteliosacr.azurecr.io/api-gateway:latest`
   - All 19 microservices: `eteliosacr.azurecr.io/{service-name}:latest`
   - Each image tagged with Build ID and `latest`

3. **Push to ACR**
   - All images stored in Azure Container Registry
   - Images are ready for Kubernetes to pull

**Example:**
```bash
# Pipeline builds:
docker build -t eteliosacr.azurecr.io/auth-service:123 -t eteliosacr.azurecr.io/auth-service:latest
docker push eteliosacr.azurecr.io/auth-service:123
docker push eteliosacr.azurecr.io/auth-service:latest
```

---

## 3️⃣ **Deploy Stage: Kubernetes Deployment**

### A. Configure kubectl
```bash
az aks get-credentials --resource-group Etelios-AKS-RG --name Etelios-AKS
```
- Connects pipeline to your AKS cluster
- Sets up kubectl authentication

### B. Generate Kubernetes Manifests
```bash
./k8s/generate-manifests.sh
```
- Creates deployment YAML files for all services
- Uses:
  - ACR: `eteliosacr.azurecr.io`
  - Namespace: `etelios-backend-prod`
  - Image tag: Latest build ID

### C. Apply Kubernetes Resources (in order)

#### 1. **Create Namespace**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: etelios-backend-prod
```
- Creates isolated namespace in AKS

#### 2. **Apply ConfigMap**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: etelios-config
  namespace: etelios-backend-prod
data:
  NODE_ENV: "production"
  CORS_ORIGIN: "*"
  AUTH_SERVICE_URL: "http://auth-service:3001"
  HR_SERVICE_URL: "http://hr-service:3002"
  # ... all service URLs
```
- **Sets environment variables** for all pods
- **Service URLs use Kubernetes service names** (not App Service URLs)
- All pods can access these via `envFrom`

#### 3. **Apply Secrets**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: etelios-secrets
  namespace: etelios-backend-prod
data:
  jwt-secret: <base64-encoded>
  mongo-uri-auth: <base64-encoded>
  # ... all secrets
```
- Stores sensitive data (JWT secrets, DB connections, etc.)
- Must be created manually before first deployment

#### 4. **Deploy API Gateway**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: etelios-backend-prod
spec:
  replicas: 2
  containers:
  - image: eteliosacr.azurecr.io/api-gateway:latest
    env:
    - name: K8S_ENV
      value: "true"  # ← This triggers Kubernetes mode!
    envFrom:
    - configMapRef:
        name: etelios-config
    - secretRef:
        name: etelios-secrets
```
- Creates 2 replicas of API Gateway
- **K8S_ENV=true** tells code to use Kubernetes service names

#### 5. **Deploy All Microservices**
- Same pattern for all 19 services
- Each service gets:
  - 2 replicas (for high availability)
  - Kubernetes service name (e.g., `auth-service`)
  - Environment variables from ConfigMap
  - Secrets from Secret

#### 6. **Apply Ingress**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: etelios-ingress
  namespace: etelios-backend-prod
spec:
  rules:
  - host: api.etelios.com
    http:
      paths:
      - path: /api/auth(/|$)(.*)
        backend:
          service:
            name: auth-service
            port: 3001
```
- Exposes services to internet
- Routes traffic based on URL paths
- Uses NGINX Ingress Controller

---

## 4️⃣ **How Services Communicate in AKS**

### Environment Detection

When a pod starts, it checks:
```javascript
const isKubernetes = process.env.KUBERNETES_SERVICE_HOST || process.env.K8S_ENV === 'true';
```

Since `K8S_ENV=true` is set in deployment, code uses **Kubernetes service names**.

### Service Discovery

**In Kubernetes, services are discoverable by name:**

```javascript
// API Gateway wants to call Auth Service
// Code detects K8S_ENV=true
// Uses: http://auth-service:3001

// From services.config.js:
getServiceUrl('auth') 
// Returns: http://auth-service:3001 (not localhost!)
```

### Network Flow

```
Internet Request
    ↓
NGINX Ingress (Load Balancer IP)
    ↓
api-gateway Service (ClusterIP)
    ↓
api-gateway Pod (K8S_ENV=true)
    ↓
Makes request to: http://auth-service:3001
    ↓
auth-service Service (ClusterIP)
    ↓
auth-service Pod
```

**Key Points:**
- Services use **internal DNS names** (e.g., `auth-service`)
- Kubernetes DNS resolves `auth-service` to ClusterIP
- Traffic stays **inside the cluster** (secure, fast)
- No external URLs needed

---

## 5️⃣ **Configuration Flow**

### Environment Variables in Pods

Each pod receives:

**From ConfigMap:**
```bash
NODE_ENV=production
CORS_ORIGIN=*
AUTH_SERVICE_URL=http://auth-service:3001
HR_SERVICE_URL=http://hr-service:3002
# ... all service URLs
```

**From Deployment:**
```bash
K8S_ENV=true  # ← Critical! Tells code it's in Kubernetes
PORT=3001
SERVICE_NAME=auth-service
```

**From Secrets:**
```bash
JWT_SECRET=<from-secret>
MONGO_URI_AUTH=<from-secret>
# ... all secrets
```

### How Code Uses This

```javascript
// In services.config.js
function getServiceUrl(serviceName, port) {
  const isKubernetes = process.env.KUBERNETES_SERVICE_HOST || process.env.K8S_ENV === 'true';
  
  if (isKubernetes) {
    return `http://${serviceName}:${port}`;  // ← Uses service name
  }
  
  return `http://localhost:${port}`;  // ← Only for local dev
}

// Since K8S_ENV=true, always returns: http://auth-service:3001
```

---

## 6️⃣ **Service URLs in Production**

### ConfigMap Sets All URLs:
```yaml
AUTH_SERVICE_URL: "http://auth-service:3001"
HR_SERVICE_URL: "http://hr-service:3002"
ATTENDANCE_SERVICE_URL: "http://attendance-service:3003"
# ... etc
```

### Code Priority:
1. **Environment Variable** (from ConfigMap) - `AUTH_SERVICE_URL`
2. **Kubernetes Detection** - If `K8S_ENV=true`, use service name
3. **Default** - localhost (only if not in K8s)

**Result:** All services use Kubernetes service names automatically!

---

## 7️⃣ **What Gets Deployed**

### Services Deployed:
1. api-gateway (2 replicas)
2. auth-service (2 replicas)
3. hr-service (2 replicas)
4. attendance-service (2 replicas)
5. payroll-service (2 replicas)
6. crm-service (2 replicas)
7. inventory-service (2 replicas)
8. sales-service (2 replicas)
9. purchase-service (2 replicas)
10. financial-service (2 replicas)
11. document-service (2 replicas)
12. service-management (2 replicas)
13. cpp-service (2 replicas)
14. prescription-service (2 replicas)
15. analytics-service (2 replicas)
16. notification-service (2 replicas)
17. monitoring-service (2 replicas)
18. tenant-registry-service (2 replicas)
19. realtime-service (2 replicas)

**Total: 19 services × 2 replicas = 38 pods**

---

## 8️⃣ **Verification After Deployment**

Pipeline runs:
```bash
kubectl wait --for=condition=available --timeout=300s deployment --all -n etelios-backend-prod
kubectl get deployments -n etelios-backend-prod
kubectl get services -n etelios-backend-prod
kubectl get ingress -n etelios-backend-prod
```

**Check deployment status:**
```bash
# Get all pods
kubectl get pods -n etelios-backend-prod

# Check service health
kubectl get services -n etelios-backend-prod

# View logs
kubectl logs -f deployment/api-gateway -n etelios-backend-prod
```

---

## 9️⃣ **Key Differences: Local vs Azure**

| Aspect | Local Development | Azure AKS |
|--------|------------------|-----------|
| **K8S_ENV** | Not set | `true` |
| **Service URLs** | `http://localhost:PORT` | `http://service-name:PORT` |
| **Service Discovery** | Hardcoded localhost | Kubernetes DNS |
| **Replicas** | 1 instance | 2+ replicas per service |
| **Load Balancing** | None | Kubernetes Service |
| **Scaling** | Manual | Automatic (HPA) |
| **Networking** | Direct | ClusterIP + Ingress |

---

## 🔟 **Summary: What Happens Automatically**

1. ✅ **Code pushed** → Pipeline triggers
2. ✅ **Docker images built** → Pushed to ACR
3. ✅ **Kubernetes manifests generated** → Using AKS config
4. ✅ **Namespace created** → `etelios-backend-prod`
5. ✅ **ConfigMap applied** → Service URLs set to K8s names
6. ✅ **Secrets applied** → Sensitive data injected
7. ✅ **All services deployed** → 38 pods total
8. ✅ **Ingress configured** → External access enabled
9. ✅ **Services communicate** → Using K8s service names
10. ✅ **Health checks** → Automatic monitoring

---

## 🎯 **Important Points**

### ✅ What Works Automatically:
- Service discovery via Kubernetes DNS
- Load balancing across replicas
- Health checks and auto-restart
- Rolling updates (zero downtime)
- Resource limits and requests

### ⚠️ What You Must Do First:
1. **Create Secrets** - Run `./k8s/setup-secrets.sh` or manually create `k8s/secrets.yaml`
2. **Configure ACR** - Ensure ACR exists and pipeline has access
3. **Setup AKS** - Run `./k8s/setup-aks.sh` if cluster doesn't exist
4. **Configure Ingress** - Set up DNS for `api.etelios.com`

### 🔒 Security:
- All inter-service communication is **internal** (ClusterIP)
- Only Ingress is exposed to internet
- Secrets are encrypted at rest
- Pods run as non-root users

---

## 📝 **Manual Deployment (Alternative)**

If you want to deploy manually:

```bash
# 1. Get AKS credentials
az aks get-credentials --resource-group Etelios-AKS-RG --name Etelios-AKS

# 2. Build and push images
./k8s/build-and-push.sh all latest

# 3. Deploy everything
./k8s/deploy.sh production all
```

---

## 🚨 **Troubleshooting**

### Check if services are running:
```bash
kubectl get pods -n etelios-backend-prod
```

### View service logs:
```bash
kubectl logs -f deployment/auth-service -n etelios-backend-prod
```

### Check service URLs:
```bash
kubectl exec -it deployment/api-gateway -n etelios-backend-prod -- env | grep SERVICE_URL
```

### Test service communication:
```bash
kubectl exec -it deployment/api-gateway -n etelios-backend-prod -- curl http://auth-service:3001/health
```

---

**Everything is configured and ready! Just push your code and the pipeline will handle the rest! 🚀**

