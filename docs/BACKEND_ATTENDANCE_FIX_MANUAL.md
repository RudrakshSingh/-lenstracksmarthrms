# 🔧 Backend Attendance Service Fix - Manual Steps

**Date:** March 9, 2026  
**Issue:** Attendance service returning 503  
**Status:** 🔧 **MANUAL FIX REQUIRED**

---

## 🚀 Quick Fix (Run This Script)

```bash
./scripts/fix-attendance-backend-complete.sh
```

This script will:
1. ✅ Check current status
2. ✅ Verify service ports
3. ✅ Check pod health
4. ✅ Restart service
5. ✅ Verify after restart
6. ✅ Test health endpoints

---

## 📋 Manual Steps (If Script Doesn't Work)

### Step 1: Check Service Status

```bash
kubectl get pods -n etelios-prod -l app=attendance-service
kubectl get svc -n etelios-prod attendance-service
kubectl get endpoints -n etelios-prod attendance-service
```

### Step 2: Verify Service Ports

Service should have:
- Port: `80`
- Target Port: `3003`

If wrong, fix it:
```bash
kubectl patch svc attendance-service -n etelios-prod --type='json' -p='[
  {"op": "replace", "path": "/spec/ports/0/port", "value": 80},
  {"op": "replace", "path": "/spec/ports/0/targetPort", "value": 3003}
]'
```

### Step 3: Restart Service

```bash
kubectl rollout restart deployment/attendance-service -n etelios-prod
kubectl rollout status deployment/attendance-service -n etelios-prod --timeout=120s
```

### Step 4: Verify Ingress

```bash
kubectl get ingress -n etelios-prod -o yaml | grep -A 5 "attendance"
```

Ingress should use port `80` (not 3003).

If wrong:
```bash
kubectl apply -f k8s/ingress-alb-fixed.yaml -n etelios-prod
```

### Step 5: Check Pod Health

```bash
POD=$(kubectl get pods -n etelios-prod -l app=attendance-service -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n etelios-prod $POD -- curl http://localhost:3003/health
```

Should return `200 OK`.

### Step 6: Wait for ALB

Wait 1-2 minutes for ALB target group to update.

### Step 7: Test API

```bash
curl -X GET 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/api/attendance?page=1&limit=10' \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'x-tenant-id: upcapto'
```

---

## 🔍 Troubleshooting

### Issue 1: Endpoints Empty

**Symptom:** `kubectl get endpoints` shows no IPs

**Fix:**
```bash
# Check service selector matches pod labels
kubectl get svc -n etelios-prod attendance-service -o yaml | grep selector
kubectl get pods -n etelios-prod -l app=attendance-service --show-labels
```

### Issue 2: Pods Not Ready

**Symptom:** Pods in `CrashLoopBackOff` or `Pending`

**Fix:**
```bash
# Check pod logs
kubectl logs -n etelios-prod -l app=attendance-service --tail=50

# Check pod events
kubectl describe pod -n etelios-prod -l app=attendance-service
```

### Issue 3: Health Check Failing

**Symptom:** Pod health endpoint returns non-200

**Fix:**
- Check if `/health` endpoint exists in attendance service
- Verify service is listening on port 3003
- Check pod logs for errors

### Issue 4: ALB Still 503

**Symptom:** Service works but ALB returns 503

**Fix:**
1. Check AWS Console → EC2 → Target Groups
2. Verify targets are registered
3. Check health check path (`/health` or `/api/attendance/health`)
4. Wait 2-5 minutes for ALB to update

---

## ✅ Success Criteria

After fix, you should see:
- ✅ Pods: Running (2/2)
- ✅ Service: Port 80 → Target Port 3003
- ✅ Endpoints: Has pod IPs
- ✅ Health Check: Returns 200
- ✅ API: Returns 200 (not 503)

---

## 📄 Files

- **Script:** `scripts/fix-attendance-backend-complete.sh`
- **Ingress:** `k8s/ingress-alb-fixed.yaml` (already fixed)
- **Service Config:** `k8s/etelios-prod/attendance-service-deployment.yaml`

---

**Last Updated:** March 9, 2026  
**Status:** 🔧 **READY TO RUN**
