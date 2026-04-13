# 🔧 Attendance Service 503 - ALB Troubleshooting Guide

**Date:** March 9, 2026  
**Issue:** Attendance service returning 503 after restart  
**Status:** 🔍 **TROUBLESHOOTING**

---

## 🔍 Current Status

### ✅ What's Working:
- Pods: Running (2/2)
- Deployment: Rolled out successfully
- Service: ClusterIP exists
- Restart: Completed

### ❌ What's Not Working:
- ALB: Returning 503 Service Temporarily Unavailable
- Target Group: Likely unhealthy
- Endpoints: May not be registered

---

## 🔍 Root Cause Analysis

The 503 error from ALB typically means:
1. **No healthy targets** in target group
2. **Health checks failing** on pods
3. **Service endpoints** not registered
4. **Port mismatch** between service and pods
5. **Health check path** incorrect

---

## 🛠️ Troubleshooting Steps

### Step 1: Check Service Endpoints

```bash
kubectl get endpoints -n etelios-prod attendance-service
```

**Expected:** Should show pod IPs and ports

**If empty:** Service can't find pods
- Check pod labels match service selector
- Check pod readiness probes

### Step 2: Check Pod Health

```bash
# Get pod name
POD=$(kubectl get pods -n etelios-prod -l app=attendance-service -o jsonpath='{.items[0].metadata.name}')

# Check health endpoint directly
kubectl exec -n etelios-prod $POD -- curl http://localhost:3003/health
```

**Expected:** Should return 200 OK

**If fails:** Pod health endpoint not working

### Step 3: Check Service Port

```bash
kubectl get svc -n etelios-prod attendance-service -o yaml | grep -A 5 "ports:"
```

**Expected:** Port should match pod container port (3003)

**Common Issue:** Service port 80, but pod port 3003

### Step 4: Check ALB Target Group (AWS Console)

1. Go to **EC2 → Target Groups**
2. Find target group for attendance service
3. Check **Health checks** tab
4. Verify:
   - Health check path: `/health` or `/api/attendance/health`
   - Port: 80 or 3003
   - Protocol: HTTP
   - Healthy threshold: 2
   - Unhealthy threshold: 3

### Step 5: Check Target Registration

In AWS Console → Target Groups → Targets tab:
- Are targets registered?
- Are they healthy?
- What's the health check status?

---

## 🔧 Fixes

### Fix 1: Verify Service Port Mapping

```yaml
# Service should map port 80 to pod port 3003
apiVersion: v1
kind: Service
metadata:
  name: attendance-service
spec:
  ports:
  - port: 80
    targetPort: 3003  # ✅ Must match pod container port
    protocol: TCP
```

### Fix 2: Add Health Check Endpoint

Ensure attendance service has `/health` endpoint:

```javascript
// In attendance-service/src/server.js
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'attendance-service',
    timestamp: new Date().toISOString()
  });
});
```

### Fix 3: Fix Service Selector

```bash
# Check service selector matches pod labels
kubectl get svc -n etelios-prod attendance-service -o yaml | grep selector
kubectl get pods -n etelios-prod -l app=attendance-service --show-labels
```

**Selector should match pod labels:**
```yaml
selector:
  app: attendance-service
```

### Fix 4: Restart Service with Correct Port

```bash
# Patch service to ensure correct port
kubectl patch svc attendance-service -n etelios-prod -p '{"spec":{"ports":[{"port":80,"targetPort":3003,"protocol":"TCP"}]}}'

# Restart deployment
kubectl rollout restart deployment/attendance-service -n etelios-prod
```

### Fix 5: Check Ingress Configuration

```bash
# Verify ingress routes attendance correctly
kubectl get ingress -n etelios-prod -o yaml | grep -A 10 "attendance"
```

**Should have:**
```yaml
- path: /api/attendance
  pathType: Prefix
  backend:
    service:
      name: attendance-service
      port:
        number: 80
```

---

## 🧪 Test After Fix

### Test 1: Direct Pod Access

```bash
POD=$(kubectl get pods -n etelios-prod -l app=attendance-service -o jsonpath='{.items[0].metadata.name}')
kubectl port-forward -n etelios-prod $POD 3003:3003

# In another terminal
curl http://localhost:3003/health
```

### Test 2: Service Access

```bash
# Port forward service
kubectl port-forward -n etelios-prod svc/attendance-service 8080:80

# Test
curl http://localhost:8080/health
```

### Test 3: ALB Access

```bash
curl -X GET 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/api/attendance/health' \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'x-tenant-id: upcapto'
```

---

## 📋 Checklist

- [ ] Service endpoints have pod IPs
- [ ] Pods respond to health checks
- [ ] Service port mapping is correct (80 → 3003)
- [ ] Health check endpoint exists (`/health`)
- [ ] ALB target group has registered targets
- [ ] Targets are healthy in ALB
- [ ] Ingress routes correctly to service
- [ ] Service selector matches pod labels

---

## 🚨 Common Issues

### Issue 1: Port Mismatch
**Symptom:** Service port 80, but pod port 3003  
**Fix:** Update service `targetPort` to 3003

### Issue 2: No Health Endpoint
**Symptom:** Health checks failing  
**Fix:** Add `/health` endpoint to service

### Issue 3: Service Selector Mismatch
**Symptom:** Endpoints empty  
**Fix:** Ensure service selector matches pod labels

### Issue 4: ALB Health Check Path Wrong
**Symptom:** Targets unhealthy  
**Fix:** Update ALB health check path to `/health` or `/api/attendance/health`

---

## 📄 Scripts

1. **Check ALB Health:**
   ```bash
   ./scripts/check-attendance-alb-health.sh
   ```

2. **Fix Service:**
   ```bash
   ./scripts/fix-attendance-service-503.sh
   ```

---

## ✅ Expected Result

After fixes:
- ✅ Service endpoints show pod IPs
- ✅ Health checks return 200
- ✅ ALB targets are healthy
- ✅ API returns 200 OK (not 503)

---

**Last Updated:** March 9, 2026  
**Status:** 🔍 **TROUBLESHOOTING IN PROGRESS**
