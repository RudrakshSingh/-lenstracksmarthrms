# Complete Codebase Module Interconnections

## All Modules in Codebase (Complete List)

### Core Active Modules (With Interconnections)

#### 1. HRMS (hr-service)
**Connects To:**
- → Attendance Service
- → Sales Service
- → Auth Service
- → Payroll Service
- → Document Service
- → Analytics Service
- → Tenant Registry Service

**Connected From:**
- ← Attendance Service
- ← Sales Service
- ← Auth Service
- ← Payroll Service

---

#### 2. Attendance Service (attendance-service)
**Connects To:**
- → HRMS
- → Auth Service
- → Sales Service

**Connected From:**
- ← HRMS

---

#### 3. Sales Service (sales-service)
**Connects To:**
- → HRMS
- → Auth Service
- → Inventory Service

**Connected From:**
- ← HRMS
- ← Attendance Service

---

#### 4. Auth Service (auth-service)
**Connects To:**
- → HRMS
- → Attendance Service

**Connected From:**
- ← HRMS
- ← Attendance Service
- ← Sales Service
- ← All Services (JWT validation)

---

#### 5. Payroll Service (payroll-service)
**Connects To:**
- → HRMS
- → Attendance Service

**Connected From:**
- ← HRMS

---

#### 6. Document Service (document-service)
**Connects To:**
- → AWS S3

**Connected From:**
- ← HRMS

---

#### 7. Inventory Service (inventory-service)
**Connects To:**
- (No outgoing connections)

**Connected From:**
- ← Sales Service

---

#### 8. Analytics Service (analytics-service)
**Connects To:**
- → HRMS

**Connected From:**
- ← HRMS

---

### Inactive/Standalone Modules (No Connections)

#### 14. CRM Service (crm-service)
**Connects To:**
- (No connections)

**Connected From:**
- (No connections)

---

#### 15. Financial Service (financial-service)
**Connects To:**
- (No connections)

**Connected From:**
- (No connections)

---

#### 16. Notification Service (notification-service)
**Connects To:**
- (No connections)

**Connected From:**
- (No connections)

---

#### 17. Prescription Service (prescription-service)
**Connects To:**
- (No connections)

**Connected From:**
- (No connections)

---

#### 18. Purchase Service (purchase-service)
**Connects To:**
- (No connections)

**Connected From:**
- (No connections)

---

#### 19. Monitoring Service (monitoring-service)
**Connects To:**
- (No connections)

**Connected From:**
- (No connections)

---

#### 16. Tenant Management Service (tenant-management-service)
**Connects To:**
- (No connections)

**Connected From:**
- (No connections)

---

#### 17. Tenant Registry Service (tenant-registry-service)
**Connects To:**
- (No connections)

**Connected From:**
- (No connections)

---

#### 18. Service Management (service-management)
**Connects To:**
- (No connections)

**Connected From:**
- (No connections)

---

#### 21. CPP Service (cpp-service)
**Connects To:**
- (No connections)

**Connected From:**
- (No connections)

---

#### 9. Realtime Service (realtime-service)
**Connects To:**
- (No outgoing connections)

**Connected From:**
- ← All Services (WebSocket connections)

---

#### 10. API Gateway (api-gateway)
**Connects To:**
- → All Services (routing)

**Connected From:**
- ← Frontend
- ← External Clients

---

#### 11. Tenant Registry Service (tenant-registry-service)
**Connects To:**
- (No outgoing connections)

**Connected From:**
- ← HRMS

---

#### 12. Tenant Management Service (tenant-management-service)
**Connects To:**
- (No connections)

**Connected From:**
- (No connections)

---

#### 13. JTS Service (jts-service)
**Connects To:**
- (No connections)

**Connected From:**
- (No connections)

---

## Complete Connection Matrix

| From Module | To Module | Status |
|-------------|-----------|--------|
| HRMS | Attendance | Active |
| HRMS | Sales | Active |
| HRMS | Auth | Active |
| HRMS | Payroll | Active |
| HRMS | Documents | Active |
| HRMS | Analytics | Active |
| HRMS | Tenant Registry | Active |
| Attendance | HRMS | Active |
| Attendance | Auth | Active |
| Attendance | Sales | Active |
| Sales | HRMS | Active |
| Sales | Auth | Active |
| Sales | Inventory | Active |
| Payroll | HRMS | Active |
| Payroll | Attendance | Active |
| Auth | HRMS | Active |
| Auth | Attendance | Active |
| Documents | AWS S3 | Active |
| Inventory | Sales | Active |
| Analytics | HRMS | Active |
| Realtime | All Services | Active (WebSocket) |
| API Gateway | All Services | Active |
| CRM | - | Inactive |
| Financial | - | Inactive |
| Notification | - | Inactive |
| Prescription | - | Inactive |
| Purchase | - | Inactive |
| JTS | - | Inactive |
| Monitoring | - | Inactive |
| Tenant Management | - | Inactive |
| Tenant Registry | HRMS | Active |
| Service Management | - | Inactive |
| CPP | - | Inactive |

---

## Module Dependency Graph (Complete)

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

API Gateway
└── → All Services

Standalone Modules (No Connections):
├── CRM Service
├── Financial Service
├── Notification Service
├── Prescription Service
├── Purchase Service
├── JTS Service
├── Monitoring Service
├── Tenant Management Service
├── Tenant Registry Service
├── Service Management
└── CPP Service
```

---

## Module Categories

### Core Active Modules (8)
1. HRMS
2. Attendance Service
3. Sales Service
4. Auth Service
5. Payroll Service
6. Document Service
7. Inventory Service
8. Analytics Service

### Infrastructure Modules (2)
1. Realtime Service
2. API Gateway

### Inactive/Standalone Modules (11)
1. CRM Service
2. Financial Service
3. Notification Service
4. Prescription Service
5. Purchase Service
6. JTS Service
7. Monitoring Service
8. Tenant Management Service
9. Tenant Registry Service
10. Service Management
11. CPP Service

---

## External Services

- AWS S3 (Document Service)
- MongoDB (All Services)
- Kubernetes Ingress (All Services)

---

## Module Categories

### Core Active Modules (8)
1. HRMS
2. Attendance Service
3. Sales Service
4. Auth Service
5. Payroll Service
6. Document Service
7. Inventory Service
8. Analytics Service

### Infrastructure Modules (2)
1. Realtime Service
2. API Gateway

### Tenant Management Modules (2)
1. Tenant Registry Service (connected to HRMS)
2. Tenant Management Service (standalone)

### Inactive/Standalone Modules (9)
1. CRM Service
2. Financial Service
3. Notification Service
4. Prescription Service
5. Purchase Service
6. JTS Service
7. Monitoring Service
8. Service Management
9. CPP Service

### Shared Utilities (1)
1. Shared (common utilities, not a service)

---

## Summary

**Total Modules:** 22 (21 services + 1 shared utilities)
**Active Modules with Connections:** 9 (8 core + 1 tenant)
**Infrastructure Modules:** 2
**Tenant Management Modules:** 2 (1 connected, 1 standalone)
**Inactive/Standalone Modules:** 8
**Shared Utilities:** 1
