# 🔒 Attendance Dashboard - Tenant Isolation Implementation

**Date:** March 10, 2026  
**Purpose:** Add tenant isolation to attendance dashboard in frontend  
**Status:** ✅ **IMPLEMENTATION GUIDE**

---

## 🎯 Overview

This guide shows how to implement tenant isolation in the attendance dashboard to ensure users only see data from their own tenant.

---

## ✅ Requirements

1. **Always send `X-Tenant-Id` header** with every API request
2. **Extract tenantId from login response** and store it securely
3. **Validate tenantId** matches the logged-in user's tenant
4. **Filter all attendance data** by tenantId on frontend (defense in depth)

---

## 📋 Implementation Steps

### Step 1: API Client Setup with Tenant Isolation

**File:** `src/utils/apiClient.js` or `src/api/client.js`

```javascript
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 
                     process.env.REACT_APP_API_BASE_URL ||
                     'http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token and tenant ID
apiClient.interceptors.request.use(
  (config) => {
    // Get token from storage
    const token = localStorage.getItem('accessToken') || 
                  sessionStorage.getItem('accessToken');
    
    // Get tenantId from storage (CRITICAL for tenant isolation)
    const tenantId = localStorage.getItem('tenantId') || 
                     sessionStorage.getItem('tenantId');
    
    // Add Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add X-Tenant-Id header (CRITICAL for tenant isolation)
    if (tenantId) {
      config.headers['X-Tenant-Id'] = tenantId;
    } else {
      console.warn('⚠️ Tenant ID not found! Tenant isolation may fail.');
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 403 Tenant mismatch
    if (error.response?.status === 403 && 
        error.response?.data?.error === 'TENANT_MISMATCH') {
      console.error('❌ Tenant mismatch! Logging out...');
      // Clear storage and redirect to login
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    }
    
    // Handle 400 Tenant required
    if (error.response?.status === 400 && 
        error.response?.data?.error === 'TENANT_REQUIRED') {
      console.error('❌ Tenant ID required! Please login again.');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

### Step 2: Store TenantId After Login

**File:** `src/services/authService.js` or `src/utils/auth.js`

```javascript
import apiClient from './apiClient';

export const login = async (email, password) => {
  try {
    const response = await apiClient.post('/api/auth/login', {
      email,
      password,
    });
    
    if (response.data.success) {
      const { accessToken, refreshToken, user } = response.data.data;
      
      // CRITICAL: Extract and store tenantId
      const tenantId = user.tenantId || 
                       response.data.data.tenantId || 
                       user.tenant_id;
      
      if (!tenantId) {
        throw new Error('Tenant ID not found in login response');
      }
      
      // Store token and tenantId securely
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('tenantId', tenantId); // CRITICAL for tenant isolation
      localStorage.setItem('user', JSON.stringify(user));
      
      return {
        success: true,
        token: accessToken,
        tenantId: tenantId,
        user: user,
      };
    }
    
    throw new Error(response.data.message || 'Login failed');
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logout = () => {
  // Clear all storage including tenantId
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('tenantId'); // CRITICAL: Clear tenantId
  localStorage.removeItem('user');
  sessionStorage.clear();
};
```

---

### Step 3: Attendance Dashboard Component with Tenant Isolation

**File:** `src/components/AttendanceDashboard.jsx` or `src/pages/AttendanceDashboard.tsx`

```jsx
import React, { useEffect, useState } from 'react';
import apiClient from '../utils/apiClient';

const AttendanceDashboard = () => {
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantId, setTenantId] = useState(null);

  useEffect(() => {
    // Get tenantId from storage
    const storedTenantId = localStorage.getItem('tenantId') || 
                          sessionStorage.getItem('tenantId');
    
    if (!storedTenantId) {
      setError('Tenant ID not found. Please login again.');
      setLoading(false);
      return;
    }
    
    setTenantId(storedTenantId);
    fetchAttendanceData(storedTenantId);
  }, []);

  const fetchAttendanceData = async (tenantId) => {
    try {
      setLoading(true);
      setError(null);
      
      // CRITICAL: tenantId is automatically added by apiClient interceptor
      // But we can also verify it's being sent
      const response = await apiClient.get('/api/attendance', {
        params: {
          page: 1,
          limit: 10,
        },
        // Explicitly set tenantId in headers (defense in depth)
        headers: {
          'X-Tenant-Id': tenantId,
        },
      });
      
      if (response.data.success) {
        // CRITICAL: Filter data by tenantId on frontend (defense in depth)
        const filteredData = response.data.data.filter(
          (record) => record.tenantId === tenantId || 
                      record.tenant_id === tenantId ||
                      !record.tenantId // Backend should handle this, but filter anyway
        );
        
        setAttendanceData({
          records: filteredData,
          pagination: response.data.pagination,
        });
      } else {
        setError(response.data.message || 'Failed to fetch attendance data');
      }
    } catch (err) {
      console.error('Attendance fetch error:', err);
      
      // Handle tenant-related errors
      if (err.response?.status === 403 && 
          err.response?.data?.error === 'TENANT_MISMATCH') {
        setError('Tenant mismatch detected. Please login again.');
        // Redirect to login
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else if (err.response?.status === 400 && 
                 err.response?.data?.error === 'TENANT_REQUIRED') {
        setError('Tenant ID required. Please login again.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError(err.response?.data?.message || 
                 err.message || 
                 'Failed to fetch attendance data');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const response = await apiClient.get('/api/attendance/today', {
        headers: {
          'X-Tenant-Id': tenantId,
        },
      });
      
      if (response.data.success) {
        // Verify tenantId matches
        const data = response.data.data;
        if (data.tenantId && data.tenantId !== tenantId) {
          console.warn('⚠️ Tenant mismatch in today attendance data!');
          setError('Data security issue detected. Please refresh.');
          return;
        }
        
        return data;
      }
    } catch (err) {
      console.error('Today attendance error:', err);
      throw err;
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await apiClient.get('/api/hr/dashboard', {
        headers: {
          'X-Tenant-Id': tenantId,
        },
      });
      
      if (response.data.success) {
        const dashboard = response.data.data;
        
        // CRITICAL: Verify tenantId in dashboard data
        if (dashboard.user?.tenantId && 
            dashboard.user.tenantId !== tenantId) {
          console.warn('⚠️ Tenant mismatch in dashboard data!');
          setError('Data security issue detected. Please refresh.');
          return;
        }
        
        return dashboard;
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="attendance-dashboard-loading">
        <div>Loading attendance data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="attendance-dashboard-error">
        <div className="error-message">{error}</div>
        <button onClick={() => fetchAttendanceData(tenantId)}>
          Retry
        </button>
      </div>
    );
  }

  if (!attendanceData || !attendanceData.records.length) {
    return (
      <div className="attendance-dashboard-empty">
        <div>No attendance records found for your tenant.</div>
      </div>
    );
  }

  return (
    <div className="attendance-dashboard">
      <div className="dashboard-header">
        <h2>Attendance Dashboard</h2>
        <div className="tenant-badge">
          Tenant: <strong>{tenantId}</strong>
        </div>
      </div>

      <div className="attendance-records">
        <h3>Recent Attendance Records</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Clock In</th>
              <th>Clock Out</th>
              <th>Total Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {attendanceData.records.map((record) => (
              <tr key={record.id || record._id}>
                <td>{new Date(record.date).toLocaleDateString()}</td>
                <td>
                  {record.clock_in_time || record.clockInTime
                    ? new Date(record.clock_in_time || record.clockInTime).toLocaleTimeString()
                    : '--'}
                </td>
                <td>
                  {record.clock_out_time || record.clockOutTime
                    ? new Date(record.clock_out_time || record.clockOutTime).toLocaleTimeString()
                    : '--'}
                </td>
                <td>
                  {record.total_hours || record.totalHours || record.hours_worked || 0} hrs
                </td>
                <td>
                  <span className={`status-${record.status}`}>
                    {record.status || 'N/A'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {attendanceData.pagination && (
        <div className="pagination">
          <button 
            disabled={attendanceData.pagination.page === 1}
            onClick={() => {
              // Fetch previous page with tenantId
              fetchAttendanceData(tenantId);
            }}
          >
            Previous
          </button>
          <span>
            Page {attendanceData.pagination.page} of {attendanceData.pagination.totalPages}
          </span>
          <button
            disabled={attendanceData.pagination.page >= attendanceData.pagination.totalPages}
            onClick={() => {
              // Fetch next page with tenantId
              fetchAttendanceData(tenantId);
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AttendanceDashboard;
```

---

### Step 4: Attendance Hook with Tenant Isolation

**File:** `src/hooks/useAttendance.js` or `src/hooks/useAttendance.ts`

```javascript
import { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';

export const useAttendance = () => {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get tenantId from storage
      const tenantId = localStorage.getItem('tenantId') || 
                      sessionStorage.getItem('tenantId');
      
      if (!tenantId) {
        throw new Error('Tenant ID not found. Please login again.');
      }
      
      const response = await apiClient.get('/api/attendance', {
        params: { page: 1, limit: 10 },
        headers: {
          'X-Tenant-Id': tenantId, // CRITICAL
        },
      });
      
      if (response.data.success) {
        // Filter by tenantId (defense in depth)
        const filtered = response.data.data.filter(
          (r) => !r.tenantId || r.tenantId === tenantId
        );
        setAttendance(filtered);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      
      // Handle tenant errors
      if (err.response?.status === 403) {
        // Redirect to login
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  const clockIn = async (location) => {
    const tenantId = localStorage.getItem('tenantId');
    
    if (!tenantId) {
      throw new Error('Tenant ID required');
    }
    
    return apiClient.post(
      '/api/attendance/clock-in',
      { latitude: location.lat, longitude: location.lng },
      {
        headers: {
          'X-Tenant-Id': tenantId, // CRITICAL
        },
      }
    );
  };

  const clockOut = async (location) => {
    const tenantId = localStorage.getItem('tenantId');
    
    if (!tenantId) {
      throw new Error('Tenant ID required');
    }
    
    return apiClient.post(
      '/api/attendance/clock-out',
      { latitude: location.lat, longitude: location.lng },
      {
        headers: {
          'X-Tenant-Id': tenantId, // CRITICAL
        },
      }
    );
  };

  return {
    attendance,
    loading,
    error,
    refetch: fetchAttendance,
    clockIn,
    clockOut,
  };
};
```

---

### Step 5: TypeScript Types (if using TypeScript)

**File:** `src/types/attendance.ts`

```typescript
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  total_hours: number;
  status: 'present' | 'absent' | 'late' | 'half-day';
  tenantId: string; // CRITICAL: Always include tenantId
  storeId?: string;
  storeCode?: string;
}

export interface AttendanceResponse {
  success: boolean;
  data: AttendanceRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AttendanceDashboardProps {
  tenantId: string; // Required prop
}
```

---

## 🔒 Security Best Practices

### 1. Always Validate TenantId

```javascript
// Before making any API call
const tenantId = localStorage.getItem('tenantId');
if (!tenantId) {
  // Redirect to login
  window.location.href = '/login';
  return;
}
```

### 2. Verify Response Data

```javascript
// After receiving data, verify tenantId matches
if (data.tenantId && data.tenantId !== currentTenantId) {
  console.error('⚠️ Tenant mismatch detected!');
  // Log out user or show error
  logout();
}
```

### 3. Filter on Frontend (Defense in Depth)

```javascript
// Even though backend filters, filter on frontend too
const filteredData = data.filter(
  (record) => record.tenantId === tenantId
);
```

### 4. Handle Tenant Errors

```javascript
// Handle 403 Tenant Mismatch
if (error.response?.status === 403) {
  // Clear storage and redirect
  localStorage.clear();
  window.location.href = '/login';
}
```

---

## ✅ Checklist

- [ ] API client adds `X-Tenant-Id` header automatically
- [ ] TenantId stored after login
- [ ] TenantId validated before API calls
- [ ] Response data filtered by tenantId (defense in depth)
- [ ] Tenant mismatch errors handled
- [ ] User redirected to login if tenantId missing
- [ ] All attendance API calls include `X-Tenant-Id` header
- [ ] Dashboard component shows current tenantId
- [ ] Error messages show tenant-related issues clearly

---

## 🧪 Testing

### Test Tenant Isolation

```javascript
// Test 1: Login as tenant1
const tenant1Token = await login('user1@tenant1.com', 'password');
localStorage.setItem('tenantId', 'tenant1');

// Test 2: Fetch attendance (should only see tenant1 data)
const attendance = await fetchAttendance();
console.assert(attendance.every(r => r.tenantId === 'tenant1'));

// Test 3: Try to access tenant2 data (should fail)
localStorage.setItem('tenantId', 'tenant2');
const response = await fetchAttendance();
// Should get 403 or empty data
```

---

## 📝 Summary

**Key Points:**
1. ✅ Always send `X-Tenant-Id` header with every request
2. ✅ Store tenantId after login
3. ✅ Validate tenantId before API calls
4. ✅ Filter data on frontend (defense in depth)
5. ✅ Handle tenant mismatch errors
6. ✅ Redirect to login if tenantId missing

**Result:** Users will only see attendance data from their own tenant, ensuring complete tenant isolation.

---

**Last Updated:** March 10, 2026  
**Status:** ✅ **IMPLEMENTATION GUIDE READY**
