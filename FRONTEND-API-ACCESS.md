# Frontend API Access Guide - All Microservices

This document explains how to access all microservices from the frontend through the API Gateway.

## API Gateway Base URL

**Production:** `https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net`

**Development:** `http://localhost:3000`

## Available Services & Endpoints

All services are accessible through the API Gateway using the following base paths:

### 1. Authentication Service
- **Endpoint:** `/api/auth`
- **Base URL:** `https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net`
- **Examples:**
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `GET /api/auth/me`
  - `POST /api/auth/refresh`

### 2. HR Service
- **Endpoint:** `/api/hr`
- **Base URL:** `https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net`
- **Examples:**
  - `GET /api/hr/employees`
  - `POST /api/hr/onboarding`
  - `GET /api/hr/leave`
  - `GET /api/hr/payroll`

### 3. Attendance Service
- **Endpoint:** `/api/attendance`
- **Examples:**
  - `POST /api/attendance/clock-in` - Clock in with location and selfie
  - `POST /api/attendance/clock-out` - Clock out with location and selfie
  - `GET /api/attendance/history` - Get attendance history
  - `GET /api/attendance/summary` - Get attendance summary
  - `GET /api/attendance` - Get all attendance records (HR/Admin only)

### 3a. Geofencing Service (Part of Attendance Service)
- **Endpoint:** `/api/geofencing`
- **Examples:**
  - `POST /api/geofencing/check` - Check geofencing status
  - `GET /api/geofencing/settings` - Get user's geofencing settings
  - `PUT /api/geofencing/settings/:userId` - Update geofencing settings (Admin only)
  - `GET /api/geofencing/users` - Get all users with geofencing enabled (Admin only)

### 4. Payroll Service
- **Endpoint:** `/api/payroll`
- **Examples:**
  - `GET /api/payroll/runs`
  - `POST /api/payroll/process`
  - `GET /api/payroll/payslips`

### 5. CRM Service
- **Endpoint:** `/api/crm`
- **Examples:**
  - `GET /api/crm/customers`
  - `POST /api/crm/customers`
  - `GET /api/crm/leads`

### 6. Inventory Service
- **Endpoint:** `/api/inventory`
- **Examples:**
  - `GET /api/inventory/products`
  - `POST /api/inventory/products`
  - `GET /api/inventory/stock`

### 7. Sales Service
- **Endpoint:** `/api/sales`
- **Examples:**
  - `GET /api/sales/orders`
  - `POST /api/sales/orders`
  - `GET /api/sales/invoices`

### 8. Purchase Service
- **Endpoint:** `/api/purchase`
- **Examples:**
  - `GET /api/purchase/orders`
  - `POST /api/purchase/orders`
  - `GET /api/purchase/vendors`

### 9. Financial Service
- **Endpoint:** `/api/financial`
- **Examples:**
  - `GET /api/financial/accounts`
  - `GET /api/financial/transactions`
  - `GET /api/financial/reports`

### 10. Document Service
- **Endpoint:** `/api/documents`
- **Examples:**
  - `GET /api/documents`
  - `POST /api/documents/upload`
  - `POST /api/documents/sign`

### 11. Service Management
- **Endpoint:** `/api/service`
- **Examples:**
  - `GET /api/service/requests`
  - `POST /api/service/requests`
  - `GET /api/service/slas`

### 12. CPP Service (Customer Protection Plan)
- **Endpoint:** `/api/cpp`
- **Examples:**
  - `GET /api/cpp/plans`
  - `POST /api/cpp/claims`

### 13. Prescription Service
- **Endpoint:** `/api/prescription`
- **Examples:**
  - `GET /api/prescription`
  - `POST /api/prescription`

### 14. Analytics Service
- **Endpoint:** `/api/analytics`
- **Examples:**
  - `GET /api/analytics/dashboard`
  - `GET /api/analytics/reports`

### 15. Notification Service
- **Endpoint:** `/api/notification`
- **Examples:**
  - `GET /api/notification`
  - `POST /api/notification/send`

### 16. Monitoring Service
- **Endpoint:** `/api/monitoring`
- **Examples:**
  - `GET /api/monitoring/health`
  - `GET /api/monitoring/metrics`

### 17. Tenant Registry Service
- **Endpoint:** `/api/tenants`
- **Examples:**
  - `GET /api/tenants`
  - `POST /api/tenants`

### 18. Realtime Service (WebSocket)
- **Endpoint:** `/ws`
- **Protocol:** WebSocket
- **Examples:**
  - `ws://your-gateway-url/ws`

## Frontend Configuration

### React/Next.js Example

```javascript
// config/api.js
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 
  'https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net';

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    ME: `${API_BASE_URL}/api/auth/me`,
    REFRESH: `${API_BASE_URL}/api/auth/refresh`,
  },
  
  // HR
  HR: {
    EMPLOYEES: `${API_BASE_URL}/api/hr/employees`,
    ONBOARDING: `${API_BASE_URL}/api/hr/onboarding`,
    LEAVE: `${API_BASE_URL}/api/hr/leave`,
    PAYROLL: `${API_BASE_URL}/api/hr/payroll`,
  },
  
  // Attendance
  ATTENDANCE: {
    CHECK_IN: `${API_BASE_URL}/api/attendance/check-in`,
    CHECK_OUT: `${API_BASE_URL}/api/attendance/check-out`,
    HISTORY: `${API_BASE_URL}/api/attendance/history`,
  },
  
  // Payroll
  PAYROLL: {
    RUNS: `${API_BASE_URL}/api/payroll/runs`,
    PROCESS: `${API_BASE_URL}/api/payroll/process`,
    PAYSLIPS: `${API_BASE_URL}/api/payroll/payslips`,
  },
  
  // CRM
  CRM: {
    CUSTOMERS: `${API_BASE_URL}/api/crm/customers`,
    LEADS: `${API_BASE_URL}/api/crm/leads`,
  },
  
  // Inventory
  INVENTORY: {
    PRODUCTS: `${API_BASE_URL}/api/inventory/products`,
    STOCK: `${API_BASE_URL}/api/inventory/stock`,
  },
  
  // Sales
  SALES: {
    ORDERS: `${API_BASE_URL}/api/sales/orders`,
    INVOICES: `${API_BASE_URL}/api/sales/invoices`,
  },
  
  // And so on for other services...
};

// Usage in components
import axios from 'axios';
import { API_ENDPOINTS } from './config/api';

// Login example
const login = async (email, password) => {
  const response = await axios.post(API_ENDPOINTS.AUTH.LOGIN, {
    email,
    password
  });
  return response.data;
};

// Get employees example
const getEmployees = async (token) => {
  const response = await axios.get(API_ENDPOINTS.HR.EMPLOYEES, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data;
};
```

### Axios Interceptor Example

```javascript
// utils/axios.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 
  'https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh or redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

## Environment Variables

Create a `.env` file in your frontend project:

```env
REACT_APP_API_BASE_URL=https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net
```

## Service Status

Check service status by calling:
- `GET /` - Shows all services and their status
- `GET /api` - Shows all services and their status
- `GET /health` - Gateway health check

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```javascript
headers: {
  'Authorization': `Bearer ${token}`
}
```

## CORS

The API Gateway is configured to accept requests from all origins. If you need to restrict CORS, set the `CORS_ORIGIN` environment variable in the gateway.

## Error Handling

All services return standardized error responses:

```json
{
  "success": false,
  "message": "Error message",
  "error": "Error details",
  "statusCode": 400
}
```

## Notes

1. **Service Availability**: Not all services may have App Services created yet. Services pointing to `localhost` will return 503 errors in production.

2. **Service URLs**: You can override service URLs by setting environment variables in the API Gateway:
   - `ATTENDANCE_SERVICE_URL`
   - `PAYROLL_SERVICE_URL`
   - `CRM_SERVICE_URL`
   - etc.

3. **Development vs Production**: In development, services may run on localhost. In production, they should point to Azure App Services.

4. **WebSocket**: The realtime service uses WebSocket protocol. Use a WebSocket client library to connect.

