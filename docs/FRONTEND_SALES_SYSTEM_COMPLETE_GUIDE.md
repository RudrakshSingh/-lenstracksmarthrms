# 💰 Employee Daily Sales System - Complete Frontend Developer Guide

**Production Ready - Comprehensive Implementation Guide**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [API Base URL](#api-base-url)
3. [Authentication](#authentication)
4. [API Endpoints](#api-endpoints)
5. [Complete React Implementation](#complete-react-implementation)
6. [TypeScript Types](#typescript-types)
7. [Error Handling](#error-handling)
8. [Flow Diagrams](#flow-diagrams)
9. [Integration Examples](#integration-examples)
10. [Testing Guide](#testing-guide)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The Employee Daily Sales System allows employees to:
- ✅ Add multiple sales entries throughout the day
- ✅ View real-time total sales for the day
- ✅ End their day and push sales to Admin/HR dashboard
- ✅ Automatically calculate sales on clock-out

### Key Features

1. **Multiple Sales Entries** - Add as many sales as needed during the day
2. **Real-time Totals** - Dashboard shows updated totals instantly
3. **Auto Calculation** - Sales auto-calculate on clock-out
4. **Dashboard Integration** - Sales visible to Admin/HR automatically
5. **Geofence Support** - Sales continue even after geofence violation

---

## 🌐 API Base URL

### Production
```
https://api.etelios.com
```

### Development (Direct ALB)
```
http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com
```

**Note:** All endpoints are prefixed with `/api`

---

## 🔐 Authentication

All endpoints require JWT authentication token in the Authorization header.

### Headers Required

```typescript
{
  'Authorization': 'Bearer <access_token>',
  'Content-Type': 'application/json',
  'X-Tenant-Id': '<tenant_id>'
}
```

### Getting Token

```typescript
// Login endpoint
POST /api/auth/login
{
  "email": "employee@example.com",
  "password": "password123",
  "tenantId": "eyekra" // Optional, can be in header
}

// Response
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "69a70743720244188049d856",
      "employeeId": "EMP-2026-853999",
      "name": "Employee Name",
      "store": "69a69035052d22973bc34935",
      // ... other user fields
    }
  }
}
```

---

## 📡 API Endpoints

### 1. Add Sales Entry

**Endpoint:** `POST /api/sales/daily-entry`

**Purpose:** Add a sales entry. Can be called multiple times during the day.

**Request:**
```typescript
{
  customer_name: string;        // Required
  customer_phone?: string;       // Optional
  items: Array<{                // Required - Array of items
    product_name: string;        // Required
    quantity: number;            // Required (default: 1)
    unit_price: number;          // Required (default: 0)
    discount_percentage?: number; // Optional (default: 0)
    tax_rate?: number;           // Optional (default: 0)
    sku?: string;                // Optional (auto-generated)
  }>;
  store_id: string;             // Required - Store ID
  payment_method?: string;       // Optional: 'CASH', 'CARD', 'UPI', etc. (default: 'CASH')
  notes?: string;               // Optional
}
```

**Response:**
```typescript
{
  success: true,
  message: 'Daily sales entry created successfully',
  data: {
    order_number: 'ORD-2026-1772881836544-OVXZO',
    total_amount: 2000,
    order_date: '2026-03-07T08:30:36.544Z',
    sales_person_id: '69a70743720244188049d856',
    sales_person_name: 'Employee Name'
  }
}
```

**Example:**
```typescript
const addSalesEntry = async (salesData: SalesEntryData) => {
  const response = await fetch('https://api.etelios.com/api/sales/daily-entry', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customer_name: 'John Doe',
      customer_phone: '+911234567890',
      items: [
        {
          product_name: 'Product 1',
          quantity: 2,
          unit_price: 5000,
          discount_percentage: 10,
          tax_rate: 18
        }
      ],
      store_id: storeId,
      payment_method: 'CASH',
      notes: 'Walk-in customer'
    })
  });

  const data = await response.json();
  return data;
};
```

**Error Responses:**
```typescript
// Missing required fields
{
  success: false,
  message: 'Missing required fields: customer_name, items (array), store_id'
}

// Employee ID not found
{
  success: false,
  message: 'Employee ID not found. Please login again.'
}

// Validation error
{
  success: false,
  message: 'Failed to create daily sales entry',
  error: 'SalesOrder validation failed: ...'
}
```

---

### 2. Get Employee's Today Sales

**Endpoint:** `GET /api/sales/employee/today`

**Purpose:** Get employee's total sales, orders, and items for today.

**Request:** No body required (uses authenticated user's ID)

**Response:**
```typescript
{
  success: true,
  data: {
    employeeId: '69a70743720244188049d856',
    employeeName: 'Employee Name',
    date: '2026-03-07',
    totalSales: 64000,        // Total sales amount for today
    totalOrders: 4,            // Number of orders today
    totalItems: 4,            // Total items sold today
    orders: [                  // Array of today's orders
      {
        order_number: 'ORD-2026-1772881836544-OVXZO',
        total_amount: 2000,
        order_date: '2026-03-07T08:30:36.544Z',
        customer_name: 'Customer 1',
        items_count: 1
      },
      // ... more orders
    ]
  }
}
```

**Example:**
```typescript
const getTodaySales = async (): Promise<TodaySalesResponse> => {
  const response = await fetch('https://api.etelios.com/api/sales/employee/today', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId
    }
  });

  const data = await response.json();
  return data;
};
```

**Error Responses:**
```typescript
// Employee ID not found
{
  success: false,
  message: 'Employee ID not found. Please login again.'
}

// Server error
{
  success: false,
  message: 'Failed to get today sales',
  error: 'Error message'
}
```

---

### 3. End Day

**Endpoint:** `POST /api/sales/employee/end-day`

**Purpose:** Employee ends their day. Sales data is pushed to Admin/HR dashboard. After this, employee can clock out.

**Request:** No body required (uses authenticated user's ID)

**Response:**
```typescript
{
  success: true,
  message: 'Day ended successfully. Sales data pushed to dashboard.',
  data: {
    employeeId: '69a70743720244188049d856',
    employeeName: 'Employee Name',
    date: '2026-03-07',
    totalSales: 64000,
    totalOrders: 4,
    totalItems: 4,
    summary: {
      message: 'Total sales for today: ₹64,000.00',
      orders: 4,
      items: 4
    }
  }
}
```

**Example:**
```typescript
const endDay = async (): Promise<EndDayResponse> => {
  const response = await fetch('https://api.etelios.com/api/sales/employee/end-day', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  return data;
};
```

**Error Responses:**
```typescript
// Employee ID not found
{
  success: false,
  message: 'Employee ID not found. Please login again.'
}

// Server error
{
  success: false,
  message: 'Failed to end day',
  error: 'Error message'
}
```

---

### 4. Clock Out (with Auto Sales Calculation)

**Endpoint:** `POST /api/attendance/clock-out`

**Purpose:** Employee clocks out. Sales automatically calculate and push to dashboard in background.

**Request:**
```typescript
{
  latitude: number;      // Required - GPS latitude
  longitude: number;     // Required - GPS longitude
  notes?: string;        // Optional
  // ... other optional fields
}
```

**Response:**
```typescript
{
  success: true,
  message: 'Clocked out successfully',
  data: {
    // Attendance data
    checkOut: {
      time: '2026-03-07T18:30:00.000Z',
      location: {
        latitude: 19.0760,
        longitude: 72.8777
      }
    },
    total_hours: 10.0,
    status: 'present'
    // ... other attendance fields
  }
}
```

**Important:** Sales auto-calculate होगी background में। Dashboard automatically update होगी।

**Example:**
```typescript
const clockOut = async (location: { latitude: number; longitude: number }): Promise<ClockOutResponse> => {
  const response = await fetch('https://api.etelios.com/api/attendance/clock-out', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      latitude: location.latitude,
      longitude: location.longitude,
      notes: 'End of day clock-out'
    })
  });

  const data = await response.json();
  return data;
};
```

---

### 5. Get Dashboard (with Sales Widget)

**Endpoint:** `GET /api/hr/dashboard`

**Purpose:** Get employee dashboard with sales widget.

**Request:** No body required

**Response:**
```typescript
{
  success: true,
  data: {
    widgets: {
      sales: {
        today: {
          totalSales: 64000,
          totalOrders: 4,
          totalItems: 4,
          formatted: '₹64,000'
        },
        orders: [
          {
            order_number: 'ORD-2026-1772881836544-OVXZO',
            total_amount: 2000,
            order_date: '2026-03-07T08:30:36.544Z',
            customer_name: 'Customer 1',
            items_count: 1
          }
          // ... more orders
        ]
      }
    }
  }
}
```

---

## 💻 Complete React Implementation

### TypeScript Types

```typescript
// Types
interface SalesItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  tax_rate?: number;
  sku?: string;
}

interface SalesEntryData {
  customer_name: string;
  customer_phone?: string;
  items: SalesItem[];
  store_id: string;
  payment_method?: 'CASH' | 'CARD' | 'UPI' | 'NET_BANKING' | 'CHEQUE' | 'EMI' | 'OTHER';
  notes?: string;
}

interface SalesEntryResponse {
  success: boolean;
  message: string;
  data: {
    order_number: string;
    total_amount: number;
    order_date: string;
    sales_person_id: string;
    sales_person_name: string;
  };
}

interface TodaySalesResponse {
  success: boolean;
  data: {
    employeeId: string;
    employeeName: string;
    date: string;
    totalSales: number;
    totalOrders: number;
    totalItems: number;
    orders: Array<{
      order_number: string;
      total_amount: number;
      order_date: string;
      customer_name: string;
      items_count: number;
    }>;
  };
}

interface EndDayResponse {
  success: boolean;
  message: string;
  data: {
    employeeId: string;
    employeeName: string;
    date: string;
    totalSales: number;
    totalOrders: number;
    totalItems: number;
    summary: {
      message: string;
      orders: number;
      items: number;
    };
  };
}
```

### API Service Class

```typescript
// services/salesService.ts
class SalesService {
  private apiBase: string;
  private token: string;
  private tenantId: string;

  constructor(apiBase: string, token: string, tenantId: string) {
    this.apiBase = apiBase;
    this.token = token;
    this.tenantId = tenantId;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.apiBase}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'X-Tenant-Id': this.tenantId,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  async addSalesEntry(data: SalesEntryData): Promise<SalesEntryResponse> {
    return this.request<SalesEntryResponse>('/api/sales/daily-entry', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getTodaySales(): Promise<TodaySalesResponse> {
    return this.request<TodaySalesResponse>('/api/sales/employee/today');
  }

  async endDay(): Promise<EndDayResponse> {
    return this.request<EndDayResponse>('/api/sales/employee/end-day', {
      method: 'POST'
    });
  }
}
```

### React Component

```typescript
// components/EmployeeSalesDashboard.tsx
import React, { useState, useEffect } from 'react';
import { SalesService } from '../services/salesService';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.etelios.com';

interface EmployeeSalesDashboardProps {
  token: string;
  tenantId: string;
  storeId: string;
}

const EmployeeSalesDashboard: React.FC<EmployeeSalesDashboardProps> = ({
  token,
  tenantId,
  storeId
}) => {
  const [todaySales, setTodaySales] = useState<TodaySalesResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSalesForm, setShowSalesForm] = useState(false);
  const [canClockOut, setCanClockOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const salesService = new SalesService(API_BASE, token, tenantId);

  useEffect(() => {
    fetchTodaySales();
    // Refresh every 30 seconds
    const interval = setInterval(fetchTodaySales, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTodaySales = async () => {
    try {
      setError(null);
      const response = await salesService.getTodaySales();
      if (response.success) {
        setTodaySales(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales');
      console.error('Failed to fetch sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSales = async (salesData: SalesEntryData) => {
    try {
      setError(null);
      const response = await salesService.addSalesEntry({
        ...salesData,
        store_id: storeId
      });

      if (response.success) {
        // Refresh sales data
        await fetchTodaySales();
        setShowSalesForm(false);
        // Show success notification
        alert('Sales entry added successfully!');
      } else {
        setError(response.message || 'Failed to add sales entry');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add sales entry';
      setError(errorMessage);
      console.error('Failed to add sales:', err);
    }
  };

  const handleEndDay = async () => {
    if (!confirm('Are you sure you want to end the day? You can clock out after this.')) {
      return;
    }

    try {
      setError(null);
      const response = await salesService.endDay();

      if (response.success) {
        alert(`Day ended! ${response.data.summary.message}`);
        // Refresh sales data
        await fetchTodaySales();
        // Enable clock out button
        setCanClockOut(true);
      } else {
        setError(response.message || 'Failed to end day');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end day';
      setError(errorMessage);
      console.error('Failed to end day:', err);
    }
  };

  const handleClockOut = async () => {
    try {
      // Get current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const response = await fetch(`${API_BASE}/api/attendance/clock-out`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          notes: 'End of day clock-out'
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Clocked out successfully! Sales automatically pushed to dashboard.');
        // Redirect or update UI
      } else {
        setError(data.message || 'Failed to clock out');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clock out';
      setError(errorMessage);
      console.error('Failed to clock out:', err);
    }
  };

  if (loading) {
    return <div className="loading">Loading sales data...</div>;
  }

  return (
    <div className="sales-dashboard">
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Today's Sales Summary Card */}
      <div className="sales-summary-card">
        <h3>Today's Sales</h3>
        <div className="sales-stats">
          <div className="stat-item">
            <span className="label">Total Sales:</span>
            <span className="value">
              ₹{(todaySales?.totalSales || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="stat-item">
            <span className="label">Orders:</span>
            <span className="value">{todaySales?.totalOrders || 0}</span>
          </div>
          <div className="stat-item">
            <span className="label">Items:</span>
            <span className="value">{todaySales?.totalItems || 0}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          onClick={() => setShowSalesForm(true)}
          className="btn-primary"
        >
          ➕ Add Sales Entry
        </button>

        <button
          onClick={handleEndDay}
          className="btn-end-day"
          disabled={!todaySales || todaySales.totalSales === 0}
        >
          🏁 End Day
        </button>

        <button
          onClick={handleClockOut}
          className="btn-clock-out"
          disabled={!canClockOut}
        >
          ⏰ Clock Out
        </button>
      </div>

      {/* Sales Form Modal */}
      {showSalesForm && (
        <SalesEntryForm
          onSubmit={handleAddSales}
          onCancel={() => setShowSalesForm(false)}
          storeId={storeId}
        />
      )}

      {/* Today's Orders List */}
      {todaySales?.orders && todaySales.orders.length > 0 && (
        <div className="orders-list">
          <h4>Today's Orders ({todaySales.orders.length})</h4>
          {todaySales.orders.map((order, index) => (
            <div key={index} className="order-card">
              <p><strong>Order:</strong> {order.order_number}</p>
              <p><strong>Customer:</strong> {order.customer_name}</p>
              <p><strong>Amount:</strong> ₹{order.total_amount.toLocaleString('en-IN')}</p>
              <p><strong>Items:</strong> {order.items_count}</p>
              <p><strong>Time:</strong> {new Date(order.order_date).toLocaleTimeString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeeSalesDashboard;
```

### Sales Entry Form Component

```typescript
// components/SalesEntryForm.tsx
import React, { useState } from 'react';
import { SalesItem, SalesEntryData } from '../types/sales';

interface SalesEntryFormProps {
  onSubmit: (data: SalesEntryData) => void;
  onCancel: () => void;
  storeId: string;
}

const SalesEntryForm: React.FC<SalesEntryFormProps> = ({
  onSubmit,
  onCancel,
  storeId
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [items, setItems] = useState<SalesItem[]>([
    { product_name: '', quantity: 1, unit_price: 0 }
  ]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI'>('CASH');
  const [notes, setNotes] = useState('');

  const handleAddItem = () => {
    setItems([...items, { product_name: '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof SalesItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName || items.length === 0) {
      alert('Please fill all required fields');
      return;
    }

    onSubmit({
      customer_name: customerName,
      customer_phone: customerPhone || undefined,
      items: items.filter(item => item.product_name && item.unit_price > 0),
      store_id: storeId,
      payment_method: paymentMethod,
      notes: notes || undefined
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add Sales Entry</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Customer Name *</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Customer Phone</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Items *</label>
            {items.map((item, index) => (
              <div key={index} className="item-row">
                <input
                  type="text"
                  placeholder="Product Name"
                  value={item.product_name}
                  onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                  required
                />
                <input
                  type="number"
                  placeholder="Quantity"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                  min="1"
                  required
                />
                <input
                  type="number"
                  placeholder="Unit Price"
                  value={item.unit_price}
                  onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  required
                />
                <input
                  type="number"
                  placeholder="Discount %"
                  value={item.discount_percentage || 0}
                  onChange={(e) => handleItemChange(index, 'discount_percentage', parseFloat(e.target.value) || 0)}
                  min="0"
                  max="100"
                />
                <input
                  type="number"
                  placeholder="Tax %"
                  value={item.tax_rate || 0}
                  onChange={(e) => handleItemChange(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                  min="0"
                />
                {items.length > 1 && (
                  <button type="button" onClick={() => handleRemoveItem(index)}>
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={handleAddItem}>
              + Add Item
            </button>
          </div>

          <div className="form-group">
            <label>Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="UPI">UPI</option>
              <option value="NET_BANKING">Net Banking</option>
            </select>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel}>Cancel</button>
            <button type="submit">Submit</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalesEntryForm;
```

---

## 🔄 Complete Flow Diagrams

### Normal Day Flow

```
1. Employee logs in
   ↓
2. Employee clocks in
   ↓
3. Employee makes a sale
   ↓
4. Employee clicks "Add Sales Entry"
   ↓
5. Employee fills form and submits
   ↓
6. Sales entry saved ✅
   ↓
7. Dashboard shows updated total
   ↓
8. (Repeat steps 3-7 as many times as needed)
   ↓
9. At end of day, employee clicks "End Day"
   ↓
10. Sales data pushed to Admin/HR dashboard ✅
    ↓
11. Employee clicks "Clock Out"
    ↓
12. Sales auto-calculated and pushed ✅
    ↓
13. Day completed ✅
```

### Geofence Violation Flow

```
1. Employee clocked in → Sales entries add कर रहा है
   ↓
2. Employee geofence के बाहर चला गया
   ↓
3. 10 min grace period
   ↓
4. Auto clock-out हो गया (geofence violation)
   ↓
5. ❌ Sales auto-calculate नहीं होगी
   ↓
6. Employee wapas login करेगा
   ↓
7. ✅ Employee wapas punch-in करेगा
   ↓
8. ✅ Sales entries continue हो सकेंगी (same day)
   ↓
9. Employee manually clock-out करेगा या End Day button दबाएगा
   ↓
10. ✅ तब sales auto-calculate होगी और dashboard पर push होगी
```

---

## 🎨 UI/UX Recommendations

### Sales Dashboard Layout

```
┌─────────────────────────────────────────────┐
│  Employee Sales Dashboard                    │
├─────────────────────────────────────────────┤
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │  Today's Sales                        │  │
│  │  ┌──────────┬──────────┬──────────┐   │  │
│  │  │ ₹64,000  │  4 Orders│  4 Items │   │  │
│  │  └──────────┴──────────┴──────────┘   │  │
│  └──────────────────────────────────────┘  │
│                                              │
│  [➕ Add Sales Entry]  [🏁 End Day]         │
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │  Today's Orders (4)                    │  │
│  │  ┌──────────────────────────────────┐ │  │
│  │  │ ORD-2026-xxx | ₹2,000 | Customer1│ │  │
│  │  │ ORD-2026-xxx | ₹12,000| Customer2│ │  │
│  │  │ ORD-2026-xxx | ₹45,000| Customer3│ │  │
│  │  │ ORD-2026-xxx | ₹5,000 | Customer4│ │  │
│  │  └──────────────────────────────────┘ │  │
│  └──────────────────────────────────────┘  │
│                                              │
│  [⏰ Clock Out] (enabled after End Day)      │
│                                              │
└─────────────────────────────────────────────┘
```

---

## ⚠️ Error Handling

### Common Errors and Solutions

```typescript
// Error handling utility
const handleApiError = (error: any): string => {
  if (error.message) {
    if (error.message.includes('Employee ID not found')) {
      return 'Please login again. Your session may have expired.';
    }
    if (error.message.includes('Missing required fields')) {
      return 'Please fill all required fields.';
    }
    if (error.message.includes('Network')) {
      return 'Network error. Please check your connection.';
    }
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
};

// Usage in component
try {
  await salesService.addSalesEntry(data);
} catch (error) {
  const errorMessage = handleApiError(error);
  setError(errorMessage);
  // Show toast notification
  toast.error(errorMessage);
}
```

---

## ✅ Testing Checklist

### Manual Testing

- [ ] Login successful
- [ ] Clock-in successful
- [ ] Add single sales entry
- [ ] Add multiple sales entries
- [ ] Verify total sales updates
- [ ] Verify orders count updates
- [ ] Verify items count updates
- [ ] Get today sales works
- [ ] End Day button works
- [ ] Clock out works
- [ ] Sales auto-calculate on clock-out
- [ ] Dashboard shows sales widget
- [ ] Multiple sales entries aggregate correctly

### Integration Testing

- [ ] Sales entry after geofence violation (wapas punch-in)
- [ ] Sales continue across multiple clock-in/out sessions
- [ ] Dashboard refresh shows updated sales
- [ ] Error handling for network failures
- [ ] Error handling for validation errors

---

## 🐛 Troubleshooting

### Issue: "Employee ID not found"

**Solution:** 
- Check if user is logged in
- Verify token is valid
- Re-login if token expired

### Issue: "Missing required fields"

**Solution:**
- Ensure `customer_name` is provided
- Ensure `items` array has at least one item
- Ensure `store_id` is provided

### Issue: Sales not showing in dashboard

**Solution:**
- Check if sales were added today
- Verify dashboard endpoint returns data
- Check browser console for errors
- Refresh dashboard

### Issue: Network timeout

**Solution:**
- Check internet connection
- Verify API base URL is correct
- Check if service is running
- Retry request

---

## 📊 Response Examples

### Successful Sales Entry

```json
{
  "success": true,
  "message": "Daily sales entry created successfully",
  "data": {
    "order_number": "ORD-2026-1772881836544-OVXZO",
    "total_amount": 2000,
    "order_date": "2026-03-07T08:30:36.544Z",
    "sales_person_id": "69a70743720244188049d856",
    "sales_person_name": "aditya diwadi"
  }
}
```

### Today Sales Response

```json
{
  "success": true,
  "data": {
    "employeeId": "69a70743720244188049d856",
    "employeeName": "aditya diwadi",
    "date": "2026-03-07",
    "totalSales": 64000,
    "totalOrders": 4,
    "totalItems": 4,
    "orders": [
      {
        "order_number": "ORD-2026-1772881836544-OVXZO",
        "total_amount": 2000,
        "order_date": "2026-03-07T08:30:36.544Z",
        "customer_name": "Customer 1",
        "items_count": 1
      }
    ]
  }
}
```

---

## 📝 Summary

| Feature | Endpoint | Method | Auth Required |
|---------|----------|--------|---------------|
| Add Sales | `/api/sales/daily-entry` | POST | ✅ Yes |
| Get Today Sales | `/api/sales/employee/today` | GET | ✅ Yes |
| End Day | `/api/sales/employee/end-day` | POST | ✅ Yes |
| Clock Out | `/api/attendance/clock-out` | POST | ✅ Yes |
| Dashboard | `/api/hr/dashboard` | GET | ✅ Yes |

**Status:** ✅ Production Ready

---

**Last Updated:** March 7, 2026  
**Version:** 1.0.0  
**Environment:** Production
