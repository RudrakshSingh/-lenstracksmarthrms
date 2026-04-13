# ⚠️ Attendance Service 503 Fix Status

**Date:** March 9, 2026  
**Issue:** Attendance Service returning 503 errors  
**Status:** ⏳ **IN PROGRESS - WAITING FOR ALB**

---

## 🔍 Diagnosis

### ✅ Service Status
- **Pods:** 2/2 Running and Ready ✅
- **Service:** ClusterIP configured correctly ✅
- **Ports:** 80 → 3003 ✅
- **Endpoints:** 2 healthy endpoints registered ✅
- **Pod Health:** Both pods returning 200 OK on `/health` ✅

### ⚠️ ALB Status
- **Target Group:** Not updated yet
- **Health Checks:** May be failing or pending
- **Status:** 503 Service Temporarily Unavailable

---

## 🔧 Fixes Applied

1. ✅ **Service Restart**
   - Restarted attendance-service deployment
   - Rollout completed successfully
   - New pods are healthy

2. ✅ **Ingress Reapply**
   - Reapplied ingress configuration
   - Forced ALB to refresh target group

3. ✅ **Service Configuration Verified**
   - Port 80 → 3003 mapping correct
   - Endpoints registered correctly
   - Pod health checks passing

---

## ⏳ Current Status

**ALB Target Group Update:** In Progress (2-5 minutes)

ALB target groups can take **2-5 minutes** to:
1. Detect new pod IPs
2. Register targets
3. Run health checks
4. Mark targets as healthy

---

## 📝 Next Steps

### Automatic (Recommended)
1. **Wait 2-5 minutes** for ALB to update
2. **Run test script:**
   ```bash
   ./scripts/test-attendance-after-fix.sh
   ```

### Manual (If Still 503 After 5 Minutes)
1. **Check AWS Console:**
   - EC2 → Target Groups
   - Find attendance-service target group
   - Check "Health checks" tab
   - Verify targets are registered and healthy

2. **If targets not registered:**
   - Manually register pod IPs to target group
   - Or restart ingress controller

3. **If health checks failing:**
   - Verify health check path: `/health`
   - Verify health check port: `80` (service port)
   - Check pod logs for errors

---

## 🧪 Test Commands

```bash
# Test attendance endpoints
TOKEN="your-token"
TENANT_ID="upcapto"
ALB_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com"

# Get attendance records
curl -X GET "$ALB_URL/api/attendance?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID"

# Clock in
curl -X POST "$ALB_URL/api/attendance/clock-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"latitude":19.0760,"longitude":72.8777}'

# Clock out
curl -X POST "$ALB_URL/api/attendance/clock-out" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"latitude":19.0760,"longitude":72.8777}'
```

---

## ✅ Expected Result

Once ALB updates (2-5 minutes):
- ✅ GET /api/attendance → 200 OK
- ✅ POST /api/attendance/clock-in → 200/201 OK
- ✅ POST /api/attendance/clock-out → 200/201 OK

---

## 📊 Summary

**Service Health:** ✅ **HEALTHY**  
**ALB Status:** ⏳ **UPDATING** (2-5 minutes)  
**Expected Resolution:** Automatic (wait for ALB)

---

**Last Updated:** March 9, 2026  
**Status:** ⏳ **WAITING FOR ALB TARGET GROUP UPDATE**
