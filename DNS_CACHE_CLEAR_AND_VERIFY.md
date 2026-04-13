# 🔧 DNS Cache Clear & Verification

**Issue:** DNS still showing old IP (`98.70.245.87`) after GoDaddy update.

This could be:
1. DNS cache on your Mac
2. DNS propagation not complete yet
3. DNS record not saved correctly in GoDaddy

---

## ✅ Step 1: Clear DNS Cache (macOS)

```bash
# Clear DNS cache
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Wait 10 seconds
sleep 10
```

---

## ✅ Step 2: Try Different DNS Server

```bash
# Use Google DNS (8.8.8.8)
nslookup api.etelios.com 8.8.8.8

# Or use Cloudflare DNS (1.1.1.1)
nslookup api.etelios.com 1.1.1.1
```

**If these show ALB hostname:** Your local DNS cache issue ✅  
**If these also show old IP:** DNS not propagated yet or record not saved correctly

---

## ✅ Step 3: Verify DNS Record in GoDaddy

**Double-check in GoDaddy:**

1. Go to GoDaddy → My Products → etelios.com → DNS
2. Look for `api` record
3. **Should see:**
   - Type: **CNAME** (NOT A)
   - Name: **api**
   - Value: **k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com**

**If you see:**
- Type: **A** with IP `98.70.245.87` → **Delete it!**
- Type: **CNAME** but wrong value → **Edit it!**

---

## ✅ Step 4: Check DNS Propagation Online

Use online DNS checker to see if DNS has propagated globally:

1. Go to: https://dnschecker.org/
2. Enter: `api.etelios.com`
3. Select: **CNAME** record type
4. Click **Search**

**If most servers show ALB hostname:** DNS propagated ✅  
**If most show old IP:** Wait 10-15 more minutes

---

## ⏱️ DNS Propagation Time

- **Minimum:** 5 minutes
- **Typical:** 10-15 minutes
- **Maximum:** 30 minutes (sometimes up to 48 hours)

**If you just updated DNS:** Wait 10-15 minutes, then check again.

---

## 🔍 Alternative: Check DNS Record Type

```bash
# Check what type of record exists
dig api.etelios.com

# Or check CNAME specifically
dig api.etelios.com CNAME
```

**Expected (CNAME):**
```
api.etelios.com.    IN    CNAME    k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
```

**If shows A record:**
```
api.etelios.com.    IN    A    98.70.245.87
```
→ DNS record not updated correctly in GoDaddy

---

## 🚨 If DNS Still Shows Old IP After 15 Minutes

### Option 1: Verify GoDaddy Record

1. Go back to GoDaddy DNS
2. Make sure:
   - Old A record is **deleted**
   - New CNAME record is **saved**
   - No duplicate records exist

### Option 2: Try Direct ALB Access

While waiting for DNS:

```bash
# Test direct ALB (bypass DNS)
curl -I http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/health --max-time 5
```

**If this works:** ALB is fine, just waiting for DNS ✅

---

## ✅ Quick Commands to Run

```bash
# 1. Clear DNS cache
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# 2. Wait 10 seconds
sleep 10

# 3. Check with Google DNS
nslookup api.etelios.com 8.8.8.8

# 4. Check with dig
dig api.etelios.com CNAME

# 5. Test direct ALB
curl -I http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/health --max-time 5
```

---

## 📋 Expected Results

### After DNS Propagates:

```bash
$ nslookup api.etelios.com
api.etelios.com canonical name = k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
```

### Then HTTP Should Work:

```bash
$ curl -I http://api.etelios.com/health --max-time 5
HTTP/1.1 200 OK
```

---

**Run these commands now:**
1. Clear DNS cache
2. Check with Google DNS
3. Verify in GoDaddy that CNAME record is saved correctly
