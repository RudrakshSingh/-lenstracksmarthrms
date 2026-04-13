# Proxy Fix Checklist

## 🚨 Current Errors

- `POST /api/attendance/clock-in 404` → API route handler missing
- `GET /api/attendance?employeeId=... 503` → Proxy can't reach backend

---

## ✅ Step-by-Step Fix

### Step 1: Set Environment Variable

**File**: `packages/shell/.env.local`

```bash
NEXT_PUBLIC_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

**Verify it's loaded:**
```bash
# In Shell directory
echo $NEXT_PUBLIC_API_BASE_URL
```

---

### Step 2: Create API Route Handler

#### For Pages Router:

**File**: `packages/shell/pages/api/[...path].ts`

**Copy code from**: `WORKING_PROXY_HANDLER.ts` (Option 1)

**Verify file exists:**
```bash
ls packages/shell/pages/api/\[...path\].ts
```

#### For App Router:

**File**: `packages/shell/app/api/[...path]/route.ts`

**Copy code from**: `WORKING_PROXY_HANDLER.ts` (Option 2)

**Verify file exists:**
```bash
ls packages/shell/app/api/\[...path\]/route.ts
```

---

### Step 3: Restart Dev Server

```bash
# Stop server (Ctrl+C)
# Then restart
npm run dev
# or
yarn dev
```

---

### Step 4: Test Proxy

**Test 1: Health Check**
```bash
curl http://localhost:3000/api/attendance/health
```

**Expected**: Should return health check JSON from backend

**Test 2: With Auth**
```bash
# Get token first
TOKEN=$(curl -s -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upcapto.com","password":"Upcapto@2026"}' \
  | jq -r '.data.accessToken')

# Test clock-in via proxy
curl -X POST http://localhost:3000/api/attendance/clock-in \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 19.0760, "longitude": 72.8777, "notes": "Test"}'
```

**Expected**: Should return attendance record (not 404 or 503)

---

### Step 5: Check Server Logs

When you make a request, you should see in your Next.js server console:

```
[Proxy] POST /api/attendance/clock-in → http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/clock-in
```

If you don't see this, the proxy handler isn't being called.

---

## 🔍 Troubleshooting

### 404 Error Still Appearing

**Possible causes:**
1. API route file doesn't exist
2. File is in wrong location
3. File has wrong name (must be `[...path].ts` or `[...path]/route.ts`)
4. Dev server not restarted after creating file

**Fix:**
- Verify file exists in correct location
- Check file name matches exactly
- Restart dev server

### 503 Error Still Appearing

**Possible causes:**
1. Environment variable not set
2. Backend URL incorrect
3. Network/CORS issue
4. Backend service down

**Fix:**
- Check `.env.local` has `NEXT_PUBLIC_API_BASE_URL`
- Verify backend is accessible: `curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/health`
- Check server logs for proxy errors

### "Employee not found" Error

**This happens when:**
- Proxy is working but employee doesn't exist in HR service
- Token doesn't have employee_id
- Employee not assigned to store

**Fix:**
- Use an employee account (not admin) for testing
- Ensure employee exists in HR service
- Check employee has store assigned

---

## 📋 Quick Checklist

- [ ] `.env.local` has `NEXT_PUBLIC_API_BASE_URL`
- [ ] API route handler file exists (`[...path].ts` or `[...path]/route.ts`)
- [ ] Handler code copied from `WORKING_PROXY_HANDLER.ts`
- [ ] Dev server restarted
- [ ] Test `curl http://localhost:3000/api/attendance/health` works
- [ ] Server logs show proxy messages
- [ ] Browser Network tab shows requests to `localhost:3000/api/*`

---

## 🆘 Still Not Working?

1. **Check file location**: Must be exactly `pages/api/[...path].ts` or `app/api/[...path]/route.ts`
2. **Check file name**: Must use `[...path]` (not `[path]` or `[...slug]`)
3. **Check environment**: Restart dev server after changing `.env.local`
4. **Check logs**: Look for proxy messages in server console
5. **Test directly**: Try `curl` commands to verify proxy works

---

**Time to fix: 10 minutes** ⏱️
