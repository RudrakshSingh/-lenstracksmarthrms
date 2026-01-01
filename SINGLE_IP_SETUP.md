# Single IP Setup - Frontend Integration

**IP Address:** `98.70.245.87`  
**Status:** ✅ CONFIGURED & WORKING  
**All Services:** Accessible through this ONE IP

---

## 🌐 **SINGLE IP FOR ALL SERVICES**

```
98.70.245.87
```

**This ONE IP provides access to:**
- ✅ auth-service
- ✅ hr-service
- ✅ attendance-service
- ✅ All future services

---

## 💻 **Frontend Configuration (Copy-Paste Ready)**

### JavaScript/React/Vue/Angular

```javascript
// Single base URL
const API_BASE_URL = 'http://98.70.245.87';

// API client with Host header
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Host': 'api.etelios.com'  // Required by Ingress
  }
});

// Or with fetch:
fetch('http://98.70.245.87/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Host': 'api.etelios.com'  // Add this header
  },
  body: JSON.stringify({ email, password })
});
```

### All Endpoints Through Single IP

```javascript
// Auth
POST   http://98.70.245.87/api/auth/login
POST   http://98.70.245.87/api/auth/mock-login-fast
GET    http://98.70.245.87/api/auth/profile

// HR
GET    http://98.70.245.87/api/hr/employees
POST   http://98.70.245.87/api/hr/employees
GET    http://98.70.245.87/api/hr/stores

// Attendance
POST   http://98.70.245.87/api/attendance/clock-in
POST   http://98.70.245.87/api/attendance/clock-out
GET    http://98.70.245.87/api/attendance/history
```

---

## ✅ **Benefits**

| Before (Multiple IPs) | After (Single IP) |
|----------------------|-------------------|
| 4 different IPs | 1 IP |
| 4 Load Balancers | 1 Load Balancer |
| ~$120/month | ~$30/month |
| Complex configuration | Simple |
| Hard to manage | Easy |

**Savings:** ~$90/month + simpler setup!

---

## 🧪 **Test Now**

```bash
# Test with Host header
curl -H "Host: api.etelios.com" http://98.70.245.87/api/auth/status

# Expected:
{
  "service": "auth-service",
  "status": "operational"
}
```

---

## 📋 **Quick Reference**

```
IP: 98.70.245.87
Host Header: api.etelios.com (required)

All endpoints: http://98.70.245.87/api/<service>/<endpoint>
```

**Status:** ✅ READY FOR FRONTEND DEVELOPMENT

