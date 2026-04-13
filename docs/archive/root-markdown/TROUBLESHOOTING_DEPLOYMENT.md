# 🔧 Troubleshooting Deployment Timeout

## Issue: Rollout Timeout

The deployment script is timing out during rollout. This is **normal** - pods take time to start.

---

## ✅ Quick Fix - Check Status

Run this to see what's happening:

```bash
./check-deployment-status.sh
```

Or manually:

```bash
# Check pod status
kubectl get pods -n etelios-prod | grep -E "payroll|hr-service"

# Check deployment status
kubectl get deployment payroll-service hr-service -n etelios-prod

# Check pod logs
kubectl logs -n etelios-prod -l app=payroll-service --tail=50
kubectl logs -n etelios-prod -l app=hr-service --tail=50
```

---

## 🎯 What's Happening

The timeout is happening because:
1. ✅ **Images built and pushed successfully** - This worked!
2. ✅ **Deployment restarted** - This worked!
3. ⏳ **Pods are starting** - This takes 2-5 minutes

**This is normal!** Kubernetes needs time to:
- Pull the new image
- Start the container
- Run health checks
- Mark pod as ready

---

## ✅ Solutions

### Option 1: Wait and Check (Recommended)

The deployment is probably still working. Just wait 2-3 minutes and check:

```bash
# Check if pods are running
kubectl get pods -n etelios-prod | grep -E "payroll|hr-service"

# If you see "Running" status, deployment succeeded!
```

### Option 2: Check Pod Status

```bash
# See detailed pod status
kubectl get pods -n etelios-prod -o wide | grep -E "payroll|hr-service"

# Check if pods are ready
kubectl get deployment payroll-service -n etelios-prod
kubectl get deployment hr-service -n etelios-prod
```

### Option 3: Check Pod Logs

```bash
# Get payroll pod name
PAYROLL_POD=$(kubectl get pods -n etelios-prod -l app=payroll-service -o jsonpath='{.items[0].metadata.name}')

# Check logs
kubectl logs -n etelios-prod $PAYROLL_POD

# Get HR pod name
HR_POD=$(kubectl get pods -n etelios-prod -l app=hr-service -o jsonpath='{.items[0].metadata.name}')

# Check logs
kubectl logs -n etelios-prod $HR_POD
```

### Option 4: Force Restart (if stuck)

If pods are stuck in "Pending" or "CrashLoopBackOff":

```bash
# Delete stuck pods (they will restart automatically)
kubectl delete pod -n etelios-prod -l app=payroll-service
kubectl delete pod -n etelios-prod -l app=hr-service

# Wait 2-3 minutes
sleep 180

# Check again
kubectl get pods -n etelios-prod | grep -E "payroll|hr-service"
```

---

## 📊 Expected Status

### Good Status (Working):
```
NAME                              READY   STATUS    RESTARTS   AGE
payroll-service-xxx-xxx           1/1     Running   0          2m
hr-service-xxx-xxx                 1/1     Running   0          2m
```

### Still Starting (Normal):
```
NAME                              READY   STATUS    RESTARTS   AGE
payroll-service-xxx-xxx           0/1     Running   0          1m
hr-service-xxx-xxx                 0/1     Running   0          1m
```

### Problem (Needs Action):
```
NAME                              READY   STATUS             RESTARTS   AGE
payroll-service-xxx-xxx           0/1     CrashLoopBackOff   3          5m
hr-service-xxx-xxx                 0/1     ImagePullBackOff   0          2m
```

---

## 🐛 Common Issues

### Issue 1: ImagePullBackOff
**Problem**: Can't pull image from ECR
**Solution**: 
```bash
# Check ECR login
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 383234048604.dkr.ecr.ap-south-1.amazonaws.com

# Check image exists
aws ecr describe-images --repository-name etelios-payroll-service --region ap-south-1
```

### Issue 2: CrashLoopBackOff
**Problem**: Pod starts but crashes
**Solution**: Check logs
```bash
kubectl logs -n etelios-prod -l app=payroll-service --tail=100
```

### Issue 3: Pending
**Problem**: Pod can't be scheduled
**Solution**: Check node resources
```bash
kubectl get nodes
kubectl describe pod -n etelios-prod -l app=payroll-service | grep -A 10 Events
```

---

## ✅ Verify Deployment Worked

After 2-3 minutes, check:

```bash
# 1. Pods are running
kubectl get pods -n etelios-prod | grep -E "payroll|hr-service"

# 2. Deployments show ready replicas
kubectl get deployment payroll-service hr-service -n etelios-prod

# 3. Test APIs
ALB_URL=$(kubectl get ingress -n etelios-prod -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}')
curl http://${ALB_URL}/api/payroll/health
curl http://${ALB_URL}/api/hr/health
```

---

## 🎉 Success Indicators

✅ **Deployment succeeded if:**
- Pods show `STATUS: Running`
- `READY: 1/1` or `2/2` (depending on replicas)
- Health endpoints return 200 OK
- No errors in logs

---

## 📝 Summary

**The timeout is normal!** The script times out after 5 minutes, but deployment continues in the background.

**What to do:**
1. ✅ Wait 2-3 minutes
2. ✅ Run `./check-deployment-status.sh`
3. ✅ Check if pods are running
4. ✅ Test APIs

**If pods are running, deployment succeeded!** 🎉
