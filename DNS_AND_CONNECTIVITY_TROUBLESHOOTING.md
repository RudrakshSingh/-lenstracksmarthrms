# 🔧 DNS & Connectivity Troubleshooting

**Issue:** `curl -I http://api.etelios.com/health --max-time 5` is timing out.

This means either:
1. DNS not resolving `api.etelios.com`
2. DNS not pointing to ALB
3. Network/firewall blocking connection

---

## 🔍 Step-by-Step Diagnosis

### Step 1: Check DNS Resolution

```bash
# Check if DNS resolves
nslookup api.etelios.com

# Or
dig api.etelios.com

# Expected: Should return ALB hostname
# k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
```

**If DNS fails:**
- DNS not configured in GoDaddy
- DNS not propagated yet
- Wrong DNS configuration

**If DNS works but shows wrong IP:**
- DNS pointing to wrong location
- Need to update DNS records

### Step 2: Test Direct ALB Access (Bypass DNS)

```bash
# Test directly on ALB hostname (bypass DNS)
curl -I http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/health --max-time 5

# If this works: DNS issue
# If this also fails: ALB/network issue
```

### Step 3: Check ALB Status

```bash
# Get ALB hostname from ingress
kubectl get ingress etelios-ingress -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'

# Should return: k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
```

### Step 4: Test ALB Directly

```bash
# Test ALB directly (bypass DNS)
ALB_HOST="k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com"
curl -I http://$ALB_HOST/health --max-time 5

# If this works: DNS needs to be configured
# If this fails: Check ALB in AWS Console
```

---

## 🚨 Common Issues & Solutions

### Issue 1: DNS Not Configured

**Symptom:** `nslookup api.etelios.com` returns nothing or wrong IP

**Solution:**
1. Go to **GoDaddy DNS Management**
2. Add CNAME record:
   - **Type:** CNAME
   - **Name:** `api`
   - **Value:** `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com`
   - **TTL:** 600
3. Wait 5-30 minutes for DNS propagation

### Issue 2: DNS Points to Wrong Location

**Symptom:** `nslookup api.etelios.com` returns wrong IP/hostname

**Solution:**
1. Check current DNS records in GoDaddy
2. Delete old/incorrect records
3. Add correct CNAME record pointing to ALB
4. Wait for DNS propagation

### Issue 3: ALB Not Accessible

**Symptom:** Direct ALB access also fails

**Solution:**
1. Check ALB status in AWS Console
2. Verify security groups allow port 80/443
3. Check if ALB is in correct state (active)
4. Verify target groups are healthy

### Issue 4: Network/Firewall Blocking

**Symptom:** All connections timeout

**Solution:**
1. Check if you're behind corporate firewall
2. Try from different network
3. Check AWS security groups
4. Verify ALB is internet-facing

---

## ✅ Quick Test Commands

```bash
# 1. Check DNS
nslookup api.etelios.com

# 2. Test direct ALB (bypass DNS)
curl -I http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/health --max-time 5

# 3. Check ingress status
kubectl get ingress etelios-ingress -n etelios-prod

# 4. Test with verbose output
curl -v http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/health --max-time 5
```

---

## 📋 GoDaddy DNS Configuration

### Required DNS Record

**For `api.etelios.com` to work:**

1. Login to **GoDaddy**
2. Go to **My Products** → **Domains** → **etelios.com**
3. Click **DNS** or **Manage DNS**
4. Add CNAME record:
   ```
   Type: CNAME
   Name: api
   Value: k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
   TTL: 600 (or 1 hour)
   ```
5. **Save**

**Result:** `api.etelios.com` → ALB hostname

---

## 🔍 Verification Steps

### Step 1: Verify DNS

```bash
nslookup api.etelios.com
```

**Should return:**
```
api.etelios.com canonical name = k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
```

### Step 2: Test HTTP

```bash
curl -I http://api.etelios.com/health --max-time 5
```

**Should return:**
```
HTTP/1.1 200 OK
```

### Step 3: Test Direct ALB

```bash
curl -I http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/health --max-time 5
```

**Should return:**
```
HTTP/1.1 200 OK
```

---

## 🎯 Action Plan

1. **Check DNS:**
   ```bash
   nslookup api.etelios.com
   ```

2. **If DNS fails:**
   - Configure DNS in GoDaddy (see above)
   - Wait 5-30 minutes for propagation

3. **If DNS works but connection fails:**
   - Test direct ALB access
   - Check AWS Console for ALB status
   - Verify security groups

4. **If direct ALB works:**
   - DNS needs to be configured/updated
   - Wait for DNS propagation

---

## 📞 Next Steps

1. Run: `nslookup api.etelios.com`
2. Share the output
3. Based on result, we'll configure DNS or troubleshoot further

---

**Most likely issue:** DNS not configured in GoDaddy yet.
