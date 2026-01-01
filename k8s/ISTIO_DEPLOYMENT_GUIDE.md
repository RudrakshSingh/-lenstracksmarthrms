# Istio Service Mesh Deployment Guide

## 📋 Overview

This guide covers the complete migration from API Gateway to Istio Service Mesh with:
- ✅ API Gateway removal
- ✅ Istio Service Mesh implementation
- ✅ mTLS between services
- ✅ Circuit breaking and retries
- ✅ Canary routing (90% prod, 10% dev)
- ✅ Traffic mirroring (prod → dev)
- ✅ Dev/Prod environment separation
- ✅ Observability (Prometheus/Grafana)

---

## 🏗️ Architecture

### **Before (With API Gateway)**
```
Client → Ingress → API Gateway → Microservice
```

### **After (With Istio)**
```
Client → Istio Gateway → VirtualService → DestinationRule → Microservice (with sidecar)
```

---

## 📦 Prerequisites

### **1. Install Istio**
```bash
# Download Istio
curl -L https://istio.io/downloadIstio | sh -
cd istio-*
export PATH=$PWD/bin:$PATH

# Install Istio
istioctl install --set values.defaultRevision=default -y

# Verify installation
kubectl get pods -n istio-system
```

### **2. Verify Kubernetes Access**
```bash
kubectl cluster-info
kubectl get nodes
```

### **3. Required Tools**
- `kubectl` (v1.24+)
- `istioctl` (v1.19+)
- `curl` (for testing)

---

## 🚀 Deployment Steps

### **Step 1: Enable Istio Injection for Namespaces**

```bash
# Apply namespace labels (enables automatic sidecar injection)
kubectl apply -f k8s/istio/namespace-labels.yaml

# Verify namespaces are labeled
kubectl get namespace etelios-backend-prod -o yaml | grep istio-injection
kubectl get namespace etelios-backend-dev -o yaml | grep istio-injection
```

**Expected Output:**
```
labels:
  istio-injection: enabled
```

---

### **Step 2: Deploy Istio Configurations**

```bash
# Deploy all Istio resources
kubectl apply -f k8s/istio/peer-authentication.yaml
kubectl apply -f k8s/istio/destination-rules.yaml
kubectl apply -f k8s/istio/virtual-services.yaml
kubectl apply -f k8s/istio/gateway.yaml
```

**Verify:**
```bash
# Check PeerAuthentication
kubectl get peerauthentication -n etelios-backend-prod
kubectl get peerauthentication -n etelios-backend-dev

# Check DestinationRules
kubectl get destinationrules -n etelios-backend-prod
kubectl get destinationrules -n etelios-backend-dev

# Check VirtualServices
kubectl get virtualservices -n etelios-backend-prod
kubectl get virtualservices -n etelios-backend-dev

# Check Gateways
kubectl get gateway -n etelios-backend-prod
kubectl get gateway -n etelios-backend-dev
```

---

### **Step 3: Remove API Gateway**

```bash
# Delete API Gateway deployment
kubectl delete deployment api-gateway -n etelios-backend-prod

# Delete API Gateway service
kubectl delete service api-gateway -n etelios-backend-prod

# Delete API Gateway HPA (if exists)
kubectl delete hpa api-gateway -n etelios-backend-prod

# Verify removal
kubectl get all -n etelios-backend-prod | grep api-gateway
# Should return nothing
```

---

### **Step 4: Deploy Services with Istio Annotations**

#### **Production Environment**
```bash
# Apply ConfigMap
kubectl apply -f k8s/prod/configmap.yaml

# Deploy services
kubectl apply -f k8s/prod/auth-service.yaml
kubectl apply -f k8s/prod/hr-service.yaml
kubectl apply -f k8s/prod/attendance-service.yaml
```

#### **Development Environment**
```bash
# Apply ConfigMap
kubectl apply -f k8s/dev/configmap.yaml

# Deploy services
kubectl apply -f k8s/dev/auth-service.yaml
kubectl apply -f k8s/dev/hr-service.yaml
kubectl apply -f k8s/dev/attendance-service.yaml
```

---

### **Step 5: Verify Sidecar Injection**

```bash
# Check pods have Istio sidecars
kubectl get pods -n etelios-backend-prod
kubectl get pods -n etelios-backend-dev

# Verify sidecar container exists
kubectl describe pod <pod-name> -n etelios-backend-prod | grep istio-proxy

# Expected: Each pod should have 2 containers:
# - <service-name> (application)
# - istio-proxy (sidecar)
```

---

### **Step 6: Wait for Deployments**

```bash
# Wait for production deployments
kubectl wait --for=condition=available --timeout=300s \
  deployment/auth-service \
  deployment/hr-service \
  deployment/attendance-service \
  -n etelios-backend-prod

# Wait for development deployments
kubectl wait --for=condition=available --timeout=300s \
  deployment/auth-service \
  deployment/hr-service \
  deployment/attendance-service \
  -n etelios-backend-dev
```

---

## 🧪 Testing & Validation

### **1. Run Automated Validation**

```bash
# Run validation script
./k8s/validate-istio.sh
```

This script checks:
- ✅ mTLS configuration
- ✅ Sidecar injection
- ✅ DestinationRules
- ✅ VirtualServices
- ✅ Gateway configuration
- ✅ Health endpoints

---

### **2. Manual Health Checks**

#### **Production Endpoints**
```bash
# Auth Service
curl -H "Host: api.etelios.com" https://api.etelios.com/api/auth/health

# HR Service
curl -H "Host: api.etelios.com" https://api.etelios.com/api/hr/health

# Attendance Service
curl -H "Host: api.etelios.com" https://api.etelios.com/api/attendance/health
```

#### **Development Endpoints**
```bash
# Auth Service
curl -H "Host: dev.api.etelios.com" https://dev.api.etelios.com/api/auth/health

# HR Service
curl -H "Host: dev.api.etelios.com" https://dev.api.etelios.com/api/hr/health

# Attendance Service
curl -H "Host: dev.api.etelios.com" https://dev.api.etelios.com/api/attendance/health
```

---

### **3. Test Canary Routing**

#### **Normal Request (90% prod, 10% dev)**
```bash
curl -H "Host: api.etelios.com" https://api.etelios.com/api/auth/health
```

#### **Canary Request (100% dev)**
```bash
curl -H "Host: api.etelios.com" \
     -H "canary: true" \
     https://api.etelios.com/api/auth/health
```

**Verify:** Check logs in dev namespace to see canary traffic:
```bash
kubectl logs -n etelios-backend-dev -l app=auth-service --tail=50
```

---

### **4. Test Traffic Mirroring**

Traffic mirroring sends 100% of production traffic to dev for testing.

```bash
# Send request to production
curl -H "Host: api.etelios.com" https://api.etelios.com/api/auth/health

# Check dev logs (should see mirrored request)
kubectl logs -n etelios-backend-dev -l app=auth-service --tail=50 | grep "mirrored"
```

**Note:** Mirrored requests don't return responses to the client, they're only for testing.

---

### **5. Verify mTLS**

```bash
# Check PeerAuthentication
kubectl get peerauthentication default -n etelios-backend-prod -o yaml

# Verify mTLS is STRICT
# Expected: spec.mtls.mode: STRICT

# Test service-to-service communication (should use mTLS)
kubectl exec -n etelios-backend-prod \
  $(kubectl get pod -l app=auth-service -n etelios-backend-prod -o jsonpath='{.items[0].metadata.name}') \
  -c istio-proxy -- \
  curl -s http://hr-service:3002/health
```

---

## 📊 Observability

### **1. Access Kiali Dashboard**

```bash
# Port-forward Kiali
istioctl dashboard kiali

# Or access via kubectl
kubectl port-forward -n istio-system svc/kiali 20001:20001
# Open: http://localhost:20001
```

**Features:**
- Service topology graph
- Traffic flow visualization
- mTLS status
- Request/response metrics

---

### **2. Access Prometheus**

```bash
# Port-forward Prometheus
istioctl dashboard prometheus

# Or access via kubectl
kubectl port-forward -n istio-system svc/prometheus 9090:9090
# Open: http://localhost:9090
```

**Metrics to Monitor:**
- `istio_requests_total` - Total requests
- `istio_request_duration_seconds` - Request latency
- `istio_request_bytes` - Request size
- `istio_response_bytes` - Response size

---

### **3. Access Grafana**

```bash
# Port-forward Grafana
istioctl dashboard grafana

# Or access via kubectl
kubectl port-forward -n istio-system svc/grafana 3000:3000
# Open: http://localhost:3000
# Default credentials: admin/admin
```

**Dashboards:**
- Istio Service Dashboard
- Istio Workload Dashboard
- Istio Performance Dashboard

---

## 🔧 Configuration Details

### **Circuit Breaking**

Configured in `k8s/istio/destination-rules.yaml`:

```yaml
outlierDetection:
  consecutiveErrors: 5      # Open circuit after 5 errors
  interval: 30s             # Check every 30 seconds
  baseEjectionTime: 30s     # Eject for 30 seconds
  maxEjectionPercent: 50    # Max 50% of pods ejected
  minHealthPercent: 50      # Keep at least 50% healthy
```

---

### **Retries**

Configured in `k8s/istio/virtual-services.yaml`:

```yaml
retries:
  attempts: 3               # Retry 3 times
  perTryTimeout: 10s        # 10s timeout per attempt
  retryOn: 5xx,gateway-error,connect-failure,refused-stream
```

---

### **Load Balancing**

Configured in `k8s/istio/destination-rules.yaml`:

```yaml
loadBalancer:
  simple: LEAST_CONN        # Least connections algorithm
```

**Options:**
- `ROUND_ROBIN` - Round-robin
- `LEAST_CONN` - Least connections (production)
- `RANDOM` - Random selection

---

### **Canary Routing**

Configured in `k8s/istio/virtual-services.yaml`:

```yaml
route:
  - destination:
      host: auth-service
      subset: v1            # Production
    weight: 90              # 90% traffic
  - destination:
      host: auth-service
      subset: v2            # Development
    weight: 10              # 10% traffic
```

**To route 100% to dev:**
```bash
# Add header: canary: true
curl -H "canary: true" https://api.etelios.com/api/auth/health
```

---

### **Traffic Mirroring**

Configured in `k8s/istio/virtual-services.yaml`:

```yaml
mirror:
  host: auth-service.etelios-backend-dev.svc.cluster.local
  subset: v2
mirrorPercentage:
  value: 100                # Mirror 100% of traffic
```

**Note:** Mirrored traffic doesn't return responses to clients.

---

## 🚨 Troubleshooting

### **Issue: Sidecars Not Injected**

**Solution:**
```bash
# Check namespace label
kubectl get namespace etelios-backend-prod -o yaml | grep istio-injection

# If missing, add label
kubectl label namespace etelios-backend-prod istio-injection=enabled --overwrite

# Restart pods
kubectl rollout restart deployment/auth-service -n etelios-backend-prod
```

---

### **Issue: mTLS Not Working**

**Solution:**
```bash
# Check PeerAuthentication
kubectl get peerauthentication -n etelios-backend-prod

# Verify mode is STRICT
kubectl get peerauthentication default -n etelios-backend-prod -o yaml

# Check sidecar logs
kubectl logs <pod-name> -c istio-proxy -n etelios-backend-prod
```

---

### **Issue: Canary Routing Not Working**

**Solution:**
```bash
# Check VirtualService
kubectl get virtualservice auth-service -n etelios-backend-prod -o yaml

# Verify DestinationRule subsets
kubectl get destinationrule auth-service -n etelios-backend-prod -o yaml

# Check pod labels match subsets
kubectl get pods -n etelios-backend-prod -l app=auth-service --show-labels
```

---

### **Issue: Gateway Not Routing**

**Solution:**
```bash
# Check Gateway
kubectl get gateway -n etelios-backend-prod

# Check VirtualService gateway reference
kubectl get virtualservice etelios-ingress-prod -n etelios-backend-prod -o yaml

# Check Istio Ingress Gateway
kubectl get pods -n istio-system -l app=istio-ingressgateway
kubectl get svc -n istio-system istio-ingressgateway
```

---

## 📝 Quick Reference

### **Deploy Everything**
```bash
./k8s/deploy-istio.sh all
```

### **Deploy Production Only**
```bash
./k8s/deploy-istio.sh prod
```

### **Deploy Development Only**
```bash
./k8s/deploy-istio.sh dev
```

### **Validate Deployment**
```bash
./k8s/validate-istio.sh
```

### **Check Service Status**
```bash
kubectl get pods -n etelios-backend-prod
kubectl get pods -n etelios-backend-dev
```

### **View Logs**
```bash
kubectl logs -n etelios-backend-prod -l app=auth-service --tail=50
kubectl logs -n etelios-backend-dev -l app=auth-service --tail=50
```

---

## 🔄 Rollback Plan

If you need to rollback:

```bash
# 1. Remove Istio configurations
kubectl delete -f k8s/istio/

# 2. Redeploy API Gateway (if needed)
kubectl apply -f k8s/deployments/api-gateway.yaml

# 3. Update ingress to use API Gateway
# Edit k8s/ingress.yaml and restore gateway route
kubectl apply -f k8s/ingress.yaml
```

---

## ✅ Success Criteria

- [ ] All pods have Istio sidecars
- [ ] mTLS is STRICT in both namespaces
- [ ] Health endpoints respond (prod and dev)
- [ ] Canary routing works (90/10 split)
- [ ] Traffic mirroring sends requests to dev
- [ ] Circuit breaking triggers on errors
- [ ] Retries work on failures
- [ ] Observability dashboards accessible
- [ ] API Gateway removed

---

**Last Updated:** December 2025

