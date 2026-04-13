const cron = require('node-cron');
const logger = require('../config/logger');
const Attendance = require('../models/Attendance.model');
const {
  resolveOpenSessionAutoClockOut,
  getRemainingMsUntilCutoff,
  getMinimumHoursForPresent
} = require('../utils/rosterShift.utils');

/**
 * Attendance Scheduler
 * Manages all cron jobs related to attendance system
 */
class AttendanceScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Start all attendance-related cron jobs
   */
  start() {
    if (this.isRunning) {
      logger.warn('Attendance scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting attendance scheduler with all cron jobs');

    // 1. Auto Clock-Out Job - Every 5 minutes
    // Clocks out at roster shift end (or fallback duration without roster)
    this.jobs.set('auto-clock-out', cron.schedule('*/5 * * * *', async () => {
      try {
        logger.info('Running auto clock-out job');
        await this.autoClockOutSessions();
      } catch (error) {
        logger.error('Error in auto clock-out job', { error: error.message, stack: error.stack });
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    }));

    // 2. Daily Attendance Validation - Every day at 11:59 PM
    // Marks absent if worked less than roster shift length (or fallback hours)
    this.jobs.set('daily-validation', cron.schedule('59 23 * * *', async () => {
      try {
        logger.info('Running daily attendance validation job');
        await this.validateDailyAttendance();
      } catch (error) {
        logger.error('Error in daily attendance validation job', { error: error.message, stack: error.stack });
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    }));

    // 3. End of Day Processing - Every day at 11:55 PM
    // Processes all open sessions before day ends
    this.jobs.set('end-of-day', cron.schedule('55 23 * * *', async () => {
      try {
        logger.info('Running end of day processing job');
        await this.processEndOfDay();
      } catch (error) {
        logger.error('Error in end of day processing job', { error: error.message, stack: error.stack });
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    }));

    // 4. Hourly Session Check - Every hour at minute 0
    // Logs when open session is within 1 hour of roster end / max duration
    this.jobs.set('hourly-check', cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Running hourly session check job');
        await this.checkSessionsApproachingLimit();
      } catch (error) {
        logger.error('Error in hourly session check job', { error: error.message, stack: error.stack });
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    }));

    // 5. Weekly Attendance Report - Every Monday at 9:00 AM
    // Generates weekly attendance summary
    this.jobs.set('weekly-report', cron.schedule('0 9 * * 1', async () => {
      try {
        logger.info('Running weekly attendance report job');
        await this.generateWeeklyReport();
      } catch (error) {
        logger.error('Error in weekly attendance report job', { error: error.message, stack: error.stack });
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    }));

    // 6. Geofence Violation Check - Every 2 minutes
    // Checks for employees outside geofence and auto clocks out after grace period
    this.jobs.set('geofence-violation-check', cron.schedule('*/2 * * * *', async () => {
      try {
        logger.info('Running geofence violation check job');
        await this.checkGeofenceViolations();
      } catch (error) {
        logger.error('Error in geofence violation check job', { error: error.message, stack: error.stack });
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    }));

    logger.info(`✅ Attendance scheduler started with ${this.jobs.size} cron jobs`);
    logger.info('Cron Jobs:');
    logger.info('  - Auto Clock-Out: Every 5 minutes');
    logger.info('  - Daily Validation: Every day at 11:59 PM');
    logger.info('  - End of Day Processing: Every day at 11:55 PM');
    logger.info('  - Hourly Session Check: Every hour');
    logger.info('  - Weekly Report: Every Monday at 9:00 AM');
    logger.info('  - Geofence Violation Check: Every 2 minutes');
  }

  /**
   * Stop all cron jobs
   */
  stop() {
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped cron job: ${name}`);
    });
    this.jobs.clear();
    this.isRunning = false;
    logger.info('Attendance scheduler stopped');
  }

  /**
   * Auto clock-out sessions at roster shift end (or fallback max duration)
   */
  async autoClockOutSessions() {
    try {
      const now = new Date();

      // Find all open attendance records
      const openSessions = await Attendance.find({
        check_in_time: { $exists: true, $ne: null },
        $or: [
          { check_out_time: { $exists: false } },
          { check_out_time: null }
        ]
      }).lean();

      logger.info(`Checking ${openSessions.length} open sessions for auto clock-out`);

      let autoClockOutCount = 0;

      for (const session of openSessions) {
        try {
          const checkInTime = new Date(session.check_in_time);
          const decision = resolveOpenSessionAutoClockOut(session, now);
          if (!decision.shouldClockOut) {
            continue;
          }

          const { checkOutAt: autoClockOutTime, totalHours, minHoursForPresent, source } = decision;
          const status = totalHours < minHoursForPresent ? 'absent' : 'present';
          const addressLabel =
            source === 'fallback_duration'
              ? 'Auto clock-out: max session duration (no roster shift on record)'
              : 'Auto clock-out at scheduled shift end (roster)';

          await Attendance.findByIdAndUpdate(session._id, {
            $set: {
              check_out_time: autoClockOutTime,
              check_out_location: session.check_in_location || {
                latitude: 0,
                longitude: 0,
                address: addressLabel
              },
              total_hours: totalHours,
              logout_reason: 'system',
              status,
              ...(status === 'absent'
                ? {
                    notes: `${session.notes || ''} | Auto clock-out: ${totalHours.toFixed(2)}h vs required ${minHoursForPresent}h (roster).`.trim()
                  }
                : {}),
              updatedAt: now
            }
          });

          autoClockOutCount++;
          logger.info('Auto clocked out session', {
            attendanceId: session._id,
            employeeId: session.employee_id,
            checkInTime: checkInTime.toISOString(),
            checkOutTime: autoClockOutTime.toISOString(),
            totalHours,
            minHoursForPresent
          });
        } catch (sessionError) {
          logger.error(`Error processing session for auto clock-out`, {
            attendanceId: session._id,
            error: sessionError.message
          });
        }
      }

      if (autoClockOutCount > 0) {
        logger.info(`Auto clock-out completed: ${autoClockOutCount} sessions auto clocked out`);
      }
    } catch (error) {
      logger.error('Error in autoClockOutSessions', { error: error.message, stack: error.stack });
    }
  }

  /**
   * Validate daily attendance and mark absent if under roster shift hours
   */
  async validateDailyAttendance() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find all attendance records for today
      const todayAttendance = await Attendance.find({
        $or: [
          { date: { $gte: today, $lt: tomorrow } },
          { check_in_time: { $gte: today, $lt: tomorrow } }
        ],
        check_in_time: { $exists: true, $ne: null },
        check_out_time: { $exists: true, $ne: null }
      }).lean();

      logger.info(`Validating ${todayAttendance.length} attendance records for today`);

      let absentMarkedCount = 0;

      for (const attendance of todayAttendance) {
        try {
          const totalHours = attendance.total_hours || 0;
          const minimumHours = getMinimumHoursForPresent(attendance);

          if (totalHours < minimumHours && attendance.status !== 'absent') {
            await Attendance.findByIdAndUpdate(
              attendance._id,
              {
                $set: {
                  status: 'absent',
                  notes: (attendance.notes || '') + 
                    ` | Daily validation: Total hours ${totalHours.toFixed(2)} is less than required ${minimumHours} hours (roster shift length). Marked as absent.`
                }
              }
            );

            absentMarkedCount++;
            logger.info(`Marked attendance as absent due to insufficient hours`, {
              attendanceId: attendance._id,
              employeeId: attendance.employee_id,
              totalHours: totalHours.toFixed(2)
            });
          }
        } catch (attendanceError) {
          logger.error(`Error validating attendance record`, {
            attendanceId: attendance._id,
            error: attendanceError.message
          });
        }
      }

      if (absentMarkedCount > 0) {
        logger.info(`Daily validation completed: ${absentMarkedCount} records marked as absent`);
      }
    } catch (error) {
      logger.error('Error in validateDailyAttendance', { error: error.message, stack: error.stack });
    }
  }

  /**
   * Process end of day - close all open sessions
   */
  async processEndOfDay() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find all open sessions for today
      const openSessions = await Attendance.find({
        $or: [
          { date: { $gte: today, $lt: tomorrow } },
          { check_in_time: { $gte: today, $lt: tomorrow } }
        ],
        check_in_time: { $exists: true, $ne: null },
        $or: [
          { check_out_time: { $exists: false } },
          { check_out_time: null }
        ]
      }).lean();

      logger.info(`Processing ${openSessions.length} open sessions at end of day`);

      let processedCount = 0;
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      for (const session of openSessions) {
        try {
          const checkInTime = new Date(session.check_in_time);
          const totalHours = (endOfDay - checkInTime) / (1000 * 60 * 60);
          const minimumHours = getMinimumHoursForPresent(session);

          const status = totalHours >= minimumHours ? 'present' : 'absent';

          await Attendance.findByIdAndUpdate(
            session._id,
            {
              $set: {
                check_out_time: endOfDay,
                check_out_location: session.check_in_location || {
                  latitude: 0,
                  longitude: 0,
                  address: 'End of day auto clock-out'
                },
                total_hours: Math.round(totalHours * 100) / 100,
                logout_reason: 'system',
                status: status,
                notes: (session.notes || '') + 
                  ` | End of day processing: ${totalHours.toFixed(2)} hours. Status: ${status}.`,
                updatedAt: endOfDay
              }
            }
          );

          processedCount++;
          logger.info(`Processed end of day session`, {
            attendanceId: session._id,
            employeeId: session.employee_id,
            totalHours: totalHours.toFixed(2),
            status: status
          });
        } catch (sessionError) {
          logger.error(`Error processing end of day session`, {
            attendanceId: session._id,
            error: sessionError.message
          });
        }
      }

      if (processedCount > 0) {
        logger.info(`End of day processing completed: ${processedCount} sessions processed`);
      }
    } catch (error) {
      logger.error('Error in processEndOfDay', { error: error.message, stack: error.stack });
    }
  }

  /**
   * Log warnings when an open session is within 1 hour of auto clock-out cutoff
   */
  async checkSessionsApproachingLimit() {
    try {
      const now = new Date();
      const WARNING_WINDOW_MS = 60 * 60 * 1000;

      const approachingSessions = await Attendance.find({
        check_in_time: { $exists: true, $ne: null },
        $or: [
          { check_out_time: { $exists: false } },
          { check_out_time: null }
        ]
      }).lean();

      let warningCount = 0;

      for (const session of approachingSessions) {
        try {
          const checkInTime = new Date(session.check_in_time);
          const remainingMs = getRemainingMsUntilCutoff(session, now);

          if (remainingMs > 0 && remainingMs <= WARNING_WINDOW_MS) {
            const elapsedHours = (now - checkInTime) / (1000 * 60 * 60);
            logger.warn('Session approaching auto clock-out (roster end or max duration)', {
              attendanceId: session._id,
              employeeId: session.employee_id,
              elapsedHours: elapsedHours.toFixed(2),
              remainingMinutes: Math.round(remainingMs / (60 * 1000)),
              checkInTime: checkInTime.toISOString()
            });
            warningCount++;
          }
        } catch (sessionError) {
          logger.error(`Error checking session`, {
            attendanceId: session._id,
            error: sessionError.message
          });
        }
      }

      if (warningCount > 0) {
        logger.info(`Hourly check completed: ${warningCount} sessions within 1h of cutoff`);
      }
    } catch (error) {
      logger.error('Error in checkSessionsApproachingLimit', { error: error.message, stack: error.stack });
    }
  }

  /**
   * Check for geofence violations and auto clock-out employees
   * This runs every 2 minutes to check if employees outside geofence have exceeded grace period
   */
  async checkGeofenceViolations() {
    try {
      const now = new Date();
      const GRACE_PERIOD_MINUTES = 10;
      const GRACE_PERIOD_MS = GRACE_PERIOD_MINUTES * 60 * 1000;

      // Find all open attendance sessions with geofence violation started
      const violationSessions = await Attendance.find({
        check_in_time: { $exists: true, $ne: null },
        $or: [
          { check_out_time: { $exists: false } },
          { check_out_time: null }
        ],
        geofence_violation_start: { $exists: true, $ne: null }
      })
      .populate('store', 'coordinates geofenceRadius')
      .lean();

      logger.info(`Checking ${violationSessions.length} sessions with geofence violations`);

      let autoClockOutCount = 0;

      for (const session of violationSessions) {
        try {
          const violationStartTime = new Date(session.geofence_violation_start);
          const timeOutside = now - violationStartTime;

          // If grace period has expired (10 minutes), auto clock-out
          if (timeOutside >= GRACE_PERIOD_MS) {
            const store = session.store;
            const geofenceRadius = store?.geofenceRadius || 200;
            
            // Use last known location or store location for clock-out
            const clockOutLocation = session.check_in_location || 
              (store?.coordinates ? {
                latitude: store.coordinates.latitude,
                longitude: store.coordinates.longitude
              } : {
                latitude: 0,
                longitude: 0
              });

            // Calculate total hours
            const checkInTime = new Date(session.check_in_time);
            const diffMs = now - checkInTime;
            const totalHours = diffMs / (1000 * 60 * 60);
            const minHours = getMinimumHoursForPresent(session);

            await Attendance.findByIdAndUpdate(
              session._id,
              {
                $set: {
                  check_out_time: now,
                  check_out_location: {
                    latitude: clockOutLocation.latitude,
                    longitude: clockOutLocation.longitude,
                    address: `Auto clock-out: Geofence violation. Grace period (${GRACE_PERIOD_MINUTES} min) expired.`
                  },
                  total_hours: totalHours,
                  logout_reason: 'auto_geofence',
                  is_geofence_violation: true,
                  status: totalHours >= minHours ? 'present' : 'absent',
                  notes: (session.notes || '') + 
                    ` | Auto clock-out: Outside geofence for ${Math.round(timeOutside / (60 * 1000))} minutes. Grace period expired.`,
                  updatedAt: now
                }
              }
            );

            // NOTE: Sales auto-calculate NOT triggered on geofence violation clock-out
            // Employee can wapas punch-in करके sales add कर सकता है
            // Sales auto-calculate सिर्फ होगी:
            // 1. Manual clock-out पर
            // 2. Auto clock-out (roster end / max duration) पर
            // 3. End Day button पर
            
            logger.info('Geofence violation clock-out - sales calculation skipped', {
              employeeId: session.employee_id,
              note: 'Employee can wapas punch-in करके sales add कर सकता है'
            });

            autoClockOutCount++;
            logger.info(`Auto clocked out due to geofence violation`, {
              attendanceId: session._id,
              employeeId: session.employee_id,
              employeeName: session.employeeName,
              violationStart: violationStartTime.toISOString(),
              timeOutsideMinutes: Math.round(timeOutside / (60 * 1000)),
              checkOutTime: now.toISOString(),
              totalHours: totalHours.toFixed(2)
            });
          }
        } catch (sessionError) {
          logger.error(`Error processing geofence violation session`, {
            attendanceId: session._id,
            error: sessionError.message
          });
        }
      }

      if (autoClockOutCount > 0) {
        logger.info(`Geofence violation check completed: ${autoClockOutCount} sessions auto clocked out`);
      }
    } catch (error) {
      logger.error('Error in checkGeofenceViolations', { error: error.message, stack: error.stack });
    }
  }

  /**
   * Generate weekly attendance report
   */
  async generateWeeklyReport() {
    try {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7); // Last 7 days
      weekStart.setHours(0, 0, 0, 0);

      // Get attendance summary for the week
      const weeklyAttendance = await Attendance.find({
        $or: [
          { date: { $gte: weekStart } },
          { check_in_time: { $gte: weekStart } }
        ],
        check_in_time: { $exists: true, $ne: null }
      }).lean();

      const stats = {
        totalSessions: weeklyAttendance.length,
        presentSessions: weeklyAttendance.filter(a => a.status === 'present').length,
        absentSessions: weeklyAttendance.filter(a => a.status === 'absent').length,
        totalHours: weeklyAttendance.reduce((sum, a) => sum + (a.total_hours || 0), 0),
        averageHours: 0
      };

      if (stats.totalSessions > 0) {
        stats.averageHours = stats.totalHours / stats.totalSessions;
      }

      logger.info('Weekly attendance report generated', {
        period: `${weekStart.toISOString()} to ${now.toISOString()}`,
        stats: stats
      });

      // Here you could send this report via email, save to database, etc.
      // For now, just logging
    } catch (error) {
      logger.error('Error in generateWeeklyReport', { error: error.message, stack: error.stack });
    }
  }

  /**
   * Get status of all cron jobs
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobsCount: this.jobs.size,
      jobs: Array.from(this.jobs.keys())
    };
  }
}

// Export singleton instance
const attendanceScheduler = new AttendanceScheduler();

module.exports = attendanceScheduler;
