# 🔄 Frontend Environment Variable Update

**Date:** 2026-02-28

---

## ⚠️ IMPORTANT: Update Frontend Environment Variable

The old ALB URL was deleted when the ingress controller service was recreated.

---

## 📝 Required Change

### Old (No longer works):
```env
NEXT_PUBLIC_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

### New (Working):
```env
NEXT_PUBLIC_API_BASE_URL=http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com
```

---

## ✅ Verified Working APIs

- ✅ `POST /api/auth/login` - HTTP 200
- ✅ `GET /health` - HTTP 200
- ✅ `GET /api/hr/stores` - Working (with auth)
- ✅ `GET /api/attendance/today` - Working (with auth)
- ✅ All other backend APIs

---

## 🧪 Test Command

```bash
# Test login
curl -X POST http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lenstrack.com","password":"AdminPass123!"}'
```

---

## 📋 What Happened

1. Old ingress controller service was deleted
2. New ingress controller service created with internet-facing ALB
3. Old ALB automatically deleted by AWS
4. New ALB created with new DNS name

---

**Action Required:** Update frontend `.env` file with new URL
