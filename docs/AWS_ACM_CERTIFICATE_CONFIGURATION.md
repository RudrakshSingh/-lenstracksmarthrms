# 🔐 AWS Certificate Manager SSL Certificate Configuration

**Date:** 2026-03-09  
**Status:** ✅ **CONFIGURED**

---

## 📋 Certificate Details

**Certificate ID:** `f28621bc-c8c2-431f-80cd-ca34a2f82b8b`  
**Certificate ARN:** `arn:aws:acm:ap-south-1:383234048604:certificate/f28621bc-c8c2-431f-80cd-ca34a2f82b8b`  
**Region:** `ap-south-1` (Mumbai)  
**AWS Account:** `383234048604`

---

## ✅ Configuration Applied

### Kubernetes Ingress (ALB)

**File:** `k8s/ingress-alb-fixed.yaml`

**Annotations Added:**
```yaml
alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:ap-south-1:383234048604:certificate/f28621bc-c8c2-431f-80cd-ca34a2f82b8b
alb.ingress.kubernetes.io/ssl-redirect: '443'
```

**What This Does:**
- ✅ Enables HTTPS listener on port 443
- ✅ Attaches AWS Certificate Manager certificate to ALB
- ✅ Automatically redirects HTTP (port 80) to HTTPS (port 443)
- ✅ Provides SSL/TLS encryption for `api.etelios.com`

---

## 🌐 Backend API URL Configuration

**Backend API Base URL:** `https://api.etelios.com`

**All API endpoints are accessible via:**
- `https://api.etelios.com/health`
- `https://api.etelios.com/api/auth/*`
- `https://api.etelios.com/api/hr/*`
- `https://api.etelios.com/api/attendance/*`
- `https://api.etelios.com/api/*` (all services)

---

## 📝 Frontend Configuration

### Environment Variables

**For Next.js/React:**
```env
NEXT_PUBLIC_API_BASE_URL=https://api.etelios.com
NEXT_PUBLIC_API_URL=https://api.etelios.com
```

**For Vite:**
```env
VITE_API_URL=https://api.etelios.com
```

**For React (Create React App):**
```env
REACT_APP_API_BASE_URL=https://api.etelios.com
```

---

## 🚀 Deployment Steps

### 1. Apply Ingress Configuration

```bash
kubectl apply -f k8s/ingress-alb-fixed.yaml
```

### 2. Verify Certificate Attachment

```bash
# Check ingress status
kubectl get ingress etelios-ingress -n etelios-prod

# Check ALB listener configuration
aws elbv2 describe-listeners \
  --load-balancer-arn <your-alb-arn> \
  --region ap-south-1
```

### 3. Verify SSL Certificate

```bash
# Test HTTPS connection
curl -I https://api.etelios.com/health

# Check certificate details
openssl s_client -connect api.etelios.com:443 -servername api.etelios.com
```

---

## ✅ Expected Results

After configuration:

1. **HTTPS Works:** `https://api.etelios.com` should be accessible
2. **SSL Redirect:** `http://api.etelios.com` automatically redirects to `https://api.etelios.com`
3. **Certificate Valid:** Browser shows valid SSL certificate (no warnings)
4. **All APIs Accessible:** All backend APIs work via `https://api.etelios.com/api/*`

---

## 🔍 Verification Checklist

- [ ] Certificate ARN annotation added to ingress
- [ ] HTTPS listener (port 443) enabled
- [ ] SSL redirect configured
- [ ] Ingress applied to Kubernetes cluster
- [ ] DNS `api.etelios.com` points to ALB
- [ ] HTTPS connection works: `curl -I https://api.etelios.com/health`
- [ ] HTTP redirects to HTTPS: `curl -I http://api.etelios.com/health`
- [ ] Frontend environment variables updated to use `https://api.etelios.com`

---

## 📞 Troubleshooting

### Issue: Certificate Not Attached

**Check:**
```bash
# Verify certificate exists in ACM
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:ap-south-1:383234048604:certificate/f28621bc-c8c2-431f-80cd-ca34a2f82b8b \
  --region ap-south-1

# Verify certificate is in "Issued" status
```

### Issue: HTTPS Not Working

**Check:**
1. Certificate must be in same region as ALB (`ap-south-1`)
2. Certificate must be in "Issued" status (not "Pending validation")
3. DNS must point `api.etelios.com` to ALB hostname
4. Security groups must allow port 443 inbound

### Issue: SSL Redirect Not Working

**Check:**
- Annotation `alb.ingress.kubernetes.io/ssl-redirect: '443'` is present
- Both HTTP (80) and HTTPS (443) listeners are configured

---

## 📄 Related Documentation

- `docs/AWS_ACM_SSL_GODADDY_SETUP.md` - Complete SSL setup guide
- `docs/ETELIOS_FRONTEND_BACKEND_SETUP.md` - Frontend/Backend setup
- `API_ETELIOS_COM_CONFIGURATION.md` - API endpoint configuration

---

**Last Updated:** 2026-03-09  
**Status:** ✅ **Certificate Configured & Ready**
