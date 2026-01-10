const Roster = require('../models/Roster.model');
const User = require('../models/User.model');
const Store = require('../models/Store.model');
const logger = require('../config/logger');

/**
 * Roster Service - Business logic for roster management
 */
class RosterService {
  /**
   * Get roster entries with filters
   */
  async getRoster(filters = {}, page = 1, limit = 100) {
    try {
      const {
        employeeId,
        storeId,
        startDate,
        endDate,
        status,
        shift,
        tenantId = 'default'
      } = filters;

      const query = { tenantId };

      if (employeeId) query.employeeId = employeeId;
      if (storeId) query.storeId = storeId;
      if (status) query.status = status;
      if (shift) query.shift = shift;

      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;

      const [rosters, total] = await Promise.all([
        Roster.find(query)
          .populate('employee', 'firstName lastName email phone employeeId')
          .populate('store', 'name code address')
          .sort({ date: 1, shiftStart: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Roster.countDocuments(query)
      ]);

      return {
        data: rosters,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error in getRoster service', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a new roster entry
   */
  async createRoster(rosterData, createdBy) {
    try {
      const {
        employeeId,
        storeId,
        date,
        shift,
        shiftStart,
        shiftEnd,
        breakDuration = 30,
        notes,
        tenantId = 'default'
      } = rosterData;

      // Validate employee exists
      const employee = await User.findOne({ employeeId, tenantId });
      if (!employee) {
        const error = new Error('Employee not found');
        error.statusCode = 404;
        throw error;
      }

      // Validate store exists
      const store = await Store.findOne({ code: storeId, tenantId });
      if (!store) {
        const error = new Error('Store not found');
        error.statusCode = 404;
        throw error;
      }

      // Check for overlapping shifts
      const hasOverlap = await Roster.checkOverlap(employeeId, date, shiftStart, shiftEnd);
      if (hasOverlap) {
        const error = new Error('Employee already has an overlapping shift on this date');
        error.statusCode = 409;
        throw error;
      }

      // Create roster entry
      const roster = new Roster({
        tenantId,
        employee: employee._id,
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
        store: store._id,
        storeId: store.code,
        storeName: store.name,
        date: new Date(date),
        shift,
        shiftStart,
        shiftEnd,
        breakDuration,
        notes,
        status: 'SCHEDULED',
        createdBy
      });

      await roster.save();

      logger.info('Roster created successfully', {
        rosterId: roster._id,
        employeeId,
        storeId,
        date
      });

      return roster;
    } catch (error) {
      logger.error('Error in createRoster service', { error: error.message });
      throw error;
    }
  }

  /**
   * Update an existing roster entry
   */
  async updateRoster(rosterId, updateData, updatedBy) {
    try {
      const roster = await Roster.findById(rosterId);
      if (!roster) {
        const error = new Error('Roster entry not found');
        error.statusCode = 404;
        throw error;
      }

      // Update allowed fields
      const allowedUpdates = [
        'storeId',
        'shift',
        'shiftStart',
        'shiftEnd',
        'breakDuration',
        'status',
        'notes'
      ];

      for (const key of allowedUpdates) {
        if (updateData[key] !== undefined) {
          // Special handling for storeId
          if (key === 'storeId') {
            const store = await Store.findOne({ code: updateData.storeId });
            if (!store) {
              const error = new Error('Store not found');
              error.statusCode = 404;
              throw error;
            }
            roster.store = store._id;
            roster.storeId = store.code;
            roster.storeName = store.name;
          } else {
            roster[key] = updateData[key];
          }
        }
      }

      // Check for overlapping shifts if time changed
      if (updateData.shiftStart || updateData.shiftEnd) {
        const hasOverlap = await Roster.checkOverlap(
          roster.employeeId,
          roster.date,
          roster.shiftStart,
          roster.shiftEnd,
          roster._id
        );
        if (hasOverlap) {
          const error = new Error('Employee already has an overlapping shift on this date');
          error.statusCode = 409;
          throw error;
        }
      }

      roster.updatedBy = updatedBy;
      await roster.save();

      logger.info('Roster updated successfully', { rosterId: roster._id });

      return roster;
    } catch (error) {
      logger.error('Error in updateRoster service', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete a roster entry
   */
  async deleteRoster(rosterId) {
    try {
      const roster = await Roster.findByIdAndDelete(rosterId);
      if (!roster) {
        const error = new Error('Roster entry not found');
        error.statusCode = 404;
        throw error;
      }

      logger.info('Roster deleted successfully', { rosterId });

      return { message: 'Roster deleted successfully' };
    } catch (error) {
      logger.error('Error in deleteRoster service', { error: error.message });
      throw error;
    }
  }

  /**
   * Get weekly roster for a store
   */
  async getWeeklyRoster(storeId, weekStartDate) {
    try {
      const startDate = new Date(weekStartDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6); // 7 days total

      const rosters = await Roster.getStoreRoster(storeId, startDate, endDate);

      // Group by date
      const weeklyRoster = {};
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        weeklyRoster[dateStr] = [];
      }

      rosters.forEach(roster => {
        const dateStr = new Date(roster.date).toISOString().split('T')[0];
        if (weeklyRoster[dateStr]) {
          weeklyRoster[dateStr].push({
            id: roster._id,
            employeeId: roster.employeeId,
            employeeName: roster.employeeName,
            shift: roster.shift,
            shiftStart: roster.shiftStart,
            shiftEnd: roster.shiftEnd,
            status: roster.status
          });
        }
      });

      return {
        weekStartDate: startDate.toISOString().split('T')[0],
        weekEndDate: endDate.toISOString().split('T')[0],
        storeId,
        roster: weeklyRoster
      };
    } catch (error) {
      logger.error('Error in getWeeklyRoster service', { error: error.message });
      throw error;
    }
  }

  /**
   * Bulk create roster entries
   */
  async bulkCreateRoster(entries, createdBy) {
    try {
      const results = {
        totalProcessed: entries.length,
        successful: 0,
        failed: 0,
        errors: []
      };

      for (const entry of entries) {
        try {
          await this.createRoster(entry, createdBy);
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            entry,
            error: error.message
          });
        }
      }

      logger.info('Bulk roster creation completed', results);

      return results;
    } catch (error) {
      logger.error('Error in bulkCreateRoster service', { error: error.message });
      throw error;
    }
  }

  /**
   * Get roster settings for a store
   */
  async getRosterSettings(storeId) {
    try {
      // This is a placeholder - implement store-specific settings if needed
      return {
        storeId,
        minimumRequired: 5,
        maximumAllowed: 15,
        shifts: {
          MORNING: { start: '09:00', end: '18:00' },
          EVENING: { start: '14:00', end: '22:00' },
          NIGHT: { start: '22:00', end: '06:00' },
          FULL_DAY: { start: '09:00', end: '22:00' }
        }
      };
    } catch (error) {
      logger.error('Error in getRosterSettings service', { error: error.message });
      throw error;
    }
  }
}

module.exports = new RosterService();

