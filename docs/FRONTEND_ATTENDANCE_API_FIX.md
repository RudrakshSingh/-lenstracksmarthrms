# 🔧 Frontend Developer - Attendance API Integration Fix

**Date:** March 9, 2026  
**Issue:** Attendance API working but frontend not showing data  
**Status:** ✅ **SOLUTION PROVIDED**

---

## 🔍 Problem

**API Status:**
- ✅ Login: Working (admin@upcapto.com)
- ⚠️ Attendance API: Sometimes 503 (Service Unavailable) or 200 OK with empty data
- ❌ Frontend: Not showing attendance records

**API Response (When Working):**
```json
{
  "success": true,
  "data": [],
  "pagination": { "page": 1, "limit": 10, "total": 0, "totalPages": 0 },
  "message": "No attendance records found"
}
```

**Issues:**
1. **503 Error:** Attendance service might be down or unhealthy
2. **Empty Data:** No attendance records exist in database for tenant `upcapto`
3. **Frontend:** Not handling empty state properly

---

## ✅ Solution

### 1. Correct API Base URL

**❌ Wrong (Localhost):**
```
http://localhost:3002/api/attendance
```

**✅ Correct (Production ALB):**
```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/api/attendance
```

### 2. Correct Endpoint

**Use this endpoint:**
```
GET /api/attendance?page=1&limit=10
```

**NOT:**
- ❌ `http://localhost:3002/api/attendance` (Wrong base URL)
- ❌ `/api/attendance/records` (May not exist)

---

## 📝 Correct Implementation

### React/Next.js Example

```javascript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 
  'http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com';

async function getAttendanceRecords(page = 1, limit = 10) {
  try {
    const token = localStorage.getItem('authToken');
    const tenantId = localStorage.getItem('tenantId') || 'upcapto';
    
    // ✅ Use correct base URL and endpoint
    const response = await axios.get(
      `${API_BASE_URL}/api/attendance`,  // ✅ Correct
      {
        params: {
          page: page,
          limit: limit
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId
        }
      }
    );
    
    if (response.data.success) {
      const { data, pagination } = response.data;
      
      // Handle empty data
      if (data.length === 0) {
        console.log('No attendance records found');
        return {
          records: [],
          pagination: pagination,
          message: 'No attendance records found'
        };
      }
      
      return {
        records: data,  // ✅ Use this in your component
        pagination: pagination
      };
    }
    
    throw new Error('Failed to fetch attendance');
  } catch (error) {
    console.error('❌ Attendance API error:', error.response?.data || error.message);
    throw error;
  }
}
```

---

## 🎯 Common Frontend Issues & Fixes

### Issue 1: Wrong Base URL

**Problem:**
```javascript
// ❌ Wrong - Using localhost
const API_URL = 'http://localhost:3002';
```

**Fix:**
```javascript
// ✅ Correct - Use production ALB
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 
  'http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com';
```

### Issue 2: Not Parsing Response Correctly

**Problem:**
```javascript
// ❌ Wrong - Accessing wrong property
const records = response.data;  // This might be empty array
```

**Fix:**
```javascript
// ✅ Correct - Access data property
const records = response.data.data;  // This is the array
const pagination = response.data.pagination;
```

### Issue 3: Not Handling Empty Data

**Problem:**
```javascript
// ❌ Wrong - Not checking for empty data
const records = response.data.data;
setAttendanceRecords(records);  // Empty array, nothing shows
```

**Fix:**
```javascript
// ✅ Correct - Handle empty state
const records = response.data.data;
if (records.length === 0) {
  setMessage('No attendance records found');
  setAttendanceRecords([]);
} else {
  setAttendanceRecords(records);
}
```

### Issue 4: Wrong Headers

**Problem:**
```javascript
// ❌ Wrong - Missing tenant ID
headers: {
  'Authorization': `Bearer ${token}`
  // Missing x-tenant-id
}
```

**Fix:**
```javascript
// ✅ Correct - Include both headers
headers: {
  'Authorization': `Bearer ${token}`,
  'x-tenant-id': tenantId  // ✅ Required
}
```

---

## 📊 Response Structure

### Success Response (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "attendance_id_123",
      "employee_id": "EMP-001",
      "employeeName": "John Doe",
      "date": "2026-03-09",
      "check_in_time": "2026-03-09T09:00:00.000Z",
      "check_out_time": "2026-03-09T18:00:00.000Z",
      "status": "present",
      "total_hours": 9,
      "check_in_location": {
        "latitude": 19.0760,
        "longitude": 72.8777
      },
      "check_in_selfie": {
        "url": "https://etelios-prod-storage.s3.ap-south-1.amazonaws.com/attendance/selfies/..."
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  },
  "message": "Attendance records retrieved successfully"
}
```

### Empty Response (200)

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0
  },
  "message": "No attendance records found"
}
```

**Note:** Empty `data` array is normal if no records exist. Frontend should handle this.

---

## 💻 Complete Frontend Component Example

### React Component

```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 
  'http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com';

function AttendanceList() {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAttendanceRecords();
  }, [pagination.page]);

  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('authToken');
      const tenantId = localStorage.getItem('tenantId') || 'upcapto';
      
      // ✅ Correct endpoint and base URL
      const response = await axios.get(
        `${API_BASE_URL}/api/attendance`,
        {
          params: {
            page: pagination.page,
            limit: pagination.limit
          },
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId
          }
        }
      );
      
      if (response.data.success) {
        // ✅ Access data.data (not just data)
        const records = response.data.data;
        const paginationData = response.data.pagination;
        
        setAttendanceRecords(records);
        setPagination(paginationData);
        setMessage(response.data.message || '');
        
        // Handle empty data
        if (records.length === 0) {
          setMessage('No attendance records found');
        }
      } else {
        setError('Failed to fetch attendance records');
      }
    } catch (error) {
      console.error('Attendance API error:', error);
      setError(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading attendance records...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Attendance Records</h2>
      
      {message && <p>{message}</p>}
      
      {attendanceRecords.length === 0 ? (
        <div>No attendance records found</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {attendanceRecords.map((record) => (
              <tr key={record.id}>
                <td>{record.employeeName || record.employee_id}</td>
                <td>{new Date(record.date).toLocaleDateString()}</td>
                <td>{record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString() : '-'}</td>
                <td>{record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : '-'}</td>
                <td>{record.total_hours || '-'}</td>
                <td>{record.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div>
          <button 
            onClick={() => setPagination({...pagination, page: pagination.page - 1})}
            disabled={pagination.page === 1}
          >
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button 
            onClick={() => setPagination({...pagination, page: pagination.page + 1})}
            disabled={pagination.page >= pagination.totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default AttendanceList;
```

---

## 🔍 Debugging Steps

### Step 1: Check API Base URL

```javascript
// Add this to your code
console.log('API Base URL:', API_BASE_URL);
console.log('Full URL:', `${API_BASE_URL}/api/attendance`);
```

**Should show:**
```
API Base URL: http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
Full URL: http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/api/attendance
```

### Step 2: Check Response Structure

```javascript
// Log full response
console.log('Full Response:', response);
console.log('Response Data:', response.data);
console.log('Records Array:', response.data.data);
console.log('Pagination:', response.data.pagination);
```

### Step 3: Check Headers

```javascript
// Log headers being sent
console.log('Token:', token ? 'Present' : 'Missing');
console.log('Tenant ID:', tenantId);
```

### Step 4: Test in Browser Console

```javascript
// Test directly in browser console
const token = localStorage.getItem('authToken');
const tenantId = localStorage.getItem('tenantId') || 'upcapto';

fetch('http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/api/attendance?page=1&limit=10', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': tenantId
  }
})
  .then(res => res.json())
  .then(data => {
    console.log('Response:', data);
    console.log('Records:', data.data);
    console.log('Count:', data.data.length);
  });
```

---

## ✅ Checklist

Before reporting issue, verify:

- [ ] Using correct base URL (not localhost)
- [ ] Using correct endpoint: `/api/attendance`
- [ ] Including `Authorization` header with Bearer token
- [ ] Including `x-tenant-id` header
- [ ] Accessing `response.data.data` (not just `response.data`)
- [ ] Handling empty data array
- [ ] Checking browser console for errors
- [ ] Checking Network tab for actual request/response

---

## 🐛 Common Mistakes

### Mistake 1: Using localhost

```javascript
// ❌ Wrong
const API_URL = 'http://localhost:3002';
```

### Mistake 2: Wrong Response Path

```javascript
// ❌ Wrong
const records = response.data;  // This is the whole response object

// ✅ Correct
const records = response.data.data;  // This is the array
```

### Mistake 3: Not Handling Empty State

```javascript
// ❌ Wrong - Shows nothing when empty
{attendanceRecords.map(...)}

// ✅ Correct - Shows message when empty
{attendanceRecords.length === 0 ? (
  <div>No records found</div>
) : (
  attendanceRecords.map(...)
)}
```

### Mistake 4: Not Handling 503 Errors

```javascript
// ❌ Wrong - No error handling for service unavailable
const response = await axios.get(`${API_URL}/api/attendance`);

// ✅ Correct - Handle 503 and other errors
try {
  const response = await axios.get(`${API_URL}/api/attendance`);
  // Handle success
} catch (error) {
  if (error.response?.status === 503) {
    setError('Attendance service is temporarily unavailable. Please try again later.');
  } else {
    setError('Failed to fetch attendance records');
  }
}
```

---

## 📊 Available Attendance Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/attendance` | GET | Get all attendance records (paginated) |
| `/api/attendance/today` | GET | Get today's attendance |
| `/api/attendance/summary` | GET | Get attendance summary |
| `/api/attendance/records` | GET | Alternative endpoint (may not exist) |
| `/api/attendance/checkin` | POST | Clock in |
| `/api/attendance/checkout` | POST | Clock out |

**Recommended:** Use `/api/attendance` with pagination.

---

## 🔗 Related Documentation

- [Frontend Developer Complete Guide](./FRONTEND_DEVELOPER_COMPLETE_GUIDE.md)
- [S3 Image Upload Guide](./FRONTEND_S3_IMAGE_UPLOAD_GUIDE.md)
- [API Test Report](./COMPLETE_API_TEST_REPORT.md)

---

## ✅ Quick Fix Summary

1. **Change base URL:**
   ```javascript
   // From: http://localhost:3002
   // To: http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
   ```

2. **Access correct response path:**
   ```javascript
   // Use: response.data.data (not response.data)
   const records = response.data.data;
   ```

3. **Handle empty data:**
   ```javascript
   if (records.length === 0) {
     // Show "No records found" message
     setMessage('No attendance records found. Please clock in to create a record.');
   }
   ```

4. **Handle 503 errors:**
   ```javascript
   try {
     const response = await axios.get(`${API_URL}/api/attendance`);
   } catch (error) {
     if (error.response?.status === 503) {
       setError('Service temporarily unavailable. Please try again.');
     }
   }
   ```

5. **Create test data:**
   - Use clock-in API to create attendance records
   - Verify records are created
   - Test API again

---

## 🔧 Why Data is Empty

**Most Likely Reason:** No attendance records have been created yet.

**Solution:**
1. Create test attendance by clocking in:
   ```bash
   POST /api/attendance/clock-in
   {
     "latitude": 19.0760,
     "longitude": 72.8777
   }
   ```

2. Verify records exist in database

3. Test API again

**See:** [Attendance Empty Data Diagnosis](./ATTENDANCE_EMPTY_DATA_DIAGNOSIS.md) for detailed analysis.

---

**Last Updated:** March 9, 2026  
**Status:** ✅ **READY FOR FRONTEND FIX**
