# 🔧 ALB Gateway Timeout Fix - Quick Instructions

## Problem
- **504 Gateway Timeout** errors on Payroll and other services
- ALB default idle timeout (60s) is too short for some operations

## Solution
Increase ALB idle timeout from **60 seconds to 120 seconds**

---

## 🚀 Quick Fix (Automated)

```bash
# Run the fix script
./fix-alb-timeout.sh
```

This script will:
1. ✅ Update kubeconfig
2. ✅ Find your ingress
3. ✅ Apply ALB timeout fix (120s)
4. ✅ Verify the configuration

---

## 📝 Manual Fix (If Script Fails)

### Step 1: Update kubeconfig
```bash
aws eks update-kubeconfig --name etelios-prod-v2 --region ap-south-1
```

### Step 2: Find your ingress namespace
```bash
# Try both namespaces
kubectl get ingress -n etelios-prod
kubectl get ingress -n etelios-backend-prod
```

### Step 3: Patch the ingress
```bash
# Replace NAMESPACE with your actual namespace
NAMESPACE="etelios-prod"  # or "etelios-backend-prod"

# Method 1: Using annotation
kubectl annotate ingress etelios-ingress \
  -n $NAMESPACE \
  --overwrite \
  alb.ingress.kubernetes.io/load-balancer-attributes="idle_timeout.timeout_seconds=120,draining.enabled=true,draining.timeout_seconds=30"

# Method 2: Using YAML file
kubectl apply -f k8s/ingress-alb-fixed.yaml
```

### Step 4: Verify
```bash
# Check annotation
kubectl get ingress etelios-ingress -n $NAMESPACE -o jsonpath='{.metadata.annotations.alb\.ingress\.kubernetes\.io/load-balancer-attributes}'

# Should show: idle_timeout.timeout_seconds=120,draining.enabled=true,draining.timeout_seconds=30
```

---

## ✅ Verification

### 1. Check Ingress Annotation
```bash
kubectl get ingress etelios-ingress -n etelios-prod -o yaml | grep load-balancer-attributes
```

### 2. Check in AWS Console
1. Go to **EC2 → Load Balancers**
2. Find your ALB (search for "etelios")
3. Click on it → **Attributes** tab
4. Check **Idle timeout** should be **120 seconds**

### 3. Test APIs
```bash
# Get ALB URL
ALB_URL=$(kubectl get ingress etelios-ingress -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Test payroll service (previously timing out)
curl -v http://$ALB_URL/api/payroll/health

# Should return 200 OK (not 504 Gateway Timeout)
```

---

## ⏱️ Timeline

- **Fix Applied**: Immediately (annotation updated)
- **ALB Update**: 2-3 minutes (AWS needs time to apply)
- **Full Effect**: 3-5 minutes after applying fix

---

## 🐛 Troubleshooting

### Issue: Annotation not updating
```bash
# Delete and recreate ingress
kubectl delete ingress etelios-ingress -n etelios-prod
kubectl apply -f k8s/ingress-alb-fixed.yaml
```

### Issue: Still getting 504 errors after 5 minutes
1. **Check service health**:
   ```bash
   kubectl get pods -n etelios-prod | grep payroll
   kubectl logs -n etelios-prod deployment/payroll-service
   ```

2. **Test directly from pod**:
   ```bash
   kubectl exec -n etelios-prod deployment/payroll-service -- curl http://localhost:3004/health
   ```

3. **Check ALB target health**:
   - AWS Console → EC2 → Target Groups
   - Check if targets are healthy

### Issue: Can't find ingress
```bash
# List all ingresses
kubectl get ingress --all-namespaces

# Check if ALB controller is installed
kubectl get pods -n kube-system | grep aws-load-balancer
```

---

## 📋 What the Fix Does

The fix adds this annotation to your ingress:
```yaml
alb.ingress.kubernetes.io/load-balancer-attributes: idle_timeout.timeout_seconds=120,draining.enabled=true,draining.timeout_seconds=30
```

This:
- ✅ Increases idle timeout from 60s to 120s
- ✅ Enables connection draining (30s)
- ✅ Prevents 504 Gateway Timeout errors

---

## 🎯 Expected Results

### Before Fix:
- ❌ Payroll API: 504 Gateway Timeout
- ❌ Long-running requests: Timeout after 60s
- ❌ ALB idle timeout: 60 seconds (default)

### After Fix:
- ✅ Payroll API: 200 OK
- ✅ Long-running requests: Complete successfully
- ✅ ALB idle timeout: 120 seconds

---

## 📞 Support

If issues persist:
1. Check deployment logs: `kubectl logs -n etelios-prod deployment/payroll-service`
2. Check ingress status: `kubectl describe ingress etelios-ingress -n etelios-prod`
3. Check ALB in AWS Console: EC2 → Load Balancers → Attributes

---

**Last Updated**: $(date)
**Fix Script**: `./fix-alb-timeout.sh`
