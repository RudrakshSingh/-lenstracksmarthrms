# Frontend Developer Guide: Mock Login Integration

## 📋 Table of Contents
1. [Introduction](#introduction)
2. [Quick Start](#quick-start)
3. [Step-by-Step Integration](#step-by-step-integration)
4. [Complete Code Examples](#complete-code-examples)
5. [Using the Token](#using-the-token)
6. [Common Scenarios](#common-scenarios)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## 🎯 Introduction

### What is Mock Login?
Mock login is a special endpoint that allows you to test your frontend application **without needing real user credentials**. It automatically creates a test user and gives you a valid authentication token.

### Why Use Mock Login?
- ✅ No need to create real users in the database
- ✅ Test different user roles (HR, Admin, Manager, etc.)
- ✅ Quick testing during development
- ✅ Works with all protected API endpoints

### Important Notes
⚠️ **This is for DEVELOPMENT/TESTING only!**
- Do NOT use in production
- Mock users are automatically created
- All mock users have the password: `mockpassword123` (if you need regular login)

---

## 🚀 Quick Start

### Step 1: Make the API Call

```javascript
// Simple mock login function
async function mockLogin(role = 'hr') {
  const response = await fetch('https://your-api-gateway.com/api/auth/mock-login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role })
  });
  
  const data = await response.json();
  return data;
}
```

### Step 2: Store the Token

```javascript
const result = await mockLogin('hr');

if (result.success) {
  // Save token to localStorage
  localStorage.setItem('accessToken', result.data.accessToken);
  localStorage.setItem('user', JSON.stringify(result.data.user));
  
  console.log('Logged in!', result.data.user);
}
```

### Step 3: Use the Token

```javascript
// Now you can make authenticated API calls
const token = localStorage.getItem('accessToken');

fetch('https://your-api-gateway.com/api/hr/employees', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
  .then(res => res.json())
  .then(data => console.log(data));
```

---

## 📝 Step-by-Step Integration

### Step 1: Create a Mock Login Service

Create a file: `src/services/authService.js`

```javascript
// src/services/authService.js

const API_BASE_URL = 'https://your-api-gateway.com'; // Replace with your actual API Gateway URL

/**
 * Mock login function
 * @param {string} role - User role: 'hr', 'admin', 'manager', 'employee', 'superadmin'
 * @param {object} options - Optional: { email, employeeId, name }
 * @returns {Promise<object>} Login response with user data and tokens
 */
export async function mockLogin(role = 'hr', options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/mock-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role,
        ...options
      })
    });

    // Check if response is OK
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Login failed');
    }

    return data;
  } catch (error) {
    console.error('Mock login error:', error);
    throw error;
  }
}

/**
 * Store authentication data in localStorage
 * @param {object} loginData - Data from mockLogin response
 */
export function storeAuthData(loginData) {
  if (loginData.success && loginData.data) {
    localStorage.setItem('accessToken', loginData.data.accessToken);
    localStorage.setItem('refreshToken', loginData.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(loginData.data.user));
    return true;
  }
  return false;
}

/**
 * Get stored access token
 * @returns {string|null} Access token or null
 */
export function getAccessToken() {
  return localStorage.getItem('accessToken');
}

/**
 * Get stored user data
 * @returns {object|null} User object or null
 */
export function getUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

/**
 * Check if user is logged in
 * @returns {boolean}
 */
export function isLoggedIn() {
  return !!getAccessToken();
}

/**
 * Logout - Clear stored data
 */
export function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

/**
 * Make authenticated API request
 * @param {string} url - API endpoint (relative to API_BASE_URL)
 * @param {object} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function authenticatedFetch(url, options = {}) {
  const token = getAccessToken();
  
  if (!token) {
    throw new Error('No access token found. Please login first.');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };

  return fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers
  });
}
```

### Step 2: Create a Login Component

Create a file: `src/components/MockLogin.jsx` (React) or `src/components/MockLogin.vue` (Vue)

#### React Example:

```jsx
// src/components/MockLogin.jsx
import React, { useState } from 'react';
import { mockLogin, storeAuthData } from '../services/authService';

function MockLogin({ onLoginSuccess }) {
  const [role, setRole] = useState('hr');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // Call mock login API
      const result = await mockLogin(role);
      
      // Store authentication data
      if (storeAuthData(result)) {
        console.log('Login successful!', result.data.user);
        
        // Call success callback if provided
        if (onLoginSuccess) {
          onLoginSuccess(result.data.user);
        }
        
        // Optionally redirect to dashboard
        // window.location.href = '/dashboard';
      } else {
        throw new Error('Failed to store authentication data');
      }
    } catch (err) {
      setError(err.message);
      console.error('Login failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h2>Mock Login (Development Only)</h2>
      
      <div style={{ marginBottom: '15px' }}>
        <label>
          Select Role:
          <select 
            value={role} 
            onChange={(e) => setRole(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px', 
              marginTop: '5px',
              fontSize: '16px'
            }}
          >
            <option value="hr">HR</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
            <option value="superadmin">Super Admin</option>
          </select>
        </label>
      </div>

      <button
        onClick={handleLogin}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>

      {error && (
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          borderRadius: '4px'
        }}>
          Error: {error}
        </div>
      )}

      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        backgroundColor: '#fff3cd', 
        fontSize: '12px',
        borderRadius: '4px'
      }}>
        ⚠️ This is for development/testing only. Do not use in production.
      </div>
    </div>
  );
}

export default MockLogin;
```

#### Vue Example:

```vue
<!-- src/components/MockLogin.vue -->
<template>
  <div class="mock-login">
    <h2>Mock Login (Development Only)</h2>
    
    <div class="form-group">
      <label>Select Role:</label>
      <select v-model="role" class="role-select">
        <option value="hr">HR</option>
        <option value="admin">Admin</option>
        <option value="manager">Manager</option>
        <option value="employee">Employee</option>
        <option value="superadmin">Super Admin</option>
      </select>
    </div>

    <button 
      @click="handleLogin" 
      :disabled="loading"
      class="login-button"
    >
      {{ loading ? 'Logging in...' : 'Login' }}
    </button>

    <div v-if="error" class="error-message">
      Error: {{ error }}
    </div>

    <div class="warning">
      ⚠️ This is for development/testing only. Do not use in production.
    </div>
  </div>
</template>

<script>
import { mockLogin, storeAuthData } from '../services/authService';

export default {
  name: 'MockLogin',
  data() {
    return {
      role: 'hr',
      loading: false,
      error: null
    };
  },
  methods: {
    async handleLogin() {
      this.loading = true;
      this.error = null;

      try {
        const result = await mockLogin(this.role);
        
        if (storeAuthData(result)) {
          console.log('Login successful!', result.data.user);
          
          // Emit event to parent
          this.$emit('login-success', result.data.user);
          
          // Optionally redirect
          // this.$router.push('/dashboard');
        } else {
          throw new Error('Failed to store authentication data');
        }
      } catch (err) {
        this.error = err.message;
        console.error('Login failed:', err);
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.mock-login {
  padding: 20px;
  max-width: 400px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 15px;
}

.role-select {
  width: 100%;
  padding: 8px;
  margin-top: 5px;
  font-size: 16px;
}

.login-button {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.login-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.error-message {
  margin-top: 15px;
  padding: 10px;
  background-color: #f8d7da;
  color: #721c24;
  border-radius: 4px;
}

.warning {
  margin-top: 20px;
  padding: 10px;
  background-color: #fff3cd;
  font-size: 12px;
  border-radius: 4px;
}
</style>
```

### Step 3: Use the Component in Your App

#### React Example:

```jsx
// src/App.jsx
import React, { useState, useEffect } from 'react';
import MockLogin from './components/MockLogin';
import { isLoggedIn, getUser } from './services/authService';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    if (isLoggedIn()) {
      setLoggedIn(true);
      setUser(getUser());
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setLoggedIn(true);
    setUser(userData);
  };

  if (!loggedIn) {
    return <MockLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div>
      <h1>Welcome, {user?.name}!</h1>
      <p>Role: {user?.role}</p>
      <p>Email: {user?.email}</p>
      {/* Your main app content here */}
    </div>
  );
}

export default App;
```

#### Vue Example:

```vue
<!-- src/App.vue -->
<template>
  <div id="app">
    <MockLogin 
      v-if="!loggedIn" 
      @login-success="handleLoginSuccess" 
    />
    <div v-else>
      <h1>Welcome, {{ user?.name }}!</h1>
      <p>Role: {{ user?.role }}</p>
      <p>Email: {{ user?.email }}</p>
      <!-- Your main app content here -->
    </div>
  </div>
</template>

<script>
import MockLogin from './components/MockLogin.vue';
import { isLoggedIn, getUser } from './services/authService';

export default {
  name: 'App',
  components: {
    MockLogin
  },
  data() {
    return {
      loggedIn: false,
      user: null
    };
  },
  mounted() {
    // Check if user is already logged in
    if (isLoggedIn()) {
      this.loggedIn = true;
      this.user = getUser();
    }
  },
  methods: {
    handleLoginSuccess(userData) {
      this.loggedIn = true;
      this.user = userData;
    }
  }
};
</script>
```

---

## 🔑 Using the Token

### Making Authenticated API Calls

After login, you need to include the token in all API requests:

```javascript
import { authenticatedFetch, getAccessToken } from './services/authService';

// Method 1: Using authenticatedFetch helper
async function getEmployees() {
  try {
    const response = await authenticatedFetch('/api/hr/employees');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
}

// Method 2: Manual fetch with token
async function getEmployeesManual() {
  const token = getAccessToken();
  
  if (!token) {
    throw new Error('Not logged in');
  }

  const response = await fetch('https://your-api-gateway.com/api/hr/employees', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  return response.json();
}
```

### Creating an API Client

Create a reusable API client: `src/services/apiClient.js`

```javascript
// src/services/apiClient.js
import { getAccessToken } from './authService';

const API_BASE_URL = 'https://your-api-gateway.com';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const token = getAccessToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export default new ApiClient();
```

### Using the API Client

```javascript
import apiClient from './services/apiClient';

// GET request
const employees = await apiClient.get('/api/hr/employees');

// POST request
const newEmployee = await apiClient.post('/api/hr/employees', {
  name: 'John Doe',
  email: 'john@example.com'
});

// PUT request
const updated = await apiClient.put('/api/hr/employees/123', {
  name: 'Jane Doe'
});

// DELETE request
await apiClient.delete('/api/hr/employees/123');
```

---

## 🎭 Common Scenarios

### Scenario 1: Login as HR User

```javascript
import { mockLogin, storeAuthData } from './services/authService';

async function loginAsHR() {
  const result = await mockLogin('hr');
  storeAuthData(result);
  console.log('Logged in as HR:', result.data.user);
}
```

### Scenario 2: Login as Admin (Full Access)

```javascript
async function loginAsAdmin() {
  const result = await mockLogin('admin');
  storeAuthData(result);
  console.log('Logged in as Admin:', result.data.user);
}
```

### Scenario 3: Login with Custom Details

```javascript
async function loginWithCustomDetails() {
  const result = await mockLogin('hr', {
    email: 'custom.hr@etelios.com',
    employeeId: 'CUSTOM001',
    name: 'Custom HR User'
  });
  storeAuthData(result);
  console.log('Logged in with custom details:', result.data.user);
}
```

### Scenario 4: Check Login Status and Redirect

```javascript
import { isLoggedIn, getUser } from './services/authService';

function ProtectedRoute({ children }) {
  if (!isLoggedIn()) {
    // Redirect to login
    window.location.href = '/login';
    return null;
  }

  const user = getUser();
  console.log('Current user:', user);

  return children;
}
```

### Scenario 5: Auto-login on Page Load

```javascript
// In your main App component
useEffect(() => {
  // Auto-login as HR for development
  if (process.env.NODE_ENV === 'development' && !isLoggedIn()) {
    mockLogin('hr')
      .then(result => {
        storeAuthData(result);
        console.log('Auto-logged in:', result.data.user);
      })
      .catch(error => {
        console.error('Auto-login failed:', error);
      });
  }
}, []);
```

---

## 🐛 Troubleshooting

### Problem 1: "CORS Error" or "Network Error"

**Solution:**
- Make sure your API Gateway URL is correct
- Check if CORS is enabled on the backend
- Verify the endpoint URL: `https://your-api-gateway.com/api/auth/mock-login`

```javascript
// Check your API_BASE_URL
const API_BASE_URL = 'https://your-api-gateway.com'; // Make sure this is correct!
```

### Problem 2: "Invalid role" Error

**Solution:**
- Make sure you're using a valid role: `'hr'`, `'admin'`, `'manager'`, `'employee'`, `'superadmin'`
- Check for typos in the role name

```javascript
// ✅ Correct
await mockLogin('hr');

// ❌ Wrong
await mockLogin('HR'); // Case sensitive!
await mockLogin('hr_manager'); // Invalid role
```

### Problem 3: Token Not Working

**Solution:**
- Make sure you're storing the token correctly
- Check if token is being sent in the Authorization header
- Verify token format: `Bearer <token>`

```javascript
// ✅ Correct
headers: {
  'Authorization': `Bearer ${token}`
}

// ❌ Wrong
headers: {
  'Authorization': token // Missing 'Bearer '
}
headers: {
  'token': token // Wrong header name
}
```

### Problem 4: "User not found" Error

**Solution:**
- The mock login should create the user automatically
- Check if the database connection is working
- Try logging in again (it will reuse existing user)

### Problem 5: Token Expired

**Solution:**
- Tokens expire after 15 minutes (default)
- Use the refresh token to get a new access token
- Or simply call mock login again

```javascript
// Refresh token example
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  
  const response = await fetch('https://your-api-gateway.com/api/auth/refresh-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('accessToken', data.data.accessToken);
  }
}
```

### Problem 6: "401 Unauthorized" Error

**Solution:**
- Check if token is being sent
- Verify token is valid (not expired)
- Make sure you're using the correct endpoint

```javascript
// Debug: Check token
console.log('Token:', getAccessToken());
console.log('User:', getUser());

// If token is missing, login again
if (!getAccessToken()) {
  await mockLogin('hr');
}
```

---

## ✅ Best Practices

### 1. Environment-Based Configuration

```javascript
// config.js
const config = {
  development: {
    API_BASE_URL: 'http://localhost:3000',
    ENABLE_MOCK_LOGIN: true
  },
  production: {
    API_BASE_URL: 'https://your-api-gateway.com',
    ENABLE_MOCK_LOGIN: false
  }
};

export default config[process.env.NODE_ENV || 'development'];
```

### 2. Error Handling

```javascript
async function safeMockLogin(role) {
  try {
    const result = await mockLogin(role);
    storeAuthData(result);
    return { success: true, user: result.data.user };
  } catch (error) {
    console.error('Login failed:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}
```

### 3. Token Refresh Interceptor

```javascript
// Intercept API calls and refresh token if expired
async function apiCallWithRefresh(url, options) {
  try {
    return await authenticatedFetch(url, options);
  } catch (error) {
    if (error.message.includes('Token expired')) {
      // Try to refresh token
      await refreshAccessToken();
      // Retry the request
      return await authenticatedFetch(url, options);
    }
    throw error;
  }
}
```

### 4. Logout Functionality

```javascript
import { logout } from './services/authService';

function handleLogout() {
  logout();
  // Redirect to login page
  window.location.href = '/login';
}
```

### 5. Protected Routes

```javascript
// React Router example
import { Navigate } from 'react-router-dom';
import { isLoggedIn } from './services/authService';

function ProtectedRoute({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" />;
}
```

---

## 📚 Complete Example: Full Integration

Here's a complete example combining everything:

```javascript
// src/services/authService.js
const API_BASE_URL = 'https://your-api-gateway.com';

export async function mockLogin(role = 'hr', options = {}) {
  const response = await fetch(`${API_BASE_URL}/api/auth/mock-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, ...options })
  });
  
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.data.user));
  }
  return data;
}

export function getAccessToken() {
  return localStorage.getItem('accessToken');
}

export function getUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

export function isLoggedIn() {
  return !!getAccessToken();
}

export function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

// src/components/Login.jsx
import React, { useState } from 'react';
import { mockLogin } from '../services/authService';

function Login({ onLogin }) {
  const [role, setRole] = useState('hr');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await mockLogin(role);
      if (result.success && onLogin) {
        onLogin(result.data.user);
      }
    } catch (error) {
      alert('Login failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="hr">HR</option>
        <option value="admin">Admin</option>
        <option value="manager">Manager</option>
      </select>
      <button onClick={handleLogin} disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </div>
  );
}

// src/App.jsx
import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import { isLoggedIn, getUser } from './services/authService';
import { authenticatedFetch } from './services/authService';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (isLoggedIn()) {
      setUser(getUser());
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const fetchData = async () => {
    const response = await authenticatedFetch('/api/hr/employees');
    const data = await response.json();
    console.log('Employees:', data);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <button onClick={fetchData}>Fetch Employees</button>
    </div>
  );
}
```

---

## 🎓 Summary

1. **Call the mock login endpoint** with a role
2. **Store the returned token** in localStorage
3. **Include the token** in all API requests using `Authorization: Bearer <token>`
4. **Use the token** to access protected endpoints

That's it! You're ready to test your frontend with the mock login. 🚀

---

## 📞 Need Help?

If you're still having issues:
1. Check the browser console for errors
2. Verify the API Gateway URL is correct
3. Make sure you're using the correct endpoint: `/api/auth/mock-login`
4. Check network tab to see the actual API request/response
5. Verify the token is being sent in the Authorization header

Good luck! 💪

