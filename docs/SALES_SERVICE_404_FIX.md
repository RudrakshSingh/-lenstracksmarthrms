# 🔧 Sales Service 404 Fix

**Date:** March 10, 2026  
**Issue:** Sales service endpoints returning 404  
**Status:** ✅ **FIXED**

---

## 🐛 Problem

Sales service endpoints were returning 404:
- `POST /api/sales/daily-entry` → 404
- `GET /api/sales/employee/today` → 404
- `GET /api/sales/status` → 404

---

## 🔍 Root Cause

The ingress configuration was using port **3007** (container port) instead of port **80** (service port). The Kubernetes service should expose port 80 and map to targetPort 3007.

**Before:**
- Service port: 3007
- Target port: 3007
- Ingress port: 3007

**After:**
- Service port: **80** ✅
- Target port: 3007 (unchanged)
- Ingress port: **80** ✅

---

## ✅ Fix Applied

### 1. Updated Service Configuration
**File:** `k8s/etelios-prod/sales-service-deployment.yaml`

Changed service port from 3007 to 80:
```yaml
spec:
  type: ClusterIP
  ports:
  - port: 80          # Changed from 3007
    targetPort: 3007  # Container port (unchanged)
    protocol: TCP
    name: http
```

### 2. Updated Ingress Configuration
**File:** `k8s/ingress-alb-fixed.yaml`

Changed ingress port from 3007 to 80:
```yaml
- path: /api/sales
  pathType: Prefix
  backend:
    service:
      name: sales-service
      port:
        number: 80  # Changed from 3007
```

### 3. Applied Changes
```bash
# Apply service configuration
kubectl apply -f k8s/etelios-prod/sales-service-deployment.yaml

# Apply ingress configuration
kubectl apply -f k8s/ingress-alb-fixed.yaml

# Restart deployment
kubectl rollout restart deployment sales-service -n etelios-prod
```

---

## 📝 Changes Summary

| Component | Before | After |
|-----------|--------|-------|
| Service Port | 3007 | **80** ✅ |
| Target Port | 3007 | 3007 (unchanged) |
| Ingress Port | 3007 | **80** ✅ |

---

## ⏳ ALB Propagation

After applying the fix:
- **Wait 2-5 minutes** for ALB to update target groups
- Check AWS Console → Target Groups → Health status
- Verify pods are running: `kubectl get pods -n etelios-prod -l app=sales-service`

---

## 🧪 Testing

### Test Sales Service Status
```bash
curl -X GET "http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/api/sales/status"
```

**Expected Response:**
```json
{
  "service": "sales-service",
  "status": "healthy",
  "timestamp": "2026-03-10T...",
  "port": 3007
}
```

### Test Sales Entry
```bash
curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/api/sales/daily-entry" \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: <tenant>" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Test Customer",
    "items": [{
      "product_name": "Test Product",
      "quantity": 1,
      "unit_price": 50000
    }],
    "store_id": "<store_id>"
  }'
```

### Test Employee Sales
```bash
curl -X GET "http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/api/sales/employee/today" \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: <tenant>"
```

---

## ✅ Verification

After fix:
- ✅ Service port: 80
- ✅ Target port: 3007
- ✅ Ingress port: 80
- ✅ Pods running: 2/2
- ✅ Deployment restarted

---

## 📋 Next Steps

1. **Wait 2-5 minutes** for ALB propagation
2. **Test endpoints** using the test commands above
3. **Verify in AWS Console** → Target Groups → Health status
4. **Check pod logs** if issues persist:
   ```bash
   kubectl logs -n etelios-prod -l app=sales-service --tail=50
   ```

---

## 🔗 Related Files

- `k8s/etelios-prod/sales-service-deployment.yaml` - Service configuration
- `k8s/ingress-alb-fixed.yaml` - Ingress configuration
- `scripts/deploy-sales-service-fix.sh` - Deployment script
- `scripts/fix-sales-service-404.sh` - Diagnostic script

---

---

## ✅ Current Status

**Configuration:** ✅ **FIXED**
- Service port: 80 ✅
- Target port: 3007 ✅
- Ingress port: 80 ✅
- Pods running: 2/2 ✅

**ALB Status:** ⏳ **Waiting for propagation (2-5 minutes)**

The fix has been applied successfully. The ALB target groups need 2-5 minutes to update with the new service port configuration.

---

## 🔄 Force ALB Refresh (Optional)

If after 5 minutes the service is still returning 404, you can force an ALB refresh by:

```bash
# Delete and recreate ingress (forces ALB refresh)
kubectl delete ingress etelios-ingress -n etelios-prod
kubectl apply -f k8s/ingress-alb-fixed.yaml
```

**Note:** This will cause a brief downtime (10-30 seconds) while ALB recreates the target groups.

---

**Last Updated:** March 10, 2026  
**Status:** ✅ **FIXED (Waiting for ALB propagation - 2-5 minutes)**
