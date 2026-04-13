# Attendance Cron Jobs & Scheduler

## Overview
Comprehensive cron job scheduler for attendance system that manages all automated attendance-related tasks.

## Cron Jobs Schedule

### 1. Auto Clock-Out Job
- **Schedule:** `*/5 * * * *` (Every 5 minutes)
- **Purpose:** Automatically clocks out sessions that have reached 10 hours
- **Functionality:**
  - Finds all open attendance sessions
  - Checks if elapsed time >= 10 hours
  - Auto clocks out and sets status to 'present'
  - Sets logout_reason to 'system'

### 2. Daily Attendance Validation
- **Schedule:** `59 23 * * *` (Every day at 11:59 PM)
- **Purpose:** Validates all attendance records for the day
- **Functionality:**
  - Checks all attendance records for today
  - Marks as 'absent' if total hours < 10 hours
  - Updates notes with validation reason

### 3. End of Day Processing
- **Schedule:** `55 23 * * *` (Every day at 11:55 PM)
- **Purpose:** Processes all open sessions before day ends
- **Functionality:**
  - Finds all open sessions for today
  - Closes them at end of day (11:59:59 PM)
  - Calculates total hours
  - Marks as 'present' if >= 10 hours, 'absent' if < 10 hours

### 4. Hourly Session Check
- **Schedule:** `0 * * * *` (Every hour at minute 0)
- **Purpose:** Monitors sessions approaching 10-hour limit
- **Functionality:**
  - Checks sessions between 9-10 hours
  - Logs warnings for sessions approaching limit
  - Helps identify sessions that need attention

### 5. Weekly Attendance Report
- **Schedule:** `0 9 * * 1` (Every Monday at 9:00 AM)
- **Purpose:** Generates weekly attendance summary
- **Functionality:**
  - Calculates statistics for last 7 days
  - Tracks total sessions, present/absent counts
  - Calculates total and average hours
  - Logs comprehensive report

## Scheduler Management

### Starting Scheduler
The scheduler automatically starts when the attendance service starts:
```javascript
const attendanceScheduler = require('./jobs/attendanceScheduler');
attendanceScheduler.start();
```

### Stopping Scheduler
```javascript
attendanceScheduler.stop();
```

### Getting Status
```javascript
const status = attendanceScheduler.getStatus();
// Returns: { isRunning: true, jobsCount: 5, jobs: [...] }
```

## API Endpoints

### Get Scheduler Status
```
GET /api/attendance/scheduler/status
```

**Response:**
```json
{
  "service": "attendance-service",
  "timestamp": "2026-03-06T14:00:00.000Z",
  "scheduler": {
    "isRunning": true,
    "jobsCount": 5,
    "jobs": [
      "auto-clock-out",
      "daily-validation",
      "end-of-day",
      "hourly-check",
      "weekly-report"
    ]
  }
}
```

## Cron Schedule Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| `*/5 * * * *` | Every 5 minutes | Auto clock-out |
| `0 * * * *` | Every hour | Hourly check |
| `55 23 * * *` | Daily at 11:55 PM | End of day |
| `59 23 * * *` | Daily at 11:59 PM | Daily validation |
| `0 9 * * 1` | Monday at 9:00 AM | Weekly report |

## Timezone
All cron jobs use `Asia/Kolkata` timezone.

## Logging
All cron job executions are logged with:
- Job name
- Execution time
- Results/statistics
- Errors (if any)

## Error Handling
- Each cron job has individual error handling
- Errors don't stop other jobs from running
- All errors are logged with full stack traces
- Scheduler continues running even if one job fails

## Testing

### Manual Trigger (for testing)
You can manually trigger individual jobs by calling the methods directly:

```javascript
const attendanceScheduler = require('./jobs/attendanceScheduler');

// Manually trigger auto clock-out
await attendanceScheduler.autoClockOutSessions();

// Manually trigger daily validation
await attendanceScheduler.validateDailyAttendance();

// Manually trigger end of day processing
await attendanceScheduler.processEndOfDay();
```

## Monitoring

### Check Scheduler Status
```bash
curl http://localhost:3003/api/attendance/scheduler/status
```

### View Logs
All cron job executions are logged. Check logs for:
- Job execution times
- Number of records processed
- Errors and warnings
- Performance metrics

## Configuration

### Adjusting Schedules
Edit `microservices/attendance-service/src/jobs/attendanceScheduler.js`:

```javascript
// Change auto clock-out frequency (currently every 5 minutes)
this.jobs.set('auto-clock-out', cron.schedule('*/10 * * * *', ...)); // Every 10 minutes

// Change daily validation time (currently 11:59 PM)
this.jobs.set('daily-validation', cron.schedule('0 0 * * *', ...)); // Midnight
```

### Minimum Hours
Currently set to 10 hours (hardcoded). Can be made configurable via environment variable.

## Best Practices

1. **Monitor Logs:** Regularly check logs for job execution and errors
2. **Test Manually:** Use manual triggers to test jobs before deployment
3. **Adjust Schedules:** Fine-tune schedules based on business needs
4. **Error Handling:** Ensure all jobs have proper error handling
5. **Performance:** Monitor job execution times and optimize if needed

## Troubleshooting

### Scheduler Not Starting
- Check server logs for errors
- Verify node-cron package is installed
- Check timezone configuration

### Jobs Not Running
- Verify cron schedule syntax
- Check if scheduler is running: `GET /api/attendance/scheduler/status`
- Review logs for execution errors

### Performance Issues
- Reduce job frequency if needed
- Optimize database queries
- Add indexes for frequently queried fields
