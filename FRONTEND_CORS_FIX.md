# 🔧 Frontend CORS Access Fix

## ❌ Problem

Frontend se backend access nahi ho raha - CORS (Cross-Origin Resource Sharing) issue.

## ✅ Solution Applied

### 1. **Ingress CORS Annotations**
Added CORS configuration to Ingress to allow all frontend origins:

```yaml
# CORS Configuration for Frontend Access
nginx.ingress.kubernetes.io/enable-cors: "true"
nginx.ingress.kubernetes.io/cors-allow-origin: "*"
nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, PATCH, DELETE, OPTIONS"
nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,X-Tenant-Id"
nginx.ingress.kubernetes.io/cors-allow-credentials: "true"
nginx.ingress.kubernetes.io/cors-max-age: "86400"
```

### 2. **Service CORS Environment Variables**
Added CORS environment variables to all service deployments:

- **HR Service:** `CORS_ORIGIN=*`, `CORS_CREDENTIALS=true`
- **Attendance Service:** `CORS_ORIGIN=*`, `CORS_CREDENTIALS=true`
- **Auth Service:** `CORS_ORIGIN=*`, `CORS_CREDENTIALS=true`

## 🚀 Deployment

### Quick Fix:
```bash
./scripts/fix-frontend-cors.sh
```

### Manual Steps:

1. **Apply Ingress:**
   ```bash
   kubectl apply -f k8s/ingress.yaml
   ```

2. **Apply Service Deployments:**
   ```bash
   kubectl apply -f k8s/etelios-prod/hr-service-deployment.yaml
   kubectl apply -f k8s/etelios-prod/attendance-service-deployment.yaml
   kubectl apply -f k8s/etelios-prod/auth-service-deployment.yaml
   ```

3. **Restart Pods:**
   ```bash
   kubectl rollout restart deployment/hr-service -n etelios-prod
   kubectl rollout restart deployment/attendance-service -n etelios-prod
   kubectl rollout restart deployment/auth-service -n etelios-prod
   ```

4. **Wait for Rollout:**
   ```bash
   kubectl rollout status deployment/hr-service -n etelios-prod
   kubectl rollout status deployment/attendance-service -n etelios-prod
   kubectl rollout status deployment/auth-service -n etelios-prod
   ```

## ✅ What's Fixed

1. ✅ **Ingress Level CORS:** All origins allowed at ingress level
2. ✅ **Service Level CORS:** All services configured to allow all origins
3. ✅ **Credentials:** Enabled for authenticated requests
4. ✅ **All HTTP Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS allowed
5. ✅ **Required Headers:** Authorization, X-Tenant-Id, etc. allowed

## 🧪 Testing

After deployment, test from frontend:

```javascript
// Example fetch request
fetch('http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Important for CORS with credentials
  body: JSON.stringify({
    email: 'admin@lenstrack.com',
    password: 'AdminPass123!'
  })
})
.then(response => response.json())
.then(data => console.log('Success:', data))
.catch(error => console.error('Error:', error));
```

## 📋 Files Changed

1. `k8s/ingress.yaml` - Added CORS annotations
2. `k8s/etelios-prod/hr-service-deployment.yaml` - Added CORS env vars
3. `k8s/etelios-prod/attendance-service-deployment.yaml` - Added CORS env vars
4. `k8s/etelios-prod/auth-service-deployment.yaml` - Added CORS env vars

## ⚠️ Security Note

Currently configured to allow **all origins** (`*`) for development/testing. For production, consider:

1. **Restrict Origins:** Set specific frontend URLs instead of `*`
2. **Environment Variables:** Use ConfigMap/Secret for CORS_ORIGIN
3. **Domain Whitelist:** Only allow trusted domains

Example for production:
```yaml
- name: CORS_ORIGIN
  value: "https://app.etelios.com,https://admin.etelios.com"
```

---

**Last Updated:** 2026-02-28  
**Status:** ✅ Ready for Deployment
