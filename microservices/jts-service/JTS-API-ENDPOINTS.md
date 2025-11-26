# JTS Service - Complete API Endpoints Documentation

## Base URL
- **Local:** `http://localhost:3018`
- **Production:** `https://your-jts-service-url.com`
- **API Version:** `/api/v1`

## Authentication

All endpoints (except health checks) require JWT authentication via `Authorization: Bearer <token>` header.

---

## Health & Status Endpoints

### GET `/health`
**Description:** Basic health check  
**Auth:** Not required  
**Response:**
```json
{
  "status": "healthy",
  "service": "jts-service",
  "timestamp": "2025-11-25T10:00:00.000Z"
}
```

### GET `/api/v1/health`
**Description:** API health check  
**Auth:** Not required  
**Response:** Same as `/health`

---

## Task Management APIs

### POST `/api/v1/tasks`
**Description:** Create a manager task  
**Auth:** Required (Manager roles: MANAGER, STORE_MANAGER, CLUSTER_MANAGER, COUNTRY_OPS, TENANT_ADMIN, HOD)  
**Request Body:**
```json
{
  "title": "Complete quarterly report",
  "description": "Finish the Q4 quarterly report",
  "priority": "HIGH",
  "type_id": "task-type-id",
  "scope_org_node_id": "org-node-id",
  "assigned_to_employee_id": "employee-id",
  "sla_minutes_override": 120,
  "requires_approval": false,
  "metadata": {}
}
```
**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "task-id",
    "title": "Complete quarterly report",
    "status": "ASSIGNED",
    "priority": "HIGH",
    "sla_minutes": 120,
    "due_at": "2025-11-25T12:00:00.000Z",
    "created_at": "2025-11-25T10:00:00.000Z"
  },
  "message": "Task created successfully"
}
```

### GET `/api/v1/tasks`
**Description:** Get tasks with filters and pagination  
**Auth:** Required  
**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `status` (string/array, optional): Filter by status
- `priority` (string, optional): Filter by priority
- `type_id` (string, optional): Filter by task type
- `assigned_to_employee_id` (string, optional): Filter by assignee
- `scope_org_node_id` (string, optional): Filter by org node
- `date_from` (string, optional): Filter from date (ISO format)
- `date_to` (string, optional): Filter to date (ISO format)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "task-id",
      "title": "Complete quarterly report",
      "status": "ASSIGNED",
      "priority": "HIGH",
      "due_at": "2025-11-25T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  },
  "message": "Tasks retrieved successfully"
}
```

### GET `/api/v1/tasks/:id`
**Description:** Get task by ID  
**Auth:** Required  
**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "task-id",
    "title": "Complete quarterly report",
    "description": "Finish the Q4 quarterly report",
    "status": "ASSIGNED",
    "priority": "HIGH",
    "assigned_to_employee_id": {
      "_id": "employee-id",
      "name": "John Doe",
      "email": "john@company.com"
    },
    "created_by_employee_id": {
      "_id": "manager-id",
      "name": "Jane Manager"
    },
    "due_at": "2025-11-25T12:00:00.000Z"
  },
  "message": "Task retrieved successfully"
}
```

### PATCH `/api/v1/tasks/:id/status`
**Description:** Change task status  
**Auth:** Required  
**Request Body:**
```json
{
  "status": "IN_PROGRESS",
  "reason": "Starting work on the task"
}
```
**Valid Status Transitions:**
- DRAFT → PENDING_APPROVAL, ASSIGNED, REJECTED
- PENDING_APPROVAL → ASSIGNED, REJECTED
- ASSIGNED → ACCEPTED, REJECTED
- ACCEPTED → IN_PROGRESS, REJECTED
- IN_PROGRESS → ON_HOLD, PENDING_REVIEW, COMPLETED
- ON_HOLD → IN_PROGRESS, REJECTED
- PENDING_REVIEW → COMPLETED, IN_PROGRESS, REJECTED

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "task-id",
    "status": "IN_PROGRESS",
    "updated_at": "2025-11-25T10:30:00.000Z"
  },
  "message": "Task status updated successfully"
}
```

---

## Self-Task APIs

### POST `/api/v1/tasks/self`
**Description:** Create a self-task (employee creates task for themselves)  
**Auth:** Required (Any authenticated user)  
**Request Body:**
```json
{
  "title": "Learn new technology",
  "description": "Complete online course on React",
  "priority": "MEDIUM",
  "type_id": "task-type-id",
  "scope_org_node_id": "org-node-id",
  "sla_minutes_override": 480
}
```
**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "task-id",
    "title": "Learn new technology",
    "status": "PENDING_APPROVAL",
    "source": "SELF",
    "requires_approval": true
  },
  "message": "Self-task created successfully"
}
```

---

## Timer Management APIs

### POST `/api/v1/tasks/:id/timer/start`
**Description:** Start timer for a task  
**Auth:** Required  
**Requirements:**
- Employee must be checked in (attendance active)
- No other active timer for the employee
- Task status must be ASSIGNED, ACCEPTED, or IN_PROGRESS

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "timer-id",
    "task_id": "task-id",
    "employee_id": "employee-id",
    "started_at": "2025-11-25T10:00:00.000Z",
    "auto_stopped": false
  },
  "message": "Timer started successfully"
}
```

### POST `/api/v1/tasks/:id/timer/stop`
**Description:** Stop timer for a task  
**Auth:** Required  
**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "timer-id",
    "task_id": "task-id",
    "employee_id": "employee-id",
    "started_at": "2025-11-25T10:00:00.000Z",
    "stopped_at": "2025-11-25T11:30:00.000Z",
    "duration_seconds": 5400
  },
  "message": "Timer stopped successfully"
}
```

### GET `/api/v1/timers/active`
**Description:** Get all active timers for current employee  
**Auth:** Required  
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "timer-id",
      "task_id": {
        "_id": "task-id",
        "title": "Complete quarterly report",
        "status": "IN_PROGRESS"
      },
      "started_at": "2025-11-25T10:00:00.000Z"
    }
  ],
  "message": "Active timers retrieved successfully"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "TASK_002_INVALID_STATUS_TRANSITION",
  "code": "TASK_002_INVALID_STATUS_TRANSITION"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access token required",
  "code": "AUTH_REQUIRED"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Insufficient role privileges.",
  "required": ["MANAGER"],
  "current": "employee",
  "code": "INSUFFICIENT_ROLE"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Task not found",
  "code": "TASK_001_NOT_FOUND"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

---

## API Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | No |
| GET | `/api/v1/health` | API health check | No |
| POST | `/api/v1/tasks` | Create manager task | Yes (Manager) |
| GET | `/api/v1/tasks` | Get tasks with filters | Yes |
| GET | `/api/v1/tasks/:id` | Get task by ID | Yes |
| PATCH | `/api/v1/tasks/:id/status` | Change task status | Yes |
| POST | `/api/v1/tasks/self` | Create self-task | Yes |
| POST | `/api/v1/tasks/:id/timer/start` | Start timer | Yes |
| POST | `/api/v1/tasks/:id/timer/stop` | Stop timer | Yes |
| GET | `/api/v1/timers/active` | Get active timers | Yes |

**Total Endpoints:** 10

---

## Notes

- All timestamps are in ISO 8601 format
- All IDs are MongoDB ObjectIds
- Pagination defaults: page=1, limit=20
- Token expiry: 15 minutes (configurable)
- Rate limiting: 1000 requests per 15 minutes per IP

