# Grafana 503 Error - Fix Status

## ✅ Fix Applied

**Date:** March 9, 2026  
**Status:** Health check updated, targets becoming healthy

## What Was Done

1. ✅ **Updated ALB Target Group Health Check**
   - Target Group: `k8s-eteliosp-grafanap-fd87365e2c`
   - ARN: `arn:aws:elasticloadbalancing:ap-south-1:383234048604:targetgroup/k8s-eteliosp-grafanap-fd87365e2c/a869a13a79560f4d`
   - Health Check Path: Changed from `/health` → `/api/health`
   - Health Check Interval: 30 seconds
   - Healthy Threshold: 2 consecutive successful checks
   - Unhealthy Threshold: 3 consecutive failed checks

## Current Status

- ✅ Health check path updated successfully
- ⏳ Targets are being evaluated (needs 2 consecutive successful health checks)
- ⏳ Expected time: 1-2 minutes from update time

## How ALB Health Checks Work

1. ALB checks `/api/health` endpoint every 30 seconds
2. Needs **2 consecutive successful checks** to mark target as healthy
3. Total time: ~60 seconds minimum (2 × 30 seconds)
4. Once healthy, Grafana will be accessible

## Verify Fix

### Check Target Health:
```bash
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:ap-south-1:383234048604:targetgroup/k8s-eteliosp-grafanap-fd87365e2c/a869a13a79560f4d \
  --region ap-south-1
```

### Test Access:
```bash
curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/grafana
```

Expected: HTTP 200 or 302 (redirect to login)

## If Still 503 After 2 Minutes

1. Check target health status in AWS Console
2. Verify Grafana pod is running: `kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana`
3. Test health endpoint directly: `curl http://10.100.8.142/api/health`
4. Check ALB controller logs: `kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller`

## Access Grafana

Once healthy:
- **URL:** http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/grafana
- **Username:** admin
- **Password:** admin123 (or your configured password)

---

**Last Updated:** March 9, 2026, 11:15 AM IST
