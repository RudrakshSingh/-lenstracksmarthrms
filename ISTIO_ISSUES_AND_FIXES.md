# Istio Installation Issues & Fixes

**Date:** December 30, 2025  
**Cluster:** Etelios-AKS (Azure Kubernetes Service)  
**Status:** ⚠️ Installation Blocked - Requires Infrastructure Action

---

## 🚨 Critical Issues

### **Issue 1: Insufficient CPU Resources**
**Severity:** 🔴 CRITICAL  
**Status:** ⏳ BLOCKED - Requires AKS Node Scaling

**Problem:**
```
0/1 nodes are available: 1 Insufficient cpu.
Pod: istiod-default-5c6d84f78b-n2pvj
Requested: 100m CPU, 256Mi memory
```

**Root Cause:**
- AKS cluster has only 1 node with limited CPU
- Even with minimal Istio profile, istiod requires 100m CPU
- Node is already running 19+ microservices

**Solution Options:**

**Option A: Scale AKS Nodes (Recommended)**
```bash
az aks scale \
  --resource-group Etelios-AKS-RG \
  --name Etelios-AKS \
  --node-count 3
```

**Option B: Upgrade Node SKU**
```bash
az aks nodepool update \
  --resource-group Etelios-AKS-RG \
  --cluster-name Etelios-AKS \
  --name <nodepool-name> \
  --node-vm-size Standard_D4s_v3
```

**Option C: Further Reduce Istio Resources (Not Recommended)**
```yaml
# k8s/install-istio-ultra-minimal.yaml
spec:
  profile: minimal
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 50m      # ← Reduced from 100m (may be unstable)
            memory: 128Mi
```

**Impact if Not Fixed:**
- Istio cannot be installed
- No service mesh features (mTLS, traffic management, observability)
- Must continue using API Gateway

---

### **Issue 2: Webhook Certificate Mismatch**
**Severity:** 🔴 CRITICAL  
**Status:** ✅ PARTIALLY FIXED

**Problem:**
```
Error creating: Internal error occurred: failed calling webhook 
"rev.namespace.sidecar-injector.istio.io": failed to call webhook: 
Post "https://istiod.istio-system.svc:443/inject?timeout=10s": 
x509: certificate is valid for:
  - istio-pilot.istio-system.svc
  - istiod-remote.istio-system.svc
  - istiod.istio-system.svc
NOT:
  - istiod-default.istio-system.svc
```

**Root Cause:**
- Istio installation creates service named `istiod-default`
- Certificate only includes `istiod` (without `-default` suffix)
- Webhook configuration points to `istiod-default`

**Applied Fix:**
1. Created service alias `istiod` pointing to same pods
2. Patched webhook to use `istiod` instead of `istiod-default`

```bash
# Service alias created
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: istiod
  namespace: istio-system
spec:
  selector:
    app: istiod
    istio.io/rev: default
  ports:
    - port: 15010
      name: grpc-xds
    - port: 15012
      name: https-dns
    - port: 443
      name: https-webhook
    - port: 15014
      name: https-monitoring
EOF

# Webhook patched
kubectl patch mutatingwebhookconfiguration istio-sidecar-injector-default \
  --type='json' \
  -p='[{"op": "replace", "path": "/webhooks/0/clientConfig/service/name", "value": "istiod"}]'
```

**Status:** Should work once CPU issue is resolved

---

### **Issue 3: Namespace Label Configuration**
**Severity:** 🟡 MEDIUM  
**Status:** ✅ FIXED

**Problem:**
Webhook requires specific label combination:
- `istio.io/rev=default` (MUST exist)
- `istio-injection` (MUST NOT exist)

**Fix Applied:**
```bash
# Correct labels
kubectl label namespace etelios-backend-prod istio.io/rev=default --overwrite
kubectl label namespace etelios-backend-dev istio.io/rev=default --overwrite

# Remove conflicting label
kubectl label namespace etelios-backend-prod istio-injection-
kubectl label namespace etelios-backend-dev istio-injection-
```

**Verification:**
```bash
kubectl get namespace etelios-backend-prod -o yaml | grep labels
# Should show: istio.io/rev: default
# Should NOT show: istio-injection
```

---

## 📋 Installation Attempts Log

### Attempt 1: Default Profile
```bash
istioctl install --set profile=default -y
```
**Result:** ❌ Failed - Insufficient CPU (500m requested)

### Attempt 2: Minimal Profile
```bash
istioctl install --set profile=minimal --set values.defaultRevision=default -y
```
**Result:** ❌ Failed - Insufficient CPU (200m requested)

### Attempt 3: Custom Low Resources
```bash
istioctl install -f k8s/install-istio-low-resources.yaml -y
```
**Result:** ❌ Failed - Insufficient CPU (100m requested)

### Attempt 4: No-Wait Installation
```bash
istioctl install --set profile=minimal --skip-confirmation --set values.pilot.resources.requests.cpu=100m
```
**Result:** ⏳ Installed but pods pending (CPU constraint)

---

## 🔍 Current Cluster State

### Istio Components
```bash
kubectl get pods -n istio-system
```
```
NAME                              READY   STATUS    RESTARTS   AGE
istiod-default-5c6d84f78b-n2pvj   0/1     Pending   0          20m
```

### Istio CRDs
```bash
kubectl get crd | grep istio | wc -l
```
**Result:** 27 CRDs installed ✅

### Services
```bash
kubectl get svc -n istio-system
```
```
NAME             TYPE        CLUSTER-IP     PORT(S)
istiod-default   ClusterIP   10.0.192.194   15010,15012,443,15014
istiod           ClusterIP   10.0.44.115    15010,15012,443,15014  ← Alias
```

---

## 🎯 Recommended Action Plan

### **Immediate (Infrastructure Team)**
1. **Scale AKS cluster to 3 nodes**
   ```bash
   az aks scale \
     --resource-group Etelios-AKS-RG \
     --name Etelios-AKS \
     --node-count 3
   ```

2. **Verify node capacity**
   ```bash
   kubectl describe nodes | grep -A 5 "Allocated resources"
   ```

3. **Restart Istio installation**
   ```bash
   kubectl delete pods -n istio-system --all
   # Pods will auto-recreate and should schedule successfully
   ```

### **After Scaling (DevOps Team)**
1. **Verify Istio is running**
   ```bash
   kubectl get pods -n istio-system
   # All pods should be Running
   ```

2. **Enable sidecar injection**
   ```bash
   kubectl label namespace etelios-backend-prod istio.io/rev=default --overwrite
   kubectl label namespace etelios-backend-dev istio.io/rev=default --overwrite
   ```

3. **Deploy services with Istio**
   ```bash
   ./k8s/deploy-istio.sh
   ```

4. **Verify sidecar injection**
   ```bash
   kubectl get pods -n etelios-backend-prod -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].name}{"\n"}{end}'
   # Should show: <service-name>  <service-name> istio-proxy
   ```

5. **Apply Istio configurations**
   ```bash
   kubectl apply -f k8s/istio/peer-authentication.yaml
   kubectl apply -f k8s/istio/destination-rules.yaml
   kubectl apply -f k8s/istio/virtual-services.yaml
   kubectl apply -f k8s/istio/gateway.yaml
   ```

---

## 📊 Resource Requirements

### Minimum Cluster Requirements for Istio
| Component | CPU Request | Memory Request | Replicas |
|-----------|-------------|----------------|----------|
| istiod | 100m | 256Mi | 1 |
| istio-ingressgateway | 50m | 128Mi | 1 |
| **Total** | **150m** | **384Mi** | **2 pods** |

### Current Microservices Load
| Services | CPU Request | Memory Request |
|----------|-------------|----------------|
| 20 microservices | ~1000m (50m each) | ~2560Mi (128Mi each) |
| API Gateway | 100m | 256Mi |
| **Total** | **~1100m** | **~2816Mi** |

### **Total Cluster Requirement**
- **CPU:** ~1250m (1.25 cores minimum)
- **Memory:** ~3200Mi (3.2 GB minimum)
- **Recommended:** 3 nodes with 2 cores each = 6 cores total

---

## 🔧 Alternative: Deploy Without Istio

If Istio cannot be installed immediately, services can run without it:

```bash
# Deploy services without Istio
./k8s/deploy-without-istio.sh

# Or manually
kubectl apply -f k8s/deployments/
```

**Note:** Without Istio, you'll need to:
- Keep API Gateway for routing
- Use Kubernetes Ingress for external access
- Implement circuit breaking in application code
- No automatic mTLS between services
- Limited observability

---

## 📞 Contacts & Resources

- **AKS Cluster:** Etelios-AKS
- **Resource Group:** Etelios-AKS-RG
- **Subscription:** Azure subscription 1
- **Istio Version:** 1.28.2
- **Profile Used:** minimal

**Documentation:**
- `/k8s/ISTIO_DEPLOYMENT_GUIDE.md` - Full deployment guide
- `/k8s/install-istio.sh` - Installation script
- `/k8s/validate-istio.sh` - Validation script

---

**Last Updated:** December 30, 2025  
**Next Review:** After AKS scaling

