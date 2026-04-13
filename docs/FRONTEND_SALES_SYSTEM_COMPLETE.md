# 💰 Employee Daily Sales System - Frontend Complete Guide

**Production Ready - Complete Implementation Guide for Frontend Developers**

---

## 🎯 Overview

Employees can add sales entries multiple times during the day. Sales automatically calculate and push to Admin/HR dashboard when:
- ✅ Employee clicks "End Day" button
- ✅ Employee manually clock-out करे
- ✅ Auto clock-out हो (10 hours complete)
- ❌ **Geofence violation clock-out** - Sales auto-calculate **नहीं होगी** (employee wapas punch-in करके sales add कर सकता है)

---

## 📡 API Endpoints

### Base URL
```
Production: https://api.etelios.com
```

### Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
X-Tenant-Id: <tenant_id>
```

---

## 1. Add Sales Entry (Multiple Times)

**Endpoint:** `POST /api/sales/daily-entry`

**Purpose:** Employee adds a sales entry. Can be called multiple times during the day.

**Request Body:**
```typescript
{
  customer_name: string;        // Required
  customer_phone?: string;      // Optional
  items: Array<{                // Required - Array of items
    product_name: string;        // Required
    quantity: number;            // Required (default: 1)
    unit_price: number;          // Required (default: 0)
    discount_percentage?: number; // Optional (default: 0)
    tax_rate?: number;           // Optional (default: 0)
    sku?: string;                // Optional (auto-generated if not provided)
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
    order_number: 'ORD-2026-xxxxx',
    total_amount: 12000,
    order_date: '2026-03-06T...',
    sales_person_id: 'employee_id',
    sales_person_name: 'Employee Name'
  }
}
```

**Example:**
```typescript
const addSalesEntry = async (salesData) => {
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

**Important Notes:**
- ✅ **No clock-in check** - Employee can add sales anytime (if logged in)
- ✅ **Multiple entries** - Can be called multiple times during the day
- ✅ **Geofence violation** - Sales entries continue even after geofence violation clock-out

---

## 2. Get Employee's Total Sales for Today

**Endpoint:** `GET /api/sales/employee/today`

**Purpose:** Get employee's total sales, orders, and items for today.

**Response:**
```typescript
{
  success: true,
  data: {
    employeeId: 'employee_id',
    employeeName: 'Employee Name',
    date: '2026-03-06',
    totalSales: 45000,        // Total sales amount for today
    totalOrders: 5,            // Number of orders today
    totalItems: 12,            // Total items sold today
    orders: [                  // Array of today's orders
      {
        order_number: 'ORD-2026-001',
        total_amount: 10000,
        order_date: '2026-03-06T...',
        customer_name: 'Customer 1',
        items_count: 3
      }
    ]
  }
}
```

**Example:**
```typescript
const getTodaySales = async () => {
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

---

## 3. End Day - Push Sales to Dashboard

**Endpoint:** `POST /api/sales/employee/end-day`

**Purpose:** Employee ends their day. Sales data is pushed to Admin/HR dashboard. After this, employee can clock out.

**Response:**
```typescript
{
  success: true,
  message: 'Day ended successfully. Sales data pushed to dashboard.',
  data: {
    employeeId: 'employee_id',
    employeeName: 'Employee Name',
    date: '2026-03-06',
    totalSales: 45000,
    totalOrders: 5,
    totalItems: 12,
    summary: {
      message: 'Total sales for today: ₹45,000.00',
      orders: 5,
      items: 12
    }
  }
}
```

**Example:**
```typescript
const endDay = async () => {
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

---

## 4. Clock Out (with Auto Sales Calculation)

**Endpoint:** `POST /api/attendance/clock-out`

**Purpose:** Employee clocks out. Sales automatically calculate and push to dashboard.

**Request Body:**
```typescript
{
  latitude: number;      // Required
  longitude: number;     // Required
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
    // Sales automatically calculated in background
  }
}
```

**Important:** Sales auto-calculate होगी background में। Dashboard automatically update होगी।

---

## 📊 Dashboard Integration

### Employee Dashboard

**Endpoint:** `GET /api/hr/dashboard`

**Sales Widget Response:**
```typescript
{
  success: true,
  data: {
    widgets: {
      sales: {
        today: {
          totalSales: 45000,
          totalOrders: 5,
          totalItems: 12,
          formatted: '₹45,000'
        },
        orders: [
          {
            order_number: 'ORD-2026-001',
            total_amount: 10000,
            order_date: '2026-03-06T...',
            customer_name: 'Customer 1',
            items_count: 3
          }
        ]
      }
    }
  }
}
```

### Admin/HR Dashboard

**Sales Widget Response:**
```typescript
{
  success: true,
  data: {
    widgets: {
      employeeSales: {
        summary: [
          {
            employeeId: 'emp_id_1',
            employeeName: 'Employee 1',
            totalSales: 100000,
            todaySales: 45000,
            totalOrders: 20,
            todayOrders: 5,
            formattedTodaySales: '₹45,000',
            formattedTotalSales: '₹1,00,000'
          }
        ],
        totalEmployees: 2,
        totalTodaySales: 75000,
        totalAllTimeSales: 180000,
        formattedTotalTodaySales: '₹75,000',
        formattedTotalAllTimeSales: '₹1,80,000'
      }
    }
  }
}
```

---

## 💻 Complete React Implementation

### Sales Entry Component

```typescript
import React, { useState, useEffect } from 'react';

const EmployeeSalesDashboard = () => {
  const [todaySales, setTodaySales] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSalesForm, setShowSalesForm] = useState(false);
  const [canClockOut, setCanClockOut] = useState(false);

  const API_BASE = 'https://api.etelios.com';
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');

  useEffect(() => {
    fetchTodaySales();
    // Refresh every 30 seconds
    const interval = setInterval(fetchTodaySales, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTodaySales = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/sales/employee/today`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId
        }
      });
      const data = await response.json();
      if (data.success) {
        setTodaySales(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSales = async (salesData) => {
    try {
      const response = await fetch(`${API_BASE}/api/sales/daily-entry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(salesData)
      });

      const data = await response.json();
      if (data.success) {
        // Refresh sales data
        await fetchTodaySales();
        setShowSalesForm(false);
        alert('Sales entry added successfully!');
      } else {
        alert(`Failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Failed to add sales:', error);
      alert('Failed to add sales entry');
    }
  };

  const handleEndDay = async () => {
    if (!confirm('Are you sure you want to end the day? You can clock out after this.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/sales/employee/end-day`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        alert(`Day ended! ${data.data.summary.message}`);
        // Refresh sales data
        await fetchTodaySales();
        // Enable clock out button
        setCanClockOut(true);
      } else {
        alert(`Failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Failed to end day:', error);
      alert('Failed to end day');
    }
  };

  const handleClockOut = async () => {
    try {
      // Get current location
      const position = await new Promise((resolve, reject) => {
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
        alert(`Failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Failed to clock out:', error);
      alert('Failed to clock out');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="sales-dashboard">
      {/* Today's Sales Summary */}
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

      {/* Add Sales Button */}
      <button 
        onClick={() => setShowSalesForm(true)}
        className="btn-primary"
      >
        ➕ Add Sales Entry
      </button>

      {/* Sales Form Modal */}
      {showSalesForm && (
        <SalesEntryForm
          onSubmit={handleAddSales}
          onCancel={() => setShowSalesForm(false)}
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

      {/* End Day Button */}
      <button 
        onClick={handleEndDay}
        className="btn-end-day"
        disabled={!todaySales || todaySales.totalSales === 0}
      >
        🏁 End Day
      </button>

      {/* Clock Out Button */}
      <button 
        onClick={handleClockOut}
        className="btn-clock-out"
        disabled={!canClockOut}
      >
        ⏰ Clock Out
      </button>
    </div>
  );
};

export default EmployeeSalesDashboard;
```

---

## 🔄 Complete Flow

### Normal Day Flow

```
1. Employee clocks in
   ↓
2. Employee makes a sale
   ↓
3. Employee clicks "Add Sales Entry"
   ↓
4. Employee fills form and submits
   ↓
5. Sales entry saved ✅
   ↓
6. Dashboard shows updated total
   ↓
7. (Repeat steps 2-6 as many times as needed)
   ↓
8. At end of day, employee clicks "End Day"
   ↓
9. Sales data pushed to Admin/HR dashboard ✅
   ↓
10. Employee clicks "Clock Out"
    ↓
11. Sales auto-calculated and pushed ✅
    ↓
12. Day completed ✅
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

## ⚠️ Important Notes

### 1. Sales Entries Never Stop

- ✅ Sales entry endpoint **doesn't check clock-in status**
- ✅ Employee can add sales anytime (if logged in)
- ✅ Geofence violation doesn't block sales entries
- ✅ Employee wapas punch-in करके sales add कर सकता है

### 2. Sales Auto-Calculate Triggers

Sales auto-calculate होगी जब:
- ✅ Employee manually clock-out करे
- ✅ Auto clock-out हो (10 hours complete)
- ✅ Employee "End Day" button दबाए

Sales auto-calculate **नहीं होगी** जब:
- ❌ Geofence violation से auto clock-out हो

### 3. Dashboard Auto-Update

- ✅ Dashboard service automatically fetches sales from sales service
- ✅ No manual push needed
- ✅ HR/Admin dashboard shows all employee sales
- ✅ Real-time updates (refresh every 30 seconds recommended)

### 4. Multiple Clock-In/Out Sessions

- ✅ Sales are tracked by `employee_id` and `date`
- ✅ Multiple sessions in same day → All sales aggregated
- ✅ Sales continue across sessions

---

## 🎨 UI/UX Recommendations

### Sales Entry Form

```
┌─────────────────────────────────────┐
│  Add Sales Entry                   │
├─────────────────────────────────────┤
│ Customer Name: [____________]       │
│ Customer Phone: [____________]       │
│                                     │
│ Items:                              │
│ ┌─────────────────────────────────┐ │
│ │ Product: [____________]         │ │
│ │ Quantity: [__] Price: [_____]  │ │
│ │ Discount: [__]% Tax: [__]%     │ │
│ └─────────────────────────────────┘ │
│ [+ Add Item]                         │
│                                     │
│ Store: [Select Store ▼]             │
│ Payment: [CASH ▼]                   │
│ Notes: [____________]               │
│                                     │
│ [Cancel]  [Submit]                  │
└─────────────────────────────────────┘
```

### Today's Sales Card

```
┌─────────────────────────────────────┐
│  Today's Sales                      │
├─────────────────────────────────────┤
│  Total Sales: ₹45,000               │
│  Orders: 5                          │
│  Items: 12                           │
│                                     │
│  [+ Add Sales Entry]                │
│  [🏁 End Day]                       │
│  [⏰ Clock Out]                     │
└─────────────────────────────────────┘
```

---

## ✅ Testing Checklist

### Sales Entry
- [ ] Add single sales entry
- [ ] Add multiple sales entries
- [ ] Verify total sales updates
- [ ] Verify orders count updates
- [ ] Verify items count updates
- [ ] Add sales after geofence violation (wapas punch-in के बाद)

### End Day
- [ ] Click "End Day" button
- [ ] Verify confirmation dialog
- [ ] Verify sales data pushed to dashboard
- [ ] Verify success message
- [ ] Verify clock out enabled after end day

### Clock Out
- [ ] Manual clock-out → Sales calculated
- [ ] Auto clock-out (10 hours) → Sales calculated
- [ ] Geofence violation clock-out → Sales **NOT** calculated
- [ ] Verify sales visible in HR/Admin dashboard

### Dashboard
- [ ] Employee dashboard shows sales widget
- [ ] Admin dashboard shows all employee sales
- [ ] HR dashboard shows all employee sales
- [ ] Sales data refreshes automatically

---

## 🔗 Integration with Attendance

### After End Day

```typescript
const handleEndDayAndClockOut = async () => {
  // Step 1: End day (push sales to dashboard)
  const endDayResult = await endDay();
  
  if (endDayResult.success) {
    // Step 2: Clock out
    await clockOut();
    
    // Step 3: Show summary
    alert(`Day completed! Sales: ${endDayResult.data.summary.message}`);
  }
};
```

### After Geofence Violation

```typescript
// Employee wapas punch-in करेगा
const handleReLoginAfterGeofence = async () => {
  // Step 1: Clock in again
  await clockIn();
  
  // Step 2: Sales entries continue
  // Employee can add sales normally
  // No special handling needed
};
```

---

## 📊 Error Handling

### Common Errors

```typescript
// Sales entry failed
if (!response.ok) {
  const error = await response.json();
  if (error.message.includes('Missing required fields')) {
    alert('Please fill all required fields');
  } else {
    alert(`Error: ${error.message}`);
  }
}

// Network error
try {
  await addSalesEntry(data);
} catch (error) {
  if (error.message === 'Failed to fetch') {
    alert('Network error. Please check your connection.');
  }
}
```

---

## 🚀 Production URLs

- **API Base:** `https://api.etelios.com`
- **Sales Entry:** `POST /api/sales/daily-entry`
- **Today Sales:** `GET /api/sales/employee/today`
- **End Day:** `POST /api/sales/employee/end-day`
- **Clock Out:** `POST /api/attendance/clock-out`
- **Dashboard:** `GET /api/hr/dashboard`

---

## 📝 Summary

| Feature | Endpoint | Auto Calculate |
|---------|----------|----------------|
| Add Sales | `POST /api/sales/daily-entry` | No |
| Get Today Sales | `GET /api/sales/employee/today` | No |
| End Day | `POST /api/sales/employee/end-day` | Yes |
| Manual Clock-Out | `POST /api/attendance/clock-out` | Yes |
| Auto Clock-Out (10h) | Automatic | Yes |
| Geofence Violation | Automatic | **No** |

**Status:** ✅ Production Ready

---

**Last Updated:** March 6, 2026  
**Version:** 1.0.0  
**Environment:** Production
