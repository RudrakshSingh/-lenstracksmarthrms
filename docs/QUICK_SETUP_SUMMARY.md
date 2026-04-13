# 🚀 Quick Setup Summary: Frontend (etelios.com) + Backend (api.etelios.com)

## ✅ आपको क्या करना है:

### Step 1: SSL Certificate (AWS)

**अगर current certificate अभी issued नहीं हुआ:**
1. AWS Certificate Manager में जाएं
2. Current certificate delete करें
3. नया certificate request करें:
   - Domain: `etelios.com`
   - Domain: `*.etelios.com`
   - Validation: DNS
4. 2 CNAME records मिलेंगे (AWS से)

**अगर certificate already issued है:**
- Current certificate रखें (`*.etelios.com`)
- नया certificate बनाएं (`etelios.com`)

---

### Step 2: GoDaddy DNS Setup

**4 CNAME Records Add करें:**

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| CNAME | @ | `your-alb-hostname.elb.amazonaws.com` | Frontend (etelios.com) |
| CNAME | api | `your-alb-hostname.elb.amazonaws.com` | Backend (api.etelios.com) |
| CNAME | `_abc123` | `_xyz789.acm-validations.aws.` | SSL Validation (AWS से) |
| CNAME | `_def456` | `_uvw012.acm-validations.aws.` | SSL Validation (AWS से) |

**ALB Hostname कैसे मिलेगा:**
```bash
kubectl -n ingress-nginx get svc ingress-nginx-controller \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

---

### Step 3: Kubernetes Ingress Update

**File use करें:** `k8s/ingress-frontend-backend.yaml`

```bash
# Apply करें
kubectl apply -f k8s/ingress-frontend-backend.yaml
```

**या current ingress update करें:**
- TLS hosts में add करें: `etelios.com`
- Frontend rule add करें: `host: etelios.com` → `frontend-service`

---

### Step 4: Frontend Service Deploy

**Frontend service create करें:**

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

```bash
kubectl apply -f k8s/etelios-prod/frontend-service-deployment.yaml
```

---

### Step 5: Frontend Environment Variables

**Frontend `.env` file:**

```env
NEXT_PUBLIC_BASE_URL=https://etelios.com
NEXT_PUBLIC_API_URL=https://api.etelios.com/api
```

---

### Step 6: Wait & Test

**Wait करें:**
- DNS Propagation: 5-30 minutes
- SSL Validation: 5-30 minutes

**Test करें:**
```bash
# Frontend
curl -I https://etelios.com/

# Backend
curl https://api.etelios.com/health
```

---

## 📋 Complete Checklist

- [ ] AWS Certificate: `etelios.com` + `*.etelios.com`
- [ ] GoDaddy DNS: Root domain CNAME (@)
- [ ] GoDaddy DNS: API subdomain CNAME (api)
- [ ] GoDaddy DNS: SSL validation CNAME records (2)
- [ ] Kubernetes Ingress: Frontend rule add
- [ ] Kubernetes Ingress: TLS hosts update
- [ ] Frontend Service: Deploy करें
- [ ] Frontend Env: API URL set करें
- [ ] Wait: DNS + SSL validation
- [ ] Test: Frontend और Backend

---

## 🎯 Final URLs

- **Frontend:** `https://etelios.com`
- **Backend:** `https://api.etelios.com`
- **API:** `https://api.etelios.com/api/*`

---

## 📚 Detailed Guides

- **Complete Setup:** `docs/ETELIOS_FRONTEND_BACKEND_SETUP.md`
- **SSL Certificate:** `docs/AWS_ACM_SSL_GODADDY_SETUP.md`
- **Certificate Edit:** `docs/AWS_CERTIFICATE_EDIT_DOMAINS.md`

---

**Ready to go!** 🚀
