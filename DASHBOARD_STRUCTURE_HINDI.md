# 📊 Dashboard Structure - Complete Overview

**कुल Dashboards:** 3 Main + 3 Legacy APIs

---

## 🎯 Main Dashboards

### 1. **Unified Dashboard** (Main Dashboard)
**Route:** `GET /api/hr/dashboard?role={role}`  
**यह सबसे important dashboard है - सभी users इसे use करेंगे**

#### 👤 **Employee Role के लिए (8 Widgets)**

```json
{
  "user": {
    "id": "EMP-001",
    "name": "Rahul Sharma",
    "role": "employee",
    "department": "Sales",
    "store": "Store A"
  },
  "widgets": {
    // 1. Attendance Widget (✅ LIVE)
    "attendance": {
      "today": {
        "status": "Present",
        "checkIn": "09:15",
        "checkOut": null
      },
      "weekly": {
        "present": 5,
        "total": 5
      }
    },
    
    // 2. Tasks Widget (🟡 Placeholder)
    "tasks": {
      "total": 15,
      "pending": 8,
      "inProgress": 3,
      "completed": 4,
      "overdue": 2
    },
    
    // 3. Performance Widget (🟡 Placeholder)
    "performance": {
      "score": 85.5,
      "grade": "A",
      "xp": 1250,
      "level": 5
    },
    
    // 4. Roster Widget (✅ LIVE)
    "roster": {
      "today": {
        "shift": "MORNING",
        "shiftStart": "09:00",
        "shiftEnd": "18:00",
        "storeName": "Store A"
      }
    },
    
    // 5. Payroll Widget (✅ LIVE)
    "payroll": {
      "currentMonth": {
        "grossSalary": 50000,
        "netSalary": 45000,
        "status": "Processing"
      }
    },
    
    // 6. Leave Balance Widget (🟡 Placeholder)
    "leaves": {
      "available": {
        "casual": 6,
        "sick": 2,
        "earned": 7
      },
      "pending": 1
    }
  },
  
  // 7. Quick Actions
  "quickActions": [
    {
      "label": "Mark Attendance",
      "icon": "clock",
      "route": "/attendance/mark"
    },
    {
      "label": "Apply Leave",
      "icon": "calendar",
      "route": "/leaves/apply"
    },
    {
      "label": "View Tasks",
      "icon": "target",
      "route": "/tasks"
    }
  ]
}
```

**Employee को dikhega:**
- ✅ आज का attendance (check-in/out time)
- ✅ Weekly attendance summary
- 📋 Tasks (total, pending, in-progress, completed)
- 📊 Performance score और XP points
- 📅 Today's shift और store information
- 💰 Current month salary (gross, net)
- 🏖️ Leave balance (casual, sick, earned)
- ⚡ Quick actions (attendance, leave, tasks)

---

#### 👨‍💼 **Manager Role के लिए (11 Widgets)**

**Employee के सभी widgets + 3 extra team widgets:**

```json
{
  // ... all employee widgets ...
  
  "widgets": {
    // ... employee widgets ...
    
    // 8. Team Performance Widget (✅ LIVE)
    "teamPerformance": {
      "totalMembers": 10,
      "avgPerformance": 78.5,
      "topPerformers": [
        {
          "name": "Amit Kumar",
          "score": 95.5
        },
        {
          "name": "Priya Singh",
          "score": 92.3
        }
      ],
      "needsAttention": []
    },
    
    // 9. Team Tasks Widget (🟡 Placeholder)
    "teamTasks": {
      "total": 50,
      "pending": 20,
      "inProgress": 15,
      "completed": 15,
      "overdue": 5
    },
    
    // 10. Team Attendance Widget (✅ LIVE)
    "teamAttendance": {
      "totalMembers": 10,
      "present": 9,
      "absent": 0,
      "onLeave": 1,
      "late": 0
    }
  }
}
```

**Manager को dikhega:**
- ✅ अपना सभी personal data (employee widgets)
- ✅ **+ Team performance** (कितने team members, average score, top performers)
- ✅ **+ Team tasks** (team के total tasks, pending, in-progress)
- ✅ **+ Team attendance** (कौन present है, कौन absent, कौन leave पर)

---

#### 👔 **HR/Admin Role के लिए (14 Widgets)**

**Manager के सभी widgets + 3 extra HR widgets:**

```json
{
  // ... all manager widgets ...
  
  "widgets": {
    // ... manager widgets ...
    
    // 11. Recruitment Pipeline Widget (🟡 Placeholder)
    "recruitment": {
      "openPositions": 5,
      "applicants": 45,
      "interviews": 12,
      "offersPending": 3
    },
    
    // 12. Compliance Tracker Widget (🟡 Placeholder)
    "compliance": {
      "pendingDocuments": 8,
      "expiringCertificates": 3,
      "policyAcknowledgments": 15,
      "complianceScore": 92
    },
    
    // 13. Payroll Summary Widget (🟡 Placeholder)
    "payrollSummary": {
      "monthlyPayroll": 5000000,
      "processingStatus": "Scheduled",
      "pendingApprovals": 2,
      "disbursementDate": "2026-01-15T00:00:00.000Z"
    }
  }
}
```

**HR/Admin को dikhega:**
- ✅ सभी employee + manager widgets
- ✅ **+ Recruitment pipeline** (open positions, applicants, interviews)
- ✅ **+ Compliance tracker** (pending documents, certificates, compliance score)
- ✅ **+ Payroll summary** (monthly payroll cost, processing status)

---

### 2. **Store Manager Dashboard**
**Route:** `GET /api/hr/dashboard/store-manager?storeId={storeId}`  
**यह केवल Store Managers के लिए है**

```json
{
  "storeInfo": {
    "id": "store-uuid-001",
    "name": "Etelios Store - Mumbai Central",
    "code": "ETELIOS-MUM-001",
    "location": "Mumbai",
    "manager": "Raj Kumar",
    "status": "active"
  },
  
  "stats": {
    // Daily metrics
    "dailySales": 125000,
    "transactions": 85,
    "customerVisits": 450,
    
    // Monthly metrics
    "monthlySales": 3500000,
    "monthlyTarget": 4000000,
    "salesGrowth": 12.5,
    
    // Inventory
    "inventoryValue": 2500000,
    "lowStockItems": 15,
    
    // Staff
    "totalStaff": 25,
    "activeStaff": 18
  },
  
  "recentTransactions": [
    {
      "id": "TXN-001",
      "type": "sale",
      "amount": 5500,
      "items": 3,
      "customer": "Walk-in",
      "time": "14:30",
      "status": "completed"
    }
  ],
  
  "lowStockItems": [
    {
      "id": "PROD-123",
      "name": "Product A",
      "sku": "SKU-123",
      "currentStock": 5,
      "minStock": 20,
      "category": "Electronics"
    }
  ],
  
  "staffMembers": [
    {
      "id": "EMP-001",
      "name": "Rahul Sharma",
      "role": "Sales Associate",
      "status": "active",
      "shift": "Morning (9:00-18:00)"
    }
  ]
}
```

**Store Manager को dikhega:**
- 🏪 **Store information** (name, code, location, status)
- 💰 **Sales metrics** (daily sales, monthly sales, growth %, target)
- 📦 **Inventory status** (total value, low stock items count)
- 👥 **Staff management** (total staff, active staff, staff list)
- 💳 **Recent transactions** (latest sales, amount, items)
- ⚠️ **Low stock alerts** (products needing reorder)
- 👤 **Staff members** (name, role, status, shift)

---

### 3. **HRMS Dashboard**
**Route:** `GET /api/hrms/dashboard?role={role}`  
**यह HR operations के लिए है**

#### For HR Role:
```json
{
  "overview": {
    "totalEmployees": 250,
    "newHires": 8,              // Last 30 days
    "pendingApprovals": 15,      // Leave requests
    "attendanceRate": 94.5,      // Monthly average
    "openPositions": 5,
    "attritionRate": 2.3         // Percentage
  },
  "recentActivities": [
    {
      "type": "hire",
      "employee": "John Doe",
      "time": "2 hours ago"
    },
    {
      "type": "leave_application",
      "employee": "Jane Smith",
      "time": "5 hours ago"
    }
  ],
  "upcomingEvents": [
    {
      "type": "interview",
      "title": "Interview with Amit Kumar",
      "time": "Tomorrow, 10:00 AM"
    }
  ]
}
```

#### For Employee Role:
```json
{
  "myInfo": {
    "attendance": {
      "present": 22,
      "absent": 0,
      "leave": 0
    },
    "leaves": {
      "available": 15,
      "pending": 0
    },
    "tasks": {
      "assigned": 0,
      "completed": 0
    },
    "performance": {
      "score": 75,
      "grade": "B"
    }
  },
  "recentActivities": [],
  "upcomingEvents": []
}
```

**HRMS Dashboard में dikhega:**

**HR को:**
- 👥 Total employees count
- 🆕 New hires (last 30 days)
- ⏳ Pending leave approvals
- 📊 Attendance rate (monthly)
- 📢 Open positions
- 📉 Attrition rate
- 📝 Recent activities (hires, leaves, etc.)
- 📅 Upcoming events (interviews, etc.)

**Employee को:**
- 📊 My attendance (present, absent, leave days)
- 🏖️ My leaves (available, pending)
- 📋 My tasks (assigned, completed)
- ⭐ My performance (score, grade)

---

## 📊 Legacy Dashboard APIs (Backwards Compatibility)

### 4. **Dashboard Stats**
**Route:** `GET /api/hr/dashboard/stats`

```json
{
  "totalEmployees": 250,
  "activeEmployees": 240,
  "newHires": 8,
  "onLeave": 5,
  "totalStores": 15,
  "activeStores": 14,
  "totalDepartments": 8,
  "attendanceRate": 85,
  "avgSalary": 45000,
  "pendingLeaves": 5,
  "performanceScore": 78
}
```

**यहाँ dikhega:**
- Overall company statistics
- Employee counts
- Store counts
- Department counts
- Averages and metrics

---

### 5. **Recent Activities**
**Route:** `GET /api/hr/dashboard/recent-activities?limit=20`

```json
[
  {
    "type": "hire",
    "employee": "John Doe",
    "department": "Sales",
    "time": "2026-01-11T10:30:00.000Z",
    "status": "completed"
  },
  {
    "type": "leave",
    "employee": "Jane Smith",
    "department": "HR",
    "time": "2026-01-11T09:15:00.000Z",
    "status": "pending"
  }
]
```

**यहाँ dikhega:**
- Recent employee hires
- Recent leave applications
- Activity timeline

---

### 6. **Department Overview**
**Route:** `GET /api/hr/dashboard/departments`

```json
[
  {
    "id": "dept-1",
    "name": "Sales",
    "code": "SALES",
    "manager": "Raj Kumar",
    "employees": 50,
    "employeeCount": 50
  },
  {
    "id": "dept-2",
    "name": "IT",
    "code": "TECH",
    "manager": "Amit Singh",
    "employees": 30,
    "employeeCount": 30
  }
]
```

**यहाँ dikhega:**
- All departments list
- Department manager
- Employee count per department

---

## 🎯 Summary Table

| Dashboard | Route | Role | Widgets Count | Live Data |
|-----------|-------|------|---------------|-----------|
| **Unified (Employee)** | `/api/hr/dashboard` | Employee | 8 | 3/8 |
| **Unified (Manager)** | `/api/hr/dashboard` | Manager | 11 | 5/11 |
| **Unified (HR/Admin)** | `/api/hr/dashboard` | HR/Admin | 14 | 5/14 |
| **Store Manager** | `/api/hr/dashboard/store-manager` | Manager | 1 Dashboard | Partial |
| **HRMS** | `/api/hrms/dashboard` | HR/Employee | 1 Dashboard | Partial |
| **Dashboard Stats** | `/api/hr/dashboard/stats` | HR/Admin | Stats | ✅ Live |
| **Recent Activities** | `/api/hr/dashboard/recent-activities` | HR/Admin | Timeline | Partial |
| **Department Overview** | `/api/hr/dashboard/departments` | HR/Admin | List | ✅ Live |

---

## 📈 Data Status

### ✅ Live Data (Working Now):
1. Attendance Widget (from attendance service)
2. Roster Widget (from user store)
3. Payroll Widget (from user salary)
4. Team Performance Widget (calculated from team members)
5. Team Attendance Widget (calculated from team)
6. Dashboard Stats (employee/store/department counts)
7. Department Overview (department list with counts)

### 🟡 Placeholder Data (Ready for Integration):
1. Tasks Widget
2. Performance Widget
3. Leave Balance Widget
4. Team Tasks Widget
5. Recruitment Pipeline Widget
6. Compliance Tracker Widget
7. Payroll Summary Widget
8. Store Sales/Inventory metrics

---

## 🔐 Access Control

| Role | Can Access |
|------|------------|
| **Employee** | Unified Dashboard (8 widgets only) |
| **Manager** | Unified Dashboard (11 widgets) + Store Dashboard |
| **HR** | All dashboards (14 widgets in unified) |
| **Admin** | All dashboards (full access) |
| **SuperAdmin** | All dashboards (full access) |

---

## 💡 Key Points

1. **Unified Dashboard सबसे important है** - यह role के basis पर अलग-अलग widgets show करता है
2. **Employee को 8 widgets मिलेंगे**
3. **Manager को 11 widgets मिलेंगे** (employee के 8 + team के 3)
4. **HR को 14 widgets मिलेंगे** (manager के 11 + HR के 3)
5. **Store Manager Dashboard अलग से है** - केवल store operations के लिए
6. **Currently 5 widgets में live data है**, बाकी में placeholder data है
7. **सभी dashboards role-based access control use करते हैं**

---

**Total Dashboards:** 6 APIs  
**Total Widgets:** 14 (maximum for HR role)  
**Live Widgets:** 5  
**Placeholder Widgets:** 9  
**Status:** ✅ Ready for deployment

