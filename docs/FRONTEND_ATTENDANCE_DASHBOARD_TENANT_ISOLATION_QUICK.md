# 🔒 Attendance Dashboard Tenant Isolation - Quick Reference

**Quick implementation guide for frontend developers**

---

## ✅ Required Changes

### 1. API Client - Add Tenant Header

```javascript
// src/utils/apiClient.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

// Add tenant header to ALL requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId'); // CRITICAL
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (tenantId) {
    config.headers['X-Tenant-Id'] = tenantId; // CRITICAL
  }
  
  return config;
});

export default apiClient;
```

---

### 2. Store TenantId After Login

```javascript
// After login
const response = await apiClient.post('/api/auth/login', { email, password });

if (response.data.success) {
  const { accessToken, user } = response.data.data;
  const tenantId = user.tenantId; // Extract tenantId
  
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('tenantId', tenantId); // CRITICAL: Store tenantId
}
```

---

### 3. Attendance Dashboard Component

```jsx
import React, { useEffect, useState } from 'react';
import apiClient from '../utils/apiClient';

const AttendanceDashboard = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState(null);

  useEffect(() => {
    const storedTenantId = localStorage.getItem('tenantId');
    
    if (!storedTenantId) {
      // Redirect to login if tenantId missing
      window.location.href = '/login';
      return;
    }
    
    setTenantId(storedTenantId);
    fetchAttendance(storedTenantId);
  }, []);

  const fetchAttendance = async (tenantId) => {
    try {
      setLoading(true);
      
      // tenantId is automatically added by apiClient interceptor
      const response = await apiClient.get('/api/attendance', {
        params: { page: 1, limit: 10 },
        headers: {
          'X-Tenant-Id': tenantId, // Explicit (defense in depth)
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
      // Handle tenant errors
      if (err.response?.status === 403) {
        // Tenant mismatch - logout
        localStorage.clear();
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!tenantId) return <div>Please login</div>;

  return (
    <div>
      <h2>Attendance Dashboard</h2>
      <p>Tenant: {tenantId}</p>
      
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Clock In</th>
            <th>Clock Out</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
          {attendance.map((record) => (
            <tr key={record.id}>
              <td>{new Date(record.date).toLocaleDateString()}</td>
              <td>{record.clock_in_time ? new Date(record.clock_in_time).toLocaleTimeString() : '--'}</td>
              <td>{record.clock_out_time ? new Date(record.clock_out_time).toLocaleTimeString() : '--'}</td>
              <td>{record.total_hours || 0} hrs</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceDashboard;
```

---

## 🔒 Security Checklist

- [ ] `X-Tenant-Id` header sent with every request
- [ ] TenantId stored after login
- [ ] TenantId validated before API calls
- [ ] Response data filtered by tenantId
- [ ] 403 errors handled (tenant mismatch)
- [ ] User redirected if tenantId missing

---

## 📝 Key Points

1. **Always send `X-Tenant-Id` header** - Required for tenant isolation
2. **Store tenantId after login** - Extract from login response
3. **Validate tenantId** - Check before making API calls
4. **Filter on frontend** - Defense in depth (backend also filters)
5. **Handle errors** - 403 = tenant mismatch, redirect to login

---

**For detailed implementation, see:** `FRONTEND_ATTENDANCE_DASHBOARD_TENANT_ISOLATION.md`
