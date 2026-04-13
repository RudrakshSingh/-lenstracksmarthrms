# ⚠️ Attendance Service 503 - Current Status

**Date:** March 9, 2026  
**Status:** ❌ **Still Returning 503**

---

## 🔍 Test Results

### ✅ Working:
- Login: ✅ Success
- Token: ✅ Valid

### ❌ Not Working:
- Attendance API: ❌ 503 Service Temporarily Unavailable
- Clock In: ❌ 503 Service Temporarily Unavailable

---

## 🔧 What Needs to Be Done

### Option 1: Run the Fix Script

```bash
./scripts/fix-attendance-backend-complete.sh
```

This will:
- Check service status
- Verify ports
- Restart service
- Test health endpoints

### Option 2: Manual Fix

```bash
# 1. Restart service
kubectl rollout restart deployment/attendance-service -n etelios-prod

# 2. Wait for rollout
kubectl rollout status deployment/attendance-service -n etelios-prod --timeout=120s

# 3. Verify ingress
kubectl apply -f k8s/ingress-alb-fixed.yaml -n etelios-prod

# 4. Check service endpoints
kubectl get endpoints -n etelios-prod attendance-service
```

### Option 3: Check ALB Target Group (AWS Console)

1. Go to **EC2 → Target Groups**
2. Find target group for attendance service
3. Check **Targets** tab:
   - Are targets registered?
   - Health status: healthy/unhealthy?
   - What's the health check result?

4. If unhealthy:
   - Check health check path (should be `/health` or `/api/attendance/health`)
   - Check port (should be 80)
   - Wait 2-5 minutes for health checks to pass

---

## 🔍 Root Cause Analysis

The 503 error means ALB can't reach healthy targets. Possible causes:

1. **Service endpoints empty** - Service can't find pods
2. **ALB target group unhealthy** - Health checks failing
3. **Port mismatch** - Service/Ingress/ALB port mismatch
4. **Pods not ready** - Pods crashing or not starting
5. **ALB propagation delay** - Takes 2-5 minutes to update

---

## 📋 Checklist

Run these commands to diagnose:

```bash
# 1. Check pods
kubectl get pods -n etelios-prod -l app=attendance-service

# 2. Check service
kubectl get svc -n etelios-prod attendance-service

# 3. Check endpoints (CRITICAL - should have pod IPs)
kubectl get endpoints -n etelios-prod attendance-service

# 4. Check pod health
POD=$(kubectl get pods -n etelios-prod -l app=attendance-service -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n etelios-prod $POD -- curl http://localhost:3003/health

# 5. Check ingress
kubectl get ingress -n etelios-prod -o yaml | grep -A 5 "attendance"
```

---

## ✅ Expected Results

After fix, you should see:

1. **Pods:** Running (2/2)
2. **Service:** Port 80 → Target Port 3003
3. **Endpoints:** Has pod IPs (not empty)
4. **Health Check:** Returns 200
5. **API:** Returns 200 (not 503)

---

## ⏳ Timeline

- **Service restart:** 1-2 minutes
- **ALB target group update:** 2-5 minutes
- **Health checks to pass:** 1-3 minutes

**Total wait time:** 3-8 minutes after running fix script

---

## 🚨 If Still 503 After 10 Minutes

1. **Check AWS Console:**
   - EC2 → Target Groups → Check health status
   - CloudWatch → Check service logs

2. **Check Kubernetes:**
   - Pod logs: `kubectl logs -n etelios-prod -l app=attendance-service --tail=50`
   - Service events: `kubectl describe svc attendance-service -n etelios-prod`

3. **Check Ingress:**
   - Verify ingress is using port 80 (not 3003)
   - Check ALB controller logs

---

## 📄 Files

- **Fix Script:** `scripts/fix-attendance-backend-complete.sh`
- **Manual Guide:** `docs/BACKEND_ATTENDANCE_FIX_MANUAL.md`
- **Ingress Config:** `k8s/ingress-alb-fixed.yaml` (already fixed)

---

**Last Updated:** March 9, 2026  
**Status:** ❌ **503 - NEEDS MANUAL FIX**
