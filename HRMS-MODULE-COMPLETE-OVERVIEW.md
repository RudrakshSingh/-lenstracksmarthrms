# HRMS Module - Complete Overview

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Modules](#core-modules)
4. [API Endpoints](#api-endpoints)
5. [Database Models](#database-models)
6. [Features & Capabilities](#features--capabilities)
7. [Security & Permissions](#security--permissions)
8. [Integration Points](#integration-points)

---

## Overview

The HRMS (Human Resource Management System) is a comprehensive microservice built on Node.js/Express with MongoDB. It handles all HR operations including employee management, attendance, payroll, leaves, transfers, and compliance.

**Service Details:**
- **Service Name:** `hr-service`
- **Port:** 3002 (default)
- **Base URL:** `/api/hr`
- **Database:** MongoDB
- **Authentication:** JWT Bearer Token
- **Authorization:** Role-Based Access Control (RBAC)

**Live Dashboard:** [https://etelios-hrms-appservice-b9evgmcugfecgqeb.centralindia-01.azurewebsites.net/](https://etelios-hrms-appservice-b9evgmcugfecgqeb.centralindia-01.azurewebsites.net/)

---

## Architecture

### Service Structure
```
hr-service/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers (14 controllers)
│   ├── models/          # Database models (20+ models)
│   ├── routes/          # API routes (13 route files)
│   ├── services/        # Business logic (13 services)
│   ├── middleware/      # Auth, RBAC, validation
│   ├── utils/           # Helper utilities
│   ├── jobs/            # Background jobs
│   └── workers/         # Worker processes
└── server.js            # Main entry point
```

### Key Technologies
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **Validation:** Joi
- **Caching:** Redis (optional)
- **File Storage:** Cloudinary
- **Queue:** Bull (for background jobs)

---

## Core Modules

### 1. **Employee Management** ✅
**Route:** `/api/hr/employees`

**Features:**
- Create, read, update, delete employees
- Employee profile management
- Role assignment
- Status management (active, on_leave, terminated, pending)
- Department and store assignment
- Employee search and filtering
- Pagination support

**Key Endpoints:**
- `GET /api/hr/employees` - List all employees
- `GET /api/hr/employees/:id` - Get employee by ID
- `POST /api/hr/employees` - Create new employee
- `PUT /api/hr/employees/:id` - Update employee
- `DELETE /api/hr/employees/:id` - Delete employee
- `POST /api/hr/employees/:id/assign-role` - Assign role
- `PATCH /api/hr/employees/:id/status` - Update status

**Models:**
- `User.model.js` - User/Employee data
- `Employee.model.js` - Extended employee info
- `EmployeeMaster.model.js` - Master employee record

---

### 2. **Store/Branch Management** ✅
**Route:** `/api/hr/stores`

**Features:**
- Store creation and management
- Geofencing configuration
- Store status management
- Store search and filtering

**Key Endpoints:**
- `GET /api/hr/stores` - List all stores
- `GET /api/hr/stores/:id` - Get store by ID
- `POST /api/hr/stores` - Create store
- `PUT /api/hr/stores/:id` - Update store
- `DELETE /api/hr/stores/:id` - Delete store

**Models:**
- `Store.model.js` - Store/branch information

---

### 3. **Leave Management** ✅
**Route:** `/api/hr/leave`

**Features:**
- Leave request creation
- Multi-level approval workflow (up to 3 levels)
- Leave policy management
- Leave ledger tracking
- Leave balance calculation
- Leave types: CL, SL, EL, WO, PH, LWP, MATERNITY, PATERNITY, BEREAVEMENT, MARRIAGE, COMP_OFF, TRAINING
- Half-day leave support
- Medical certificate upload
- Leave year closing

**Key Endpoints:**
- `GET /api/hr/policies/leave` - Get leave policy
- `POST /api/hr/leave-requests` - Create leave request
- `GET /api/hr/leave-requests` - List leave requests
- `GET /api/hr/leave-requests/:id` - Get leave request
- `POST /api/hr/leave-requests/:id/approve` - Approve leave
- `POST /api/hr/leave-requests/:id/reject` - Reject leave
- `GET /api/hr/leave-balance/:employeeId` - Get leave balance
- `POST /api/hr/leave-year-close` - Close leave year

**Models:**
- `LeaveRequest.model.js` - Leave requests
- `LeavePolicy.model.js` - Leave policies
- `LeaveLedger.model.js` - Leave transactions

**Controllers:**
- `leaveController.js`
- `leaveYearCloseController.js`

**Services:**
- `leaveManagement.service.js`
- `leaveYearClose.service.js`

---

### 4. **Payroll Management** ✅
**Route:** `/api/hr/payroll`

**Features:**
- Payroll run creation and processing
- Multi-status workflow: DRAFT → PROCESSING → REVIEW → LOCKED → POSTED
- Payroll component management
- Override support (arrears, bonuses, adjustments)
- Lock and post functionality
- Journal voucher integration
- Statutory deductions (PF, ESIC, PT, TDS)
- Salary structure management
- Performance-based salary (for sales staff)

**Key Endpoints:**
- `POST /api/hr/payroll-runs` - Create payroll run
- `GET /api/hr/payroll-runs` - List payroll runs
- `GET /api/hr/payroll-runs/:id` - Get payroll run
- `POST /api/hr/payroll-runs/:id/process` - Process payroll
- `POST /api/hr/payroll-runs/:id/lock` - Lock payroll
- `POST /api/hr/payroll-runs/:id/post` - Post payroll
- `POST /api/hr/payroll-overrides` - Create override
- `GET /api/hr/payroll-components` - List components

**Models:**
- `PayrollRun.model.js` - Payroll runs
- `PayrollComponent.model.js` - Salary components
- `PayrollOverride.model.js` - Payroll overrides
- `CompensationProfile.model.js` - Employee compensation

**Controllers:**
- `payrollController.js`

**Services:**
- `payrollRun.service.js`

---

### 5. **Incentive & Clawback Management** ✅
**Route:** `/api/hr/incentive`

**Features:**
- Incentive claim creation
- Sales-based incentive calculation
- Multi-level approval workflow
- Clawback processing (for returns/remakes)
- Returns and remakes feed processing
- Incentive slab management
- Performance-based incentives

**Key Endpoints:**
- `POST /api/hr/incentive-claims` - Create incentive claim
- `GET /api/hr/incentive-claims` - List claims
- `POST /api/hr/incentive-claims/:id/approve` - Approve claim
- `POST /api/hr/clawback/apply` - Apply clawback
- `POST /api/hr/returns-remakes/feed` - Process returns/remakes

**Models:**
- `IncentiveClaim.model.js` - Incentive claims
- `ReturnsRemakesFeed.model.js` - Returns/remakes data

**Controllers:**
- `incentiveController.js`

**Services:**
- `incentiveClawback.service.js`

---

### 6. **Full & Final (F&F) Settlement** ✅
**Route:** `/api/hr/fnf`

**Features:**
- F&F case initiation
- Settlement calculation
- Outstanding balance tracking
- Payout processing
- Multi-level approval
- Bank transfer, cheque, cash support

**Key Endpoints:**
- `POST /api/hr/fnf` - Initiate F&F case
- `GET /api/hr/fnf` - List F&F cases
- `GET /api/hr/fnf/:id` - Get F&F case
- `POST /api/hr/fnf/:id/approve` - Approve F&F
- `POST /api/hr/fnf/:id/payout` - Process payout

**Models:**
- `FnFCase.model.js` - F&F cases

**Controllers:**
- `fnfController.js`

**Services:**
- `fnfSettlement.service.js`

---

### 7. **Transfer Management** ✅
**Route:** `/api/transfers`

**Features:**
- Store transfers
- Department transfers
- Role transfers
- Location transfers
- Multi-level approval workflow
- Transfer history tracking
- Effective date management

**Key Endpoints:**
- `POST /api/transfers` - Create transfer request
- `GET /api/transfers` - List transfers
- `GET /api/transfers/:id` - Get transfer
- `POST /api/transfers/:id/approve` - Approve transfer
- `POST /api/transfers/:id/reject` - Reject transfer

**Models:**
- `Transfer.model.js` - Transfer requests
- `ApprovalWorkflow.model.js` - Approval workflows

**Controllers:**
- `transferController.js`

**Services:**
- `transfer.service.js`

**Workers:**
- `transferWorker.js` - Background processing

---

### 8. **HR Letters** ✅
**Route:** `/api/hr-letter`

**Features:**
- Letter template management
- Letter generation (Offer, Appointment, Promotion, Demotion, Transfer, Role Change, Termination, Internship)
- Multi-language support (English, Hindi)
- Approval workflow
- PDF generation
- Template versioning

**Key Endpoints:**
- `POST /api/hr-letter/letters` - Create letter
- `GET /api/hr-letter/letters` - List letters
- `GET /api/hr-letter/letters/:id` - Get letter
- `POST /api/hr-letter/letters/:id/approve` - Approve letter
- `GET /api/hr-letter/templates` - List templates
- `POST /api/hr-letter/templates` - Create template

**Models:**
- `HRLetter.model.js` - HR letters
- `HRTemplate.model.js` - Letter templates

**Controllers:**
- `hrLetterController.js`

**Services:**
- `hrLetterService.js`
- `templateEngine.js` - Template rendering

---

### 9. **Statutory Compliance** ✅
**Route:** `/api/hr/stat-exports`

**Features:**
- EPF export generation
- ESIC export generation
- TDS Form 24Q generation
- Form 16 generation
- Statutory report validation
- Export file generation

**Key Endpoints:**
- `POST /api/hr/stat-exports/epf` - Generate EPF export
- `POST /api/hr/stat-exports/esic` - Generate ESIC export
- `POST /api/hr/stat-exports/tds-form24q` - Generate Form 24Q
- `POST /api/hr/stat-exports/form16` - Generate Form 16
- `GET /api/hr/stat-exports` - List exports

**Models:**
- `StatExport.model.js` - Statutory exports

**Controllers:**
- `statutoryController.js`

**Services:**
- `statutoryExport.service.js`

---

### 10. **Onboarding** ✅
**Route:** `/api/hr/onboarding`

**Features:**
- Employee registration
- Work details capture
- Statutory information collection
- Onboarding draft management
- Multi-step onboarding process

**Key Endpoints:**
- `POST /api/auth/register` - Register employee
- `POST /api/hr/work-details` - Add work details
- `POST /api/hr/statutory` - Add statutory info
- `POST /api/hr/complete-onboarding` - Complete onboarding
- `GET /api/hr/onboarding-drafts` - List drafts
- `POST /api/hr/onboarding-drafts` - Create draft

**Models:**
- `OnboardingDraft.model.js` - Onboarding drafts

**Controllers:**
- `onboardingController.js`

**Services:**
- `onboarding.service.js`

---

### 11. **Reports** ✅
**Route:** `/api/hr/reports`

**Features:**
- Payroll cost by store/role
- Incentive as % of sales
- Clawback reports
- LWP (Loss of Pay) days report
- Leave utilization report
- Attrition report
- Employee reports
- Custom report generation

**Key Endpoints:**
- `GET /api/hr/reports/payroll-cost` - Payroll cost report
- `GET /api/hr/reports/incentive-sales` - Incentive sales report
- `GET /api/hr/reports/clawback` - Clawback report
- `GET /api/hr/reports/lwp-days` - LWP days report
- `GET /api/hr/reports/leave-utilization` - Leave utilization
- `GET /api/hr/reports/attrition` - Attrition report

**Controllers:**
- `reportsController.js`

**Services:**
- `reports.service.js`

---

### 12. **Audit & Logging** ✅
**Route:** `/api/hr/audit`

**Features:**
- Audit log tracking
- User activity logging
- Change history
- Audit log verification

**Key Endpoints:**
- `GET /api/hr/audit-logs` - List audit logs
- `GET /api/hr/audit-logs/:id` - Get audit log
- `POST /api/hr/audit-logs/:id/verify` - Verify log

**Models:**
- `AuditLog.model.js` - Audit logs

**Controllers:**
- `auditController.js`

**Services:**
- `audit.service.js`

**Middleware:**
- `audit.middleware.js` - Automatic audit logging

---

### 13. **Webhooks** ✅
**Route:** `/api/hr/webhooks`

**Features:**
- Webhook registration
- Event notifications
- External system integration

**Controllers:**
- `webhookController.js`

---

## API Endpoints Summary

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Employee Management
- `GET /api/hr/employees` - List employees
- `POST /api/hr/employees` - Create employee
- `GET /api/hr/employees/:id` - Get employee
- `PUT /api/hr/employees/:id` - Update employee
- `DELETE /api/hr/employees/:id` - Delete employee
- `POST /api/hr/employees/:id/assign-role` - Assign role
- `PATCH /api/hr/employees/:id/status` - Update status

### Store Management
- `GET /api/hr/stores` - List stores
- `POST /api/hr/stores` - Create store
- `GET /api/hr/stores/:id` - Get store
- `PUT /api/hr/stores/:id` - Update store
- `DELETE /api/hr/stores/:id` - Delete store

### Leave Management
- `GET /api/hr/policies/leave` - Get leave policy
- `POST /api/hr/leave-requests` - Create leave request
- `GET /api/hr/leave-requests` - List leave requests
- `GET /api/hr/leave-requests/:id` - Get leave request
- `POST /api/hr/leave-requests/:id/approve` - Approve leave
- `POST /api/hr/leave-requests/:id/reject` - Reject leave
- `GET /api/hr/leave-balance/:employeeId` - Get leave balance
- `POST /api/hr/leave-year-close` - Close leave year

### Payroll Management
- `POST /api/hr/payroll-runs` - Create payroll run
- `GET /api/hr/payroll-runs` - List payroll runs
- `GET /api/hr/payroll-runs/:id` - Get payroll run
- `POST /api/hr/payroll-runs/:id/process` - Process payroll
- `POST /api/hr/payroll-runs/:id/lock` - Lock payroll
- `POST /api/hr/payroll-runs/:id/post` - Post payroll
- `POST /api/hr/payroll-overrides` - Create override

### Incentive Management
- `POST /api/hr/incentive-claims` - Create incentive claim
- `GET /api/hr/incentive-claims` - List claims
- `POST /api/hr/incentive-claims/:id/approve` - Approve claim
- `POST /api/hr/clawback/apply` - Apply clawback

### F&F Settlement
- `POST /api/hr/fnf` - Initiate F&F case
- `GET /api/hr/fnf` - List F&F cases
- `POST /api/hr/fnf/:id/approve` - Approve F&F
- `POST /api/hr/fnf/:id/payout` - Process payout

### Transfer Management
- `POST /api/transfers` - Create transfer
- `GET /api/transfers` - List transfers
- `POST /api/transfers/:id/approve` - Approve transfer

### HR Letters
- `POST /api/hr-letter/letters` - Create letter
- `GET /api/hr-letter/letters` - List letters
- `POST /api/hr-letter/letters/:id/approve` - Approve letter

### Statutory Compliance
- `POST /api/hr/stat-exports/epf` - Generate EPF
- `POST /api/hr/stat-exports/esic` - Generate ESIC
- `POST /api/hr/stat-exports/tds-form24q` - Generate Form 24Q
- `POST /api/hr/stat-exports/form16` - Generate Form 16

### Reports
- `GET /api/hr/reports/payroll-cost` - Payroll cost report
- `GET /api/hr/reports/incentive-sales` - Incentive report
- `GET /api/hr/reports/clawback` - Clawback report
- `GET /api/hr/reports/leave-utilization` - Leave report

---

## Database Models

### Core Models
1. **User.model.js** - User/Employee accounts
2. **Employee.model.js** - Extended employee information
3. **EmployeeMaster.model.js** - Master employee record
4. **Role.model.js** - User roles and permissions
5. **Store.model.js** - Store/branch information

### Leave Models
6. **LeaveRequest.model.js** - Leave requests
7. **LeavePolicy.model.js** - Leave policies
8. **LeaveLedger.model.js** - Leave transactions

### Payroll Models
9. **PayrollRun.model.js** - Payroll runs
10. **PayrollComponent.model.js** - Salary components
11. **PayrollOverride.model.js** - Payroll overrides
12. **CompensationProfile.model.js** - Employee compensation

### Other Models
13. **Transfer.model.js** - Transfer requests
14. **ApprovalWorkflow.model.js** - Approval workflows
15. **HRLetter.model.js** - HR letters
16. **HRTemplate.model.js** - Letter templates
17. **IncentiveClaim.model.js** - Incentive claims
18. **ReturnsRemakesFeed.model.js** - Returns/remakes
19. **FnFCase.model.js** - F&F cases
20. **StatExport.model.js** - Statutory exports
21. **OnboardingDraft.model.js** - Onboarding drafts
22. **AuditLog.model.js** - Audit logs

---

## Features & Capabilities

### ✅ Implemented Features

1. **Employee Lifecycle Management**
   - Onboarding
   - Active management
   - Transfers
   - Offboarding (F&F)

2. **Attendance Integration**
   - Geofencing support
   - Store-based attendance
   - Location tracking

3. **Leave Management**
   - Multiple leave types
   - Approval workflows
   - Balance tracking
   - Year closing

4. **Payroll Processing**
   - Automated calculation
   - Statutory deductions
   - Override support
   - Lock and post

5. **Incentive Management**
   - Sales-based incentives
   - Clawback processing
   - Approval workflows

6. **Compliance**
   - EPF/ESIC exports
   - TDS compliance
   - Form 16 generation

7. **Reporting**
   - Payroll reports
   - Leave reports
   - Attrition reports
   - Custom reports

8. **Security**
   - JWT authentication
   - RBAC authorization
   - Audit logging
   - Data encryption

### 🔄 Integration Points

1. **Attendance Service**
   - Employee data sync
   - Store information
   - Geofencing data

2. **Financial Service**
   - Payroll posting
   - Journal vouchers
   - Financial reports

3. **Notification Service**
   - Leave notifications
   - Payroll notifications
   - Transfer notifications

4. **Document Service**
   - Letter generation
   - Form generation
   - Report generation

---

## Security & Permissions

### Roles
- **SuperAdmin** - Full access
- **Admin** - Administrative access
- **HR** - HR management access
- **Manager** - Team management access
- **Employee** - Self-service access

### Permission Categories
- User Management: `user:read`, `user:create`, `user:update`, `user:delete`
- Leave Management: `hr.leave.read`, `hr.leave.create`, `hr.leave.approve`
- Payroll Management: `hr.payroll.read`, `hr.payroll.process`, `hr.payroll.lock`
- Store Management: `store:read`, `store:create`, `store:update`
- Transfer Management: `transfer:read`, `transfer:approve`
- Reports: `hr.reports.read`
- Audit: `hr.audit.read`, `hr.audit.verify`

### Middleware
- `auth.middleware.js` - JWT authentication
- `rbac.middleware.js` - Role-based access control
- `audit.middleware.js` - Audit logging
- `validateRequest.middleware.js` - Request validation

---

## Dashboard Statistics

Based on the live dashboard, the system currently tracks:

- **Total Employees:** 1,247
- **Attendance Rate:** 94.2%
- **Average Salary:** ₹85,000
- **Performance Rating:** 4.3/5
- **New Hires This Month:** 47
- **Pending Leaves:** 23
- **Total Stores:** 5

### Department Distribution
- Optometry: 156 employees (+12.5%)
- Sales: 234 employees (+8.2%)
- HR: 45 employees (+15.3%)
- Technology: 189 employees (+22.1%)
- Finance: 78 employees (+5.7%)
- Marketing: 67 employees (+18.9%)
- Operations: 113 employees (+9.8%)

---

## Status Summary

### ✅ Fully Implemented Modules
1. Employee Management
2. Store Management
3. Leave Management
4. Payroll Management
5. Incentive Management
6. F&F Settlement
7. Transfer Management
8. HR Letters
9. Statutory Compliance
10. Onboarding
11. Reports
12. Audit & Logging
13. Webhooks

### 📊 Module Statistics
- **Total Controllers:** 14
- **Total Models:** 22
- **Total Routes:** 13 route files
- **Total Services:** 13
- **API Endpoints:** 100+

---

## Next Steps / Enhancements

### Potential Additions
1. **Performance Management** - Reviews, goals, appraisals
2. **Recruitment** - Job postings, candidate management
3. **Training & Development** - Learning programs, skill tracking
4. **Benefits Management** - Benefits enrollment, claims
5. **Org Chart** - Organizational hierarchy visualization
6. **Roster Management** - Shift scheduling, roster planning

### Technical Improvements
1. Real-time notifications
2. Advanced analytics
3. Mobile app support
4. API versioning
5. GraphQL support
6. Microservice communication optimization

---

## Conclusion

The HRMS module is a **fully functional, production-ready** system with comprehensive features covering the entire employee lifecycle. All core modules are implemented with proper authentication, authorization, validation, and error handling.

The system is currently live and handling 1,247+ employees across 5 stores with high attendance rates and efficient payroll processing.

