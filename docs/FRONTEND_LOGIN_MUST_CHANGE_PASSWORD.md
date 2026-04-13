# Frontend Login with Must Change Password Flow

## Overview

When a user logs in with a temporary password or has `mustChangePassword: true` set, the backend returns **200 OK** (not 401) with the `mustChangePassword: true` flag. The frontend must check this flag and automatically redirect to the password change page.

## Backend Response

### Normal Login (200 OK)
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... },
    "mustChangePassword": false,
    "passwordTemporary": false
  },
  "message": "Login successful"
}
```

### Temporary Password / First Login (200 OK)
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... },
    "mustChangePassword": true,  // ✅ Check this flag!
    "passwordTemporary": true
  },
  "message": "Login successful"
}
```

**⚠️ Important:** Backend returns **200 OK** (not 401) even when password is temporary. Frontend must check `mustChangePassword` flag.

---

## Frontend Implementation Examples

### React with React Router

```typescript
// services/authService.ts
import apiClient from '@/lib/api-client';
import { useNavigate } from 'react-router-dom';

export interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      role: string;
      tenantId: string;
      employeeId?: string;
    };
    mustChangePassword?: boolean;
    passwordTemporary?: boolean;
  };
  message: string;
}

export const login = async (
  credentials: { email: string; password: string },
  navigate: (path: string) => void
): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post('/api/auth/login', credentials);
    
    if (response.data.success && response.data.data.accessToken) {
      // Store token and user data
      localStorage.setItem('accessToken', response.data.data.accessToken);
      localStorage.setItem('refreshToken', response.data.data.refreshToken);
      localStorage.setItem('tenantId', response.data.data.user.tenantId);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
      
      // ✅ CRITICAL: Check if password change is required
      if (response.data.data.mustChangePassword || response.data.data.passwordTemporary) {
        // Redirect to change password page with reason
        navigate(`/auth/change-password?reason=first_login&email=${encodeURIComponent(credentials.email)}`);
        return response.data;
      }
      
      // Normal login - redirect to dashboard
      navigate('/dashboard');
      return response.data;
    }
    
    throw new Error(response.data.message || 'Login failed');
  } catch (error: any) {
    // Handle 400/401 errors (invalid credentials)
    if (error.response?.status === 400 || error.response?.status === 401) {
      throw new Error(error.response?.data?.message || 'Invalid email or password');
    }
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};
```

```typescript
// components/LoginForm.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '@/services/authService';

export const LoginForm = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password }, navigate);
      // Navigation is handled inside login() function
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};
```

```typescript
// pages/ChangePasswordPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '@/lib/api-client';

export const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');
  const email = searchParams.get('email');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If reason is first_login, show message
    if (reason === 'first_login') {
      // Optional: Show info message
    }
  }, [reason]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.put('/api/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword
      });

      if (response.data.success) {
        // Password changed successfully
        // Clear mustChangePassword flag from localStorage if stored
        // Redirect to dashboard
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Change Password</h2>
      {reason === 'first_login' && (
        <div className="info">
          Please change your password to continue.
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Current Password"
          required
        />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New Password"
          required
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm New Password"
          required
        />
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
};
```

---

### Next.js with App Router

```typescript
// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';

export async function POST(request: Request) {
  const { email, password } = await request.json();
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (data.success && data.data.accessToken) {
      // Store tokens (use httpOnly cookies in production)
      // For now, using localStorage as example
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('tenantId', data.data.user.tenantId);
        localStorage.setItem('user', JSON.stringify(data.data.user));
      }

      // ✅ Check mustChangePassword flag
      if (data.data.mustChangePassword || data.data.passwordTemporary) {
        return NextResponse.redirect(
          new URL(`/auth/change-password?reason=first_login&email=${encodeURIComponent(email)}`, request.url)
        );
      }

      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.json(
      { success: false, message: data.message || 'Login failed' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}
```

---

### Vue.js with Vue Router

```typescript
// services/authService.ts
import apiClient from '@/lib/api-client';
import router from '@/router';

export const login = async (credentials: { email: string; password: string }) => {
  try {
    const response = await apiClient.post('/api/auth/login', credentials);
    
    if (response.data.success && response.data.data.accessToken) {
      // Store tokens
      localStorage.setItem('accessToken', response.data.data.accessToken);
      localStorage.setItem('tenantId', response.data.data.user.tenantId);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
      
      // ✅ Check mustChangePassword flag
      if (response.data.data.mustChangePassword || response.data.data.passwordTemporary) {
        router.push({
          path: '/auth/change-password',
          query: {
            reason: 'first_login',
            email: credentials.email
          }
        });
        return response.data;
      }
      
      // Normal login
      router.push('/dashboard');
      return response.data;
    }
    
    throw new Error(response.data.message || 'Login failed');
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};
```

```vue
<!-- components/LoginForm.vue -->
<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="email" type="email" placeholder="Email" required />
    <input v-model="password" type="password" placeholder="Password" required />
    <div v-if="error" class="error">{{ error }}</div>
    <button type="submit" :disabled="loading">
      {{ loading ? 'Logging in...' : 'Login' }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { login } from '@/services/authService';

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const handleSubmit = async () => {
  error.value = '';
  loading.value = true;

  try {
    await login({ email: email.value, password: password.value });
    // Navigation is handled inside login() function
  } catch (err: any) {
    error.value = err.message || 'Login failed';
  } finally {
    loading.value = false;
  }
};
</script>
```

---

## Key Points

1. **Backend returns 200 OK** (not 401) when password is correct but temporary
2. **Always check `mustChangePassword` flag** in login response
3. **Redirect to `/auth/change-password?reason=first_login`** when flag is true
4. **Do not show "Access denied" error** - backend already authenticated the user
5. **Store tokens before redirecting** - user is authenticated, just needs to change password

---

## Testing

To test this flow:

1. Create a user with `mustChangePassword: true` or `passwordTemporary: true`
2. Login with that user's temporary password
3. Verify backend returns 200 OK with `mustChangePassword: true`
4. Verify frontend redirects to change password page (not showing error)
5. Change password and verify redirect to dashboard

---

## API Endpoint: Change Password

```typescript
PUT /api/auth/change-password
Authorization: Bearer <accessToken>
x-tenant-id: <tenantId>
Content-Type: application/json

{
  "currentPassword": "TempPass123!",
  "newPassword": "MySecurePassword123!",
  "confirmPassword": "MySecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": {
    "mustChangePassword": false,
    "passwordTemporary": false,
    "passwordChangedAt": "2026-02-28T10:30:00.000Z"
  }
}
```
