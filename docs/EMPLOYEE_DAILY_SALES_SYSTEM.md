# 💰 Employee Daily Sales Entry System

**Complete Guide for Frontend Implementation**

---

## 🎯 Overview

Employees can add sales entries multiple times during the day. When they click "End Day", their total sales are automatically pushed to Admin/HR dashboard. After that, they can clock out.

---

## 📋 Features

1. ✅ **Multiple Sales Entries** - Employee can add sales as many times as needed during the day
2. ✅ **Real-time Total** - Dashboard shows total sales for the day
3. ✅ **End Day Button** - Pushes sales to Admin/HR dashboard
4. ✅ **Auto Dashboard Update** - Admin/HR see all employee sales automatically
5. ✅ **Clock Out Integration** - After ending day, employee can clock out

---

## 📡 API Endpoints

### 1. Add Sales Entry (Multiple Times)

**Endpoint:** `POST /api/sales/daily-entry`

**Purpose:** Employee adds a sales entry. Can be called multiple times during the day.

**Request:**
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

**Example:**
```typescript
const addSalesEntry = async (salesData) => {
  const response = await fetch(`${API_BASE}/sales/daily-entry`, {
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
        },
        {
          product_name: 'Product 2',
          quantity: 1,
          unit_price: 3000
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

---

### 2. Get Employee's Total Sales for Today

**Endpoint:** `GET /api/sales/employee/today`

**Purpose:** Get employee's total sales, orders, and items for today.

**Request:**
```typescript
// No body required - uses authenticated user's ID
```

**Example:**
```typescript
const getTodaySales = async () => {
  const response = await fetch(`${API_BASE}/sales/employee/today`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId
    }
  });

  const data = await response.json();
  return data;
};
```

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
      },
      // ... more orders
    ]
  }
}
```

---

### 3. End Day - Push Sales to Dashboard

**Endpoint:** `POST /api/sales/employee/end-day`

**Purpose:** Employee ends their day. Sales data is pushed to Admin/HR dashboard. After this, employee can clock out.

**Request:**
```typescript
// No body required - uses authenticated user's ID
```

**Example:**
```typescript
const endDay = async () => {
  const response = await fetch(`${API_BASE}/sales/employee/end-day`, {
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
          // ... more orders
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
          },
          {
            employeeId: 'emp_id_2',
            employeeName: 'Employee 2',
            totalSales: 80000,
            todaySales: 30000,
            totalOrders: 15,
            todayOrders: 3,
            formattedTodaySales: '₹30,000',
            formattedTotalSales: '₹80,000'
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

## 💻 Frontend Implementation Example

### React Component for Sales Entry

```typescript
import React, { useState, useEffect } from 'react';

const EmployeeSalesDashboard = () => {
  const [todaySales, setTodaySales] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSalesForm, setShowSalesForm] = useState(false);

  useEffect(() => {
    fetchTodaySales();
    // Refresh every 30 seconds
    const interval = setInterval(fetchTodaySales, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTodaySales = async () => {
    try {
      const response = await fetch(`${API_BASE}/sales/employee/today`, {
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
      const response = await fetch(`${API_BASE}/sales/daily-entry`, {
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
        showNotification('Sales entry added successfully!');
      }
    } catch (error) {
      console.error('Failed to add sales:', error);
      showError('Failed to add sales entry');
    }
  };

  const handleEndDay = async () => {
    if (!confirm('Are you sure you want to end the day? You can clock out after this.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/sales/employee/end-day`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        showSuccess(`Day ended! Total sales: ${data.data.summary.message}`);
        // Refresh sales data
        await fetchTodaySales();
        // Enable clock out button
        setCanClockOut(true);
      }
    } catch (error) {
      console.error('Failed to end day:', error);
      showError('Failed to end day');
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
            <span className="value">{todaySales?.formatted || '₹0'}</span>
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
      <button onClick={() => setShowSalesForm(true)}>
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
        className="end-day-button"
        disabled={!todaySales || todaySales.totalSales === 0}
      >
        🏁 End Day
      </button>
    </div>
  );
};

export default EmployeeSalesDashboard;
```

---

## 🔄 Complete Flow

### Employee Workflow

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
11. Day completed ✅
```

---

## 📝 Frontend Checklist

### Required Components

- [ ] **Sales Entry Form**
  - Customer name input
  - Customer phone input (optional)
  - Items array (add/remove items)
  - Each item: product name, quantity, unit price, discount, tax
  - Store selection
  - Payment method selection
  - Notes field

- [ ] **Today's Sales Display**
  - Total sales amount (formatted)
  - Total orders count
  - Total items count
  - List of today's orders

- [ ] **Add Sales Button**
  - Opens sales entry form
  - Can be clicked multiple times

- [ ] **End Day Button**
  - Shows confirmation dialog
  - Calls `/api/sales/employee/end-day`
  - Shows success message with total sales
  - Enables clock out after success

- [ ] **Dashboard Integration**
  - Employee dashboard shows sales widget
  - Admin/HR dashboard shows all employee sales
  - Auto-refresh sales data

---

## 🎨 UI/UX Recommendations

### Sales Entry Form

```
┌─────────────────────────────────────┐
│  Add Sales Entry                    │
├─────────────────────────────────────┤
│ Customer Name: [____________]       │
│ Customer Phone: [____________]       │
│                                     │
│ Items:                              │
│ ┌─────────────────────────────────┐ │
│ │ Product: [____________]         │ │
│ │ Quantity: [__] Price: [_____]   │ │
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

### End Day
- [ ] Click "End Day" button
- [ ] Verify confirmation dialog
- [ ] Verify sales data pushed to dashboard
- [ ] Verify success message
- [ ] Verify clock out enabled after end day

### Dashboard
- [ ] Employee dashboard shows sales widget
- [ ] Admin dashboard shows all employee sales
- [ ] HR dashboard shows all employee sales
- [ ] Sales data refreshes automatically

---

## 🔗 Integration with Attendance

After employee clicks "End Day":
1. Sales data is pushed to Admin/HR dashboard
2. Employee can now clock out
3. Clock out will record attendance with sales summary

**Recommended Flow:**
```typescript
const handleEndDayAndClockOut = async () => {
  // Step 1: End day (push sales to dashboard)
  const endDayResult = await endDay();
  
  if (endDayResult.success) {
    // Step 2: Clock out
    await clockOut();
    
    // Step 3: Show summary
    showSuccess(`Day completed! Sales: ${endDayResult.data.summary.message}`);
  }
};
```

---

## 📊 Data Flow

```
Employee → Add Sales Entry → Sales Service → Database
                ↓
         Dashboard fetches → Shows in widget
                ↓
    Employee clicks "End Day" → Sales pushed to Admin/HR
                ↓
         Admin/HR Dashboard → Shows all employee sales
                ↓
         Employee clocks out → Day completed
```

---

## 🎯 Summary

| Feature | Endpoint | Purpose |
|---------|----------|---------|
| Add Sales | `POST /api/sales/daily-entry` | Add sales entry (multiple times) |
| Get Today Sales | `GET /api/sales/employee/today` | Get employee's total sales |
| End Day | `POST /api/sales/employee/end-day` | Push sales to dashboard |
| Dashboard | `GET /api/hr/dashboard` | View sales in dashboard |

**Status:** ✅ Ready for Frontend Implementation

---

**Last Updated:** March 6, 2026  
**Version:** 1.0.0
