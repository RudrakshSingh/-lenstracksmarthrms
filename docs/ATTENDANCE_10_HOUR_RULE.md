# 10 Hour Attendance Rule Implementation

## Overview
This document describes the implementation of the 10-hour attendance rule that ensures:
1. Employees must complete minimum 10 hours in a session
2. Sessions are automatically clocked out after 10 hours
3. Sessions with less than 10 hours are marked as absent
4. Users can clock in/out multiple times during the 10-hour period

## Implementation Details

### 1. Auto Clock-Out Job
**File:** `microservices/attendance-service/src/jobs/autoClockOut.job.js`

- **Schedule:** Runs every 5 minutes
- **Functionality:**
  - Checks all open attendance sessions (check_in_time exists, check_out_time is null)
  - If a session has reached 10 hours, automatically clocks it out
  - Sets check_out_time to exactly check_in_time + 10 hours
  - Marks logout_reason as 'system'
  - Ensures status is 'present' if 10 hours completed

**How it works:**
```javascript
// Runs every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  // Find all open sessions
  // Check if elapsed time >= 10 hours
  // Auto clock-out if condition met
});
```

### 2. Clock-Out Validation
**File:** `microservices/attendance-service/src/services/attendance.service.js`

- **Minimum Hours Check:**
  - When user manually clocks out, system calculates total hours
  - If total hours < 10 hours:
    - Status is set to 'absent'
    - Notes are updated with reason
  - If total hours >= 10 hours:
    - Status remains 'present'

**Code Logic:**
```javascript
const MINIMUM_HOURS = 10;
const totalHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);

if (totalHours < MINIMUM_HOURS) {
  attendance.status = 'absent';
  attendance.notes += ` | Clock-out: Total hours ${totalHours.toFixed(2)} is less than required ${MINIMUM_HOURS} hours. Marked as absent.`;
} else {
  attendance.status = 'present';
}
```

### 3. Flexible Clock In/Out
- Users can clock in/out multiple times during the day
- System tracks each session separately
- Each session must meet the 10-hour requirement individually
- Multiple sessions in a day are allowed (user can clock in again after clocking out)

### 4. Server Integration
**File:** `microservices/attendance-service/src/server.js`

- Auto clock-out job starts automatically when server starts
- Job runs in background and doesn't block server operations
- If job fails to start, server continues (non-blocking)

## Behavior Examples

### Example 1: Normal 10+ Hour Session
1. User clocks in at 9:00 AM
2. User clocks out at 7:30 PM (10.5 hours)
3. **Result:** Status = 'present', Total Hours = 10.5

### Example 2: Less Than 10 Hours
1. User clocks in at 9:00 AM
2. User clocks out at 5:00 PM (8 hours)
3. **Result:** Status = 'absent', Total Hours = 8.0, Notes include reason

### Example 3: Auto Clock-Out After 10 Hours
1. User clocks in at 9:00 AM
2. User doesn't clock out
3. At 7:00 PM (10 hours later), system auto clocks out
4. **Result:** Status = 'present', Total Hours = 10.0, logout_reason = 'system'

### Example 4: Multiple Sessions in a Day
1. User clocks in at 9:00 AM
2. User clocks out at 1:00 PM (4 hours) - **Marked as absent**
3. User clocks in again at 2:00 PM
4. User clocks out at 10:00 PM (8 hours) - **Marked as absent**
5. **Result:** Two separate attendance records, both marked as absent

## Configuration

### Minimum Hours
Currently set to **10 hours** (hardcoded in service)
- Can be made configurable via environment variable if needed

### Auto Clock-Out Check Frequency
Currently runs **every 5 minutes**
- Can be adjusted in `autoClockOut.job.js` cron schedule

## Logging

All actions are logged:
- Auto clock-out events
- Absent marking due to insufficient hours
- Errors during job execution

## Testing

To test the implementation:

1. **Test Auto Clock-Out:**
   ```javascript
   // Manually trigger the job
   const autoClockOutJob = require('./jobs/autoClockOut.job');
   await autoClockOutJob.triggerManual();
   ```

2. **Test Manual Clock-Out with < 10 Hours:**
   - Clock in
   - Wait or manually set check_out_time to less than 10 hours
   - Verify status is 'absent'

3. **Test Manual Clock-Out with >= 10 Hours:**
   - Clock in
   - Wait or manually set check_out_time to 10+ hours
   - Verify status is 'present'

## Notes

- The 10-hour rule applies per session, not per day
- Multiple sessions in a day are allowed
- Each session is evaluated independently
- Auto clock-out happens exactly at 10 hours (not before)
- System clock-out sets total_hours to exactly 10.0

## Future Enhancements

1. Make minimum hours configurable via environment variable
2. Add notification when auto clock-out happens
3. Add dashboard to show sessions approaching 10 hours
4. Add reporting for sessions marked as absent due to insufficient hours
