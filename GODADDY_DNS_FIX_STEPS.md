# 🔧 GoDaddy DNS Fix - Step by Step

## Current Issue

**DNS shows:** `api.etelios.com → 98.70.245.87` (A record - WRONG)  
**Should be:** `api.etelios.com → ALB hostname` (CNAME - CORRECT)

---

## 📝 Step-by-Step Fix

### Step 1: Login to GoDaddy

1. Open browser
2. Go to: https://www.godaddy.com
3. Click **Sign In**
4. Enter your credentials

### Step 2: Go to DNS Management

1. After login, click **My Products** (top menu)
2. Find **etelios.com** in the list
3. Click **DNS** button (or **Manage DNS**)

### Step 3: Find and Delete Old Record

1. Look for a record with:
   - **Type:** A
   - **Name:** `api`
   - **Value/Points to:** `98.70.245.87`

2. Click the **three dots** (⋯) or **pencil icon** next to this record
3. Click **Delete** or **Remove**
4. Confirm deletion

### Step 4: Add New CNAME Record

1. Click **Add** button (usually at top or bottom of records list)
2. Select **Type:** `CNAME` (from dropdown)
3. Fill in:
   - **Name:** `api` (type only "api", NOT "api.etelios.com")
   - **Value:** `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com`
   - **TTL:** `600` (or select "1 hour")
4. Click **Save** or **Add Record**

### Step 5: Verify Record Added

You should now see:
```
Type: CNAME
Name: api
Value: k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
TTL: 600
```

---

## ⏱️ Wait for DNS Propagation

- **Minimum:** 5 minutes
- **Typical:** 10-15 minutes
- **Maximum:** 30 minutes

---

## ✅ Verify Fix

### After 10-15 minutes, run:

```bash
# Check DNS
nslookup api.etelios.com
```

**Should show:**
```
api.etelios.com canonical name = k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
```

**Then test:**
```bash
# Test HTTP
curl -I http://api.etelios.com/health --max-time 5

# Should return: HTTP/1.1 200 OK
```

---

## 📸 Visual Guide

### GoDaddy DNS Page Should Look Like:

```
DNS Records for etelios.com

Type    Name    Value                                                      TTL
CNAME   api     k8s-eteliosp-eteliosi-f5ad4f50f3-842295189...elb...com    600
```

**NOT:**
```
Type    Name    Value          TTL
A       api     98.70.245.87   600  ❌ WRONG
```

---

## 🚨 Important Notes

1. **Name field:** Only type `api`, GoDaddy automatically adds `.etelios.com`

2. **Value field:** Copy the exact ALB hostname:
   ```
   k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
   ```

3. **Type:** Must be **CNAME**, NOT A record

4. **Delete old record first:** Don't have both A and CNAME records

---

## ✅ After DNS is Fixed

1. **HTTP will work:**
   ```bash
   curl -I http://api.etelios.com/health --max-time 5
   ```

2. **HTTPS will work** (after ALB creates HTTPS listener):
   ```bash
   curl -I https://api.etelios.com/health --max-time 5
   ```

3. **All APIs accessible:**
   - `http://api.etelios.com/api/auth/*`
   - `http://api.etelios.com/api/hr/*`
   - `http://api.etelios.com/api/attendance/*`

---

**Go to GoDaddy and fix DNS now!** 🚀
