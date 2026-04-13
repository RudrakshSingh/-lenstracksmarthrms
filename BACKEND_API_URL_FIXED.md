# ✅ Backend API URL - Fixed

**Date:** 2026-02-28

---

## ⚠️ Old ALB Deleted

**Old URL (No longer exists):**
```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

**Status:** ❌ ALB was deleted when ingress controller service was recreated

---

## ✅ New Backend API URL

**New URL (Working):**
```
http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com
```

**Type:** Internet-Facing Network Load Balancer (NLB)  
**Status:** ✅ Active  
**Scheme:** internet-facing

---

## 🔧 What Happened

1. Old ingress controller service was deleted
2. New ingress controller service was created with internet-facing ALB
3. Old ALB was automatically deleted by AWS
4. New ALB was created with different DNS name

---

## 📋 Update Frontend Environment Variable

**Old:**
```env
NEXT_PUBLIC_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

**New:**
```env
NEXT_PUBLIC_API_BASE_URL=http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com
```

---

## 🧪 Test APIs

```bash
# Login
curl -X POST http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lenstrack.com","password":"AdminPass123!"}'

# Get Stores (with token)
curl http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api/hr/stores \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: lenstrack"
```

---

## ✅ All APIs Available

- `POST /api/auth/login`
- `GET /api/hr/stores`
- `GET /api/attendance/today`
- All other backend APIs

---

**Last Updated:** 2026-02-28  
**Status:** ✅ **Use new URL in frontend**
