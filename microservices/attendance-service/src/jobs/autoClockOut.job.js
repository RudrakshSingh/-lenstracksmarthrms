const cron = require('node-cron');
const Attendance = require('../models/Attendance.model');
const logger = require('../config/logger');
const { resolveOpenSessionAutoClockOut } = require('../utils/rosterShift.utils');

/**
 * Auto Clock-Out Job
 * Clocks out open sessions at roster shift end (or fallback duration if no roster)
 */
class AutoClockOutJob {
  constructor() {
    this.isRunning = false;
    this.job = null;
  }

  /**
   * Start the auto clock-out scheduler
   */
  start() {
    if (this.isRunning) {
      logger.warn('Auto clock-out job is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting auto clock-out job scheduler');

    // Run every 5 minutes to align with roster shift end / max session length
    this.job = cron.schedule('*/5 * * * *', async () => {
      try {
        await this.checkAndAutoClockOut();
      } catch (error) {
        logger.error('Error in auto clock-out job', { error: error.message, stack: error.stack });
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });

    logger.info('Auto clock-out job started - runs every 5 minutes');
  }

  /**
   * Stop the auto clock-out scheduler
   */
  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
    }
    this.isRunning = false;
    logger.info('Auto clock-out job stopped');
  }

  /**
   * Check for open attendance sessions and auto clock-out at roster shift end (or fallback)
   */
  async checkAndAutoClockOut() {
    try {
      const now = new Date();

      // Find all open attendance records (check_in_time exists but check_out_time is null)
      const openSessions = await Attendance.find({
        check_in_time: { $exists: true, $ne: null },
        $or: [
          { check_out_time: { $exists: false } },
          { check_out_time: null }
        ]
      }).lean();

      logger.info(`Checking ${openSessions.length} open attendance sessions for auto clock-out`);

      let autoClockOutCount = 0;
      let absentMarkedCount = 0;

      for (const session of openSessions) {
        try {
          const checkInTime = new Date(session.check_in_time);
          const decision = resolveOpenSessionAutoClockOut(session, now);

          if (!decision.shouldClockOut) {
            continue;
          }

          const {
            checkOutAt: autoClockOutTime,
            totalHours,
            minHoursForPresent,
            source
          } = decision;

          const addressLabel =
            source === 'fallback_duration'
              ? 'Auto clock-out: max session duration (no roster shift on record)'
              : 'Auto clock-out at scheduled shift end (roster)';

          logger.info('Auto clocking out session', {
            attendanceId: session._id,
            employeeId: session.employee_id,
            checkInTime: checkInTime.toISOString(),
            checkOutTime: autoClockOutTime.toISOString(),
            totalHours,
            minHoursForPresent,
            source
          });

          const status = totalHours < minHoursForPresent ? 'absent' : 'present';
          const absentNote =
            status === 'absent'
              ? `Auto clock-out: ${totalHours.toFixed(2)}h worked vs required ${minHoursForPresent}h (roster shift length).`
              : undefined;

          await Attendance.findByIdAndUpdate(
            session._id,
            {
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
                ...(absentNote
                  ? {
                      notes: [session.notes, absentNote].filter(Boolean).join(' | ')
                    }
                  : {}),
                updatedAt: now
              }
            },
            { new: true }
          );

          if (status === 'absent') {
            absentMarkedCount++;
            logger.warn('Marked attendance as absent after auto clock-out (under roster hours)', {
              attendanceId: session._id,
              employeeId: session.employee_id,
              totalHours,
              minHoursForPresent
            });
          }

          autoClockOutCount++;

          // Auto-calculate and push sales to dashboard (non-blocking)
          try {
            const axios = require('axios');
            const SALES_SERVICE_URL = process.env.SALES_SERVICE_URL || 'http://sales-service:80';
            const employeeIdString = session.employee_id;

            const salesResponse = await axios
              .get(`${SALES_SERVICE_URL}/api/sales/employee/today`, {
                headers: {
                  'Content-Type': 'application/json'
                },
                timeout: 5000,
                validateStatus: (status) => status < 500
              })
              .catch(() => null);

            if (salesResponse && salesResponse.data && salesResponse.data.success) {
              logger.info('Sales auto-calculated on auto clock-out', {
                employeeId: employeeIdString,
                totalSales: salesResponse.data.data.totalSales,
                totalOrders: salesResponse.data.data.totalOrders
              });
            }
          } catch (salesError) {
            logger.warn('Failed to calculate sales on auto clock-out', {
              error: salesError.message,
              employeeId: session.employee_id
            });
          }

          logger.info('Auto clock-out completed', {
            attendanceId: session._id,
            employeeId: session.employee_id,
            checkInTime: checkInTime.toISOString(),
            checkOutTime: autoClockOutTime.toISOString(),
            totalHours
          });
        } catch (sessionError) {
          logger.error(`Error processing session for auto clock-out`, {
            attendanceId: session._id,
            error: sessionError.message
          });
        }
      }

      if (autoClockOutCount > 0) {
        logger.info(`Auto clock-out job completed: ${autoClockOutCount} sessions auto clocked out, ${absentMarkedCount} marked as absent`);
      }
    } catch (error) {
      logger.error('Error in checkAndAutoClockOut', { error: error.message, stack: error.stack });
    }
  }

  /**
   * Manually trigger auto clock-out check (for testing or manual execution)
   */
  async triggerManual() {
    logger.info('Manually triggering auto clock-out check');
    await this.checkAndAutoClockOut();
  }
}

// Export singleton instance
const autoClockOutJob = new AutoClockOutJob();

module.exports = autoClockOutJob;
