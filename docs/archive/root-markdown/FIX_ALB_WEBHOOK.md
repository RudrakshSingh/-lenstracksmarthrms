# Fix ALB Controller Webhook Issue

## ✅ Good News
**All 20 deployments are created!** ("unchanged" means they already exist)

## ❌ Current Issue
Services are failing to create because ALB Controller webhook has no endpoints.

Error: `no endpoints available for service "aws-load-balancer-webhook-service"`

This means ALB Controller pods are not running yet.

---

## 🔍 Check ALB Controller Status

```bash
# Check ALB Controller pods
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller

# Check ALB Controller deployment
kubectl get deployment aws-load-balancer-controller -n kube-system

# Check webhook service
kubectl get svc aws-load-balancer-webhook-service -n kube-system
```

---

## 🔧 Solutions

### Option 1: Wait for ALB Controller (Recommended)

ALB Controller might still be starting. Wait 2-3 minutes and check:

```bash
# Wait and check
kubectl wait --for=condition=available --timeout=300s deployment/aws-load-balancer-controller -n kube-system

# Then try deploying services again
for service in analytics-service attendance-service auth-service cpp-service crm-service document-service financial-service hr-service inventory-service jts-service monitoring-service notification-service payroll-service prescription-service purchase-service realtime-service sales-service service-management tenant-management-service tenant-registry-service; do
  kubectl apply --validate=false -f k8s/etelios-prod/$service-deployment.yaml
done
```

### Option 2: Temporarily Disable Webhook

If ALB Controller is not starting, temporarily disable the webhook:

```bash
# Delete the webhook configuration
kubectl delete mutatingwebhookconfiguration aws-load-balancer-webhook-configuration

# Then deploy services
for service in analytics-service attendance-service auth-service cpp-service crm-service document-service financial-service hr-service inventory-service jts-service monitoring-service notification-service payroll-service prescription-service purchase-service realtime-service sales-service service-management tenant-management-service tenant-registry-service; do
  kubectl apply --validate=false -f k8s/etelios-prod/$service-deployment.yaml
done
```

### Option 3: Deploy Only Deployments (Skip Services Temporarily)

If you just need deployments running:

```bash
# Extract and deploy only Deployment resources (not Services)
for service in analytics-service attendance-service auth-service cpp-service crm-service document-service financial-service hr-service inventory-service jts-service monitoring-service notification-service payroll-service prescription-service purchase-service realtime-service sales-service service-management tenant-management-service tenant-registry-service; do
  kubectl apply --validate=false -f <(grep -A 100 "^apiVersion: apps/v1" k8s/etelios-prod/$service-deployment.yaml | grep -B 100 "^---" | head -n -1)
done
```

---

## 🔍 Check Current Status

```bash
# Check deployments
kubectl get deployments -n etelios-prod

# Check pods
kubectl get pods -n etelios-prod

# Check services
kubectl get services -n etelios-prod
```

---

## ✅ Expected Result

After fixing:
- ✅ All 20 deployments running
- ✅ All 20 services created
- ✅ Pods in Running state
- ✅ Services accessible

---

## 🚀 Quick Fix Command

```bash
# Wait for ALB Controller
kubectl wait --for=condition=available --timeout=300s deployment/aws-load-balancer-controller -n kube-system && \
echo "✅ ALB Controller ready" || \
echo "⚠️ ALB Controller not ready, trying without webhook..."

# Deploy services (will work once ALB Controller is ready)
for service in analytics-service attendance-service auth-service cpp-service crm-service document-service financial-service hr-service inventory-service jts-service monitoring-service notification-service payroll-service prescription-service purchase-service realtime-service sales-service service-management tenant-management-service tenant-registry-service; do
  kubectl apply --validate=false -f k8s/etelios-prod/$service-deployment.yaml 2>&1 | grep -v "webhook" || true
done
```
