# ✅ Frontend Environment Configuration Verification

## 📋 Your Current Configuration

```env
# Backend API – use AWS ALB URL. Do NOT use localhost for API.
NEXT_PUBLIC_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
NEXT_PUBLIC_API_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com

# Micro frontend URLs (for local dev)
NEXT_PUBLIC_SHELL_URL=http://localhost:3000
NEXT_PUBLIC_HRMS_URL=http://localhost:3002
NEXT_PUBLIC_CRM_URL=http://localhost:3001
NEXT_PUBLIC_INVENTORY_URL=http://localhost:3003
NEXT_PUBLIC_FINANCIAL_URL=http://localhost:3004
NEXT_PUBLIC_SALES_URL=http://localhost:3005
NEXT_PUBLIC_ADMIN_URL=http://localhost:3006
```

**✅ Configuration looks correct!**

---

## 🔍 Verification Steps

### Step 1: Verify Environment Variables Are Loaded

**In your frontend code (e.g., `src/lib/api-client.ts` or `src/config/api.ts`):**

```typescript
// ✅ CORRECT - Use environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 
                     process.env.NEXT_PUBLIC_API_URL ||
                     'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';

console.log('API Base URL:', API_BASE_URL); // Debug: Should show production URL

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**❌ WRONG - Hardcoded localhost:**
```typescript
// ❌ DON'T DO THIS
const API_BASE_URL = 'http://localhost:3000';
```

---

### Step 2: Check for Hardcoded URLs

**Search your frontend codebase for hardcoded URLs:**

```bash
# In your frontend project directory
grep -r "localhost:3000" src/
grep -r "localhost:3002" src/
grep -r "http://localhost" src/
grep -r "baseURL.*localhost" src/
```

**If you find any hardcoded URLs, replace them with:**
```typescript
process.env.NEXT_PUBLIC_API_BASE_URL
```

---

### Step 3: Verify Next.js Proxy (If Using Shell Proxy)

**If your frontend uses Next.js Shell as a proxy:**

**File: `packages/shell/pages/api/[...path].ts` (Pages Router)**
**OR**
**File: `packages/shell/app/api/[...path]/route.ts` (App Router)**

```typescript
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 
  'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const url = `${API_BASE_URL}/api/${path}${request.nextUrl.search}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': request.headers.get('Authorization') || '',
      'x-tenant-id': request.headers.get('x-tenant-id') || '',
    },
  });
  
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const url = `${API_BASE_URL}/api/${path}`;
  const body = await request.json();
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': request.headers.get('Authorization') || '',
      'x-tenant-id': request.headers.get('x-tenant-id') || '',
    },
    body: JSON.stringify(body),
  });
  
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
```

---

### Step 4: Verify API Client Interceptors

**Your API client should add auth token and tenant ID:**

```typescript
// api/client.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 
  'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token and tenant ID to all requests
apiClient.interceptors.request.use((config) => {
  // Get token from localStorage or context
  const token = localStorage.getItem('accessToken') || 
                localStorage.getItem('authToken') ||
                localStorage.getItem('token');
  
  // Get tenant ID from localStorage or context
  const tenantId = localStorage.getItem('tenantId') || 'upcapto';
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (tenantId) {
    config.headers['x-tenant-id'] = tenantId;
  }
  
  return config;
});

// Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

### Step 5: Test API Connection

**In browser DevTools Console:**

```javascript
// Test API connection
fetch('http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/health')
  .then(res => res.json())
  .then(data => console.log('✅ API Connected:', data))
  .catch(err => console.error('❌ API Error:', err));
```

**Expected output:**
```
✅ API Connected: { status: 'ok', service: 'auth-service', ... }
```

---

### Step 6: Verify Network Requests in Browser

**When creating an employee from frontend:**

1. Open **DevTools** → **Network** tab
2. Create employee from form
3. Check the request:
   - **URL**: Should be `http://k8s-eteliosp-eteliosi-xxx.../api/hr/employees`
   - **NOT**: `http://localhost:3000/api/hr/employees`
   - **Headers**: Should have `Authorization: Bearer ...` and `x-tenant-id: upcapto`
   - **Status**: Should be `201 Created` or `200 OK`

---

## 🚨 Common Issues

### Issue 1: Environment Variable Not Loading

**Symptom:** `process.env.NEXT_PUBLIC_API_BASE_URL` is `undefined`

**Fix:**
1. Make sure `.env` or `.env.local` is in the **root** of your frontend project
2. **Restart dev server** after changing `.env`:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   # or
   yarn dev
   ```
3. Clear Next.js cache:
   ```bash
   rm -rf .next
   npm run dev
   ```

---

### Issue 2: Still Using localhost

**Symptom:** Network tab shows `localhost:3000` requests

**Fix:**
1. Search for hardcoded `localhost:3000` in your code
2. Replace with `process.env.NEXT_PUBLIC_API_BASE_URL`
3. Check if proxy is configured correctly (if using Next.js Shell)

---

### Issue 3: CORS Error

**Symptom:** Browser console shows CORS error

**Fix:**
- Backend CORS is already configured ✅
- Make sure you're using the **correct production URL**
- Check if request includes proper headers

---

## ✅ Quick Test Script

Run this to test your API connection:

```bash
# Test API health
curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/health

# Test employee list (requires auth)
curl -X GET "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/hr/employees" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: upcapto"
```

---

## 📝 Summary

✅ **Your `.env` configuration is correct!**

**Next steps:**
1. Verify frontend code uses `process.env.NEXT_PUBLIC_API_BASE_URL`
2. Check for hardcoded `localhost` URLs
3. Verify API client interceptors add auth token and tenant ID
4. Test in browser DevTools Network tab
5. Restart dev server if needed

---

**Status**: ✅ Configuration looks good! Just verify the code uses these variables correctly.
