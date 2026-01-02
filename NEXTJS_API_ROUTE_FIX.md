# Next.js API Route Proxy Fix

## Problem
Frontend is using Next.js API routes with `safeFetch`, which calls relative URLs like `api/hr/employees`. These go to `localhost:3002/api/hr/employees` (Next.js route), but the Next.js route is not proxying to the backend at `98.70.245.87`.

## Solution: Fix Next.js API Route Proxy

### Option 1: Create Catch-All Proxy Route (Recommended)

#### For App Router (Next.js 13+):
Create or update: `app/api/[...proxy]/route.ts`

```typescript
// app/api/[...proxy]/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'http://98.70.245.87';
const BACKEND_HOST = 'api.etelios.com';

async function proxyRequest(
  request: NextRequest,
  method: string,
  params: { proxy?: string[] }
) {
  const path = params.proxy?.join('/') || '';
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${BACKEND_URL}/api/${path}${searchParams ? '?' + searchParams : ''}`;
  
  // Forward auth header
  const authHeader = request.headers.get('authorization');
  const contentType = request.headers.get('content-type');
  
  const headers: HeadersInit = {
    'Host': BACKEND_HOST,
    ...(authHeader ? { 'Authorization': authHeader } : {}),
    ...(contentType && !contentType.includes('multipart') ? { 'Content-Type': contentType } : {})
  };
  
  try {
    let body: BodyInit | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      if (contentType?.includes('multipart/form-data')) {
        body = await request.formData();
      } else {
        body = await request.json();
      }
    }
    
    const response = await fetch(url, {
      method,
      headers,
      body: contentType?.includes('multipart') ? body : (body ? JSON.stringify(body) : undefined)
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Backend unavailable', message: error.message },
      { status: 503 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { proxy?: string[] } }
) {
  return proxyRequest(request, 'GET', params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { proxy?: string[] } }
) {
  return proxyRequest(request, 'POST', params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { proxy?: string[] } }
) {
  return proxyRequest(request, 'PUT', params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { proxy?: string[] } }
) {
  return proxyRequest(request, 'PATCH', params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { proxy?: string[] } }
) {
  return proxyRequest(request, 'DELETE', params);
}
```

#### For Pages Router (Next.js 12 and below):
Create or update: `pages/api/[...proxy].ts`

```typescript
// pages/api/[...proxy].ts
import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = 'http://98.70.245.87';
const BACKEND_HOST = 'api.etelios.com';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { proxy } = req.query;
  const path = Array.isArray(proxy) ? proxy.join('/') : '';
  const searchParams = new URLSearchParams(req.url?.split('?')[1] || '').toString();
  const url = `${BACKEND_URL}/api/${path}${searchParams ? '?' + searchParams : ''}`;
  
  const headers: HeadersInit = {
    'Host': BACKEND_HOST,
    ...(req.headers.authorization ? { 'Authorization': req.headers.authorization } : {}),
    ...(req.headers['content-type'] && !req.headers['content-type']?.includes('multipart') 
      ? { 'Content-Type': req.headers['content-type'] } 
      : {})
  };
  
  try {
    let body: BodyInit | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        // For multipart, forward the raw body
        body = req.body;
      } else {
        body = JSON.stringify(req.body);
      }
    }
    
    const response = await fetch(url, {
      method: req.method,
      headers,
      body
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error: any) {
    console.error('Proxy error:', error);
    res.status(503).json({ error: 'Backend unavailable', message: error.message });
  }
}
```

### Option 2: Update safeFetch to Use Absolute URLs

If you prefer to bypass Next.js API routes:

```typescript
// lib/api-utils.ts or utils/safeFetch.ts

const API_BASE_URL = 'http://98.70.245.87';
const API_HOST = 'api.etelios.com';

export async function safeFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // Ensure endpoint starts with /
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${path}`;
  
  const headers: HeadersInit = {
    'Host': API_HOST,
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  // Add auth token if available
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers
  });
}
```

## Testing

After implementing the fix:

1. Restart Next.js dev server
2. Check Network tab - requests should go to `98.70.245.87`
3. Verify responses are coming from backend

## Notes

- The catch-all route `[...proxy]` will handle all API routes
- Make sure to forward the `Authorization` header for authenticated requests
- Handle multipart/form-data for file uploads
- The `Host` header is important for Ingress routing in AKS

