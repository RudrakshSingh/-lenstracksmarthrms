# Shell Proxy Configuration Fix

## 🏗️ Architecture Understanding

Your frontend uses a **Next.js Shell as a proxy**:

```
Browser → localhost:3000/api/attendance/clock-in
         ↓
Next.js Shell (server-side)
         ↓
Proxies to: http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

**The browser never directly calls the AWS URL** - it only calls localhost, and the Shell proxies to the live backend.

---

## ❌ Current Issue

```
POST http://localhost:3000/api/attendance/clock-in 404 (Not Found)
GET http://localhost:3000/api/attendance?employeeId=... 503 (Service Unavailable)
```

**This means:**
1. The Next.js API route handler is missing or not configured correctly
2. OR the proxy is not forwarding requests properly
3. OR the `NEXT_PUBLIC_API_BASE_URL` is not set

---

## ✅ Fix Steps

### Step 1: Check Environment Variable

**In your Shell's `.env.local` or `.env`:**
```bash
NEXT_PUBLIC_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

**Or check `packages/shell/lib/backend-api-config.ts`:**
```typescript
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 
  'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';
```

### Step 2: Check Next.js API Route Handler

**Location**: `packages/shell/pages/api/[...path].ts` or `packages/shell/app/api/[...path]/route.ts`

**The proxy handler should look like this:**

**For Pages Router (`pages/api/[...path].ts`):**
```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { API_BASE_URL } from '@/lib/backend-api-config';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { path } = req.query;
  const apiPath = Array.isArray(path) ? path.join('/') : path;
  
  const targetUrl = `${API_BASE_URL}/api/${apiPath}`;
  
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' 
        ? JSON.stringify(req.body) 
        : undefined,
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy error', message: error.message });
  }
}
```

**For App Router (`app/api/[...path]/route.ts`):**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/backend-api-config';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, 'DELETE');
}

async function proxyRequest(
  request: NextRequest,
  path: string[],
  method: string
) {
  const apiPath = path.join('/');
  const targetUrl = `${API_BASE_URL}/api/${apiPath}${request.nextUrl.search}`;
  
  try {
    const body = method !== 'GET' && method !== 'HEAD' 
      ? await request.text() 
      : undefined;
    
    const response = await fetch(targetUrl, {
      method,
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        'Content-Type': 'application/json',
      },
      body,
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Proxy error', message: error.message },
      { status: 500 }
    );
  }
}
```

### Step 3: Handle FormData (for Selfie Upload)

**If clock-in uses FormData (for selfie upload), update the proxy:**

```typescript
// Check if request is FormData
const contentType = request.headers.get('content-type');
const isFormData = contentType?.includes('multipart/form-data');

if (isFormData) {
  // For FormData, don't parse as JSON
  const formData = await request.formData();
  
  const response = await fetch(targetUrl, {
    method,
    headers: {
      // Don't set Content-Type for FormData - let fetch set it with boundary
      Authorization: request.headers.get('authorization') || '',
      'x-tenant-id': request.headers.get('x-tenant-id') || '',
    },
    body: formData,
  });
  
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
```

### Step 4: Verify Proxy is Working

**Test the proxy directly:**
```bash
# From your Shell directory
curl http://localhost:3000/api/attendance/health
# Should proxy to AWS and return health check
```

**Or check browser Network tab:**
- Request URL: `http://localhost:3000/api/attendance/clock-in`
- Status: Should be 200/201 (not 404)
- Response: Should come from backend

---

## 🔍 Debugging

### Check if API Route Exists

**For Pages Router:**
- File should exist: `packages/shell/pages/api/[...path].ts`

**For App Router:**
- File should exist: `packages/shell/app/api/[...path]/route.ts`

### Check Environment Variable

```bash
# In Shell directory
echo $NEXT_PUBLIC_API_BASE_URL
# Should output the AWS URL
```

### Check Server Logs

When you make a request, check your Next.js server console:
- Should see proxy requests being made
- Should see target URL being called

### Common Issues

1. **404 Error**: API route handler doesn't exist or path is wrong
2. **503 Error**: Proxy can't reach backend (network/CORS issue)
3. **CORS Error**: Backend needs to allow requests from localhost:3000

---

## 📝 Quick Checklist

- [ ] `NEXT_PUBLIC_API_BASE_URL` is set in `.env.local`
- [ ] API route handler exists (`[...path].ts` or `[...path]/route.ts`)
- [ ] Proxy handler forwards all HTTP methods (GET, POST, PUT, DELETE)
- [ ] Proxy handler forwards headers (especially `Authorization` and `x-tenant-id`)
- [ ] Proxy handler handles FormData for file uploads
- [ ] Restart dev server after changes
- [ ] Test with `curl http://localhost:3000/api/attendance/health`

---

## 🧪 Test Proxy

```bash
# Test health endpoint
curl http://localhost:3000/api/attendance/health

# Test with auth (replace TOKEN)
curl -X POST http://localhost:3000/api/attendance/clock-in \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: upcapto" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 19.0760, "longitude": 72.8777, "notes": "Test"}'
```

---

**The issue is in the Shell's proxy configuration, not the browser calls!**
