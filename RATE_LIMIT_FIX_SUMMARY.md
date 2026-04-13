# 🚀 Rate Limiting Fix Summary

## ✅ Problem Fixed

**Issue:** API requests were being rate limited too aggressively:
- Ingress: Only **100 requests per minute**
- Services: **1000 requests per 15 minutes**
- This caused "Too many requests from this IP" errors during testing

## 🔧 Changes Made

### 1. **Ingress Rate Limiting** (`k8s/ingress.yaml`)
- **Before:** 100 requests/min, burst 20
- **After:** **10000 requests/min, burst 500**
- **Impact:** 100x increase at the gateway level

### 2. **HR Service** (`microservices/hr-service/src/server.js`)
- **Before:** 1000 requests/15min
- **After:** **10000 requests/15min** (configurable via `RATE_LIMIT_MAX_REQUESTS`)
- **Added:** Admin/SuperAdmin/HR users exempt from rate limiting

### 3. **Attendance Service** (`microservices/attendance-service/src/server.js`)
- **Before:** 1000 requests/15min
- **After:** **10000 requests/15min** (configurable via `RATE_LIMIT_MAX_REQUESTS`)
- **Added:** Admin/SuperAdmin/HR users exempt from rate limiting

### 4. **Auth Service** (`microservices/auth-service/src/server.js`)
- **Before:** 1000 requests/15min
- **After:** **10000 requests/15min** (configurable via `RATE_LIMIT_MAX_REQUESTS`)
- **Added:** Admin/SuperAdmin/HR users exempt from rate limiting

### 5. **Kubernetes Deployments**
Added environment variables to all service deployments:
- `RATE_LIMIT_MAX_REQUESTS=10000`
- `RATE_LIMIT_WINDOW_MS=900000` (15 minutes)

**Files Updated:**
- `k8s/etelios-prod/hr-service-deployment.yaml`
- `k8s/etelios-prod/attendance-service-deployment.yaml`
- `k8s/etelios-prod/auth-service-deployment.yaml`

## 📊 New Rate Limits

| Component | Old Limit | New Limit | Increase |
|-----------|-----------|-----------|----------|
| **Ingress** | 100/min | **10000/min** | 100x |
| **HR Service** | 1000/15min | **10000/15min** | 10x |
| **Attendance Service** | 1000/15min | **10000/15min** | 10x |
| **Auth Service** | 1000/15min | **10000/15min** | 10x |

## 🎯 Special Features

### Admin User Exemption
Admin, SuperAdmin, and HR users are now **exempt from rate limiting** when authenticated:
```javascript
skip: (req) => {
  return req.user && (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'hr');
}
```

### Health Check Exemption
Health check endpoints (`/health`, `/api/auth/health`) are exempt from rate limiting.

## 🚀 Deployment

### Option 1: Automated Script
```bash
./scripts/deploy-rate-limit-fix.sh
```

This script will:
1. Build and push updated Docker images
2. Apply updated Kubernetes configurations
3. Restart all service pods
4. Verify deployment

### Option 2: Manual Deployment

#### Step 1: Build and Push Images
```bash
# HR Service
docker buildx build --platform linux/amd64 \
  -f microservices/hr-service/Dockerfile \
  -t 383234048604.dkr.ecr.ap-south-1.amazonaws.com/etelios-hr-service:latest \
  --push .

# Attendance Service
docker buildx build --platform linux/amd64 \
  -f microservices/attendance-service/Dockerfile \
  -t 383234048604.dkr.ecr.ap-south-1.amazonaws.com/etelios-attendance-service:latest \
  --push .

# Auth Service
docker buildx build --platform linux/amd64 \
  -f microservices/auth-service/Dockerfile \
  -t 383234048604.dkr.ecr.ap-south-1.amazonaws.com/etelios-auth-service:latest \
  --push .
```

#### Step 2: Apply Kubernetes Configurations
```bash
# Update Ingress
kubectl apply -f k8s/ingress.yaml

# Update Service Deployments
kubectl apply -f k8s/etelios-prod/hr-service-deployment.yaml
kubectl apply -f k8s/etelios-prod/attendance-service-deployment.yaml
kubectl apply -f k8s/etelios-prod/auth-service-deployment.yaml
```

#### Step 3: Restart Pods
```bash
kubectl rollout restart deployment/hr-service -n etelios-prod
kubectl rollout restart deployment/attendance-service -n etelios-prod
kubectl rollout restart deployment/auth-service -n etelios-prod

# Wait for rollout
kubectl rollout status deployment/hr-service -n etelios-prod
kubectl rollout status deployment/attendance-service -n etelios-prod
kubectl rollout status deployment/auth-service -n etelios-prod
```

## 🧪 Testing

After deployment, test the APIs:

```bash
# Test multiple rapid requests (should not hit rate limit)
for i in {1..50}; do
  curl -X GET http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/hr/stores \
    -H "Authorization: Bearer <token>" \
    -H "x-tenant-id: lenstrack" &
done
wait

# Should all succeed without 429 errors
```

## 📝 Configuration

Rate limits can be adjusted via environment variables:

```yaml
env:
  - name: RATE_LIMIT_MAX_REQUESTS
    value: "10000"  # Adjust as needed
  - name: RATE_LIMIT_WINDOW_MS
    value: "900000"  # 15 minutes in milliseconds
```

## ⚠️ Notes

1. **Production Considerations:**
   - Current limits are set high for testing
   - Consider adjusting based on actual traffic patterns
   - Monitor for abuse and adjust accordingly

2. **Security:**
   - Admin users are exempt, but this is intentional for operational needs
   - Regular users still have rate limits applied
   - Health checks are exempt to prevent false alarms

3. **Monitoring:**
   - Monitor rate limit headers in responses
   - Check logs for rate limit warnings
   - Adjust limits if needed based on usage patterns

## ✅ Verification

After deployment, verify:

1. **Check Ingress:**
   ```bash
   kubectl get ingress -n etelios-prod
   kubectl describe ingress -n etelios-prod
   ```

2. **Check Service Logs:**
   ```bash
   kubectl logs -n etelios-prod deployment/hr-service | grep -i "rate"
   kubectl logs -n etelios-prod deployment/attendance-service | grep -i "rate"
   kubectl logs -n etelios-prod deployment/auth-service | grep -i "rate"
   ```

3. **Test API Calls:**
   - Make multiple rapid requests
   - Should not receive 429 errors
   - Admin users should have no limits

---

**Last Updated:** 2026-02-28
**Status:** ✅ Ready for Deployment
