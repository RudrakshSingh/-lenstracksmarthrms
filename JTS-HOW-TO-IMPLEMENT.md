# JTS (Jobs Tracking System) - How to Implement
## Step-by-Step Implementation Guide

**Date:** 2025-01-21  
**Approach:** Conceptual guide on how to achieve JTS in existing codebase

---

## 🎯 Overview

This document explains **HOW** to implement JTS by leveraging existing services and adding new components. It's a roadmap, not actual code.

---

## 📊 Current State Analysis

### What Already Exists:
1. ✅ **Task Model** (`service-management/src/models/Task.model.js`)
   - Basic task structure
   - Status, priority, assignment
   - **Missing:** Timer integration, attendance validation, shift linkage

2. ✅ **Attendance Service** (`attendance-service/`)
   - Clock-in/out functionality
   - GPS validation
   - Selfie verification
   - **Can be used for:** Validating attendance before timer start

3. ✅ **HR Service** (`hr-service/`)
   - Employee management
   - Store management
   - **Can be used for:** Roster/shift data, employee details

4. ✅ **Service Management** (`service-management/`)
   - Task management structure
   - SLA management
   - **Can be extended for:** JTS core functionality

### What's Missing:
1. ❌ Timer functionality
2. ❌ Task-Timer integration
3. ❌ Daily Score calculation
4. ❌ Roster-to-Task auto-assignment
5. ❌ Performance metrics aggregation

---

## 🔧 Implementation Strategy

### **Approach 1: Extend Existing Service-Management Service** (Recommended)

**Why:** 
- Task model already exists
- Service structure is in place
- Can add timer/score models alongside

**How:**
1. **Enhance Task Model** - Add JTS-specific fields without breaking existing functionality
2. **Add Timer Model** - New model in same service
3. **Add Daily Score Model** - New model in same service
4. **Create Integration Service** - Handles communication with attendance/hr services
5. **Add Controllers/Routes** - New endpoints for timer and daily planner

**Pros:**
- Single service to manage
- Easier deployment
- Shared database connection
- Less service-to-service communication

**Cons:**
- Service becomes larger
- More responsibilities in one place

---

### **Approach 2: Create New JTS Service** (Alternative)

**Why:**
- Separation of concerns
- Can scale independently
- Cleaner architecture

**How:**
1. Create new `jts-service` microservice
2. Copy/enhance Task model
3. Add Timer and Daily Score models
4. Communicate with attendance-service and hr-service via HTTP/Kafka

**Pros:**
- Clear separation
- Independent scaling
- Easier to test

**Cons:**
- More services to manage
- More inter-service communication
- More deployment complexity

---

## 📋 Step-by-Step Implementation Plan

### **Phase 1: Enhance Task Model** (1-2 days)

**Location:** `microservices/service-management/src/models/Task.model.js`

**What to do:**
1. **Add new fields** to existing schema (non-breaking):
   - `shift_id` - Link to roster/shift
   - `attendance_id` - Link to attendance record
   - `store_id` - Physical location
   - `department` - Department name
   - `job_category` - sales, hr, lab, support, admin
   - `environment` - retail, office, warehouse, lab
   - `timer_id` - Reference to active timer
   - `estimated_minutes` - Estimated duration
   - `actual_minutes` - Actual duration from timer
   - `sla_deadline` - SLA deadline
   - `sla_status` - on_time, at_risk, breached

2. **Extend status enum** to include JTS statuses:
   - Add: `ASSIGNED`, `ACCEPTED`, `IN_PROGRESS`, `PAUSED`, `ON_HOLD`, `PENDING_REVIEW`, `COMPLETED`, `REJECTED`

3. **Add status history tracking**:
   - Array of status changes with timestamps

4. **Add performance fields**:
   - `completion_score`, `quality_score`, `timeliness_score`

**How to achieve:**
- Use Mongoose schema extension (add fields to existing schema)
- Make new fields optional initially (backward compatible)
- Use migration script to populate existing tasks with defaults

---

### **Phase 2: Create Timer Model** (2-3 days)

**Location:** `microservices/service-management/src/models/Timer.model.js` (new file)

**What to create:**
1. **Timer Schema** with:
   - `timer_id` - Unique identifier
   - `task_id` - Link to task
   - `employee_id` - Employee running timer
   - `attendance_id` - Must have active attendance
   - `shift_id` - Must match current shift
   - `state` - running, paused, break, stopped
   - `start_time`, `stop_time`
   - `pause_duration`, `break_duration`
   - `total_duration` - Active work time
   - `auto_stopped` - Boolean flag
   - `auto_stop_reason` - Why it auto-stopped
   - Validation flags: `attendance_validated`, `shift_validated`

2. **Timer Methods**:
   - `start()` - Start timer (validates attendance/shift first)
   - `stop()` - Stop timer
   - `pause()` - Pause timer
   - `resume()` - Resume timer
   - `startBreak()` - Start break
   - `endBreak()` - End break
   - `calculateDuration()` - Calculate active time

**How to achieve:**
- Create new Mongoose model
- Add validation methods that call attendance-service API
- Add shift validation that calls hr-service API
- Use pre-save hooks for auto-calculations

---

### **Phase 3: Create Timer Service** (2-3 days)

**Location:** `microservices/service-management/src/services/timer.service.js` (new file)

**What to implement:**
1. **Start Timer Logic**:
   - Check if employee has active attendance (call attendance-service)
   - Check if employee has valid shift (call hr-service)
   - Check if task is assigned to employee
   - Check if no other timer is running
   - Create timer record
   - Update task status to IN_PROGRESS

2. **Stop Timer Logic**:
   - Calculate total duration
   - Update task with actual_minutes
   - Update timer state
   - Trigger daily score recalculation

3. **Pause/Resume Logic**:
   - Track pause start/end times
   - Calculate pause duration
   - Exclude pause time from total duration

4. **Auto-Stop Logic**:
   - Listen for attendance clock-out events (via Kafka)
   - Auto-stop all running timers
   - Mark as auto_stopped

**How to achieve:**
- Use HTTP client (axios) to call attendance-service and hr-service
- Use Kafka consumer to listen for attendance events
- Use database transactions for atomic operations
- Add error handling for service unavailability

---

### **Phase 4: Create Daily Score Model** (1-2 days)

**Location:** `microservices/service-management/src/models/DailyScore.model.js` (new file)

**What to create:**
1. **Daily Score Schema**:
   - `score_id` - Unique identifier
   - `employee_id` - Employee
   - `date` - Date of score
   - `shift_id` - Shift reference
   - Metrics: `task_completion_rate`, `timeliness_score`, `productivity_utilization`, `sla_compliance`, `quality_score`
   - `daily_score` - Weighted average
   - Breakdown: `tasks_assigned`, `tasks_completed`, `tasks_on_time`, `tasks_late`
   - `total_timer_minutes`, `total_shift_minutes`
   - `reliability_score`

2. **Calculation Methods**:
   - `calculateTaskCompletionRate()` - Completed / Assigned
   - `calculateTimelinessScore()` - On-time / Total
   - `calculateProductivityUtilization()` - Timer minutes / Shift minutes
   - `calculateSLACompliance()` - SLA met / Total SLA tasks
   - `calculateOverallScore()` - Weighted average

**How to achieve:**
- Create Mongoose model
- Add static methods for calculations
- Use aggregation pipelines for efficient queries
- Schedule daily job to calculate scores

---

### **Phase 5: Create Daily Score Service** (2-3 days)

**Location:** `microservices/service-management/src/services/dailyScore.service.js` (new file)

**What to implement:**
1. **Calculate Daily Score**:
   - Get all tasks for employee on date
   - Get all timers for employee on date
   - Get shift duration from hr-service
   - Calculate all metrics
   - Store daily score

2. **Auto-Calculation**:
   - Scheduled job runs at end of shift
   - Calculates score for all employees
   - Publishes score events to Kafka (for payroll integration)

3. **Performance Metrics**:
   - Task Completion Rate (TCR)
   - Timeliness Score
   - Productivity Utilization
   - SLA Compliance
   - Quality Score (from manager feedback)

**How to achieve:**
- Use cron job (node-cron) for scheduled calculations
- Use MongoDB aggregation for efficient data processing
- Publish events to Kafka for other services
- Cache results for quick retrieval

---

### **Phase 6: Create JTS Integration Service** (2-3 days)

**Location:** `microservices/service-management/src/services/jtsIntegration.service.js` (new file)

**What to implement:**
1. **Attendance Integration**:
   - Method to validate attendance before timer start
   - Method to get current attendance status
   - Listen for clock-out events (auto-stop timers)

2. **Roster Integration**:
   - Method to get current shift for employee
   - Method to validate shift before timer start
   - Method to get daily roster tasks

3. **Task Auto-Assignment**:
   - Method to generate tasks from roster
   - Method to assign tasks based on workload
   - Method to distribute tasks evenly

4. **Payroll Integration**:
   - Publish daily score events
   - Publish timer duration events
   - Publish task completion events

**How to achieve:**
- Use HTTP client for synchronous calls
- Use Kafka for asynchronous events
- Use service discovery or environment variables for service URLs
- Add retry logic and circuit breakers

---

### **Phase 7: Create Daily Planner Service** (2-3 days)

**Location:** `microservices/service-management/src/services/dailyPlanner.service.js` (new file)

**What to implement:**
1. **Generate Daily Planner**:
   - Get employee's roster/shift
   - Get pending tasks from previous days
   - Get auto-assigned tasks from roster
   - Get department workload
   - Prioritize and organize tasks
   - Return structured daily plan

2. **Auto-Task Assignment from Roster**:
   - Parse roster data
   - Generate tasks based on shift type
   - Assign to employees
   - Set priorities and deadlines

3. **Workload Distribution**:
   - Calculate current workload per employee
   - Distribute new tasks evenly
   - Consider employee capacity
   - Consider task complexity

**How to achieve:**
- Query roster from hr-service
- Query existing tasks from database
- Use algorithm to prioritize (priority + deadline + workload)
- Store daily planner in cache for quick access

---

### **Phase 8: Create Controllers** (1-2 days)

**Location:** `microservices/service-management/src/controllers/jtsController.js` (new file)

**What to create:**
1. **Task Controllers**:
   - `createTask()` - Create new task
   - `getTasks()` - List tasks with filters
   - `getTaskById()` - Get task details
   - `updateTask()` - Update task
   - `assignTask()` - Assign task to employee
   - `acceptTask()` - Employee accepts task
   - `startTask()` - Start task (with timer)
   - `completeTask()` - Complete task
   - `rejectTask()` - Reject task with notes

2. **Timer Controllers**:
   - `startTimer()` - Start timer (validates attendance/shift)
   - `stopTimer()` - Stop timer
   - `pauseTimer()` - Pause timer
   - `resumeTimer()` - Resume timer
   - `startBreak()` - Start break
   - `endBreak()` - End break
   - `getCurrentTimer()` - Get active timer
   - `getTimerHistory()` - Get timer history

3. **Daily Planner Controllers**:
   - `getDailyPlanner()` - Get today's planner
   - `getPlannerByDate()` - Get planner for specific date
   - `generatePlanner()` - Manually generate planner

4. **Performance Controllers**:
   - `getDailyScore()` - Get daily performance score
   - `getPerformanceMetrics()` - Get performance metrics
   - `getSLACompliance()` - Get SLA compliance
   - `getProductivityMetrics()` - Get productivity metrics

**How to achieve:**
- Use existing controller pattern
- Call service methods
- Use standardized response format (from response.util.js)
- Add proper error handling
- Add validation middleware

---

### **Phase 9: Create Routes** (1 day)

**Location:** `microservices/service-management/src/routes/jts.routes.js` (new file)

**What to create:**
1. **Task Routes**:
   - `POST /api/jts/tasks` - Create task
   - `GET /api/jts/tasks` - List tasks
   - `GET /api/jts/tasks/:id` - Get task
   - `PUT /api/jts/tasks/:id` - Update task
   - `DELETE /api/jts/tasks/:id` - Delete task
   - `POST /api/jts/tasks/:id/assign` - Assign task
   - `POST /api/jts/tasks/:id/accept` - Accept task
   - `POST /api/jts/tasks/:id/start` - Start task
   - `POST /api/jts/tasks/:id/complete` - Complete task
   - `POST /api/jts/tasks/:id/reject` - Reject task

2. **Timer Routes**:
   - `POST /api/jts/timer/start` - Start timer
   - `POST /api/jts/timer/stop` - Stop timer
   - `POST /api/jts/timer/pause` - Pause timer
   - `POST /api/jts/timer/resume` - Resume timer
   - `POST /api/jts/timer/break` - Start break
   - `POST /api/jts/timer/break/end` - End break
   - `GET /api/jts/timer/current` - Get current timer
   - `GET /api/jts/timer/history` - Get timer history

3. **Daily Planner Routes**:
   - `GET /api/jts/planner/daily` - Get daily planner
   - `GET /api/jts/planner/daily/:date` - Get planner by date
   - `POST /api/jts/planner/generate` - Generate planner

4. **Performance Routes**:
   - `GET /api/jts/performance/daily` - Get daily score
   - `GET /api/jts/performance/metrics` - Get metrics
   - `GET /api/jts/performance/sla` - Get SLA compliance
   - `GET /api/jts/performance/productivity` - Get productivity

**How to achieve:**
- Use Express router
- Add authentication middleware
- Add role-based access control
- Add request validation
- Use async handler wrapper

---

### **Phase 10: Integration with Existing Services** (3-4 days)

**What to integrate:**

1. **With Attendance Service**:
   - **HTTP Calls:**
     - `GET /api/attendance/current/:employeeId` - Check if clocked in
     - `POST /api/attendance/validate` - Validate attendance
   - **Kafka Events:**
     - Subscribe to `attendance.clock-out` events
     - Auto-stop timers on clock-out

2. **With HR Service**:
   - **HTTP Calls:**
     - `GET /api/hr/roster/:employeeId` - Get current shift
     - `GET /api/hr/employees/:id` - Get employee details
     - `GET /api/hr/stores/:id` - Get store details
   - **Kafka Events:**
     - Subscribe to `roster.updated` events
     - Regenerate daily planner on roster change

3. **With Payroll Service**:
   - **Kafka Events:**
     - Publish `jts.daily-score.calculated` events
     - Publish `jts.timer.completed` events
     - Publish `jts.task.completed` events

**How to achieve:**
- Use axios for HTTP calls
- Use Kafka service (from shared/services/kafka.service.js) for events
- Add service discovery or environment variables for URLs
- Add retry logic and error handling
- Use circuit breakers for resilience

---

### **Phase 11: Scheduled Jobs** (1-2 days)

**What to create:**

1. **Daily Planner Generator** (Runs at start of day):
   - Generate tasks from roster
   - Assign tasks to employees
   - Create daily planner

2. **Daily Score Calculator** (Runs at end of shift):
   - Calculate scores for all employees
   - Store daily scores
   - Publish events

3. **SLA Monitor** (Runs every hour):
   - Check SLA deadlines
   - Update SLA status
   - Trigger alerts for at-risk tasks

4. **Auto-Stop Timer Check** (Runs every 5 minutes):
   - Check for timers running past shift end
   - Auto-stop timers
   - Log violations

**How to achieve:**
- Use node-cron for scheduling
- Create job files in `src/jobs/` directory
- Use BullMQ for queue-based jobs (if needed)
- Add logging and error handling

---

### **Phase 12: API Gateway Integration** (1 day)

**What to do:**
1. **Add JTS routes to API Gateway**:
   - Update `src/server.js` in API Gateway
   - Add `/api/jts/*` proxy to service-management service
   - Add service to service registry

**How to achieve:**
- Add service configuration to API Gateway
- Update service registry
- Test routing

---

## 🔄 Workflow Implementation

### **Workflow 1: Roster → Task Assignment → Timer**

**How it works:**
1. **Scheduled Job** (runs at start of day):
   - Queries hr-service for today's roster
   - Generates tasks based on roster assignments
   - Assigns tasks to employees
   - Stores in database

2. **Employee Checks In** (attendance-service):
   - Employee clocks in
   - Attendance record created
   - Event published: `attendance.clock-in`

3. **JTS Service Listens** (Kafka consumer):
   - Receives clock-in event
   - Generates/updates daily planner for employee
   - Makes planner available via API

4. **Employee Starts Task**:
   - Employee selects task from daily planner
   - Calls `POST /api/jts/tasks/:id/start`
   - Service validates:
     - Attendance is active (HTTP call to attendance-service)
     - Shift is valid (HTTP call to hr-service)
     - Task is assigned to employee
   - Creates timer record
   - Updates task status to IN_PROGRESS

**How to achieve:**
- Use Kafka consumer in JTS service
- Use HTTP calls for validation
- Use database transactions for atomicity

---

### **Workflow 2: Attendance → Timer → Task → Payroll**

**How it works:**
1. **Timer Running**:
   - Timer tracks duration
   - Updates every minute (or on stop)

2. **Employee Completes Task**:
   - Calls `POST /api/jts/tasks/:id/complete`
   - Service stops timer
   - Calculates actual duration
   - Updates task with completion data
   - Triggers daily score recalculation

3. **Daily Score Calculation**:
   - Scheduled job calculates score at end of shift
   - Aggregates all tasks and timers
   - Calculates metrics
   - Stores daily score

4. **Payroll Integration**:
   - Daily score event published to Kafka
   - Payroll service consumes event
   - Uses score for performance-based payroll

**How to achieve:**
- Use Kafka producer for events
- Use scheduled jobs for calculations
- Use MongoDB aggregation for efficient queries

---

## 🎯 Key Implementation Techniques

### **1. Service Communication**

**HTTP Calls:**
- Use axios with retry logic
- Use environment variables for service URLs
- Add timeout and error handling
- Cache responses when appropriate

**Kafka Events:**
- Use existing Kafka service
- Publish events for async operations
- Subscribe to events for real-time updates
- Use event schemas for type safety

### **2. Data Validation**

**Before Timer Start:**
- Check attendance via HTTP call
- Check shift via HTTP call
- Validate task assignment
- Check no other timer running

**How to handle failures:**
- Return clear error messages
- Log validation failures
- Allow override for managers (optional)

### **3. Performance Optimization**

**Database:**
- Add indexes on frequently queried fields
- Use aggregation pipelines for calculations
- Cache daily planners
- Use pagination for task lists

**Caching:**
- Cache daily planners (Redis)
- Cache employee shift data
- Cache performance metrics
- Invalidate on updates

### **4. Error Handling**

**Service Unavailability:**
- Use circuit breakers
- Return graceful errors
- Queue operations for retry
- Log all failures

**Data Consistency:**
- Use database transactions
- Use idempotent operations
- Add validation at multiple levels

---

## 📊 Database Design Considerations

### **Indexes to Add:**
- `tasks.assigned_to + tasks.status` - For employee task queries
- `tasks.shift_id + tasks.date` - For shift-based queries
- `timers.employee_id + timers.state` - For active timer queries
- `daily_scores.employee_id + daily_scores.date` - For score queries

### **Data Retention:**
- Keep tasks for 1 year
- Keep timers for 6 months
- Keep daily scores permanently (for payroll)

### **Partitioning:**
- Consider date-based partitioning for timers
- Consider employee-based sharding for large scale

---

## 🚀 Deployment Strategy

### **Phase 1: Development**
- Implement in service-management service
- Test with mock attendance/hr services
- Use local database

### **Phase 2: Integration Testing**
- Connect to real attendance-service
- Connect to real hr-service
- Test end-to-end workflows
- Load testing

### **Phase 3: Staging**
- Deploy to staging environment
- Test with real data
- Performance testing
- User acceptance testing

### **Phase 4: Production**
- Gradual rollout
- Monitor performance
- Monitor errors
- Collect feedback

---

## 📝 Summary

**To implement JTS, you need to:**

1. **Extend existing Task model** - Add JTS fields (non-breaking)
2. **Create Timer model** - New model for time tracking
3. **Create Daily Score model** - New model for performance
4. **Create services** - Timer, Daily Score, Integration, Daily Planner
5. **Create controllers** - Task, Timer, Planner, Performance
6. **Create routes** - All JTS endpoints
7. **Integrate with existing services** - Attendance, HR, Payroll
8. **Add scheduled jobs** - Planner generation, score calculation
9. **Update API Gateway** - Add JTS routes
10. **Test and deploy** - End-to-end testing

**Key Technologies:**
- MongoDB (existing)
- Express.js (existing)
- Kafka (existing)
- HTTP clients (axios)
- Cron jobs (node-cron)
- Redis (for caching, if available)

**Estimated Time:** 15-20 days for full implementation

---

**This is the conceptual approach. The actual code implementation would follow these patterns and use the existing codebase structure.**

