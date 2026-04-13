# Fix ALB Controller Pending Pods

## 🔍 Issue
ALB Controller pods are in "Pending" status for 51 minutes.

This means pods can't be scheduled on nodes.

---

## 🔍 Diagnose the Issue

Run these commands to find out why:

```bash
# Check pod events
kubectl describe pod -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller

# Check node resources
kubectl get nodes
kubectl describe nodes

# Check if nodes have capacity
kubectl top nodes
```

---

## 🔧 Common Causes & Solutions

### Cause 1: Insufficient Node Resources

**Check:**
```bash
kubectl describe nodes
```

**Solution:** Add more nodes or increase node size

```bash
# Scale up node group
eksctl scale nodegroup --cluster=etelios-prod --name=standard-workers --nodes=5 --region=ap-south-1
```

### Cause 2: Node Selector/Affinity Issues

**Check:**
```bash
kubectl get deployment aws-load-balancer-controller -n kube-system -o yaml | grep -A 5 nodeSelector
```

**Solution:** Remove node selector if present

### Cause 3: Taints on Nodes

**Check:**
```bash
kubectl describe nodes | grep -i taint
```

**Solution:** Add toleration to ALB Controller deployment

---

## 🚀 Quick Fix: Temporarily Disable Webhook

While fixing ALB Controller, you can deploy services by disabling the webhook:

```bash
# Delete webhook configuration
kubectl delete mutatingwebhookconfiguration aws-load-balancer-webhook-configuration

# Now deploy services
for service in analytics-service attendance-service auth-service cpp-service crm-service document-service financial-service hr-service inventory-service jts-service monitoring-service notification-service payroll-service prescription-service purchase-service realtime-service sales-service service-management tenant-management-service tenant-registry-service; do
  kubectl apply --validate=false -f k8s/etelios-prod/$service-deployment.yaml
done
```

---

## 🔧 Fix ALB Controller (Proper Solution)

### Step 1: Check Why Pods Are Pending

```bash
kubectl describe pod -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller | grep -A 20 "Events:"
```

Look for messages like:
- "Insufficient cpu"
- "Insufficient memory"
- "node(s) had taint"
- "node(s) didn't match node selector"

### Step 2: Based on Error, Apply Fix

**If insufficient resources:**
```bash
# Scale up nodes
eksctl scale nodegroup --cluster=etelios-prod --name=standard-workers --nodes=5 --region=ap-south-1
```

**If taint issue:**
```bash
# Remove taints from nodes (if safe)
kubectl taint nodes --all node-role.kubernetes.io/master- --ignore-errors
```

**If node selector issue:**
```bash
# Edit deployment to remove node selector
kubectl edit deployment aws-load-balancer-controller -n kube-system
```

---

## ✅ Verify Fix

```bash
# Check pods
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller

# Should show "Running" status
```

---

## 🎯 Recommended Action

1. **First, check why pods are pending:**
   ```bash
   kubectl describe pod -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller | grep -A 20 "Events:"
   ```

2. **If it's resource issue, scale up:**
   ```bash
   eksctl scale nodegroup --cluster=etelios-prod --name=standard-workers --nodes=5 --region=ap-south-1
   ```

3. **Or temporarily disable webhook and deploy services:**
   ```bash
   kubectl delete mutatingwebhookconfiguration aws-load-balancer-webhook-configuration
   # Then deploy services
   ```

---

**Note:** Services can be created without ALB Controller webhook. The webhook is only needed for automatic ALB annotations. You can add annotations manually later.
