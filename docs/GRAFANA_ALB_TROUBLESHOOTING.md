# Grafana ALB 503 Error - Troubleshooting Guide

## Issue
Grafana accessible via ALB at `/grafana` path returns 503 error.

## Root Cause
ALB health check is configured to check `/health` path, but Grafana's health endpoint is at `/api/health`. This causes targets to be marked unhealthy.

## Current Status
- ✅ Service created: `grafana-proxy` in `etelios-prod` namespace
- ✅ Endpoints configured: Points to Grafana service ClusterIP (10.100.8.142:80)
- ✅ Ingress route added: `/grafana` path configured
- ✅ Target group created: `k8s-eteliosp-grafanap-fd87365e2c`
- ❌ Health check failing: ALB checking `/health` but Grafana has `/api/health`

## Solution Options

### Option 1: Update Health Check via AWS Console (Recommended)
1. Go to AWS Console → EC2 → Target Groups
2. Find target group: `k8s-eteliosp-grafanap-fd87365e2c`
3. Click "Health checks" tab
4. Edit health check:
   - Health check path: `/api/health`
   - Healthy threshold: 2
   - Unhealthy threshold: 3
   - Timeout: 10 seconds
   - Interval: 30 seconds
5. Save changes
6. Wait 1-2 minutes for targets to become healthy

### Option 2: Use Port-Forward (Temporary Workaround)
```bash
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# Access at: http://localhost:3000
```

### Option 3: Create Health Endpoint Proxy
Create a simple service that proxies `/health` to Grafana's `/api/health`.

## Verify Fix
```bash
# Check target health
aws elbv2 describe-target-health \
  --target-group-arn <TG_ARN> \
  --region ap-south-1

# Test access
curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/grafana/login
```

## Expected Result
- HTTP 200 or 302 (redirect to login)
- Grafana login page accessible

## Current Configuration
- **Service:** `grafana-proxy` (ClusterIP)
- **Endpoints:** 10.100.8.142:80 (Grafana service ClusterIP)
- **Ingress Path:** `/grafana`
- **ALB URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/grafana`
