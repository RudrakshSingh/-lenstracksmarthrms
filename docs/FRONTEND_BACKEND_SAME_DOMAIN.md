# Running Frontend and Backend on Same Domain/CNAME

**Yes, you can absolutely run both frontend and backend on the same CNAME and domain!** Here are the best approaches:

---

## 🎯 Option 1: Path-Based Routing (Recommended)

**Same domain, different paths:**
- **Frontend:** `https://etelios.com` or `https://www.etelios.com` (root `/`)
- **Backend APIs:** `https://etelios.com/api/*` or `https://www.etelios.com/api/*`

### Advantages:
- ✅ Single SSL certificate covers both
- ✅ No CORS issues (same origin)
- ✅ Simpler DNS setup (one CNAME)
- ✅ Better SEO (single domain)
- ✅ Easier to manage

### Configuration:

#### 1. Update Ingress for Path-Based Routing

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
spec:
  tls:
  - hosts:
    - etelios.com
    - www.etelios.com
    secretName: etelios-tls
  rules:
  - host: etelios.com
    http:
      paths:
      # Frontend - Serve static files or SPA
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service  # Your frontend service
            port:
              number: 80
      # Backend APIs - All /api/* routes
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-gateway  # Or individual services via ingress
            port:
              number: 80
      - path: /api/auth
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 3001
      - path: /api/hr
        pathType: Prefix
        backend:
          service:
            name: hr-service
            port:
              number: 3002
      # ... other API routes
  - host: www.etelios.com
    http:
      paths:
      # Same configuration as above
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 80
```

#### 2. Frontend Configuration

**Update your frontend `.env` or environment variables:**

```env
# Frontend serves from root
NEXT_PUBLIC_BASE_URL=https://etelios.com
# Backend APIs are on same domain
NEXT_PUBLIC_API_URL=https://etelios.com/api
# Or relative path (recommended)
NEXT_PUBLIC_API_URL=/api
```

**In your frontend code:**

```typescript
// ✅ CORRECT - Relative path (recommended)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// ✅ CORRECT - Full URL (also works)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://etelios.com/api';

// ❌ WRONG - Don't use different domain
const API_BASE_URL = 'https://api.etelios.com/api';
```

#### 3. Frontend Service Deployment

If your frontend is a static site (React, Next.js static export, etc.):

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
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
        volumeMounts:
        - name: frontend-files
          mountPath: /usr/share/nginx/html
      volumes:
      - name: frontend-files
        configMap:
          name: frontend-config
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

If your frontend is a Next.js app with SSR:

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
      - name: nextjs
        image: your-frontend-image:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_API_URL
          value: "/api"  # Relative path
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
    targetPort: 3000
```

---

## 🎯 Option 2: Subdomain Approach

**Different subdomains:**
- **Frontend:** `https://www.etelios.com` or `https://app.etelios.com`
- **Backend:** `https://api.etelios.com`

### Advantages:
- ✅ Clear separation
- ✅ Can scale independently
- ✅ Different SSL certificates possible

### Configuration:

#### 1. DNS Setup (GoDaddy)

Add two CNAME records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | www | `your-alb-hostname.elb.amazonaws.com` | 600 |
| CNAME | api | `your-alb-hostname.elb.amazonaws.com` | 600 |

#### 2. Ingress Configuration

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: etelios-ingress
  namespace: etelios-prod
spec:
  tls:
  - hosts:
    - www.etelios.com
    - api.etelios.com
    secretName: etelios-tls
  rules:
  # Frontend subdomain
  - host: www.etelios.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
  # Backend subdomain
  - host: api.etelios.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 3001
      - path: /api/auth
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 3001
      - path: /api/hr
        pathType: Prefix
        backend:
          service:
            name: hr-service
            port:
              number: 3002
      # ... other API routes
```

#### 3. Frontend Configuration

```env
# Frontend on www subdomain
NEXT_PUBLIC_BASE_URL=https://www.etelios.com
# Backend on api subdomain
NEXT_PUBLIC_API_URL=https://api.etelios.com/api
```

---

## 🎯 Option 3: Hybrid Approach (Current Setup + Frontend)

**Keep current backend setup, add frontend:**

Your current setup uses `api.etelios.com` for backend. You can add frontend to the root domain:

- **Frontend:** `https://etelios.com` or `https://www.etelios.com`
- **Backend:** `https://api.etelios.com` (keep as is)

### Configuration:

#### 1. DNS Setup (GoDaddy)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | @ (root) | `your-alb-hostname.elb.amazonaws.com` | 600 |
| CNAME | www | `your-alb-hostname.elb.amazonaws.com` | 600 |
| CNAME | api | `your-alb-hostname.elb.amazonaws.com` | 600 |

#### 2. Update Ingress

Add frontend routes to your existing ingress:

```yaml
spec:
  tls:
  - hosts:
    - etelios.com
    - www.etelios.com
    - api.etelios.com
    secretName: etelios-tls
  rules:
  # Frontend on root domain
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
  - host: www.etelios.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
  # Backend on api subdomain (existing)
  - host: api.etelios.com
    http:
      paths:
      # ... your existing API routes
```

#### 3. Frontend Configuration

```env
NEXT_PUBLIC_BASE_URL=https://etelios.com
NEXT_PUBLIC_API_URL=https://api.etelios.com/api
```

---

## 📋 SSL Certificate Setup

### For Option 1 (Same Domain):

Request certificate for:
- `etelios.com`
- `*.etelios.com` (wildcard covers www.etelios.com)

### For Option 2 (Subdomains):

Request certificate for:
- `www.etelios.com`
- `api.etelios.com`
- Or use wildcard: `*.etelios.com`

### For Option 3 (Hybrid):

Request certificate for:
- `etelios.com`
- `www.etelios.com`
- `api.etelios.com`
- Or use wildcard: `*.etelios.com`

**See:** `docs/AWS_ACM_SSL_GODADDY_SETUP.md` for detailed SSL setup instructions.

---

## ✅ Recommended: Option 1 (Path-Based)

**Why?**
- ✅ Single SSL certificate
- ✅ No CORS issues
- ✅ Simpler setup
- ✅ Better for SEO
- ✅ Easier to manage

**Example URLs:**
- Frontend: `https://etelios.com/`
- Login: `https://etelios.com/login`
- Dashboard: `https://etelios.com/dashboard`
- API: `https://etelios.com/api/auth/login`
- API: `https://etelios.com/api/hr/employees`

---

## 🔧 Implementation Steps

### Step 1: Update Ingress

Add frontend service route to your ingress configuration (see examples above).

### Step 2: Deploy Frontend Service

Create a Kubernetes deployment and service for your frontend.

### Step 3: Update Frontend Environment Variables

```env
# Use relative path (recommended for same domain)
NEXT_PUBLIC_API_URL=/api

# Or full URL
NEXT_PUBLIC_API_URL=https://etelios.com/api
```

### Step 4: Update SSL Certificate

Request/update certificate to include frontend domain(s).

### Step 5: Update DNS (if needed)

Add CNAME records for frontend domain(s) in GoDaddy.

### Step 6: Test

```bash
# Test frontend
curl https://etelios.com/

# Test backend API
curl https://etelios.com/api/health
```

---

## 🚨 Important Notes

### Path Ordering in Ingress

**Order matters!** More specific paths should come before general ones:

```yaml
paths:
# ✅ CORRECT - Specific paths first
- path: /api/auth/login
  pathType: Exact
- path: /api/auth
  pathType: Prefix
- path: /api
  pathType: Prefix
- path: /
  pathType: Prefix  # Frontend catch-all last
```

### Frontend SPA Routing

If using a Single Page Application (React Router, Next.js, etc.), configure ingress to serve `index.html` for all routes:

```yaml
annotations:
  nginx.ingress.kubernetes.io/rewrite-target: /$2
  nginx.ingress.kubernetes.io/use-regex: "true"
```

Or use a catch-all route:

```yaml
- path: /
  pathType: Prefix
  backend:
    service:
      name: frontend-service
      port:
        number: 80
```

### CORS Configuration

If using **Option 1** (same domain), you don't need CORS! Same origin = no CORS issues.

If using **Option 2** (subdomains), ensure CORS is configured:

```yaml
annotations:
  nginx.ingress.kubernetes.io/enable-cors: "true"
  nginx.ingress.kubernetes.io/cors-allow-origin: "https://www.etelios.com"
  nginx.ingress.kubernetes.io/cors-allow-credentials: "true"
```

---

## 📊 Comparison Table

| Feature | Option 1: Same Domain | Option 2: Subdomains | Option 3: Hybrid |
|---------|---------------------|---------------------|------------------|
| SSL Certificate | Single (simpler) | Single or multiple | Single or multiple |
| CORS | Not needed ✅ | Required | Required |
| DNS Setup | One CNAME | Multiple CNAMEs | Multiple CNAMEs |
| SEO | Better ✅ | Good | Good |
| Management | Easier ✅ | More complex | More complex |
| Scalability | Good | Better ✅ | Better ✅ |
| Cost | Lower ✅ | Higher | Higher |

---

## 🎯 Quick Start: Option 1 Implementation

1. **Update your ingress** to add frontend route at root `/`
2. **Deploy frontend service** in Kubernetes
3. **Update frontend env** to use `/api` (relative path)
4. **Request SSL certificate** for `etelios.com` and `*.etelios.com`
5. **Add CNAME** in GoDaddy: `@` → ALB hostname
6. **Test:** `curl https://etelios.com/` and `curl https://etelios.com/api/health`

---

**Last Updated:** 2026-03-05  
**Recommended:** Option 1 (Path-Based Routing)
