# Module Interconnections - Codebase Structure

## Direct Module Connections

### HRMS (hr-service)
**Connects To:**
- → Attendance Service (fetches attendance stats, records)
- → Sales Service (fetches sales data, dashboard)
- → Auth Service (user authentication, token validation)
- → Payroll Service (payroll preview, salary data)
- → Document Service (document URLs, metadata)

**Connected From:**
- ← Attendance Service (employee data, roster data, store data)
- ← Sales Service (employee validation, store validation, roster validation)
- ← Auth Service (user profile data)
- ← Payroll Service (payroll calculations)

---

### Attendance Service (attendance-service)
**Connects To:**
- → HRMS (employee lookup, roster lookup, store lookup)
- → Auth Service (admin token for internal calls)
- → Sales Service (sales data on clock-out)

**Connected From:**
- ← HRMS (attendance statistics, attendance records)

---

### Sales Service (sales-service)
**Connects To:**
- → HRMS (employee validation, store validation, roster validation)
- → Auth Service (admin token for roster lookup)
- → Inventory Service (product validation, stock availability)

**Connected From:**
- ← HRMS (sales data, sales statistics, dashboard)
- ← Attendance Service (sales calculation on clock-out)

---

### Payroll Service (payroll-service)
**Connects To:**
- → HRMS (employee salary data, leave records)
- → Attendance Service (hours worked, attendance records)

**Connected From:**
- ← HRMS (payroll preview, payroll calculations)

---

### Auth Service (auth-service)
**Connects To:**
- → HRMS (employee data for user profile)

**Connected From:**
- ← HRMS (user account creation)
- ← Attendance Service (admin token requests)
- ← Sales Service (admin token requests)
- ← All Services (JWT token validation)

---

### Document Service (document-service)
**Connects To:**
- → AWS S3 (file storage)

**Connected From:**
- ← HRMS (document URLs, document metadata)
- ← Leave Service (leave application attachments)
- ← Performance Service (performance review documents)

---

### Inventory Service (inventory-service)
**Connects To:**
- (Standalone - no outgoing connections)

**Connected From:**
- ← Sales Service (product validation, stock updates)

---

### CRM Service (crm-service)
**Connects To:**
- (Standalone - no outgoing connections)

**Connected From:**
- (No incoming connections currently)

---

### Analytics Service (analytics-service)
**Connects To:**
- → HRMS (data aggregation)

**Connected From:**
- ← HRMS (analytics reports, dashboard widgets)

---

### Financial Service (financial-service)
**Connects To:**
- (Standalone - no outgoing connections)

**Connected From:**
- (No incoming connections currently)

---

### Notification Service (notification-service)
**Connects To:**
- (Standalone - no outgoing connections)

**Connected From:**
- (No incoming connections currently)

---

### Realtime Service (realtime-service)
**Connects To:**
- (Standalone - no outgoing connections)

**Connected From:**
- ← All Services (WebSocket connections for real-time updates)

---

## Connection Matrix

| From Module | To Module | Connection Type |
|------------|-----------|-----------------|
| HRMS | Attendance | Data Fetch (stats, records) |
| HRMS | Sales | Data Fetch (sales data) |
| HRMS | Auth | User Profile |
| HRMS | Payroll | Payroll Preview |
| HRMS | Documents | Document URLs |
| HRMS | Analytics | Data Aggregation |
| Attendance | HRMS | Data Fetch (employee, roster, store) |
| Attendance | Auth | Token Request |
| Attendance | Sales | Sales Calculation |
| Sales | HRMS | Validation (employee, store, roster) |
| Sales | Auth | Token Request |
| Sales | Inventory | Product Validation |
| Payroll | HRMS | Salary Data |
| Payroll | Attendance | Hours Worked |
| Auth | HRMS | Employee Data |
| Documents | AWS S3 | File Storage |
| Inventory | Sales | Stock Updates |
| Analytics | HRMS | Data Source |
| All Services | Auth | JWT Validation |
| All Services | Realtime | WebSocket Updates |

---

## Module Dependency Graph

```
HRMS (Central Hub)
├── → Attendance Service
│   └── ← Attendance Service
├── → Sales Service
│   └── ← Sales Service
├── → Auth Service
│   └── ← Auth Service
├── → Payroll Service
│   └── ← Payroll Service
├── → Document Service
├── → Analytics Service
│   └── ← Analytics Service
└── → Realtime Service (WebSocket)

Attendance Service
├── → HRMS
├── → Auth Service
└── → Sales Service

Sales Service
├── → HRMS
├── → Auth Service
└── → Inventory Service
    └── ← Inventory Service

Payroll Service
├── → HRMS
└── → Attendance Service

Auth Service
└── → HRMS

Document Service
└── → AWS S3

Inventory Service
└── ← Sales Service

Analytics Service
└── → HRMS

Realtime Service
└── ← All Services (WebSocket)
```

---

## Critical Paths

**Employee Check-in:**
Attendance → HRMS → Auth

**Sales Entry:**
Sales → HRMS → Auth → Inventory

**Payroll Processing:**
Payroll → HRMS + Attendance

**Dashboard Load:**
HRMS → Attendance + Sales + Payroll

---

## Standalone Modules (No Connections)

- CRM Service
- Financial Service
- Notification Service
- Prescription Service
- Purchase Service
- JTS Service
- Monitoring Service
- Tenant Management Service
- Tenant Registry Service
- Service Management
- CPP Service

---

## External Services

- AWS S3 (Document Service)
- MongoDB (All Services)
- Kubernetes Ingress (All Services)
