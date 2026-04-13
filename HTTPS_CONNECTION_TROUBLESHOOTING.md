# 🔧 HTTPS Connection Troubleshooting

**Issue:** `curl -I https://api.etelios.com/health` command is hanging/freezing.

---

## 🚨 Immediate Action

**Press `Ctrl+C` to cancel the hanging curl command.**

---

## 🔍 Possible Causes

1. **HTTPS listener not created yet** (ALB still updating)
2. **DNS not resolving** `api.etelios.com`
3. **SSL certificate not attached** to ALB
4. **Connection timeout** (network/firewall issue)

---

## ✅ Step-by-Step Troubleshooting

### Step 1: Check DNS Resolution

```bash
# Test DNS resolution
nslookup api.etelios.com

# Or
dig api.etelios.com

# Should return the ALB hostname:
# k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
```

**If DNS fails:** DNS not configured in GoDaddy yet.

### Step 2: Test HTTP First (Should Work)

```bash
# Test HTTP connection (should work)
curl -I http://api.etelios.com/health --max-time 10

# If this works, backend is accessible
# If this also hangs, DNS/network issue
```

### Step 3: Test HTTPS with Timeout

```bash
# Test HTTPS with 10 second timeout
curl -I https://api.etelios.com/health --max-time 10

# If it times out, HTTPS listener not ready yet
```

### Step 4: Check ALB Listeners (AWS Console)

1. Go to **AWS Console → EC2 → Load Balancers**
2. Find ALB: `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189`
3. Click **Listeners** tab
4. Check if **Port 443 (HTTPS)** listener exists

**If only Port 80 exists:** ALB still updating (wait 5-10 more minutes)

### Step 5: Check Certificate Status

```bash
# Check if certificate is "Issued"
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:ap-south-1:383234048604:certificate/f28621bc-c8c2-431f-80cd-ca34a2f82b8b \
  --region ap-south-1 \
  --query 'Certificate.Status'

# Should return: "ISSUED"
# If "PENDING_VALIDATION", certificate not ready
```

### Step 6: Test Direct ALB HTTPS

```bash
# Test HTTPS directly on ALB hostname (bypass DNS)
curl -I https://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/health --max-time 10

# If this works but api.etelios.com doesn't, it's a DNS issue
# If this also fails, HTTPS listener not created yet
```

---

## 🕐 Timeline & Expectations

### Current Status
- ✅ Ingress configuration applied
- ⏳ ALB updating (5-10 minutes)
- ⏳ HTTPS listener being created

### Expected Timeline
- **0-5 minutes:** ALB Ingress Controller processing
- **5-10 minutes:** HTTPS listener created
- **10-15 minutes:** Certificate attached, fully operational

---

## ✅ Quick Test Commands (With Timeouts)

```bash
# Test HTTP (should work)
curl -I http://api.etelios.com/health --max-time 5

# Test HTTPS (may timeout if not ready)
curl -I https://api.etelios.com/health --max-time 5

# Test direct ALB (bypass DNS)
curl -I https://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/health --max-time 5
```

**Always use `--max-time` to prevent hanging!**

---

## 🚨 If HTTPS Still Not Working After 15 Minutes

### Option 1: Check ALB Ingress Controller Logs

```bash
# Find ALB ingress controller pod
kubectl get pods -n kube-system | grep alb

# Check logs
kubectl logs -n kube-system <alb-pod-name> --tail=100 | grep -i "certificate\|https\|error"
```

### Option 2: Re-apply Ingress

```bash
# Re-apply ingress configuration
kubectl apply -f k8s/ingress-alb-fixed.yaml

# Wait 5 minutes
# Check ingress status
kubectl get ingress etelios-ingress -n etelios-prod
```

### Option 3: Verify Certificate in AWS Console

1. Go to **AWS Certificate Manager**
2. Find certificate: `f28621bc-c8c2-431f-80cd-ca34a2f82b8b`
3. Verify status is **"Issued"** (not "Pending validation")
4. Verify region is **ap-south-1**

---

## 📋 Common Issues & Solutions

### Issue 1: DNS Not Configured

**Symptom:** `nslookup api.etelios.com` fails

**Solution:**
- Configure DNS in GoDaddy
- Add CNAME record: `api` → ALB hostname

### Issue 2: Certificate Not Issued

**Symptom:** Certificate status is "Pending validation"

**Solution:**
- Complete DNS validation in AWS Certificate Manager
- Add CNAME records to GoDaddy for certificate validation

### Issue 3: HTTPS Listener Not Created

**Symptom:** ALB only has port 80 listener

**Solution:**
- Wait 10-15 minutes for ALB to update
- Check ALB Ingress Controller logs for errors
- Verify ingress annotations are correct

---

## ✅ Success Indicators

When everything works:

1. **DNS resolves:**
   ```bash
   nslookup api.etelios.com
   # Returns ALB hostname
   ```

2. **HTTP works:**
   ```bash
   curl -I http://api.etelios.com/health --max-time 5
   # Returns: HTTP/1.1 200 OK
   ```

3. **HTTPS works:**
   ```bash
   curl -I https://api.etelios.com/health --max-time 5
   # Returns: HTTP/2 200 or HTTP/1.1 200 OK
   ```

4. **Ingress shows both ports:**
   ```bash
   kubectl get ingress etelios-ingress -n etelios-prod
   # Shows: PORTS  80, 443
   ```

---

## 🎯 Recommended Next Steps

1. **Cancel hanging curl** (Ctrl+C)
2. **Test HTTP first** (should work)
3. **Check DNS resolution**
4. **Wait 10-15 minutes** for ALB to fully update
5. **Re-test HTTPS** with timeout: `curl -I https://api.etelios.com/health --max-time 5`
6. **Check AWS Console** for ALB listeners

---

**Remember:** Always use `--max-time` flag with curl to prevent hanging!
