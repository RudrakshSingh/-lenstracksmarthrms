# ✅ Verify DNS Update - Step by Step

**Status:** DNS updated in GoDaddy ✅

Now let's verify it's working!

---

## 🔍 Step 1: Check DNS Resolution

```bash
nslookup api.etelios.com
```

**Expected Output:**
```
api.etelios.com canonical name = k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
```

**If still shows old IP (98.70.245.87):**
- Wait 5-10 more minutes (DNS propagation takes time)
- Try clearing DNS cache: `sudo dscacheutil -flushcache` (macOS)

---

## ✅ Step 2: Test HTTP Connection

```bash
curl -I http://api.etelios.com/health --max-time 5
```

**Expected:**
```
HTTP/1.1 200 OK
```

**If timeout:**
- DNS might not have propagated yet
- Wait 5-10 more minutes
- Try direct ALB test (see Step 3)

---

## 🔍 Step 3: Test Direct ALB (Bypass DNS)

```bash
curl -I http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/health --max-time 5
```

**If this works but Step 2 doesn't:**
- DNS not propagated yet
- Wait 10-15 more minutes

**If this also fails:**
- ALB/network issue
- Check AWS Console for ALB status

---

## ✅ Step 4: Check Ingress Status

```bash
kubectl get ingress etelios-ingress -n etelios-prod
```

**Check:**
- Should show ALB hostname in ADDRESS field
- PORTS might still show only `80` (HTTPS listener takes 10-15 minutes)

---

## 🔐 Step 5: Test HTTPS (After ALB Updates)

**Wait 10-15 minutes after DNS fix, then:**

```bash
curl -I https://api.etelios.com/health --max-time 5
```

**Expected (after ALB creates HTTPS listener):**
```
HTTP/2 200
```
or
```
HTTP/1.1 200 OK
```

**If timeout:**
- HTTPS listener not created yet
- Wait 5-10 more minutes
- Check ALB in AWS Console

---

## 📋 Verification Checklist

- [ ] DNS resolves to ALB hostname (not old IP)
- [ ] HTTP connection works: `curl -I http://api.etelios.com/health`
- [ ] Direct ALB works: `curl -I http://<ALB-hostname>/health`
- [ ] Ingress shows correct ALB hostname
- [ ] HTTPS works (after 10-15 minutes): `curl -I https://api.etelios.com/health`

---

## ⏱️ Timeline

- **0-5 minutes:** DNS propagation starts
- **5-10 minutes:** DNS should be updated
- **10-15 minutes:** HTTP should work
- **15-20 minutes:** HTTPS listener created (if not already)
- **20+ minutes:** Everything fully operational

---

## 🚨 If DNS Still Shows Old IP

### Clear DNS Cache (macOS):

```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

### Try Different DNS Server:

```bash
# Use Google DNS
nslookup api.etelios.com 8.8.8.8

# Or Cloudflare DNS
nslookup api.etelios.com 1.1.1.1
```

---

## ✅ Success Indicators

When everything works:

1. **DNS:**
   ```bash
   nslookup api.etelios.com
   # Shows: CNAME → ALB hostname ✅
   ```

2. **HTTP:**
   ```bash
   curl -I http://api.etelios.com/health --max-time 5
   # Returns: HTTP/1.1 200 OK ✅
   ```

3. **HTTPS:**
   ```bash
   curl -I https://api.etelios.com/health --max-time 5
   # Returns: HTTP/2 200 ✅
   ```

---

**Run these commands now to verify DNS update!**
