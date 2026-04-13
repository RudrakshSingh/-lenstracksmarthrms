# ✅ Backend API URL - Production

**Date:** 2026-02-28  
**Status:** ✅ **LIVE & ACCESSIBLE**

---

## 🌐 Backend API Base URL

```
http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com
```

**Type:** Internet-Facing Network Load Balancer (NLB)  
**Scheme:** internet-facing  
**Status:** Active

---

## 📋 Available APIs

All backend APIs are accessible via the above URL:

### Auth Service
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/refresh`

### HR Service
- `GET /api/hr/stores`
- `GET /api/hr/employees`
- `POST /api/hr/employees`
- `GET /api/hr/departments`
- `GET /api/hr/roles`
- `GET /api/hr/time-tracking`
- `GET /api/hr/dashboard/stats`
- All other HR endpoints

### Attendance Service
- `GET /api/attendance/today`
- `POST /api/attendance/clock-in`
- `POST /api/attendance/check-out`
- `GET /api/attendance/summary`
- `GET /api/attendance/timeline`
- `GET /api/attendance/status`
- All other attendance endpoints

### Other Services
- Tenant Registry: `/api/tenant/*`, `/api/tenants/*`
- Payroll: `/api/payroll/*`
- CRM: `/api/crm/*`
- Inventory: `/api/inventory/*`
- Sales: `/api/sales/*`
- Financial: `/api/financial/*`
- And all other configured services

---

## 🧪 Test Example

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

## ✅ Configuration

- **Ingress Controller:** nginx (internet-facing)
- **Load Balancer:** AWS NLB (internet-facing)
- **Security Groups:** Ports 80/443 open to 0.0.0.0/0
- **Routing:** All `/api/*` paths routed to backend services

---

**Last Updated:** 2026-02-28  
**Status:** ✅ **PRODUCTION READY**
