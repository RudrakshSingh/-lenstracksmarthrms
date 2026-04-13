# 🚨 DNS Fix Required - Wrong IP Address

## ❌ Current Problem

**DNS Lookup Result:**
```
api.etelios.com → 98.70.245.87 (WRONG IP)
```

**Expected:**
```
api.etelios.com → CNAME → k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
```

**Issue:** DNS has an **A record** pointing to wrong IP instead of **CNAME** pointing to ALB.

---

## ✅ Solution: Fix DNS in GoDaddy

### Step 1: Login to GoDaddy

1. Go to: https://www.godaddy.com
2. Login to your account

### Step 2: Navigate to DNS Management

1. Click **My Products**
2. Find **etelios.com** domain
3. Click **DNS** or **Manage DNS**

### Step 3: Delete Old A Record

1. Find the record for `api` with IP `98.70.245.87`
2. Click **Delete** or **Remove** (trash icon)
3. Confirm deletion

### Step 4: Add New CNAME Record

1. Click **Add** or **+** button
2. Select **Type:** `CNAME`
3. **Name:** Enter `api` (NOT `api.etelios.com`)
4. **Value:** Enter `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com`
5. **TTL:** 600 (or 1 hour)
6. Click **Save**

### Step 5: Verify DNS Record

After adding, you should see:
```
Type: CNAME
Name: api
Value: k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
TTL: 600
```

---

## ⏱️ Wait for DNS Propagation

- **Time:** 5-30 minutes
- **Check:** `nslookup api.etelios.com`
- **Should show:** CNAME pointing to ALB hostname

---

## ✅ Verify After Fix

### Step 1: Check DNS (After 10-15 minutes)

```bash
nslookup api.etelios.com
```

**Expected Output:**
```
api.etelios.com canonical name = k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
```

### Step 2: Test HTTP Connection

```bash
curl -I http://api.etelios.com/health --max-time 5
```

**Expected:** `HTTP/1.1 200 OK`

### Step 3: Test HTTPS (After ALB updates)

```bash
curl -I https://api.etelios.com/health --max-time 5
```

**Expected:** `HTTP/2 200` or `HTTP/1.1 200 OK`

---

## 📋 DNS Record Details

| Field | Current (Wrong) | Should Be |
|-------|----------------|-----------|
| **Type** | A | **CNAME** |
| **Name** | api | **api** |
| **Value** | 98.70.245.87 | **k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com** |

---

## 🚨 Why This Matters

1. **A Record (Current):** Points to static IP `98.70.245.87`
   - ❌ This IP might not be the ALB
   - ❌ ALB IPs can change
   - ❌ Connection times out

2. **CNAME (Required):** Points to ALB hostname
   - ✅ Always points to correct ALB
   - ✅ ALB handles IP changes automatically
   - ✅ Works with SSL certificates

---

## 🎯 Action Required

1. **Go to GoDaddy DNS**
2. **Delete A record** for `api` with IP `98.70.245.87`
3. **Add CNAME record** pointing to ALB hostname
4. **Wait 10-15 minutes** for propagation
5. **Test again:** `nslookup api.etelios.com`

---

## ✅ Success Indicators

After fixing DNS:

1. **DNS resolves correctly:**
   ```bash
   nslookup api.etelios.com
   # Shows: CNAME → ALB hostname
   ```

2. **HTTP works:**
   ```bash
   curl -I http://api.etelios.com/health --max-time 5
   # Returns: HTTP/1.1 200 OK
   ```

3. **HTTPS works** (after ALB creates listener):
   ```bash
   curl -I https://api.etelios.com/health --max-time 5
   # Returns: HTTP/2 200
   ```

---

**Fix DNS in GoDaddy now!** Delete A record, add CNAME record.
