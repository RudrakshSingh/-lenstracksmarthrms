# Kubectl Commands Reference - Istio Deployment

## 🚀 Complete Deployment Commands

### **1. Install Istio (One-time Setup)**
```bash
# Download and install Istio
curl -L https://istio.io/downloadIstio | sh -
cd istio-*
export PATH=$PWD/bin:$PATH

# Install Istio
istioctl install --set values.defaultRevision=default -y

# Verify installation
kubectl get pods -n istio-system
```

---

### **2. Enable Istio Injection for Namespaces**
```bash
# Apply namespace labels
kubectl apply -f k8s/istio/namespace-labels.yaml

# Verify labels
kubectl get namespace etelios-backend-prod -o yaml | grep istio-injection
kubectl get namespace etelios-backend-dev -o yaml | grep istio-injection
```

---

### **3. Deploy Istio Configurations**
```bash
# PeerAuthentication (mTLS)
kubectl apply -f k8s/istio/peer-authentication.yaml

# DestinationRules (Circuit breaking, load balancing)
kubectl apply -f k8s/istio/destination-rules.yaml

# VirtualServices (Canary routing, traffic mirroring)
kubectl apply -f k8s/istio/virtual-services.yaml

# Gateway (Ingress routing)
kubectl apply -f k8s/istio/gateway.yaml
```

---

### **4. Remove API Gateway**
```bash
# Delete API Gateway deployment
kubectl delete deployment api-gateway -n etelios-backend-prod

# Delete API Gateway service
kubectl delete service api-gateway -n etelios-backend-prod

# Delete API Gateway HPA
kubectl delete hpa api-gateway -n etelios-backend-prod --ignore-not-found=true

# Verify removal
kubectl get all -n etelios-backend-prod | grep api-gateway
```

---

### **5. Deploy Production Services**
```bash
# Apply ConfigMap
kubectl apply -f k8s/prod/configmap.yaml

# Deploy services
kubectl apply -f k8s/prod/auth-service.yaml
kubectl apply -f k8s/prod/hr-service.yaml
kubectl apply -f k8s/prod/attendance-service.yaml

# Wait for deployments
kubectl wait --for=condition=available --timeout=300s \
  deployment/auth-service \
  deployment/hr-service \
  deployment/attendance-service \
  -n etelios-backend-prod
```

---

### **6. Deploy Development Services**
```bash
# Apply ConfigMap
kubectl apply -f k8s/dev/configmap.yaml

# Deploy services
kubectl apply -f k8s/dev/auth-service.yaml
kubectl apply -f k8s/dev/hr-service.yaml
kubectl apply -f k8s/dev/attendance-service.yaml

# Wait for deployments
kubectl wait --for=condition=available --timeout=300s \
  deployment/auth-service \
  deployment/hr-service \
  deployment/attendance-service \
  -n etelios-backend-dev
```

---

## 🔍 Verification Commands

### **Check Pods and Sidecars**
```bash
# Production pods
kubectl get pods -n etelios-backend-prod

# Development pods
kubectl get pods -n etelios-backend-dev

# Verify sidecar injection
kubectl describe pod <pod-name> -n etelios-backend-prod | grep istio-proxy
```

### **Check Istio Resources**
```bash
# PeerAuthentication
kubectl get peerauthentication -n etelios-backend-prod
kubectl get peerauthentication -n etelios-backend-dev

# DestinationRules
kubectl get destinationrules -n etelios-backend-prod
kubectl get destinationrules -n etelios-backend-dev

# VirtualServices
kubectl get virtualservices -n etelios-backend-prod
kubectl get virtualservices -n etelios-backend-dev

# Gateways
kubectl get gateway -n etelios-backend-prod
kubectl get gateway -n etelios-backend-dev
```

### **Check Services**
```bash
# Production services
kubectl get svc -n etelios-backend-prod

# Development services
kubectl get svc -n etelios-backend-dev
```

---

## 🧪 Testing Commands

### **Health Checks (Internal)**
```bash
# Test from within cluster
kubectl run -it --rm test-pod --image=curlimages/curl:latest --restart=Never -- \
  curl -s http://auth-service.etelios-backend-prod.svc.cluster.local:3001/health

# Cleanup
kubectl delete pod test-pod --ignore-not-found=true
```

### **Health Checks (External - Production)**
```bash
# Auth Service
curl -H "Host: api.etelios.com" https://api.etelios.com/api/auth/health

# HR Service
curl -H "Host: api.etelios.com" https://api.etelios.com/api/hr/health

# Attendance Service
curl -H "Host: api.etelios.com" https://api.etelios.com/api/attendance/health
```

### **Health Checks (External - Development)**
```bash
# Auth Service
curl -H "Host: dev.api.etelios.com" https://dev.api.etelios.com/api/auth/health

# HR Service
curl -H "Host: dev.api.etelios.com" https://dev.api.etelios.com/api/hr/health

# Attendance Service
curl -H "Host: dev.api.etelios.com" https://dev.api.etelios.com/api/attendance/health
```

### **Test Canary Routing**
```bash
# Normal request (90% prod, 10% dev)
curl -H "Host: api.etelios.com" https://api.etelios.com/api/auth/health

# Canary request (100% dev)
curl -H "Host: api.etelios.com" \
     -H "canary: true" \
     https://api.etelios.com/api/auth/health
```

### **Test Traffic Mirroring**
```bash
# Send request to production
curl -H "Host: api.etelios.com" https://api.etelios.com/api/auth/health

# Check dev logs for mirrored traffic
kubectl logs -n etelios-backend-dev -l app=auth-service --tail=50
```

---

## 📊 Observability Commands

### **Access Kiali Dashboard**
```bash
# Via istioctl
istioctl dashboard kiali

# Via kubectl port-forward
kubectl port-forward -n istio-system svc/kiali 20001:20001
# Open: http://localhost:20001
```

### **Access Prometheus**
```bash
# Via istioctl
istioctl dashboard prometheus

# Via kubectl port-forward
kubectl port-forward -n istio-system svc/prometheus 9090:9090
# Open: http://localhost:9090
```

### **Access Grafana**
```bash
# Via istioctl
istioctl dashboard grafana

# Via kubectl port-forward
kubectl port-forward -n istio-system svc/grafana 3000:3000
# Open: http://localhost:3000
# Default credentials: admin/admin
```

---

## 🔧 Troubleshooting Commands

### **Check Pod Logs**
```bash
# Application logs
kubectl logs -n etelios-backend-prod -l app=auth-service --tail=50

# Istio sidecar logs
kubectl logs -n etelios-backend-prod -l app=auth-service -c istio-proxy --tail=50
```

### **Check Pod Status**
```bash
# Describe pod
kubectl describe pod <pod-name> -n etelios-backend-prod

# Check events
kubectl get events -n etelios-backend-prod --sort-by='.lastTimestamp'
```

### **Verify mTLS**
```bash
# Check PeerAuthentication
kubectl get peerauthentication default -n etelios-backend-prod -o yaml

# Check mTLS status in Kiali
istioctl dashboard kiali
# Navigate to: Service Graph → mTLS status
```

### **Check Service-to-Service Communication**
```bash
# Test from pod
kubectl exec -n etelios-backend-prod \
  $(kubectl get pod -l app=auth-service -n etelios-backend-prod -o jsonpath='{.items[0].metadata.name}') \
  -c istio-proxy -- \
  curl -s http://hr-service:3002/health
```

### **Restart Deployments**
```bash
# Restart production services
kubectl rollout restart deployment/auth-service -n etelios-backend-prod
kubectl rollout restart deployment/hr-service -n etelios-backend-prod
kubectl rollout restart deployment/attendance-service -n etelios-backend-prod

# Restart development services
kubectl rollout restart deployment/auth-service -n etelios-backend-dev
kubectl rollout restart deployment/hr-service -n etelios-backend-dev
kubectl rollout restart deployment/attendance-service -n etelios-backend-dev
```

---

## 🔄 Rollback Commands

### **Remove Istio Configurations**
```bash
# Remove all Istio resources
kubectl delete -f k8s/istio/peer-authentication.yaml
kubectl delete -f k8s/istio/destination-rules.yaml
kubectl delete -f k8s/istio/virtual-services.yaml
kubectl delete -f k8s/istio/gateway.yaml
```

### **Disable Istio Injection**
```bash
# Remove namespace labels
kubectl label namespace etelios-backend-prod istio-injection-
kubectl label namespace etelios-backend-dev istio-injection-
```

### **Redeploy API Gateway (if needed)**
```bash
# Redeploy API Gateway
kubectl apply -f k8s/deployments/api-gateway.yaml

# Verify
kubectl get deployment api-gateway -n etelios-backend-prod
```

---

## 📝 Quick Reference

### **One-Command Deployment**
```bash
# Deploy everything
./k8s/deploy-istio.sh all

# Deploy production only
./k8s/deploy-istio.sh prod

# Deploy development only
./k8s/deploy-istio.sh dev
```

### **One-Command Validation**
```bash
./k8s/validate-istio.sh
```

### **Check All Resources**
```bash
# Production
kubectl get all,peerauthentication,destinationrules,virtualservices,gateway -n etelios-backend-prod

# Development
kubectl get all,peerauthentication,destinationrules,virtualservices,gateway -n etelios-backend-dev
```

---

**Last Updated:** December 2025

