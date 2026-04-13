# ✅ Frontend Fix Checklist - Form Data Not Saving

## 🎯 Problem
Frontend form se employee create ho raha hai, lekin database mein save nahi ho raha.

## ✅ Solution: Fix Frontend API URL

---

## 📋 Step-by-Step Fix

### Step 1: Find API Configuration File

**Search in your frontend codebase:**

```bash
# Search for localhost
grep -r "localhost:3000" .
grep -r "localhost:3002" .

# Search for API config
grep -r "baseURL" .
grep -r "API_BASE" .
grep -r "API_URL" .
```

**Common locations:**
- `.env` or `.env.local`
- `next.config.js`
- `vite.config.ts`
- `src/api/client.ts`
- `src/services/api.ts`
- `src/config/api.ts`

---

### Step 2: Update to Production URL

**Replace:**
```typescript
// ❌ WRONG
const API_BASE = 'http://localhost:3000';
baseURL: 'http://localhost:3000'
```

**With:**
```typescript
// ✅ CORRECT
const API_BASE = 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';
baseURL: 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com'
```

---

### Step 3: Update Environment Variables

**In `.env` or `.env.local`:**
```env
# ✅ CORRECT
NEXT_PUBLIC_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
REACT_APP_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

**Restart dev server:**
```bash
npm run dev
```

---

### Step 4: Verify in Browser

1. Open **DevTools** → **Network** tab
2. Create employee from form
3. Check request:
   - ✅ URL: `http://k8s-eteliosp-eteliosi-xxx.../api/hr/employees`
   - ✅ Status: 201 Created
   - ✅ Response: `{success: true, ...}`

---

## ✅ Verification

**After fix, test:**
```bash
# Test from frontend form
# Then verify in DB
./list-lenstrack-employees.sh
```

**Expected:**
- ✅ Employee created from frontend appears in DB
- ✅ Employee list shows new employee

---

**Status**: ✅ **Backend Working - Fix Frontend API URL!** 🚀
