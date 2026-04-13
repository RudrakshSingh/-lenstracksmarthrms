# Business Domain Connection Flow - HRMS System

## Complete Inter-Department/Module Connection Map

This document shows how different business departments/modules are interconnected in the HRMS system.

---

## 🏢 CORE BUSINESS DOMAIN CONNECTIONS

### 1. **HRMS (Human Resource Management System) - Central Hub**

HRMS is the **central orchestrator** that connects to almost all other departments:

```
HRMS (hr-service)
├── 👥 Employee Management
│   ├── Creates/Manages employee records
│   ├── Assigns employees to stores
│   ├── Manages employee roles and permissions
│   └── Tracks employee status (active, on-leave, terminated)
│
├── 📅 Roster/Schedule Management
│   ├── Creates employee schedules
│   ├── Assigns employees to stores for specific dates
│   ├── Defines shift timings
│   └── Links employees to stores for attendance validation
│
├── 🏪 Store Management
│   ├── Creates and manages store locations
│   ├── Defines store geofencing boundaries
│   ├── Assigns employees to stores
│   └── Links stores to sales and attendance
│
├── 🏖️ Leave Management
│   ├── Manages leave applications
│   ├── Tracks leave balances
│   ├── Approves/rejects leave requests
│   └── Integrates with attendance (marks days as on-leave)
│
├── 💰 Payroll Management
│   ├── Calculates employee salaries
│   ├── Processes payroll runs
│   ├── Links to attendance (for hours worked)
│   └── Generates payroll reports
│
└── 📊 Performance Management
    ├── Tracks employee performance reviews
    ├── Links to attendance (for performance scoring)
    └── Manages performance metrics
```

---

## 🔗 INTER-DEPARTMENT CONNECTIONS

### **1. HRMS ↔ ATTENDANCE**

**Connection Type:** Strong Dependency (Bidirectional)

**HRMS → Attendance:**
- **Employee Data**: Attendance service fetches employee information from HRMS
  - Employee ID, Name, Email
  - Store assignment
  - Employee status (active/inactive)
  - Tenant information

- **Roster Data**: Attendance service fetches roster information
  - Shift timings (shiftStart, shiftEnd)
  - Store assignment for the day
  - Date-specific schedule

- **Store Data**: Attendance service fetches store information
  - Store location (latitude, longitude)
  - Geofencing radius
  - Store code and name

**Attendance → HRMS:**
- **Attendance Statistics**: HRMS dashboard fetches attendance stats
  - Total present/absent count
  - Attendance percentage
  - Today's attendance records
  - Attendance history

- **Attendance Records**: HRMS displays attendance data
  - Check-in/Check-out times
  - Location data
  - Attendance status

**Business Flow:**
```
Employee Check-in Request
    ↓
Attendance Service
    ↓
Fetches Employee from HRMS → Validates Employee exists & is active
    ↓
Fetches Roster from HRMS → Validates shift timing & store assignment
    ↓
Fetches Store from HRMS → Validates location within geofence
    ↓
Saves Attendance Record
    ↓
HRMS Dashboard → Fetches Attendance Stats for display
```

**Data Flow:**
- **Employee ID** (HRMS → Attendance)
- **Store ID** (HRMS → Attendance)
- **Roster Data** (HRMS → Attendance)
- **Attendance Records** (Attendance → HRMS)

---

### **2. HRMS ↔ SALES**

**Connection Type:** Strong Dependency (Bidirectional)

**HRMS → Sales:**
- **Employee Validation**: Sales service validates employee exists
  - Employee ID validation
  - Employee status check (must be active)
  - Store assignment validation

- **Store Validation**: Sales service validates store exists
  - Store ID validation
  - Store status check
  - Tenant validation

- **Roster Validation**: Sales service validates employee is assigned to store for the day
  - Checks if employee has roster for the date
  - Validates store in roster matches sales entry store
  - Ensures employee is scheduled for that store

**Sales → HRMS:**
- **Sales Data**: HRMS dashboard fetches sales statistics
  - Daily sales totals
  - Employee-specific sales
  - Store-wise sales
  - Monthly sales aggregates

- **Sales Dashboard**: HRMS displays sales widgets
  - Today's sales
  - This month's sales
  - Sales performance metrics

**Business Flow:**
```
Employee Creates Sales Entry
    ↓
Sales Service
    ↓
Validates Employee from HRMS → Checks employee exists & is active
    ↓
Validates Store from HRMS → Checks store exists & is active
    ↓
Fetches Roster from HRMS → Validates employee is assigned to store for today
    ↓
If roster exists: Only allows sales if store matches roster store
    ↓
Saves Sales Order
    ↓
HRMS Dashboard → Fetches Sales Data for display
```

**Data Flow:**
- **Employee ID** (HRMS → Sales)
- **Store ID** (HRMS → Sales)
- **Roster Data** (HRMS → Sales)
- **Sales Orders** (Sales → HRMS)

---

### **3. HRMS ↔ FINANCE/PAYROLL**

**Connection Type:** Strong Dependency (HRMS → Payroll)

**HRMS → Payroll:**
- **Employee Salary Data**: Payroll service uses HRMS employee data
  - Employee salary/CTC
  - Salary breakdown (basic, HRA, allowances)
  - Employee designation
  - Employee status

- **Attendance Data**: Payroll calculates based on attendance
  - Hours worked (from attendance records)
  - Days present/absent
  - Leave deductions
  - Overtime calculations

- **Leave Data**: Payroll considers leave records
  - Approved leaves
  - Leave without pay (LWP)
  - Leave balance deductions

**Payroll → HRMS:**
- **Payroll Preview**: HRMS displays payroll information
  - Current month payroll
  - Salary breakdown
  - Deductions
  - Net pay

**Business Flow:**
```
Payroll Processing
    ↓
HRMS Provides:
  - Employee salary data
  - Attendance records (hours worked)
  - Leave records (deductions)
    ↓
Payroll Service Calculates:
  - Gross salary
  - Deductions (leaves, taxes)
  - Net pay
    ↓
HRMS Dashboard → Displays Payroll Preview
```

**Data Flow:**
- **Employee Salary** (HRMS → Payroll)
- **Attendance Records** (HRMS → Payroll)
- **Leave Records** (HRMS → Payroll)
- **Payroll Runs** (Payroll → HRMS)

---

### **4. HRMS ↔ AUTHENTICATION**

**Connection Type:** Strong Dependency (Bidirectional)

**Auth → HRMS:**
- **User Credentials**: Auth service manages user authentication
  - Login credentials
  - Password management
  - JWT token generation

- **User Profile**: Auth service provides user profile data
  - Employee ID
  - Email
  - Role
  - Tenant ID

**HRMS → Auth:**
- **Employee Creation**: When HRMS creates employee, may create auth user
  - User account creation
  - Initial password setup
  - Role assignment

**Business Flow:**
```
User Login
    ↓
Auth Service Validates Credentials
    ↓
Generates JWT Token (includes employee_id, tenant_id, role)
    ↓
All API Requests Include Token
    ↓
HRMS Validates Token & Extracts Employee Info
    ↓
HRMS Returns Employee Data Based on Token
```

**Data Flow:**
- **User Credentials** (Auth → HRMS)
- **JWT Tokens** (Auth → All Services)
- **Employee Data** (HRMS → Auth)

---

### **5. ATTENDANCE ↔ SALES**

**Connection Type:** Indirect (through HRMS)

**Connection:**
- Both services depend on HRMS for employee/store/roster data
- Both validate against the same roster data
- Both ensure employee is assigned to the correct store

**Business Flow:**
```
Employee Must Check-in First (Attendance)
    ↓
Attendance Validates Against Roster (from HRMS)
    ↓
Employee Can Then Create Sales Entry
    ↓
Sales Validates Against Same Roster (from HRMS)
    ↓
Both Ensure Store Assignment Matches
```

---

### **6. HRMS ↔ DOCUMENTS**

**Connection Type:** Moderate Dependency

**HRMS → Documents:**
- **Document Upload**: Employees upload documents through HRMS
  - Employee documents (ID proof, certificates)
  - Leave supporting documents
  - Performance review documents

**Documents → HRMS:**
- **Document Links**: HRMS stores document URLs
  - Document references in employee records
  - Leave application attachments
  - Performance review attachments

**Data Flow:**
- **Document URLs** (Documents → HRMS)
- **Document Metadata** (Documents → HRMS)

---

### **7. HRMS ↔ CRM**

**Connection Type:** Weak Dependency (Future Integration)

**Potential Connections:**
- Employee-customer relationships
- Sales person assignment to customers
- Customer interaction tracking by employees

---

### **8. SALES ↔ INVENTORY**

**Connection Type:** Moderate Dependency

**Sales → Inventory:**
- **Product Validation**: Sales validates products exist in inventory
  - Product ID validation
  - Stock availability
  - Product pricing

**Inventory → Sales:**
- **Stock Updates**: Sales updates inventory after order
  - Stock deduction
  - Inventory movement tracking

**Data Flow:**
- **Product Data** (Inventory → Sales)
- **Stock Updates** (Sales → Inventory)

---

### **9. HRMS ↔ ANALYTICS**

**Connection Type:** Data Consumer

**HRMS → Analytics:**
- **Data Aggregation**: Analytics service processes HRMS data
  - Employee statistics
  - Attendance trends
  - Performance metrics
  - Payroll analytics

**Analytics → HRMS:**
- **Reports**: HRMS displays analytics reports
  - Dashboard widgets
  - Trend analysis
  - Predictive insights

---

## 📊 COMPLETE CONNECTION DIAGRAM

```
                    ┌─────────────────┐
                    │   AUTH SERVICE  │
                    │  (Authentication)│
                    └────────┬────────┘
                             │
                             │ JWT Tokens
                             │ User Credentials
                             ↓
        ┌─────────────────────────────────────────────┐
        │          HRMS (hr-service)                  │
        │  ┌──────────────────────────────────────┐  │
        │  │ • Employee Management                 │  │
        │  │ • Store Management                    │  │
        │  │ • Roster/Schedule Management          │  │
        │  │ • Leave Management                    │  │
        │  │ • Payroll Management                  │  │
        │  │ • Performance Management              │  │
        │  └──────────────────────────────────────┘  │
        └─────┬──────────┬──────────┬──────────┬─────┘
              │          │          │          │
              │          │          │          │
    ┌─────────┘          │          │          └─────────┐
    │                    │          │                    │
    │ Employee Data      │          │                    │ Employee Data
    │ Store Data         │          │                    │ Store Data
    │ Roster Data        │          │                    │ Roster Data
    │                    │          │                    │
    ↓                    ↓          ↓                    ↓
┌──────────┐      ┌──────────┐  ┌──────────┐      ┌──────────┐
│ATTENDANCE│      │  SALES   │  │ PAYROLL  │      │ DOCUMENTS│
│ SERVICE  │      │ SERVICE  │  │ SERVICE  │      │ SERVICE  │
└────┬─────┘      └────┬─────┘  └────┬─────┘      └────┬─────┘
     │                 │              │                 │
     │ Attendance      │ Sales Data   │ Payroll Data    │ Document URLs
     │ Statistics      │              │                 │
     └─────────────────┴──────────────┴─────────────────┘
              │              │              │
              │              │              │
              └──────────────┴──────────────┘
                         │
                         │ Aggregated Data
                         ↓
              ┌──────────────────┐
              │  HRMS DASHBOARD  │
              │  (Displays All)  │
              └──────────────────┘
```

---

## 🔄 KEY BUSINESS WORKFLOWS

### **Workflow 1: Employee Onboarding**
```
1. HRMS creates employee record
   ↓
2. Auth Service creates user account
   ↓
3. HRMS assigns employee to store
   ↓
4. HRMS creates initial roster
   ↓
5. Employee can now check-in (Attendance)
   ↓
6. Employee can create sales entries (Sales)
```

### **Workflow 2: Daily Operations**
```
1. Employee checks roster (HRMS)
   ↓
2. Employee checks-in at store (Attendance → validates with HRMS roster)
   ↓
3. Employee creates sales entries (Sales → validates with HRMS roster)
   ↓
4. Attendance records saved (Attendance)
   ↓
5. Sales orders saved (Sales)
   ↓
6. HRMS dashboard aggregates all data
```

### **Workflow 3: Payroll Processing**
```
1. HRMS provides employee salary data
   ↓
2. Attendance service provides attendance records
   ↓
3. HRMS provides leave records
   ↓
4. Payroll service calculates:
   - Gross salary (from HRMS)
   - Hours worked (from Attendance)
   - Leave deductions (from HRMS)
   - Net pay
   ↓
5. HRMS displays payroll preview
```

### **Workflow 4: Leave Management**
```
1. Employee applies for leave (HRMS)
   ↓
2. Manager/HR approves leave (HRMS)
   ↓
3. Leave balance updated (HRMS)
   ↓
4. Attendance service marks day as "on-leave"
   ↓
5. Payroll service deducts leave from salary
```

---

## 📋 DATA DEPENDENCIES SUMMARY

### **HRMS is the Central Hub:**
- **Provides to Attendance**: Employee data, Store data, Roster data
- **Provides to Sales**: Employee data, Store data, Roster data
- **Provides to Payroll**: Employee data, Salary data, Attendance data, Leave data
- **Receives from Attendance**: Attendance statistics, Attendance records
- **Receives from Sales**: Sales data, Sales statistics
- **Receives from Payroll**: Payroll runs, Payroll preview

### **Attendance Depends On:**
- **HRMS**: Employee validation, Store validation, Roster validation
- **Provides to HRMS**: Attendance records, Attendance statistics
- **Provides to Payroll**: Hours worked, Attendance data

### **Sales Depends On:**
- **HRMS**: Employee validation, Store validation, Roster validation
- **Inventory**: Product validation, Stock availability
- **Provides to HRMS**: Sales data, Sales statistics

### **Payroll Depends On:**
- **HRMS**: Employee salary, Leave records
- **Attendance**: Hours worked, Attendance records
- **Provides to HRMS**: Payroll calculations, Payroll preview

---

## 🎯 CRITICAL CONNECTIONS (Must Work)

1. **HRMS ↔ Attendance** - Critical for check-in/check-out
2. **HRMS ↔ Sales** - Critical for sales entry validation
3. **HRMS ↔ Payroll** - Critical for salary calculation
4. **HRMS ↔ Auth** - Critical for user authentication

---

## 📝 NOTES

- **HRMS is the single source of truth** for employee, store, and roster data
- **All services validate against HRMS** before processing requests
- **Roster is the binding factor** - it connects employees to stores for specific dates
- **Tenant isolation** ensures data is separated by tenant (lenstrack, default, etc.)
- **JWT tokens** from Auth service are used across all services for authentication

---

## 🔍 TROUBLESHOOTING CONNECTIONS

If a service is not working, check:
1. **HRMS is running** (most services depend on it)
2. **Employee exists in HRMS** with store assignment
3. **Roster exists** for the date (for attendance/sales)
4. **JWT token is valid** (from Auth service)
5. **Tenant ID matches** across all services
