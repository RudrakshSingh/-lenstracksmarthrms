# JTS (Jobs Tracking System) - Implementation Plan
## Unified Task, Timer, Attendance & Performance System

**Date:** 2025-01-21  
**Status:** Implementation Guide

---

## 📋 Overview

This document outlines how to implement the unified JTS system in the existing Etelios codebase, integrating with:
- Existing `service-management` service (tasks)
- Existing `attendance-service` (attendance)
- Existing `hr-service` (roster, employees)
- New timer functionality
- Performance metrics

---

## 🏗️ Architecture Integration

### Current State:
- ✅ `service-management` service exists with basic Task model
- ✅ `attendance-service` exists with clock-in/out
- ✅ `hr-service` exists with roster/employee management
- ❌ Timer functionality missing
- ❌ Task-Timer-Attendance integration missing
- ❌ Daily Score system missing

### Target State:
```
service-management (JTS Service)
├── Enhanced Task Model
├── Timer Model & Service
├── Daily Score Model
├── Task-Timer Integration
├── Attendance Validation
├── Roster Integration
└── Performance Metrics
```

---

## 📦 Implementation Steps

### Phase 1: Enhance Task Model (1-2 days)

**File:** `microservices/service-management/src/models/Task.model.js`

**Changes Needed:**
1. Extend existing Task model with JTS fields
2. Add timer integration fields
3. Add attendance/shift validation fields
4. Add environment-specific fields

---

### Phase 2: Create Timer Model & Service (2-3 days)

**New Files:**
- `microservices/service-management/src/models/Timer.model.js`
- `microservices/service-management/src/services/timer.service.js`
- `microservices/service-management/src/controllers/timerController.js`
- `microservices/service-management/src/routes/timer.routes.js`

---

### Phase 3: Create Daily Score System (1-2 days)

**New Files:**
- `microservices/service-management/src/models/DailyScore.model.js`
- `microservices/service-management/src/services/dailyScore.service.js`

---

### Phase 4: Integration Layer (2-3 days)

**New Files:**
- `microservices/service-management/src/services/jtsIntegration.service.js`
- Integration with attendance-service
- Integration with hr-service (roster)
- Integration with payroll-service

---

### Phase 5: Controllers & Routes (1-2 days)

**Update Files:**
- `microservices/service-management/src/controllers/jtsController.js`
- `microservices/service-management/src/routes/jts.routes.js`

---

## 🔧 Detailed Implementation

### Step 1: Enhanced Task Model

**File:** `microservices/service-management/src/models/Task.model.js`

**Enhancements:**
- Add timer fields
- Add attendance validation
- Add shift/roster linkage
- Add environment-specific fields
- Add SLA fields

---

### Step 2: Timer Model

**New File:** `microservices/service-management/src/models/Timer.model.js`

**Features:**
- Start/stop/pause functionality
- Task linkage
- Attendance validation
- Auto-stop on checkout
- Break tracking

---

### Step 3: Daily Score Model

**New File:** `microservices/service-management/src/models/DailyScore.model.js`

**Features:**
- Task completion rate
- Timeliness score
- Productivity utilization
- SLA compliance
- Quality score

---

### Step 4: JTS Service

**New File:** `microservices/service-management/src/services/jts.service.js`

**Features:**
- Task assignment engine
- Timer management
- Daily planner generation
- Performance metrics calculation
- Integration with other services

---

## 🔗 Service Integration

### Integration with Attendance Service

**Method:** HTTP calls or Kafka events

**Endpoints to use:**
- `GET /api/attendance/current` - Get current attendance status
- `POST /api/attendance/validate` - Validate attendance before timer start

---

### Integration with HR Service

**Endpoints to use:**
- `GET /api/hr/roster/:employeeId` - Get current roster/shift
- `GET /api/hr/employees/:id` - Get employee details

---

### Integration with Payroll Service

**Events to publish:**
- Task completion events
- Daily score events
- Timer duration events

---

## 📊 Database Schema

### Enhanced Task Schema

```javascript
{
  // Existing fields
  task_id, type, customer_id, due_at, reason, assigned_to, status, priority,
  
  // JTS New Fields
  shift_id: ObjectId,           // Link to roster/shift
  attendance_id: ObjectId,      // Link to attendance record
  store_id: ObjectId,           // Physical location
  department: String,           // Department
  job_category: String,         // sales, hr, lab, support, admin
  environment: String,          // retail, office, warehouse, lab
  
  // Timer Integration
  timer_id: ObjectId,           // Active timer
  estimated_minutes: Number,    // Estimated duration
  actual_minutes: Number,       // Actual duration from timer
  
  // SLA
  sla_deadline: Date,
  sla_status: String,           // on_time, at_risk, breached
  
  // Status Lifecycle
  status_history: [{
    status: String,
    changed_at: Date,
    changed_by: ObjectId,
    notes: String
  }],
  
  // Performance
  completion_score: Number,
  quality_score: Number,
  timeliness_score: Number
}
```

### Timer Schema

```javascript
{
  timer_id: String,
  task_id: ObjectId,
  employee_id: ObjectId,
  attendance_id: ObjectId,      // Must have active attendance
  shift_id: ObjectId,           // Must match current shift
  
  // Timer States
  state: String,                // running, paused, break, stopped
  start_time: Date,
  stop_time: Date,
  pause_duration: Number,       // Total paused time in minutes
  break_duration: Number,       // Total break time in minutes
  total_duration: Number,       // Active work time in minutes
  
  // Auto-stop
  auto_stopped: Boolean,
  auto_stop_reason: String,     // checkout, shift_end, etc.
  
  // Validation
  attendance_validated: Boolean,
  shift_validated: Boolean,
  
  created_at: Date,
  updated_at: Date
}
```

### Daily Score Schema

```javascript
{
  score_id: String,
  employee_id: ObjectId,
  date: Date,
  shift_id: ObjectId,
  
  // Metrics
  task_completion_rate: Number,    // Completed / Assigned
  timeliness_score: Number,        // On-time completion %
  productivity_utilization: Number, // Active timer / Total shift
  sla_compliance: Number,          // SLA met / Total SLA tasks
  quality_score: Number,           // Average quality from feedback
  
  // Overall Score
  daily_score: Number,             // Weighted average
  
  // Breakdown
  tasks_assigned: Number,
  tasks_completed: Number,
  tasks_on_time: Number,
  tasks_late: Number,
  total_timer_minutes: Number,
  total_shift_minutes: Number,
  
  // Reliability
  reliability_score: Number,       // Based on attendance + completion
  
  created_at: Date
}
```

---

## 🚀 API Endpoints

### Task Endpoints

```
POST   /api/jts/tasks                    - Create task
GET    /api/jts/tasks                    - List tasks (with filters)
GET    /api/jts/tasks/:id                - Get task details
PUT    /api/jts/tasks/:id                - Update task
DELETE /api/jts/tasks/:id                - Delete task
POST   /api/jts/tasks/:id/assign         - Assign task
POST   /api/jts/tasks/:id/accept         - Accept task
POST   /api/jts/tasks/:id/start          - Start task (with timer)
POST   /api/jts/tasks/:id/complete       - Complete task
POST   /api/jts/tasks/:id/reject         - Reject task
POST   /api/jts/tasks/auto-assign        - Auto-assign from roster
```

### Timer Endpoints

```
POST   /api/jts/timer/start              - Start timer (validates attendance/shift)
POST   /api/jts/timer/stop               - Stop timer
POST   /api/jts/timer/pause              - Pause timer
POST   /api/jts/timer/resume             - Resume timer
POST   /api/jts/timer/break              - Start break
POST   /api/jts/timer/break/end          - End break
GET    /api/jts/timer/current            - Get current active timer
GET    /api/jts/timer/history            - Get timer history
```

### Daily Planner Endpoints

```
GET    /api/jts/planner/daily            - Get daily task planner
GET    /api/jts/planner/daily/:date      - Get planner for specific date
POST   /api/jts/planner/generate         - Generate daily planner
```

### Performance Endpoints

```
GET    /api/jts/performance/daily        - Get daily performance score
GET    /api/jts/performance/metrics      - Get performance metrics
GET    /api/jts/performance/sla          - Get SLA compliance
GET    /api/jts/performance/productivity - Get productivity metrics
```

---

## 🔄 Workflows Implementation

### Workflow 1: Roster → Task Assignment → Timer

**Implementation:**
1. Create scheduled job to generate tasks from roster
2. Validate attendance before timer start
3. Validate shift before timer start
4. Force task selection if multiple pending

**Code Location:**
- `microservices/service-management/src/jobs/rosterTaskGenerator.js`

---

### Workflow 2: Attendance → Timer → Task → Payroll

**Implementation:**
1. Timer validates attendance on start
2. Timer tracks duration
3. Task completion updates daily score
4. Daily score feeds into payroll

**Code Location:**
- `microservices/service-management/src/services/jtsIntegration.service.js`

---

## 📝 Next Steps

1. **Review this plan** - Confirm approach
2. **Start with Phase 1** - Enhance Task model
3. **Implement Timer** - Core timer functionality
4. **Add Integration** - Connect with attendance/roster
5. **Test Workflows** - Verify end-to-end flows

---

**Ready to implement?** Let me know and I'll start creating the actual code files!

