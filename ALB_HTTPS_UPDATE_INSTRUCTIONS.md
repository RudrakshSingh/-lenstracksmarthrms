# 🔧 ALB HTTPS Configuration - Update Instructions

**Issue:** Ingress shows only port 80, HTTPS (443) not showing yet.

---

## 🔍 Current Status

From `kubectl get ingress`:
```
PORTS: 80
```

**Expected:** Should show `80, 443` after ALB updates.

---

## ⏱️ ALB Update Time

AWS ALB Ingress Controller takes **2-5 minutes** to:
1. Read the new ingress annotations
2. Create/update HTTPS listener (port 443)
3. Attach SSL certificate
4. Configure SSL redirect

**Wait 5-10 minutes after applying ingress configuration.**

---

## ✅ Verification Steps

### Step 1: Check Ingress Annotations (Already Applied)

```bash
kubectl get ingress etelios-ingress -n etelios-prod -o yaml | grep -A 2 "certificate-arn\|listen-ports"
```

**Should show:**
```yaml
alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:ap-south-1:383234048604:certificate/f28621bc-c8c2-431f-80cd-ca34a2f82b8b
alb.ingress.kubernetes.io/ssl-redirect: '443'
```

### Step 2: Check ALB Ingress Controller Logs

```bash
# Find ALB ingress controller pod
kubectl get pods -n kube-system | grep alb

# Check logs for errors
kubectl logs -n kube-system <alb-ingress-pod-name> --tail=50 | grep -i "certificate\|https\|443"
```

### Step 3: Wait and Re-check Ingress

```bash
# Wait 5 minutes, then check again
kubectl get ingress etelios-ingress -n etelios-prod

# Should eventually show: PORTS  80, 443
```

### Step 4: Check ALB Directly (AWS Console)

1. Go to **EC2 → Load Balancers**
2. Find ALB: `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com`
3. Check **Listeners** tab
4. Should show:
   - **Listener 1:** Port 80, Protocol HTTP
   - **Listener 2:** Port 443, Protocol HTTPS (with certificate)

---

## 🚨 If HTTPS Still Not Showing After 10 Minutes

### Option 1: Restart ALB Ingress Controller

```bash
# Find controller pod
kubectl get pods -n kube-system | grep alb

# Delete pod (will restart automatically)
kubectl delete pod -n kube-system <alb-ingress-pod-name>

# Wait 2-3 minutes for restart
# Then check ingress again
kubectl get ingress etelios-ingress -n etelios-prod
```

### Option 2: Re-apply Ingress

```bash
# Re-apply the ingress configuration
kubectl apply -f k8s/ingress-alb-fixed.yaml

# Wait 5 minutes
# Check again
kubectl get ingress etelios-ingress -n etelios-prod
```

### Option 3: Check Certificate Status

```bash
# Verify certificate is "Issued" in AWS
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:ap-south-1:383234048604:certificate/f28621bc-c8c2-431f-80cd-ca34a2f82b8b \
  --region ap-south-1 \
  --query 'Certificate.Status'

# Should return: "ISSUED"
```

---

## 📋 Common Issues

### Issue 1: Certificate Not in "Issued" Status

**Solution:**
- Certificate must be fully validated in AWS Certificate Manager
- Check certificate status in AWS Console
- If "Pending validation", complete DNS validation first

### Issue 2: Certificate in Wrong Region

**Solution:**
- Certificate must be in same region as ALB (`ap-south-1`)
- ALB cannot use certificates from other regions

### Issue 3: ALB Ingress Controller Not Processing

**Solution:**
- Check controller logs for errors
- Restart controller pod
- Verify controller has IAM permissions to modify ALB

---

## ✅ Success Indicators

When working correctly:

1. **Ingress shows both ports:**
   ```
   PORTS  80, 443
   ```

2. **ALB has HTTPS listener:**
   - Port 443, Protocol HTTPS
   - Certificate attached

3. **HTTPS works:**
   ```bash
   curl -I https://api.etelios.com/health
   # Returns: HTTP/2 200 or HTTP/1.1 200 OK
   ```

4. **HTTP redirects to HTTPS:**
   ```bash
   curl -I http://api.etelios.com/health
   # Returns: HTTP/1.1 301 Moved Permanently
   # Location: https://api.etelios.com/health
   ```

---

## 🕐 Timeline

- **0-2 minutes:** ALB Ingress Controller reads new annotations
- **2-5 minutes:** ALB creates HTTPS listener
- **5-10 minutes:** Certificate attached, SSL redirect configured
- **10+ minutes:** Fully operational

---

## 📝 Next Steps

1. **Wait 5-10 minutes** (ALB needs time to update)
2. **Re-check ingress:** `kubectl get ingress etelios-ingress -n etelios-prod`
3. **Check ALB in AWS Console** (Listeners tab)
4. **Test HTTPS:** `curl -I https://api.etelios.com/health`

---

**Note:** The ingress configuration is correct. ALB just needs time to process the changes.
