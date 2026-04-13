# 🚨 URGENT: Frontend API Base URL Fix

## ⚠️ READ THIS FIRST!

**Your frontend is STILL using `localhost:3000`!**

**See `CRITICAL_FRONTEND_FIX_NOW.md` for the most urgent fix instructions.**

---

## ❌ Current Error
```
POST http://localhost:3000/api/attendance/clock-in 404 (Not Found)
GET http://localhost:3000/api/attendance?employeeId=... 503 (Service Unavailable)
```

**The "Employee not found" error happens because the request never reaches the backend!**

## ✅ IMMEDIATE FIX REQUIRED

### Step 1: Find Your API Configuration File

Look for one of these files in your frontend codebase:
- `workforceApi.ts`
- `api-client.ts`
- `.env` or `.env.local`
- `config.ts` or `config.js`
- Any file with `baseURL` or `API_BASE`

### Step 2: Update Base URL

**Find this line:**
```typescript
// ❌ WRONG - Current
const API_BASE = 'http://localhost:3000';
// or
baseURL: 'http://localhost:3000'
```

**Replace with:**
```typescript
// ✅ CORRECT
const API_BASE = 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';
// or
baseURL: 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com'
```

### Step 3: If Using Environment Variables

**In `.env` or `.env.local`:**
```bash
# ❌ WRONG
NEXT_PUBLIC_API_URL=http://localhost:3000
# or
REACT_APP_API_URL=http://localhost:3000

# ✅ CORRECT
NEXT_PUBLIC_API_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
# or
REACT_APP_API_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

**Then restart your dev server:**
```bash
npm run dev
# or
yarn dev
```

---

## 🔍 How to Find the File

### Search in your codebase:
```bash
# Search for localhost:3000
grep -r "localhost:3000" src/

# Search for baseURL
grep -r "baseURL" src/

# Search for API_BASE
grep -r "API_BASE" src/
```

### Common locations:
- `src/api/workforceApi.ts`
- `src/services/api-client.ts`
- `src/config/api.ts`
- `src/utils/api.ts`
- `.env.local`
- `next.config.js` (for Next.js)
- `vite.config.ts` (for Vite)

---

## 📝 Example Fix for `workforceApi.ts`

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

## ⚠️ About "Employee not found in backend" Error

**This error appears because:**
1. Your frontend is calling `localhost:3000` → Returns 404
2. The request **never reaches the backend**
3. Frontend shows "Employee not found" but backend never got the request

**Solution:**
1. **First**: Fix the base URL (see Step 2 above)
2. **Then**: The request will reach the backend
3. **If still getting "Employee not found"**: The logged-in user (admin@upcapto.com) might not have an employee record. Create an employee account for testing attendance.

**Note**: Admin/SuperAdmin accounts are for tenant management, not attendance. Use an employee account for attendance testing.

---

## ✅ After Fix - Test

1. **Restart your dev server**
2. **Clear browser cache** (Ctrl+Shift+R or Cmd+Shift+R)
3. **Test clock-in again**

You should see requests going to:
```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/clock-in
```

NOT:
```
http://localhost:3000/api/attendance/clock-in
```

---

## 🆘 Still Not Working?

1. Check browser Network tab - verify requests are going to AWS URL
2. Check console for any CORS errors
3. Verify the API URL is correct (copy-paste from this document)
4. Check if you have multiple API configuration files

---

**This is the #1 priority fix - everything else depends on this!**
