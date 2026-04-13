# 🚀 Complete Production Deployment Guide

## Overview

This guide covers deploying all fixes to production, including:
1. ✅ ALB timeout configuration fix
2. ✅ All service rebuilds with latest fixes
3. ✅ ECR image push
4. ✅ EKS deployment
5. ✅ API verification

---

## 🔧 ALB Timeout Fix

### Problem
- Payroll service and other services returning **504 Gateway Timeout** errors
- ALB default idle timeout (60s) is too short for some operations

### Solution
- Increase ALB idle timeout to **120 seconds**
- Add proper health check configuration
- Enable connection draining

### Configuration
```yaml
annotations:
  alb.ingress.kubernetes.io/load-balancer-attributes: idle_timeout.timeout_seconds=120
  alb.ingress.kubernetes.io/healthcheck-timeout-seconds: '10'
  alb.ingress.kubernetes.io/healthcheck-interval-seconds: '30'
```

---

## 📋 Services to Deploy

### Priority Services (with fixes):
1. **auth-service** - Token payload fixes
2. **hr-service** - Employee field mapping, dashboard fixes
3. **attendance-service** - Clock-in/out fixes, auto check-in
4. **payroll-service** - Direct endpoints, timeout fixes
5. **tenant-registry-service** - Company endpoint fixes
6. **realtime-service** - WebSocket support

---

## 🚀 Deployment Steps

### Option 1: Automated Script (Recommended)

```bash
# Run the complete deployment script
./deploy-all-fixes-to-production.sh
```

This script will:
1. ✅ Verify prerequisites (AWS CLI, kubectl, Docker)
2. ✅ Fix ALB timeout configuration
3. ✅ Rebuild all services with latest fixes
4. ✅ Push images to ECR
5. ✅ Deploy to EKS
6. ✅ Verify deployment

### Option 2: Manual Steps

#### Step 1: Verify Prerequisites
```bash
# Check AWS credentials
aws sts get-caller-identity

# Check kubectl access
kubectl get nodes

# Check Docker
docker ps
```

#### Step 2: Fix ALB Timeout
```bash
# Update ingress with ALB timeout
kubectl apply -f k8s/ingress-alb-fixed.yaml
```

#### Step 3: Rebuild and Push Images
```bash
# Login to ECR
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin \
  383234048604.dkr.ecr.ap-south-1.amazonaws.com

# Build and push each service
for service in auth-service hr-service attendance-service payroll-service tenant-registry-service; do
  docker buildx build \
    --platform linux/amd64 \
    --tag 383234048604.dkr.ecr.ap-south-1.amazonaws.com/etelios-$service:latest \
    --file microservices/$service/Dockerfile \
    . \
    --push
done
```

#### Step 4: Deploy to EKS
```bash
# Update kubeconfig
aws eks update-kubeconfig --name etelios-prod-v2 --region ap-south-1

# Restart deployments
for service in auth-service hr-service attendance-service payroll-service tenant-registry-service; do
  kubectl rollout restart deployment $service -n etelios-prod
  kubectl rollout status deployment $service -n etelios-prod --timeout=300s
done
```

#### Step 5: Verify Deployment
```bash
# Get ALB URL
ALB_URL=$(kubectl get ingress etelios-ingress -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Test health endpoints
curl http://$ALB_URL/api/auth/health
curl http://$ALB_URL/api/hr/health
curl http://$ALB_URL/api/attendance/health
curl http://$ALB_URL/api/payroll/health
```

---

## 🔍 Verification Checklist

After deployment, verify:

- [ ] All pods are running: `kubectl get pods -n etelios-prod`
- [ ] ALB timeout is 120s: Check ALB attributes in AWS Console
- [ ] Health checks passing: All `/health` endpoints return 200
- [ ] Payroll APIs working: No more 504 errors
- [ ] Attendance APIs working: Clock-in/out functional
- [ ] HR APIs working: Employee CRUD operations functional

---

## 📊 Expected Results

### Before Fix:
- ❌ Payroll service: 504 Gateway Timeout
- ❌ Some attendance APIs: 503 Service Unavailable
- ❌ ALB idle timeout: 60 seconds (default)

### After Fix:
- ✅ Payroll service: 200 OK
- ✅ All attendance APIs: Working
- ✅ ALB idle timeout: 120 seconds
- ✅ All services: Healthy and responsive

---

## 🐛 Troubleshooting

### Issue: Images not pulling
```bash
# Check ECR permissions
aws ecr describe-repositories --region ap-south-1

# Verify image exists
aws ecr describe-images --repository-name etelios-payroll-service --region ap-south-1
```

### Issue: Pods not starting
```bash
# Check pod logs
kubectl logs -n etelios-prod deployment/payroll-service

# Check pod events
kubectl describe pod -n etelios-prod -l app=payroll-service
```

### Issue: ALB not updating
```bash
# Check ingress status
kubectl get ingress etelios-ingress -n etelios-prod -o yaml

# Check ALB in AWS Console
# EC2 → Load Balancers → Find ALB → Attributes → Idle timeout
```

### Issue: 504 errors persist
```bash
# Check service endpoints
kubectl get svc -n etelios-prod

# Test directly from pod
kubectl exec -n etelios-prod deployment/payroll-service -- curl http://localhost:3004/health

# Check ALB target health
# EC2 → Target Groups → Check health status
```

---

## 📝 Notes

1. **Image Tag**: Script uses timestamp-based tags for versioning
2. **Rollback**: Keep previous image tags for quick rollback if needed
3. **Monitoring**: Watch CloudWatch logs during deployment
4. **Zero Downtime**: Deployments use rolling updates (default)

---

## ✅ Success Criteria

Deployment is successful when:
- ✅ All pods are in `Running` state
- ✅ All health checks return 200 OK
- ✅ Payroll APIs respond within 5 seconds
- ✅ No 504 Gateway Timeout errors
- ✅ ALB idle timeout is 120 seconds

---

**Last Updated**: $(date)
**Deployment Script**: `deploy-all-fixes-to-production.sh`
