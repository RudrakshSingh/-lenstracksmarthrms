# 🔍 ALB Purpose & Status - Complete Overview

**Date:** March 10, 2026

---

## 📊 All ALBs in AWS (ap-south-1)

You have **3 ALBs** currently active:

| # | ALB Name | DNS Hostname | Purpose | Status |
|---|----------|--------------|---------|--------|
| 1 | `k8s-ingressn-ingressn-3df442ea60` | `k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com` | Nginx Ingress Controller | ✅ Active |
| 2 | `etelios-frontend-alb` | `etelios-frontend-alb-557163772.ap-south-1.elb.amazonaws.com` | Frontend Application | ✅ Active |
| 3 | `k8s-eteliosp-eteliosi-f5ad4f50f3` | `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com` | **Backend APIs** | ✅ **ACTIVE (Current)** |

---

## 🎯 Currently Active for Backend

**Backend API ALB:**
```
k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
```

**Configuration:**
- ✅ Used by: Kubernetes Ingress (`etelios-ingress`)
- ✅ DNS: `api.etelios.com` → Points to this ALB
- ✅ SSL Certificate: Attached (certificate ID: `f28621bc-c8c2-431f-80cd-ca34a2f82b8b`)
- ✅ HTTPS: Working (port 443)
- ✅ HTTP: Working (port 80)
- ✅ Status: Fully operational

---

## 📋 ALB Details

### 1. Backend API ALB (Currently Active)
**Name:** `k8s-eteliosp-eteliosi-f5ad4f50f3`  
**Hostname:** `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com`

**Purpose:**
- Backend APIs (`/api/*`)
- Health checks (`/health`)
- All microservices (auth, hr, attendance, etc.)

**Used by:**
- Kubernetes Ingress: `etelios-ingress` in namespace `etelios-prod`
- DNS: `api.etelios.com`
- SSL Certificate: AWS Certificate Manager

**Status:** ✅ **ACTIVE - This is the one being used for backend**

---

### 2. Frontend ALB
**Name:** `etelios-frontend-alb`  
**Hostname:** `etelios-frontend-alb-557163772.ap-south-1.elb.amazonaws.com`

**Purpose:**
- Frontend application
- Shell/UI services
- Frontend static assets

**Status:** ✅ Active (for frontend)

---

### 3. Nginx Ingress Controller ALB
**Name:** `k8s-ingressn-ingressn-3df442ea60`  
**Hostname:** `k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com`

**Purpose:**
- Nginx ingress controller service
- Alternative ingress controller
- May be used for other services

**Status:** ✅ Active

---

## ✅ Verification

### Check Which ALB Ingress is Using:

```bash
kubectl get ingress etelios-ingress -n etelios-prod
```

**Should show:**
```
ADDRESS: k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
```

### Check DNS:

```bash
nslookup api.etelios.com 8.8.8.8
```

**Should show:**
```
api.etelios.com → k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
```

---

## 🎯 Summary

**For Backend APIs (`api.etelios.com`):**
- ✅ **Active ALB:** `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com`
- ✅ **SSL Certificate:** Attached and working
- ✅ **HTTPS:** Working
- ✅ **Status:** Production ready

**Other ALBs:**
- Frontend ALB: For frontend application
- Nginx Ingress ALB: For nginx ingress controller

---

## 💡 Recommendation

**Current Setup is Correct:**
- Backend APIs use: `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189...` ✅
- Frontend uses: `etelios-frontend-alb-557163772...` ✅
- Each ALB serves its purpose ✅

**No changes needed!** The backend is correctly using the ALB with SSL certificate.

---

**Backend ALB:** `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com` ✅
