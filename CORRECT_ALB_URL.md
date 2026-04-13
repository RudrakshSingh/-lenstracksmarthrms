# ✅ Correct ALB URL

**Date:** 2026-02-28

---

## ❌ Wrong ALB URL (Not Resolving)

```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

**Error:** `Could not resolve host`

---

## ✅ Correct ALB URL

```
http://etelios-frontend-alb-557163772.ap-south-1.elb.amazonaws.com
```

**Status:** ✅ **Working!**

---

## 🧪 Test Results

### Health Endpoint
```bash
curl http://etelios-frontend-alb-557163772.ap-south-1.elb.amazonaws.com/health
```

### Login API
```bash
curl -X POST http://etelios-frontend-alb-557163772.ap-south-1.elb.amazonaws.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lenstrack.com","password":"AdminPass123!"}'
```

### HR API
```bash
curl http://etelios-frontend-alb-557163772.ap-south-1.elb.amazonaws.com/api/hr/stores \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: lenstrack"
```

---

## 📋 ALB Details

- **Name:** etelios-frontend-alb
- **DNS:** etelios-frontend-alb-557163772.ap-south-1.elb.amazonaws.com
- **Scheme:** internet-facing
- **State:** active
- **Security Groups:** ✅ Ports 80/443 open

---

## 🔧 Frontend Configuration

Update your frontend `.env` or config:

```env
REACT_APP_API_URL=http://etelios-frontend-alb-557163772.ap-south-1.elb.amazonaws.com
# or
VITE_API_URL=http://etelios-frontend-alb-557163772.ap-south-1.elb.amazonaws.com
```

---

## ⚠️ Note

The ingress still shows the old ALB DNS. This might be from a previous ALB that was deleted. The current working ALB is `etelios-frontend-alb-557163772.ap-south-1.elb.amazonaws.com`.

---

**Last Updated:** 2026-02-28  
**Status:** ✅ ALB is working with correct URL
