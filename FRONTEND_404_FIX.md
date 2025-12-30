# Frontend 404 Error - Solution

## Problem
Frontend is getting **404 Not Found** when accessing:
```
https://98.70.245.87/api/auth/login
```

## Root Cause
The Kubernetes Ingress is configured with a **host-based routing rule** that requires the `Host: api.etelios.com` header. Without this header, the Ingress controller cannot route the request to the correct service.

---

## Solution 1: Add Host Header (Quick Fix)

### For Fetch API:
```javascript
fetch('https://98.70.245.87/api/auth/login', {
  method: 'POST',
  headers: {
    'Host': 'api.etelios.com',  // ✅ Required
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    emailOrEmployeeId: 'user@example.com',
    password: 'password123'
  })
})
```

### For Axios:
```javascript
axios.post('https://98.70.245.87/api/auth/login', {
  emailOrEmployeeId: 'user@example.com',
  password: 'password123'
}, {
  headers: {
    'Host': 'api.etelios.com'  // ✅ Required
  }
})
```

### ⚠️ Browser Limitation
**Important**: Modern browsers **cannot** set custom `Host` headers from JavaScript due to security restrictions. The `Host` header is automatically set by the browser based on the URL.

---

## Solution 2: Use Domain Name (Recommended for Production)

### Setup DNS:
1. Point `api.etelios.com` to `98.70.245.87` (A record)
2. Frontend uses the domain instead of IP:

```javascript
fetch('https://api.etelios.com/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    emailOrEmployeeId: 'user@example.com',
    password: 'password123'
  })
})
```

**Pros**:
- ✅ No custom headers needed
- ✅ Works in all browsers
- ✅ Proper SSL certificate can be issued
- ✅ Professional setup

---

## Solution 3: Remove Host Requirement (Development Only)

If you need direct IP access for development, we can modify the Ingress to accept requests without the Host header.

### Current Ingress Rule:
```yaml
rules:
  - host: api.etelios.com  # ← Requires Host header
    http:
      paths:
        - path: /api/auth
          pathType: Prefix
          backend:
            service:
              name: auth-service
              port:
                number: 3001
```

### Modified for Direct IP Access:
```yaml
rules:
  - http:  # ← No host specified, accepts any Host
      paths:
        - path: /api/auth
          pathType: Prefix
          backend:
            service:
              name: auth-service
              port:
                number: 3001
```

**Should I implement this change?** This allows direct IP access but removes host-based routing protection.

---

## Testing

### Test without Host header (currently fails):
```bash
curl -k https://98.70.245.87/api/auth/status
# Returns: 404 Not Found
```

### Test with Host header (currently works):
```bash
curl -k -H "Host: api.etelios.com" https://98.70.245.87/api/auth/status
# Returns: {"service":"auth-service","status":"operational",...}
```

---

## Recommended Approach

### For Development/Testing:
**Option A**: I can modify the Ingress to remove the host requirement
- Pros: Works immediately with IP
- Cons: Less secure, not production-ready

### For Production:
**Option B**: Setup DNS properly
- Pros: Professional, secure, works everywhere
- Cons: Requires DNS configuration

---

## Which solution do you prefer?

1. **Remove host requirement** (I can do this now) - Quick fix for development
2. **Keep host requirement** - Frontend adds header (won't work in browsers)
3. **Setup DNS** - Proper production solution

Let me know which approach you'd like, and I'll implement it immediately.

