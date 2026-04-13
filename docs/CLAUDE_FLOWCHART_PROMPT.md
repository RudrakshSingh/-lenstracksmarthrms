# Claude Prompt: Generate Detailed Software Architecture Flowchart

Use this prompt in Claude to generate a comprehensive flowchart of the HRMS system architecture.

---

## PROMPT FOR CLAUDE:

```
I need you to create a detailed flowchart/mermaid diagram showing the complete architecture and module connections of an HRMS (Human Resource Management System) software. Here are the system details:

### SYSTEM OVERVIEW:
- **Architecture**: Microservices-based system deployed on Kubernetes (AWS EKS)
- **Domain**: api.etelios.com (HTTPS with SSL certificate)
- **Frontend**: app.etelios.com (Next.js application)
- **Database**: MongoDB (DocumentDB on AWS)

### MICROSERVICES (Backend Services):

1. **auth-service** (Port 3001)
   - Handles user authentication and authorization
   - JWT token generation and validation
   - User registration and login
   - Endpoints: /api/auth/login, /api/auth/register, /api/auth/me, /api/auth/refresh
   - Database: User credentials, tokens

2. **hr-service** (Port 3002)
   - Core HR management functionality
   - Employee management (CRUD operations)
   - Store management
   - Department management
   - Roster/schedule management
   - Leave management
   - Payroll processing
   - Performance reviews
   - Dashboard data aggregation
   - Endpoints: /api/hr/employees, /api/hr/stores, /api/hr/departments, /api/hr/roster, /api/hr/leaves, /api/hr/dashboard, /api/hr/payroll
   - Database: Employees, Stores, Departments, Rosters, LeaveRequests, PayrollRuns, PerformanceReviews
   - **Calls**: attendance-service (for attendance stats), sales-service (for sales data)

3. **attendance-service** (Port 3003)
   - Employee attendance tracking
   - Clock-in/Clock-out functionality
   - Location-based validation
   - Geofencing
   - Attendance reports and statistics
   - Endpoints: /api/attendance/clock-in, /api/attendance/clock-out, /api/attendance, /api/attendance/stats
   - Database: Attendance records
   - **Calls**: hr-service (to fetch employee data, roster data, store information)

4. **sales-service** (Port 3007)
   - Sales order management
   - Daily sales entries
   - Sales dashboard
   - Product management
   - Endpoints: /api/sales/orders, /api/sales/daily
   - Database: SalesOrders, Products
   - **Calls**: hr-service (to validate employee and store)

5. **document-service** (Port 3004)
   - Document upload and management
   - File storage (AWS S3)
   - Document retrieval
   - Endpoints: /api/documents

6. **inventory-service** (Port 3006)
   - Inventory management
   - Stock tracking
   - Endpoints: /api/inventory

7. **crm-service**
   - Customer relationship management
   - Endpoints: /api/crm

8. **analytics-service**
   - Business analytics and reporting
   - Endpoints: /api/analytics

### FRONTEND MODULES (app.etelios.com):

1. **Authentication Module**
   - Login/Logout
   - Token management
   - User session

2. **Dashboard Module**
   - HR Dashboard (aggregates data from multiple services)
   - Employee Dashboard
   - Admin Dashboard
   - Widgets: Attendance, Payroll, Sales, Leaves, Performance, Tasks, Roster

3. **Employee Management Module**
   - Employee list
   - Employee details
   - Employee creation/editing
   - Employee onboarding

4. **Attendance Module**
   - Clock-in/Clock-out interface
   - Attendance history
   - Attendance reports
   - Location tracking

5. **Store Management Module**
   - Store list
   - Store creation/editing
   - Store details

6. **Roster/Schedule Module**
   - Roster creation
   - Schedule management
   - Shift assignment

7. **Leave Management Module**
   - Leave applications
   - Leave balance
   - Leave approval workflow

8. **Sales Module**
   - Daily sales entry
   - Sales orders
   - Sales reports

9. **Payroll Module**
   - Payroll preview
   - Payroll processing

10. **Performance Module**
    - Performance reviews
    - Performance tracking

11. **Documents Module**
    - Document upload
    - Document management

### DATABASE CONNECTIONS:

- **auth-service** → MongoDB (User credentials, tokens)
- **hr-service** → MongoDB (Employees, Stores, Departments, Rosters, Leaves, Payroll, Performance)
- **attendance-service** → MongoDB (Attendance records)
- **sales-service** → MongoDB (Sales orders, Products)
- **document-service** → MongoDB (Document metadata) + AWS S3 (File storage)

### INTER-SERVICE COMMUNICATION:

1. **hr-service → attendance-service**
   - Purpose: Fetch attendance statistics for dashboard
   - Method: HTTP GET /api/attendance/stats
   - Authentication: Admin token passed in Authorization header

2. **hr-service → sales-service**
   - Purpose: Fetch sales data for dashboard
   - Method: HTTP GET /api/sales/dashboard
   - Authentication: Service-to-service call

3. **attendance-service → hr-service**
   - Purpose: Fetch employee data, roster data, store information
   - Method: HTTP GET /api/hr/employees, /api/hr/roster
   - Authentication: Admin token for internal calls

4. **sales-service → hr-service**
   - Purpose: Validate employee and store for sales entries
   - Method: HTTP GET /api/hr/employees, /api/hr/stores

### REQUEST FLOW EXAMPLES:

**Clock-in Flow:**
1. Frontend (app.etelios.com) → POST /api/attendance/check-in
2. Request goes through Kubernetes Ingress (api.etelios.com)
3. Ingress routes to attendance-service
4. attendance-service authenticates user via JWT token
5. attendance-service calls hr-service to fetch employee data and roster
6. attendance-service validates location against store geofence
7. attendance-service saves attendance record to MongoDB
8. Response sent back to frontend

**Dashboard Flow:**
1. Frontend → GET /api/hr/dashboard
2. Ingress routes to hr-service
3. hr-service fetches data from its own MongoDB
4. hr-service calls attendance-service for attendance stats
5. hr-service calls sales-service for sales data
6. hr-service aggregates all data
7. Response sent to frontend

**Employee Creation Flow:**
1. Frontend → POST /api/hr/employees
2. Ingress routes to hr-service
3. hr-service validates request and tenant
4. hr-service creates employee in MongoDB
5. hr-service may call auth-service to create user credentials
6. Response sent to frontend

### KUBERNETES INGRESS ROUTING:

All requests to api.etelios.com are routed through ALB Ingress Controller:
- /api/auth/* → auth-service
- /api/hr/* → hr-service
- /api/attendance/* → attendance-service
- /api/sales/* → sales-service
- /api/documents/* → document-service
- /api/inventory/* → inventory-service
- /api/crm/* → crm-service
- /api/analytics/* → analytics-service
- /api/tasks → hr-service
- /api/payroll/* → hr-service

### AUTHENTICATION FLOW:

1. User logs in via Frontend
2. Frontend → POST /api/auth/login (auth-service)
3. auth-service validates credentials
4. auth-service generates JWT token
5. Token returned to frontend
6. Frontend stores token and includes in all subsequent requests
7. Each service validates token using shared JWT_SECRET

### TENANT ISOLATION:

- Multi-tenant system
- Each tenant has isolated data (lenstrack, default, etc.)
- Tenant ID passed via x-tenant-id header
- All database queries filtered by tenantId

### EXTERNAL SERVICES:

- **AWS S3**: Document and selfie image storage
- **AWS Certificate Manager**: SSL certificates
- **AWS Application Load Balancer**: Traffic routing
- **MongoDB DocumentDB**: Primary database

---

## TASK:

Create a comprehensive flowchart/mermaid diagram that shows:

1. **Frontend modules** and their connections to backend APIs
2. **All microservices** and their internal components
3. **Database connections** for each service
4. **Inter-service communication** (with arrows showing direction and purpose)
5. **Request flow** for key operations (clock-in, dashboard, employee creation)
6. **Kubernetes Ingress** routing layer
7. **Authentication flow**
8. **External services** (AWS S3, DocumentDB, ALB)

Use Mermaid syntax for the diagram. Include:
- Different colors for frontend, backend services, databases, external services
- Clear labels for connections
- Request/response flow indicators
- Authentication tokens flow
- Data flow directions

Make it detailed enough to understand the complete system architecture at a glance.
```

---

## USAGE:

1. Copy the prompt above (everything between the triple backticks)
2. Paste it into Claude (Claude.ai or Claude API)
3. Claude will generate a detailed Mermaid flowchart
4. You can render the Mermaid diagram using:
   - GitHub (paste in .md file)
   - Mermaid Live Editor (https://mermaid.live)
   - VS Code with Mermaid extension
   - Any Mermaid renderer

## ADDITIONAL NOTES:

- The system uses **tenant isolation** - all data is filtered by tenantId
- Services communicate via **HTTP REST APIs** within Kubernetes cluster
- **JWT tokens** are used for authentication across all services
- **Kubernetes Ingress** handles external routing and SSL termination
- **MongoDB** is the primary database for all services
- **AWS S3** is used for file storage (documents, selfies)

---

## EXPECTED OUTPUT:

Claude should generate a Mermaid diagram showing:
- All microservices as boxes
- Frontend modules
- Database connections
- Inter-service API calls (with arrows)
- Request flow paths
- Authentication layer
- External services integration

This will provide a complete visual representation of the system architecture.
