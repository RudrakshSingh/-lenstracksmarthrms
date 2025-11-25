const moment = require('moment-timezone');
const Tenant = require('../models/Tenant.model');
const TaskTypeSlaRule = require('../models/TaskTypeSlaRule.model');
const ShiftSchedule = require('../models/ShiftSchedule.model');
const logger = require('../config/logger');

class SlaCalculatorService {
  /**
   * Resolve SLA minutes from rules or use override
   */
  async resolveSlaMinutes(tenantId, taskTypeId, priority, overrideMinutes) {
    if (overrideMinutes) return overrideMinutes;

    const rule = await TaskTypeSlaRule.findOne({
      tenant_id: tenantId,
      task_type_id: taskTypeId,
      priority
    });

    if (!rule) {
      throw new Error('SLA_001_RULE_NOT_FOUND');
    }

    return rule.base_sla_minutes;
  }

  /**
   * Calculate due date based on SLA basis (CALENDAR_TIME or BUSINESS_HOURS)
   */
  async calculateDueDate(tenantId, orgNodeId, slaMinutes, startDate) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('TENANT_001_NOT_FOUND');

    const basis = tenant.settings.sla_basis_default;

    return basis === 'CALENDAR_TIME'
      ? this.addCalendarMinutes(startDate, slaMinutes, tenant.settings.timezone)
      : this.addBusinessMinutes(tenant, orgNodeId, slaMinutes, startDate);
  }

  /**
   * Add calendar minutes (simple time addition)
   */
  addCalendarMinutes(start, minutes, timezone) {
    return moment(start).tz(timezone).add(minutes, 'minutes').toDate();
  }

  /**
   * Add business minutes (respecting working hours and days)
   */
  async addBusinessMinutes(tenant, orgNodeId, minutes, startDate) {
    let remaining = minutes;
    let current = moment(startDate).tz(tenant.settings.timezone);

    while (remaining > 0) {
      // Skip non-working days
      if (!this.isBusinessDay(tenant, current)) {
        current = this.nextBusinessDayStart(tenant, current);
        continue;
      }

      const [dayStart, dayEnd] = this.getBusinessWindow(tenant, current);

      // If before business hours, move to start
      if (current.isBefore(dayStart)) {
        current = dayStart;
      }

      // If after business hours, move to next day
      if (current.isSameOrAfter(dayEnd)) {
        current = this.nextBusinessDayStart(tenant, current);
        continue;
      }

      // Calculate usable minutes in current day
      const usableMinutes = dayEnd.diff(current, 'minutes');

      if (usableMinutes >= remaining) {
        current.add(remaining, 'minutes');
        remaining = 0;
      } else {
        remaining -= usableMinutes;
        current = this.nextBusinessDayStart(tenant, current);
      }
    }

    return current.toDate();
  }

  /**
   * Check if date is a business day
   */
  isBusinessDay(tenant, date) {
    const dayOfWeek = date.day(); // 0-6, Sunday=0
    return tenant.settings.working_days.includes(dayOfWeek);
  }

  /**
   * Get business hours window for a date
   */
  getBusinessWindow(tenant, date) {
    const [startHour, startMin] = tenant.settings.working_hours.start.split(':').map(Number);
    const [endHour, endMin] = tenant.settings.working_hours.end.split(':').map(Number);

    const dayStart = date.clone().hour(startHour).minute(startMin).second(0).millisecond(0);
    const dayEnd = date.clone().hour(endHour).minute(endMin).second(0).millisecond(0);

    return [dayStart, dayEnd];
  }

  /**
   * Get next business day start
   */
  nextBusinessDayStart(tenant, date) {
    let next = date.clone().add(1, 'day').startOf('day');
    
    while (!this.isBusinessDay(tenant, next)) {
      next.add(1, 'day');
    }

    const [startHour, startMin] = tenant.settings.working_hours.start.split(':').map(Number);
    return next.hour(startHour).minute(startMin).second(0).millisecond(0);
  }
}

module.exports = new SlaCalculatorService();

