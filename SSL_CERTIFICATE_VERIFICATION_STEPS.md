# ✅ SSL Certificate Configuration - Verification Steps

**Date:** 2026-03-09  
**Status:** ✅ **INGRESS APPLIED**

---

## ✅ Configuration Applied

Your ingress has been successfully updated with:
- ✅ AWS Certificate Manager SSL Certificate
- ✅ HTTPS listener (port 443)
- ✅ SSL redirect from HTTP to HTTPS
- ✅ Backend URL: `https://api.etelios.com`

---

## 🔍 Verification Steps

### Step 1: Verify Ingress Configuration

```bash
# Check ingress annotations
kubectl get ingress etelios-ingress -n etelios-prod -o yaml | grep -A 2 "certificate-arn"

# Should show:
# alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:ap-south-1:383234048604:certificate/f28621bc-c8c2-431f-80cd-ca34a2f82b8b
```

### Step 2: Check ALB Status

```bash
# Get ALB hostname
kubectl get ingress etelios-ingress -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'

# This will show the ALB hostname (e.g., k8s-xxxxx-xxxxx.elb.ap-south-1.amazonaws.com)
```

### Step 3: Verify DNS Configuration

```bash
# Check if api.etelios.com points to ALB
nslookup api.etelios.com

# Should resolve to the ALB hostname
```

### Step 4: Test HTTPS Connection

```bash
# Test HTTPS (should work with SSL certificate)
curl -I https://api.etelios.com/health

# Expected: HTTP/2 200 or HTTP/1.1 200 OK
```

### Step 5: Test SSL Redirect

```bash
# Test HTTP redirect to HTTPS
curl -I http://api.etelios.com/health

# Expected: HTTP/1.1 301 Moved Permanently
# Location: https://api.etelios.com/health
```

### Step 6: Verify SSL Certificate

```bash
# Check certificate details
openssl s_client -connect api.etelios.com:443 -servername api.etelios.com < /dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates

# Should show certificate details including:
# - Subject: CN=*.etelios.com (or similar)
# - Valid dates
```

### Step 7: Test in Browser

1. Open browser
2. Navigate to: `https://api.etelios.com/health`
3. Check for SSL lock icon (🔒) in address bar
4. Click on lock icon to verify certificate details

---

## ⏱️ Propagation Time

After applying ingress configuration:
- **ALB Update:** 1-2 minutes
- **SSL Certificate Attachment:** 2-5 minutes
- **DNS Propagation:** 5-30 minutes (if DNS was just updated)

**Wait 5-10 minutes after applying ingress before testing.**

---

## 🚨 Troubleshooting

### Issue: HTTPS Not Working

**Check:**
1. Certificate status in AWS Certificate Manager:
   ```bash
   aws acm describe-certificate \
     --certificate-arn arn:aws:acm:ap-south-1:383234048604:certificate/f28621bc-c8c2-431f-80cd-ca34a2f82b8b \
     --region ap-south-1 \
     --query 'Certificate.Status'
   ```
   Should return: `"ISSUED"`

2. Certificate must be in same region as ALB (`ap-south-1`)

3. DNS must point `api.etelios.com` to ALB hostname

### Issue: Certificate Not Attached

**Check ALB listeners:**
```bash
# Get ALB ARN from ingress
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --region ap-south-1 \
  --query "LoadBalancers[?contains(DNSName, '$(kubectl get ingress etelios-ingress -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')')].LoadBalancerArn" \
  --output text)

# Check listeners
aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN \
  --region ap-south-1 \
  --query 'Listeners[*].[Port,Protocol,Certificates[0].CertificateArn]' \
  --output table
```

Should show:
- Port 80, Protocol HTTP
- Port 443, Protocol HTTPS with certificate ARN

### Issue: SSL Redirect Not Working

**Check annotation:**
```bash
kubectl get ingress etelios-ingress -n etelios-prod -o yaml | grep ssl-redirect
```

Should show: `alb.ingress.kubernetes.io/ssl-redirect: '443'`

---

## ✅ Success Indicators

When everything is working correctly:

1. ✅ `https://api.etelios.com/health` returns 200 OK
2. ✅ `http://api.etelios.com/health` redirects to HTTPS (301)
3. ✅ Browser shows valid SSL certificate (no warnings)
4. ✅ Certificate shows as "Issued" in AWS Certificate Manager
5. ✅ ALB has both HTTP (80) and HTTPS (443) listeners
6. ✅ HTTPS listener has certificate attached

---

## 📝 Next Steps

1. **Wait 5-10 minutes** for ALB to update
2. **Run verification steps** above
3. **Update frontend** environment variables to use `https://api.etelios.com`
4. **Test all API endpoints** via HTTPS

---

## 📄 Related Files

- `k8s/ingress-alb-fixed.yaml` - Ingress configuration
- `docs/AWS_ACM_CERTIFICATE_CONFIGURATION.md` - Complete guide
- `AWS_SSL_CERTIFICATE_CONFIGURATION_COMPLETE.md` - Quick reference

---

**Configuration Applied!** ✅  
**Run verification steps to confirm SSL is working.**
