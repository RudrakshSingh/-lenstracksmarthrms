# 🚨 CRITICAL: Fix Shell Proxy Configuration NOW

## ⚠️ Architecture Note

Your frontend uses **Next.js Shell as a proxy**:
- Browser calls `localhost:3000/api/*`
- Shell proxies to AWS backend
- This is correct architecture!

**The issue**: The Shell's proxy is not configured correctly.

---

## ❌ Your Current Error

```
POST http://localhost:3000/api/attendance/clock-in 404 (Not Found)
GET http://localhost:3000/api/attendance?employeeId=... 503 (Service Unavailable)
```

**The problem**: The Next.js API route handler is missing or not proxying correctly!

---

## ✅ IMMEDIATE FIX

### Step 1: Check Environment Variable

**In Shell's `.env.local` or `.env`:**
```bash
NEXT_PUBLIC_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

### Step 2: Check API Route Handler Exists

**For Pages Router:**
- File: `packages/shell/pages/api/[...path].ts`
- Should exist and proxy requests

**For App Router:**
- File: `packages/shell/app/api/[...path]/route.ts`
- Should exist and proxy requests

### Step 3: Verify Proxy Configuration

**Check `packages/shell/lib/backend-api-config.ts`:**
```typescript
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 
  'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';
```

**See `SHELL_PROXY_FIX.md` for complete proxy handler code.**

### Step 4: Restart Dev Server

```bash
# Stop your dev server (Ctrl+C)
# Then restart
npm run dev
# or
yarn dev
```

### Step 5: Clear Browser Cache

- **Chrome/Edge**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` or `Cmd+Shift+R`

---

## 📝 Exact Fix for `workforceApi.ts`

**Before:**
```typescript
const API_BASE = 'http://localhost:3000';

export const checkIn = async (data: ClockInData) => {
  const response = await fetch(`${API_BASE}/api/attendance/clock-in`, {
    // ...
  });
};
```

**After:**
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 
  'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';

export const checkIn = async (data: ClockInData) => {
  const response = await fetch(`${API_BASE}/api/attendance/clock-in`, {
    // ...
  });
};
```

---

## 🔍 How to Verify the Fix

1. **Open browser DevTools** (F12)
2. **Go to Network tab**
3. **Try clock-in again**
4. **Check the request URL** - it should be:
   ```
   http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/clock-in
   ```
   
   **NOT:**
   ```
   http://localhost:3000/api/attendance/clock-in
   ```

---

## ⚠️ Why "Employee not found" Error?

The error "Employee not found in backend" appears because:
1. Request goes to `localhost:3000` → **404 Not Found**
2. **Backend never receives the request**
3. Frontend shows "Employee not found" but backend never got the request!

**Once you fix the base URL, the request will reach the backend and work correctly.**

---

## 🆘 Still Not Working?

1. **Check Network tab** - verify requests are going to AWS URL (not localhost)
2. **Check console** - look for CORS errors
3. **Verify the URL** - copy-paste from this document exactly
4. **Check for multiple API config files** - you might have multiple places setting the base URL

---

## 📞 Quick Test

After fixing, test with this curl command:

```bash
# Login
TOKEN=$(curl -s -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upcapto.com","password":"Upcapto@2026"}' \
  | jq -r '.data.accessToken')

# Test clock-in
curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/clock-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 19.0760, "longitude": 72.8777, "notes": "Test"}'
```

If this works, your frontend will work too once you fix the base URL!

---

**This is the #1 priority fix - everything else depends on this!**

**Time to fix: 5 minutes** ⏱️
