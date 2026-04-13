# Check Deployment Status

## 🔍 Quick Status Check

Run these commands to see if deployments were actually created:

```bash
# Check all deployments
kubectl get deployments -n etelios-prod

# Check all pods
kubectl get pods -n etelios-prod

# Check services
kubectl get services -n etelios-prod

# Check one deployment in detail
kubectl describe deployment auth-service -n etelios-prod
```

---

## 🐛 If Deployments Don't Exist

The issue is likely AWS CLI permission error affecting kubectl authentication.

### Option 1: Fix AWS CLI Permissions

```bash
sudo chown -R $(whoami) /opt/homebrew/Cellar/awscli
```

Then re-run:
```bash
./day3-aws-setup.sh
```

### Option 2: Manual Deployment (If Script Fails)

Deploy manually:

```bash
# Deploy all services
for service in analytics-service attendance-service auth-service cpp-service crm-service document-service financial-service hr-service inventory-service jts-service monitoring-service notification-service payroll-service prescription-service purchase-service realtime-service sales-service service-management tenant-management-service tenant-registry-service; do
  kubectl apply --validate=false -f k8s/etelios-prod/$service-deployment.yaml
done
```

---

## ✅ If Deployments Exist

If deployments were created (despite errors), check pod status:

```bash
# Check pod status
kubectl get pods -n etelios-prod

# Check pod logs if they're not running
kubectl logs -n etelios-prod -l app=auth-service

# Check events
kubectl get events -n etelios-prod --sort-by='.lastTimestamp'
```

---

## 🔧 Common Issues

### Pods in ImagePullBackOff

If pods can't pull images:
```bash
# Check ECR secret
kubectl get secret ecr-registry-secret -n etelios-prod

# Recreate ECR secret if needed
kubectl create secret docker-registry ecr-registry-secret \
  --docker-server=383234048604.dkr.ecr.ap-south-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$(aws ecr get-login-password --region ap-south-1) \
  --namespace etelios-prod \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Pods in CrashLoopBackOff

Check logs:
```bash
kubectl logs -n etelios-prod <pod-name>
kubectl describe pod <pod-name> -n etelios-prod
```

---

## 📊 Quick Status Summary

```bash
# All in one
kubectl get all -n etelios-prod
```
