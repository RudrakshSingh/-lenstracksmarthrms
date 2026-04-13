# Frontend (etelios.com) और Backend (api.etelios.com) Setup Guide

## 🎯 आपका Requirement

- **Frontend:** `https://etelios.com`
- **Backend:** `https://api.etelios.com`

---

## 📋 Step 1: SSL Certificate Setup

### Option A: Single Certificate (Recommended)

**एक certificate में दोनों domains:**

1. **Current Certificate Delete करें** (अगर अभी issued नहीं हुआ):
   - AWS Console → Certificate Manager
   - Current certificate select करें
   - **"Delete"** click करें

2. **नया Certificate Request करें:**
   - **"Request a certificate"** click करें
   - Domain names में add करें:
     ```
     etelios.com
     *.etelios.com
     ```
   - **DNS validation** select करें
   - **"Request"** click करें

3. **CNAME Records:**
   - AWS से **2 CNAME records** मिलेंगे:
     - `etelios.com` के लिए एक
     - `*.etelios.com` के लिए एक
   - दोनों GoDaddy में add करें

### Option B: Separate Certificates

**अगर current certificate already issued है:**

1. **Current Certificate रखें:** `*.etelios.com` (backend के लिए)
2. **नया Certificate बनाएं:** `etelios.com` (frontend के लिए)

---

## 🌐 Step 2: GoDaddy DNS Setup

### CNAME Records Add करें:

| Type | Name | Value (ALB Hostname) | TTL |
|------|------|---------------------|-----|
| CNAME | @ (root) | `your-alb-hostname.elb.amazonaws.com` | 600 |
| CNAME | api | `your-alb-hostname.elb.amazonaws.com` | 600 |

**Steps:**

1. GoDaddy में login करें
2. **My Products** → Domain select करें
3. **DNS** button click करें
4. **Records** section में जाएं

**Record 1: Root Domain (Frontend)**
- Click **"Add"**
- Type: **CNAME**
- Name: **@** (root domain के लिए)
- Value: **Your ALB hostname** (e.g., `k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com`)
- TTL: **600**
- Save

**Record 2: API Subdomain (Backend)**
- Click **"Add"**
- Type: **CNAME**
- Name: **api**
- Value: **Same ALB hostname**
- TTL: **600**
- Save

**Note:** कुछ DNS providers में root domain के लिए CNAME नहीं चलता, तो A record use करें (ALB IP address)

---

## 🔧 Step 3: Kubernetes Ingress Configuration

### Ingress File Update करें:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: etelios-ingress
  namespace: etelios-prod
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    
    # CORS Configuration
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://etelios.com"
    nginx.ingress.kubernetes.io/cors-allow-credentials: "true"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,X-Tenant-Id"
spec:
  tls:
  - hosts:
    - etelios.com
    - api.etelios.com
    secretName: etelios-tls
  rules:
  # Frontend - Root Domain
  - host: etelios.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
  
  # Backend - API Subdomain
  - host: api.etelios.com
    http:
      paths:
      # Health check
      - path: /health
        pathType: Exact
        backend:
          service:
            name: auth-service
            port:
              number: 3001
      # Auth Service
      - path: /api/auth
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 3001
      # HR Service
      - path: /api/hr
        pathType: Prefix
        backend:
          service:
            name: hr-service
            port:
              number: 3002
      # Attendance Service
      - path: /api/attendance
        pathType: Prefix
        backend:
          service:
            name: attendance-service
            port:
              number: 3003
      # ... other API routes (same as current)
```

---

## 🚀 Step 4: Frontend Service Deployment

### Frontend Service Create करें:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-service
  namespace: etelios-prod
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend-service
  template:
    metadata:
      labels:
        app: frontend-service
    spec:
      containers:
      - name: frontend
        image: your-frontend-image:latest
        ports:
        - containerPort: 80
        env:
        - name: NEXT_PUBLIC_API_URL
          value: "https://api.etelios.com/api"
        - name: NEXT_PUBLIC_BASE_URL
          value: "https://etelios.com"
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: etelios-prod
spec:
  selector:
    app: frontend-service
  ports:
  - port: 80
    targetPort: 80
```

---

## ⚙️ Step 5: Frontend Environment Configuration

### Frontend `.env` File:

```env
# Frontend Base URL
NEXT_PUBLIC_BASE_URL=https://etelios.com

# Backend API URL
NEXT_PUBLIC_API_URL=https://api.etelios.com/api

# Or if using relative paths (not recommended for different subdomains)
# NEXT_PUBLIC_API_URL=https://api.etelios.com/api
```

### Frontend Code में:

```typescript
// ✅ CORRECT - Full URL (recommended for different subdomains)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.etelios.com/api';

// Example API call
const response = await fetch(`${API_BASE_URL}/auth/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email, password }),
});
```

---

## ✅ Step 6: Apply Configuration

### 1. Ingress Apply करें:

```bash
kubectl apply -f k8s/ingress.yaml
```

### 2. Frontend Service Deploy करें:

```bash
kubectl apply -f k8s/etelios-prod/frontend-service-deployment.yaml
```

### 3. Check Status:

```bash
# Ingress check
kubectl get ingress -n etelios-prod

# Frontend service check
kubectl get pods -n etelios-prod -l app=frontend-service

# Service check
kubectl get svc -n etelios-prod frontend-service
```

---

## 🧪 Step 7: Testing

### DNS Propagation Check:

```bash
# Frontend domain
nslookup etelios.com

# Backend domain
nslookup api.etelios.com

# Should return ALB hostname
```

### Frontend Test:

```bash
# Test frontend
curl -I https://etelios.com/

# Should return: HTTP/2 200
```

### Backend Test:

```bash
# Test backend health
curl https://api.etelios.com/health

# Test API
curl https://api.etelios.com/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

---

## 🔐 Step 8: SSL Certificate Validation

### AWS Certificate Manager में:

1. Certificate select करें
2. **"Domains"** section check करें
3. CNAME records GoDaddy में add करें
4. Wait 5-30 minutes
5. Status: **"Pending validation"** → **"Issued"** ✅

### CNAME Records GoDaddy में:

**Certificate Validation के लिए:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `_abc123.etelios.com` | `_xyz789.acm-validations.aws.` | 600 |
| CNAME | `_def456.etelios.com` | `_uvw012.acm-validations.aws.` | 600 |

**Note:** AWS Certificate Manager से exact CNAME records copy करें।

---

## 📊 Complete Setup Summary

### DNS Records (GoDaddy):

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| CNAME | @ | ALB hostname | Frontend (etelios.com) |
| CNAME | api | ALB hostname | Backend (api.etelios.com) |
| CNAME | `_abc123` | AWS validation | SSL Certificate |
| CNAME | `_def456` | AWS validation | SSL Certificate |

### URLs:

- **Frontend:** `https://etelios.com`
- **Backend:** `https://api.etelios.com`
- **API Endpoints:** `https://api.etelios.com/api/*`

### Certificate:

- **Domains:** `etelios.com` + `*.etelios.com`
- **Coverage:** 
  - ✅ `etelios.com` (frontend)
  - ✅ `api.etelios.com` (backend)
  - ✅ सभी subdomains

---

## 🚨 Troubleshooting

### Issue: Frontend नहीं खुल रहा

**Check:**
1. DNS propagation: `nslookup etelios.com`
2. Frontend service running: `kubectl get pods -n etelios-prod -l app=frontend-service`
3. Ingress configured: `kubectl describe ingress -n etelios-prod`

### Issue: CORS Error

**Solution:**
- Ingress में CORS annotations add करें (ऊपर देखें)
- Frontend से backend calls में credentials include करें

### Issue: SSL Certificate Error

**Check:**
1. Certificate issued: AWS Certificate Manager में check करें
2. CNAME records added: GoDaddy DNS में verify करें
3. Certificate attached to ALB: EC2 → Load Balancers → Listeners

---

## ✅ Checklist

- [ ] SSL Certificate request करें: `etelios.com` + `*.etelios.com`
- [ ] CNAME records GoDaddy में add करें (DNS routing)
- [ ] Certificate validation CNAME records add करें
- [ ] Ingress configuration update करें
- [ ] Frontend service deploy करें
- [ ] Frontend environment variables set करें
- [ ] DNS propagation wait करें (5-30 minutes)
- [ ] Certificate validation wait करें (5-30 minutes)
- [ ] Test frontend: `curl https://etelios.com/`
- [ ] Test backend: `curl https://api.etelios.com/health`

---

## 🎯 Quick Start Commands

```bash
# 1. Get ALB hostname
kubectl -n ingress-nginx get svc ingress-nginx-controller \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'

# 2. Apply ingress
kubectl apply -f k8s/ingress.yaml

# 3. Deploy frontend
kubectl apply -f k8s/etelios-prod/frontend-service-deployment.yaml

# 4. Check status
kubectl get ingress -n etelios-prod
kubectl get pods -n etelios-prod -l app=frontend-service

# 5. Test
curl -I https://etelios.com/
curl https://api.etelios.com/health
```

---

**Last Updated:** 2026-03-05  
**Frontend:** `https://etelios.com`  
**Backend:** `https://api.etelios.com`
