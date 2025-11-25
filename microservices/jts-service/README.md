# JTS Service v3 - Jobs Tracking System

## Overview

Etelios JTS v3 is the execution + evaluation engine inside the Etelios Business OS. It tracks:
- What work was assigned
- Who did it
- How fast
- With what quality and seriousness
- With how many delays/escalations
- How that converts into performance scores, reviews, rewards, or corrections

## Features

- **Task Management**: Manager tasks, system tasks, employee self-tasks
- **Timer + Attendance Integration**: Task timers bound to attendance
- **SLA + Escalation Engine**: 3-level escalation (PRE_SLA → SLA_BREACH → EXTRA_DELAY)
- **Performance Engine**: 5 component score calculation with daily/weekly/monthly/quarterly rollups
- **Review Engine**: Quarterly/Annual reviews with manager ratings
- **Multi-Tenant**: Full tenant isolation with org hierarchy support

## Tech Stack

- Node.js 20+
- Express.js
- MongoDB with Mongoose
- Redis (BullMQ for background jobs)
- Socket.io (for real-time updates)

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## Running

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker
```bash
docker-compose up
```

## API Endpoints

### Base URL
`/api/v1`

### Task Management
- `POST /api/v1/tasks` - Create manager task
- `GET /api/v1/tasks` - Get tasks with filters
- `GET /api/v1/tasks/:id` - Get task by ID
- `PATCH /api/v1/tasks/:id/status` - Change task status

### Self-Tasks
- `POST /api/v1/tasks/self` - Create self-task

### Timer Management
- `POST /api/v1/tasks/:id/timer/start` - Start timer
- `POST /api/v1/tasks/:id/timer/stop` - Stop timer
- `GET /api/v1/timers/active` - Get active timers

## Database Models

33 MongoDB collections covering:
- Tenancy & Organization (5)
- Task & Execution (8)
- SLA & Escalation (4)
- Policy & Workforce (3)
- Performance & Reviews (6)
- Notifications & Audit (7)

## Background Jobs

12 background jobs for:
- Escalation checking (every 5 min)
- Daily performance calculation (1 AM)
- Weekly/monthly/quarterly rollups
- Review triggers
- Performance alerts
- Timer auto-stop
- And more...

## License

Proprietary

