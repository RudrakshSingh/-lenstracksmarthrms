# Quick Proxy Test & Fix

## 🚨 Current Errors

- `404 Not Found` → API route handler missing
- `503 Service Unavailable` → Proxy can't reach backend OR backend is down

---

## ✅ Step 1: Test Backend Directly

**Test if backend is accessible:**

```bash
# Test attendance service
curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/health

# Should return: {"service":"attendance-service","status":"healthy",...}
```

**If this fails**, the backend is down or unreachable.

---

## ✅ Step 2: Test Employee Exists

**Check if employee `EMP-2026-207625` exists:**

```bash
# Login first
TOKEN=$(curl -s -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upcapto.com","password":"Upcapto@2026"}' \
  | jq -r '.data.accessToken')

# Search for employee
curl -s -X GET "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/hr/employees?search=EMP-2026-207625" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto" \
  | jq '.data[] | {employeeId, fullName, email, hasStore: (.store != null)}'
```

**If employee not found**, create it or use a different employee ID.

---

## ✅ Step 3: Test Proxy (After Fixing)

**Once proxy is set up, test it:**

```bash
# Test via proxy
curl http://localhost:3000/api/attendance/health

# Should return same as direct backend call
```

---

## 🔧 Fix 404 Error (API Route Handler Missing)

### For Pages Router:

**Create file**: `packages/shell/pages/api/[...path].ts`

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
    
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization as string;
    }
    if (req.headers['x-tenant-id']) {
      headers['x-tenant-id'] = req.headers['x-tenant-id'] as string;
    }
    
    let body: string | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });
    
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

### For App Router:

**Create file**: `packages/shell/app/api/[...path]/route.ts`

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
    
    if (request.headers.get('authorization')) {
      headers['Authorization'] = request.headers.get('authorization')!;
    }
    if (request.headers.get('x-tenant-id')) {
      headers['x-tenant-id'] = request.headers.get('x-tenant-id')!;
    }
    
    const contentType = request.headers.get('content-type') || '';
    const isFormData = contentType.includes('multipart/form-data');
    
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    let body: BodyInit | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      if (isFormData) {
        body = await request.formData();
      } else {
        body = await request.text();
      }
    }
    
    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
    });
    
    const data = await response.json().catch(() => ({
      success: false,
      error: 'Invalid JSON response',
    }));
    
    return NextResponse.json(data, { status: response.status });
    
  } catch (error: any) {
    console.error('[Proxy Error]', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Proxy error',
        message: error.message || 'Failed to proxy request',
      },
      { status: 500 }
    );
  }
}
```

---

## 🔧 Fix 503 Error (Proxy Can't Reach Backend)

### Check 1: Environment Variable

**File**: `packages/shell/.env.local`

```bash
NEXT_PUBLIC_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

**Restart dev server after changing!**

### Check 2: Backend is Accessible

```bash
# Test from your machine
curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/health
```

**If this fails**, the backend is down or your network can't reach it.

### Check 3: CORS Configuration

The backend should allow requests from `localhost:3000`. Check backend CORS settings.

---

## 📋 Checklist

- [ ] Backend is accessible (test with curl)
- [ ] Employee `EMP-2026-207625` exists in HR service
- [ ] Employee has a store assigned
- [ ] API route handler file exists (`[...path].ts` or `[...path]/route.ts`)
- [ ] Environment variable `NEXT_PUBLIC_API_BASE_URL` is set
- [ ] Dev server restarted after changes
- [ ] Test `curl http://localhost:3000/api/attendance/health` works

---

## 🧪 Complete Test Flow

```bash
# 1. Test backend directly
curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/health

# 2. Test proxy (after fixing)
curl http://localhost:3000/api/attendance/health

# 3. Test with auth via proxy
TOKEN="your-token-here"
curl -X POST http://localhost:3000/api/attendance/clock-in \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 19.0760, "longitude": 72.8777, "notes": "Test"}'
```

---

**The "Employee not found" error is a red herring - it appears because the request never reaches the backend (404/503). Fix the proxy first!**
