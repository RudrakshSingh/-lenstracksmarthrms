# 🚨 FINAL PROXY FIX - Step by Step

## Current Situation

- **404 Error**: API route handler doesn't exist
- **503 Error**: Proxy can't reach backend (or backend down)
- **"Employee not found"**: This is a RED HERRING - request never reaches backend!

---

## ✅ IMMEDIATE ACTIONS

### Action 1: Verify Backend is Up

```bash
curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/health
```

**If this fails**: Backend is down - contact backend team.

**If this works**: Continue to Action 2.

---

### Action 2: Create API Route Handler

**You MUST create one of these files:**

#### Option A: Pages Router
**File**: `packages/shell/pages/api/[...path].ts`

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 
  'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { path, ...query } = req.query;
  const apiPath = Array.isArray(path) ? path.join('/') : (path as string);
  const queryString = new URLSearchParams(query as Record<string, string>).toString();
  const targetUrl = `${API_BASE_URL}/api/${apiPath}${queryString ? `?${queryString}` : ''}`;
  
  console.log(`[Proxy] ${req.method} ${req.url} → ${targetUrl}`);
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (req.headers.authorization) headers['Authorization'] = req.headers.authorization as string;
    if (req.headers['x-tenant-id']) headers['x-tenant-id'] = req.headers['x-tenant-id'] as string;
    
    let body: string | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }
    
    const response = await fetch(targetUrl, { method: req.method, headers, body });
    const data = await response.json().catch(() => ({}));
    res.status(response.status).json(data);
    
  } catch (error: any) {
    console.error('[Proxy Error]', error);
    res.status(500).json({
      success: false,
      error: 'Proxy error',
      message: error.message || 'Failed to proxy request',
    });
  }
}
```

#### Option B: App Router
**File**: `packages/shell/app/api/[...path]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 
  'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params.path, 'GET');
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params.path, 'POST');
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params.path, 'PUT');
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params.path, 'DELETE');
}

async function proxyRequest(request: NextRequest, path: string[], method: string) {
  const apiPath = path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const targetUrl = `${API_BASE_URL}/api/${apiPath}${searchParams ? `?${searchParams}` : ''}`;
  
  console.log(`[Proxy] ${method} ${request.url} → ${targetUrl}`);
  
  try {
    const headers: Record<string, string> = {};
    if (request.headers.get('authorization')) headers['Authorization'] = request.headers.get('authorization')!;
    if (request.headers.get('x-tenant-id')) headers['x-tenant-id'] = request.headers.get('x-tenant-id')!;
    
    const contentType = request.headers.get('content-type') || '';
    const isFormData = contentType.includes('multipart/form-data');
    if (!isFormData) headers['Content-Type'] = 'application/json';
    
    let body: BodyInit | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      body = isFormData ? await request.formData() : await request.text();
    }
    
    const response = await fetch(targetUrl, { method, headers, body });
    const data = await response.json().catch(() => ({ success: false, error: 'Invalid JSON' }));
    return NextResponse.json(data, { status: response.status });
    
  } catch (error: any) {
    console.error('[Proxy Error]', error);
    return NextResponse.json({ success: false, error: 'Proxy error', message: error.message }, { status: 500 });
  }
}
```

---

### Action 3: Set Environment Variable

**File**: `packages/shell/.env.local`

```bash
NEXT_PUBLIC_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

---

### Action 4: Restart Dev Server

```bash
# Stop server (Ctrl+C)
npm run dev
# or
yarn dev
```

---

### Action 5: Test Proxy

```bash
# Test health endpoint
curl http://localhost:3000/api/attendance/health

# Should return: {"service":"attendance-service","status":"healthy",...}
```

**If this works**: Proxy is fixed! ✅

**If still 404**: Check file location and name (must be exactly `[...path].ts`)

**If still 503**: Check environment variable and backend accessibility

---

## 🎯 Why "Employee not found"?

The error "Employee not found in backend" appears because:

1. Request goes to `localhost:3000/api/attendance/clock-in`
2. Gets **404** (route handler missing) or **503** (proxy can't reach backend)
3. Frontend shows "Employee not found" but **backend never received the request!**

**Once proxy is fixed, the request will reach the backend and work correctly.**

---

## 📋 Final Checklist

- [ ] Backend is accessible (test with curl)
- [ ] API route handler file created
- [ ] Environment variable set in `.env.local`
- [ ] Dev server restarted
- [ ] `curl http://localhost:3000/api/attendance/health` works
- [ ] Browser requests now work

---

**Time to fix: 5-10 minutes** ⏱️
