# Production Deployment Guide - api.etelios.com

## 🚀 Quick Deployment Steps

### Step 1: Deploy SSL Certificate to Kubernetes

```bash
# Deploy certificate as TLS secret
bash k8s/deploy-ssl-certificate.sh
```

This will:
- ✅ Verify certificate and private key
- ✅ Create TLS secret in `etelios-prod` namespace
- ✅ Verify secret creation

---

### Step 2: Apply Ingress Configuration

```bash
# Apply ingress with api.etelios.com endpoint
kubectl apply -f k8s/ingress.yaml
```

**Current Ingress Configuration:**
- **Host:** `api.etelios.com`
- **TLS Secret:** `etelios-tls`
- **SSL Redirect:** Enabled
- **CORS:** Enabled for all origins

---

### Step 3: Verify Deployment

```bash
# Check ingress status
kubectl get ingress -n etelios-prod

# Check TLS secret
kubectl get secret etelios-tls -n etelios-prod

# Describe ingress
kubectl describe ingress etelios-ingress -n etelios-prod
```

---

### Step 4: Test Endpoint

```bash
# Test health endpoint
curl -I https://api.etelios.com/health

# Test with SSL verification
curl -v https://api.etelios.com/health

# Test API endpoint
curl https://api.etelios.com/api/auth/health
```

---

## 📋 Configuration Details

### Endpoint Configuration

**Base URL:** `https://api.etelios.com`

**API Endpoints:**
- Health: `https://api.etelios.com/health`
- Auth: `https://api.etelios.com/api/auth/*`
- HR: `https://api.etelios.com/api/hr/*`
- Attendance: `https://api.etelios.com/api/attendance/*`
- And all other services...

### SSL Certificate

- **Certificate:** `ssl/production/etelios-cert.pem`
- **Private Key:** `ssl/production/private/etelios-key.pem`
- **Domain:** `*.etelios.com` (covers `api.etelios.com`)
- **Issuer:** Sectigo Public Server Authentication CA DV R36
- **Valid Until:** January 2, 2027

### Kubernetes Resources

- **Namespace:** `etelios-prod`
- **TLS Secret:** `etelios-tls`
- **Ingress:** `etelios-ingress`

---

## 🔧 Manual Deployment (Alternative)

If the script doesn't work, deploy manually:

```bash
# 1. Create namespace
kubectl create namespace etelios-prod --dry-run=client -o yaml | kubectl apply -f -

# 2. Create TLS secret
kubectl create secret tls etelios-tls \
  --cert=ssl/production/etelios-cert.pem \
  --key=ssl/production/private/etelios-key.pem \
  --namespace=etelios-prod

# 3. Apply ingress
kubectl apply -f k8s/ingress.yaml

# 4. Verify
kubectl get ingress -n etelios-prod
```

---

## ✅ Verification Checklist

- [ ] Certificate deployed as TLS secret
- [ ] Ingress configured with `api.etelios.com`
- [ ] TLS secret attached to ingress
- [ ] SSL redirect enabled
- [ ] Health endpoint accessible
- [ ] API endpoints responding
- [ ] SSL certificate valid (no browser warnings)

---

## 🐛 Troubleshooting

### Certificate Not Working

```bash
# Check secret exists
kubectl get secret etelios-tls -n etelios-prod

# Check secret data
kubectl get secret etelios-tls -n etelios-prod -o yaml

# Recreate secret
kubectl delete secret etelios-tls -n etelios-prod
bash k8s/deploy-ssl-certificate.sh
```

### Ingress Not Routing

```bash
# Check ingress status
kubectl describe ingress etelios-ingress -n etelios-prod

# Check ingress controller
kubectl get pods -n ingress-nginx

# Check services
kubectl get svc -n etelios-prod
```

### DNS Not Resolving

```bash
# Check DNS
nslookup api.etelios.com

# Check if CNAME is set in GoDaddy
# Should point to your ALB/Ingress hostname
```

---

## 📝 Environment Variables

The following environment variables are already configured in `k8s/configmap.yaml`:

```yaml
ENABLE_SSL: "true"
ENABLE_HTTPS: "true"
SSL_CERT_PATH: "/etc/ssl/certs/etelios-cert.pem"
SSL_KEY_PATH: "/etc/ssl/private/etelios-key.pem"
```

---

## 🎯 Production Endpoints

After deployment, your API will be available at:

- **Base URL:** `https://api.etelios.com`
- **Health Check:** `https://api.etelios.com/health`
- **API Gateway:** `https://api.etelios.com/api/*`

All endpoints are secured with SSL/TLS!

---

**Deployment Date:** $(date)
**Certificate Valid Until:** January 2, 2027
