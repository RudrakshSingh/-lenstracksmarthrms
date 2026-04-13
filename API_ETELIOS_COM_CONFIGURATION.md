# ✅ api.etelios.com Configuration - Complete Setup

## 🎯 Certificate Coverage

**Certificate:** `*.etelios.com` (Wildcard)

**Covers:**
- ✅ `api.etelios.com` (Backend API)
- ✅ `www.etelios.com` (Frontend)
- ✅ `backend.etelios.com` (Alternative)
- ✅ Any other subdomain of `etelios.com`

---

## ✅ Current Configuration Status

### 1. SSL Certificate
- **Certificate:** `*.etelios.com` ✅
- **Location:** `ssl/production/etelios-cert.pem`
- **Status:** Valid until Jan 2, 2027
- **Covers api.etelios.com:** ✅ Yes

### 2. Private Key
- **Location:** `ssl/production/private/etelios-key.pem`
- **Status:** Valid and matches certificate ✅
- **Deployed:** Kubernetes TLS secret ✅

### 3. Kubernetes Ingress
- **Host:** `api.etelios.com` ✅
- **TLS Secret:** `etelios-tls` ✅
- **SSL Redirect:** Enabled ✅
- **Status:** Active ✅

### 4. TLS Secret
- **Name:** `etelios-tls`
- **Namespace:** `etelios-prod`
- **Status:** Active ✅
- **Contains:** Certificate + Private Key ✅

---

## 🔐 SSL Configuration for api.etelios.com

### Certificate Details
```
Subject: CN=*.etelios.com
SAN: *.etelios.com, etelios.com
Issuer: Sectigo Public Server Authentication CA DV R36
Valid: March 6, 2026 - January 2, 2027
```

**✅ api.etelios.com is covered by *.etelios.com**

---

## 📋 Endpoint Configuration

**Base URL:** `https://api.etelios.com`

**All Services Available:**
- `https://api.etelios.com/health`
- `https://api.etelios.com/api/auth/*`
- `https://api.etelios.com/api/hr/*`
- `https://api.etelios.com/api/attendance/*`
- `https://api.etelios.com/api/*` (all services)

---

## ✅ Configuration Summary

| Component | Status | Details |
|-----------|--------|---------|
| Certificate | ✅ | `*.etelios.com` covers `api.etelios.com` |
| Private Key | ✅ | Valid and matches certificate |
| TLS Secret | ✅ | Deployed to Kubernetes |
| Ingress TLS | ✅ | Configured for `api.etelios.com` |
| SSL Redirect | ✅ | Enabled |
| Endpoint | ✅ | `https://api.etelios.com` ready |

---

## 🔧 What's Already Configured

1. ✅ **Certificate:** `*.etelios.com` (covers `api.etelios.com`)
2. ✅ **Private Key:** Valid and secure
3. ✅ **TLS Secret:** Created in Kubernetes
4. ✅ **Ingress:** Configured with `api.etelios.com` host
5. ✅ **SSL Redirect:** Enabled
6. ✅ **CORS:** Configured
7. ✅ **All Services:** Routed via `api.etelios.com`

---

## ⏳ Only DNS Update Needed

**Current Issue:**
- DNS: `api.etelios.com` → `98.70.245.87` (wrong IP)

**Required:**
- DNS: `api.etelios.com` → ALB hostname (CNAME)

**GoDaddy DNS Update:**
```
Type: CNAME
Name: api
Value: k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com
TTL: 600
```

---

## ✅ After DNS Update

Once DNS is updated in GoDaddy:

1. **DNS resolves correctly:**
   ```bash
   nslookup api.etelios.com
   # Should show ALB IP
   ```

2. **HTTPS works:**
   ```bash
   curl -I https://api.etelios.com/health
   # Should connect successfully
   ```

3. **SSL shows secure:**
   - Browser shows 🔒 lock icon
   - Certificate shows `*.etelios.com` from Sectigo
   - No certificate warnings

---

## 🎯 Summary

**✅ Backend Configuration:**
- Certificate: `*.etelios.com` ✅ (covers `api.etelios.com`)
- Private Key: Valid ✅
- TLS Secret: Deployed ✅
- Ingress: Configured ✅
- SSL: Ready ✅

**⏳ Remaining:**
- DNS update in GoDaddy (5-30 minutes)

**Result:**
- `https://api.etelios.com` will work with SSL/TLS
- All APIs accessible via secure HTTPS
- Certificate valid and secure

---

**Status:** ✅ **Backend configured for api.etelios.com with *.etelios.com certificate**

**Next Step:** Update GoDaddy DNS → Wait 5-30 minutes → SSL will be secure!
