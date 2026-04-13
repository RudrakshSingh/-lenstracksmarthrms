# 🚨 Immediate DNS Fix - api.etelios.com

**Problem:** `api.etelios.com` is timing out - DNS not configured.

---

## ✅ Quick Fix Steps

### Step 1: Check Current DNS

```bash
nslookup api.etelios.com
```

**If it fails or shows wrong IP:** DNS not configured ✅

### Step 2: Configure DNS in GoDaddy

1. **Login to GoDaddy:**
   - Go to: https://www.godaddy.com
   - Login to your account

2. **Navigate to DNS:**
   - Click **My Products**
   - Find **etelios.com** domain
   - Click **DNS** or **Manage DNS**

3. **Add CNAME Record:**
   - Click **Add** or **+** button
   - **Type:** Select **CNAME**
   - **Name:** Enter `api` (NOT `api.etelios.com`)
   - **Value:** Enter `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com`
   - **TTL:** 600 (or 1 hour)
   - Click **Save**

4. **Verify:**
   - You should see a record like:
     ```
     Type: CNAME
     Name: api
     Value: k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
     ```

### Step 3: Wait for DNS Propagation

- **Time:** 5-30 minutes
- **Check:** `nslookup api.etelios.com`
- **Should return:** ALB hostname

### Step 4: Test After Propagation

```bash
# Wait 10-15 minutes, then test
nslookup api.etelios.com

# Should show:
# api.etelios.com canonical name = k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com

# Then test HTTP
curl -I http://api.etelios.com/health --max-time 5
```

---

## 📋 DNS Record Details

| Field | Value |
|-------|-------|
| **Type** | CNAME |
| **Name** | `api` |
| **Value** | `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com` |
| **TTL** | 600 |

**Result:** `api.etelios.com` → ALB

---

## ⚠️ Important Notes

1. **Name field:** Only enter `api`, NOT `api.etelios.com`
   - GoDaddy automatically adds the domain

2. **Value:** Use the exact ALB hostname from ingress:
   ```
   k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
   ```

3. **Wait time:** DNS changes take 5-30 minutes to propagate

4. **Check existing records:** If there's already an `api` record, delete it first, then add new one

---

## 🔍 Verify DNS Configuration

After adding DNS record, verify:

```bash
# Check DNS resolution
nslookup api.etelios.com

# Expected output:
# api.etelios.com canonical name = k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
```

---

## ✅ After DNS is Configured

Once DNS propagates:

1. **HTTP will work:**
   ```bash
   curl -I http://api.etelios.com/health --max-time 5
   ```

2. **HTTPS will work** (after ALB creates listener):
   ```bash
   curl -I https://api.etelios.com/health --max-time 5
   ```

3. **All APIs accessible:**
   - `http://api.etelios.com/api/auth/*`
   - `http://api.etelios.com/api/hr/*`
   - `http://api.etelios.com/api/attendance/*`

---

**Action Required:** Configure DNS in GoDaddy now!
