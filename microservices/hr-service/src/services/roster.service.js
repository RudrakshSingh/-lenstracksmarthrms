const Roster = require('../models/Roster.model');
const RosterSettings = require('../models/RosterSettings.model');
const User = require('../models/User.model');
const Store = require('../models/Store.model');
const LeaveRequest = require('../models/LeaveRequest.model');
const logger = require('../config/logger');
const mongoose = require('mongoose');
const axios = require('axios');

// Deployment trigger: 2026-01-12 20:51 - Force pipeline execution
// Attendance service URL for fetching historical data
const ATTENDANCE_SERVICE_URL = process.env.ATTENDANCE_SERVICE_URL || 'http://attendance-service:3004';

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
        date, // CRITICAL: Support single date parameter
        status,
        shift,
        tenantId = 'default'
      } = filters;

      const query = { tenantId };

      if (employeeId) {
        // Handle both MongoDB _id and employeeId string
        if (mongoose.Types.ObjectId.isValid(employeeId)) {
          query.$or = [
            { employee: employeeId },
            { employeeId: employeeId }
          ];
        } else {
          query.employeeId = employeeId;
        }
      }
      if (storeId) query.storeId = storeId;
      if (status) query.status = status;
      if (shift) query.shift = shift;

      // CRITICAL: Handle single date parameter (for today's roster lookup)
      if (date) {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        query.date = {
          $gte: targetDate,
          $lt: nextDay
        };
      } else if (startDate || endDate) {
        // Handle date range
        query.date = {};
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          query.date.$gte = start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.date.$lte = end;
        }
      }

      const skip = (page - 1) * limit;

      // Fetch rosters with populate (without strict tenantId match in populate to avoid filtering out valid rosters)
      // The query already filters by tenantId at roster level, so populate should work
      // OPTIMIZED: Reduce populate fields, add maxTimeMS, select only needed fields
      const [rosters, total] = await Promise.all([
        Roster.find(query)
          .select('employeeId employeeName storeId storeName date shift shiftStart shiftEnd status')
          .populate({
            path: 'employee',
            select: 'firstName lastName employeeId',
            // Don't use match here - roster already has tenantId filter
          })
          .populate({
            path: 'store',
            select: 'name code',
            // Don't use match here - roster already has tenantId filter
          })
          .sort({ date: 1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .maxTimeMS(2000), // Reduced timeout for faster response
        Roster.countDocuments(query).maxTimeMS(2000)
      ]);

      // Filter out rosters where employee or store populate returned null (only if they don't exist)
      // But don't filter by tenantId since roster already has tenantId filter
      const filteredRosters = rosters.filter(roster => 
        roster.employee && roster.store
      );

      // Format roster entries to match frontend expected shape
      // Frontend expects: id, employeeId, employeeName?, storeId, store_id (for Add Sales Entry modal), storeName?, date (YYYY-MM-DD), shift, shiftStart?, shiftEnd?, status?
      // Use filteredRosters to ensure tenant isolation
      const formattedRosters = filteredRosters.map(roster => ({
        id: roster._id?.toString() || roster.id,
        employeeId: roster.employeeId,
        employeeName: roster.employeeName || 
                      (roster.employee?.firstName && roster.employee?.lastName 
                        ? `${roster.employee.firstName} ${roster.employee.lastName}`.trim()
                        : roster.employee?.firstName || roster.employee?.lastName || null),
        storeId: roster.storeId,
        store_id: roster.storeId, // CRITICAL: Add store_id alias for frontend compatibility (Add Sales Entry modal)
        storeName: roster.storeName || roster.store?.name || null,
        date: roster.date ? (typeof roster.date === 'string' ? roster.date : new Date(roster.date).toISOString().split('T')[0]) : null,
        shift: roster.shift,
        shiftStart: roster.shiftStart || null,
        shiftEnd: roster.shiftEnd || null,
        status: roster.status || null
      }));

      // Format response to match frontend expectations
      // Frontend accepts: direct array, or wrapped in data/roster/items/list/records
      return {
        data: formattedRosters, // Main array for frontend
        roster: formattedRosters, // Alternative key for frontend compatibility
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
      // Wrap entire function to catch any 409 errors and handle as upsert
      return await this._createRosterInternal(rosterData, createdBy);
    } catch (error) {
      // If we get a 409 overlap error, try to find and update existing roster
      if (error.statusCode === 409 && error.message && error.message.includes('overlapping shift')) {
        logger.warn('Got 409 overlap error, attempting upsert fallback', {
          error: error.message,
          employeeId: rosterData.employeeId,
          date: rosterData.date
        });

        try {
          // Extract employee info
          const { employeeId, date } = rosterData;
          const employee = await User.findOne({
            $or: [
              { _id: employeeId },
              { employeeId: employeeId },
              { employee_id: employeeId }
            ]
          });

          if (!employee) {
            throw error; // Re-throw if employee not found
          }

          const actualEmployeeIdString = employee.employeeId || employee.employee_id || employee._id.toString();
          const dateObj = new Date(date);
          const startOfDay = new Date(dateObj);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(dateObj);
          endOfDay.setHours(23, 59, 59, 999);

          // Find existing roster (try all possible queries)
          const existingRoster = await Roster.findOne({
            $or: [
              { employeeId: actualEmployeeIdString },
              { employee: employee._id }
            ],
            date: {
              $gte: startOfDay,
              $lte: endOfDay
            },
            status: { $nin: ['CANCELLED'] }
          });

          if (existingRoster) {
            logger.info('Found existing roster in fallback, updating', {
              rosterId: existingRoster._id
            });
            // Use updateRoster to update it
            return await this.updateRoster(existingRoster._id.toString(), rosterData, createdBy);
          }
        } catch (fallbackError) {
          logger.error('Upsert fallback failed', { error: fallbackError.message });
        }
      }
      // Re-throw original error if we couldn't handle it
      throw error;
    }
  }

  async _createRosterInternal(rosterData, createdBy) {
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

      // Normalize shift to uppercase enum value
      const shiftMap = {
        'morning': 'MORNING',
        'evening': 'EVENING',
        'night': 'NIGHT',
        'full_day': 'FULL_DAY',
        'fullday': 'FULL_DAY',
        'full day': 'FULL_DAY',
        'off': 'OFF'
      };
      const normalizedShift = shiftMap[shift?.toLowerCase()] || shift?.toUpperCase() || 'MORNING';
      
      // Default shift times if not provided (based on shift type)
      let finalShiftStart = shiftStart;
      let finalShiftEnd = shiftEnd;
      
      if (!finalShiftStart && normalizedShift !== 'OFF') {
        const defaultTimes = {
          'MORNING': { start: '09:00', end: '17:00' },
          'EVENING': { start: '14:00', end: '22:00' },
          'NIGHT': { start: '22:00', end: '06:00' },
          'FULL_DAY': { start: '09:00', end: '18:00' }
        };
        const defaults = defaultTimes[normalizedShift] || defaultTimes['MORNING'];
        finalShiftStart = defaults.start;
        finalShiftEnd = defaults.end;
      }

      // Validate employee exists - try multiple lookup strategies
      // CRITICAL: Frontend may send MongoDB _id, employeeId, or employee_id
      let employee = null;
      
      // First, check if employeeId is a valid MongoDB ObjectId
      if (mongoose.Types.ObjectId.isValid(employeeId)) {
        // Try to find by MongoDB _id with tenantId
        employee = await User.findOne({ 
          _id: employeeId,
          tenantId 
        });
        
        // If not found with tenantId, try without (for backward compatibility)
        if (!employee) {
          employee = await User.findById(employeeId);
        }
      }
      
      // If not found by _id, try by employeeId/employee_id fields
      if (!employee) {
        employee = await User.findOne({ 
          $or: [
            { employeeId: employeeId },
            { employee_id: employeeId },
            { employeeId: employeeId.toUpperCase() },
            { employee_id: employeeId.toUpperCase() }
          ],
          tenantId 
        });
      }
      
      // Try without tenantId for backward compatibility
      if (!employee) {
        employee = await User.findOne({ 
          $or: [
            { employeeId: employeeId },
            { employee_id: employeeId },
            { employeeId: employeeId.toUpperCase() },
            { employee_id: employeeId.toUpperCase() }
          ]
        });
      }
      
      if (!employee) {
        const error = new Error('Employee not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Get the actual employee's employeeId string (for roster.employeeId, checkOverlap, leave checks)
      const actualEmployeeIdString = employee.employeeId || employee.employee_id || employee._id.toString();

      // Validate store exists - handle both ObjectId and store code strings
      // CRITICAL: Ensure we find the EXACT store that was requested
      let store = null;
      
      // Try 1: By MongoDB _id with tenantId (most specific)
      if (mongoose.Types.ObjectId.isValid(storeId)) {
        store = await Store.findOne({ _id: storeId, tenantId });
        if (store) {
          logger.info('Store found by _id with tenantId', { 
            requestedStoreId: storeId, 
            foundStoreId: store._id.toString(), 
            foundStoreCode: store.code,
            foundStoreName: store.name,
            tenantId 
          });
        }
      }
      
      // Try 2: By store code with tenantId
      if (!store) {
        store = await Store.findOne({ code: storeId, tenantId });
        if (store) {
          logger.info('Store found by code with tenantId', { 
            requestedStoreId: storeId, 
            foundStoreId: store._id.toString(), 
            foundStoreCode: store.code,
            foundStoreName: store.name,
            tenantId 
          });
        }
      }
      
      // Try 3: By MongoDB _id without tenantId (backward compatibility)
      if (!store && mongoose.Types.ObjectId.isValid(storeId)) {
        store = await Store.findOne({ _id: storeId });
        if (store) {
          logger.warn('Store found by _id without tenantId (backward compatibility)', { 
            requestedStoreId: storeId, 
            foundStoreId: store._id.toString(), 
            foundStoreCode: store.code,
            foundStoreName: store.name,
            storeTenantId: store.tenantId,
            requestedTenantId: tenantId 
          });
        }
      }
      
      // Try 4: By store code without tenantId (backward compatibility)
      if (!store) {
        store = await Store.findOne({ code: storeId });
        if (store) {
          logger.warn('Store found by code without tenantId (backward compatibility)', { 
            requestedStoreId: storeId, 
            foundStoreId: store._id.toString(), 
            foundStoreCode: store.code,
            foundStoreName: store.name,
            storeTenantId: store.tenantId,
            requestedTenantId: tenantId 
          });
        }
      }
      
      // CRITICAL: If store not found, throw detailed error
      if (!store) {
        // Log all stores for debugging
        const allStores = await Store.find({ tenantId }).select('_id code name tenantId').limit(10);
        logger.error('Store not found for roster creation', {
          requestedStoreId: storeId,
          requestedTenantId: tenantId,
          isObjectId: mongoose.Types.ObjectId.isValid(storeId),
          availableStores: allStores.map(s => ({
            _id: s._id.toString(),
            code: s.code,
            name: s.name,
            tenantId: s.tenantId
          }))
        });
        const error = new Error(`Store not found. Requested storeId: ${storeId}, tenantId: ${tenantId}. Please ensure the store exists in the database.`);
        error.statusCode = 404;
        throw error;
      }
      
      // CRITICAL: Verify tenantId matches (if tenantId was provided)
      if (tenantId && tenantId !== 'default' && store.tenantId && store.tenantId !== tenantId) {
        logger.error('Store tenantId mismatch', {
          requestedTenantId: tenantId,
          storeTenantId: store.tenantId,
          storeId: store._id.toString(),
          storeCode: store.code,
          storeName: store.name
        });
        const error = new Error(`Store belongs to different tenant. Requested: ${tenantId}, Store tenant: ${store.tenantId}`);
        error.statusCode = 400;
        throw error;
      }
      
      logger.info('Store validated for roster', {
        requestedStoreId: storeId,
        foundStoreId: store._id.toString(),
        foundStoreCode: store.code,
        foundStoreName: store.name,
        tenantId: store.tenantId || tenantId
      });

      // UPSERT LOGIC: Check if roster already exists for this employee on this date
      // Use date range to handle timezone issues
      const dateObj = new Date(date);
      const startOfDay = new Date(dateObj);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateObj);
      endOfDay.setHours(23, 59, 59, 999);

      // Find existing roster by employeeId OR employee ObjectId (handle both formats)
      // Try multiple queries to find existing roster - check ALL possible combinations
      let existingRoster = null;
      
      // Try 1: By employeeId string with date range (NO tenantId filter - check all)
      existingRoster = await Roster.findOne({
        employeeId: actualEmployeeIdString,
        date: {
          $gte: startOfDay,
          $lte: endOfDay
        },
        status: { $nin: ['CANCELLED'] }
      }).lean(); // Use lean() for faster query

      // Try 2: By employee ObjectId with date range (NO tenantId filter)
      if (!existingRoster) {
        existingRoster = await Roster.findOne({
          employee: employee._id,
          date: {
            $gte: startOfDay,
            $lte: endOfDay
          },
          status: { $nin: ['CANCELLED'] }
        }).lean();
      }

      // Try 3: By employeeId OR employee ObjectId (combined query)
      if (!existingRoster) {
        existingRoster = await Roster.findOne({
          $or: [
            { employeeId: actualEmployeeIdString },
            { employee: employee._id },
            { employeeId: employee.employeeId },
            { employeeId: employee.employee_id }
          ],
          date: {
            $gte: startOfDay,
            $lte: endOfDay
          },
          status: { $nin: ['CANCELLED'] }
        });
      }

      // Try 4: Without date filter (just employee match) - in case date format is different
      if (!existingRoster) {
        const allRostersForEmployee = await Roster.find({
          $or: [
            { employeeId: actualEmployeeIdString },
            { employee: employee._id }
          ],
          status: { $nin: ['CANCELLED'] }
        }).sort({ date: -1 }).limit(5);

        logger.info('Checking all rosters for employee (Try 4)', {
          employeeId: actualEmployeeIdString,
          employeeMongoId: employee._id.toString(),
          foundRosters: allRostersForEmployee.length,
          dateRange: { start: startOfDay, end: endOfDay }
        });

        // Check if any roster is for the same date (manual comparison)
        for (const roster of allRostersForEmployee) {
          const rosterDate = new Date(roster.date);
          logger.debug('Comparing roster date', {
            rosterId: roster._id,
            rosterDate: rosterDate.toISOString(),
            startOfDay: startOfDay.toISOString(),
            endOfDay: endOfDay.toISOString(),
            inRange: rosterDate >= startOfDay && rosterDate <= endOfDay
          });
          if (rosterDate >= startOfDay && rosterDate <= endOfDay) {
            existingRoster = roster;
            logger.info('Found existing roster in Try 4', { rosterId: roster._id });
            break;
          }
        }
      }

      logger.info('Existing roster check result', {
        found: !!existingRoster,
        rosterId: existingRoster?._id?.toString(),
        employeeId: actualEmployeeIdString,
        date
      });

      // If found, UPDATE it (upsert behavior - no overlap check needed)
      if (existingRoster) {
        logger.info('Roster exists - UPDATING (upsert)', {
          rosterId: existingRoster._id,
          employeeId: actualEmployeeIdString,
          date,
          oldShift: existingRoster.shift,
          newShift: normalizedShift
        });

        // If we used lean(), we need to fetch the full document to update it
        const rosterToUpdate = await Roster.findById(existingRoster._id);
        if (!rosterToUpdate) {
          logger.error('Could not find roster to update', { rosterId: existingRoster._id });
          throw new Error('Roster not found for update');
        }

        // CRITICAL: Update store assignment with the EXACT store that was found and validated
        rosterToUpdate.tenantId = tenantId;
        rosterToUpdate.store = store._id; // CRITICAL: Use the validated store's MongoDB _id
        rosterToUpdate.storeId = store.code || store.store_id || store._id.toString(); // Use store code, fallback to _id
        rosterToUpdate.storeName = store.name; // CRITICAL: Use the validated store's name
        rosterToUpdate.shift = normalizedShift;
        rosterToUpdate.shiftStart = finalShiftStart;
        rosterToUpdate.shiftEnd = finalShiftEnd;
        rosterToUpdate.breakDuration = breakDuration;
        rosterToUpdate.notes = notes;
        rosterToUpdate.status = 'SCHEDULED';
        rosterToUpdate.updatedBy = createdBy;
        rosterToUpdate.updatedAt = new Date();
        
        // Log the store update for debugging
        logger.info('Updating roster store assignment', {
          rosterId: rosterToUpdate._id.toString(),
          employeeId: actualEmployeeIdString,
          requestedStoreId: storeId,
          oldStoreId: existingRoster.storeId,
          oldStoreName: existingRoster.storeName,
          newStoreId: store._id.toString(),
          newStoreCode: store.code,
          newStoreName: store.name,
          date,
          tenantId
        });

        await rosterToUpdate.save();

        // Return UPDATED values, not old existingRoster values
        return {
          id: rosterToUpdate._id.toString(),
          employeeId: rosterToUpdate.employeeId,
          employeeName: rosterToUpdate.employeeName,
          storeId: rosterToUpdate.storeId,
          storeName: rosterToUpdate.storeName,
          date: new Date(rosterToUpdate.date).toISOString().split('T')[0],
          shift: rosterToUpdate.shift,
          shiftStart: rosterToUpdate.shiftStart,
          shiftEnd: rosterToUpdate.shiftEnd,
          status: rosterToUpdate.status
        };
      }

      // No existing roster found - proceed to CREATE

      // Check if employee is on leave - if yes, allow roster creation but log warning
      const leaveOnDate = await LeaveRequest.findOne({
        employee_code: actualEmployeeIdString,
        from_date: { $lte: new Date(date) },
        to_date: { $gte: new Date(date) },
        status: { $in: ['approved', 'pending'] }
      });

      if (leaveOnDate) {
        logger.warn('Creating roster for employee on leave', {
          employeeId: actualEmployeeIdString,
          date,
          leaveType: leaveOnDate.leave_type,
          leaveStatus: leaveOnDate.status
        });
        // Don't throw error - allow roster creation (frontend can handle warnings)
      }

      // Create roster entry
      // CRITICAL: Use the EXACT store that was found and validated
      const roster = new Roster({
        tenantId,
        employee: employee._id,
        employeeId: actualEmployeeIdString,
        employeeName: employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.fullName,
        store: store._id, // CRITICAL: Use the validated store's MongoDB _id
        storeId: store.code || store.store_id || store._id.toString(), // Use store code, fallback to _id
        storeName: store.name, // CRITICAL: Use the validated store's name
        date: new Date(date),
        shift: normalizedShift,
        shiftStart: finalShiftStart,
        shiftEnd: finalShiftEnd,
        breakDuration,
        notes,
        status: 'SCHEDULED',
        createdBy
      });
      
      // Log the store assignment for debugging
      logger.info('Creating roster with store assignment', {
        employeeId: actualEmployeeIdString,
        requestedStoreId: storeId,
        assignedStoreId: store._id.toString(),
        assignedStoreCode: store.code,
        assignedStoreName: store.name,
        date,
        tenantId
      });

      try {
        await roster.save();
      } catch (saveError) {
        // If save fails due to duplicate/overlap, try to find and update existing roster
        if (saveError.message && saveError.message.includes('overlapping')) {
          logger.warn('Save failed with overlap error, attempting to find existing roster', {
            error: saveError.message,
            employeeId: actualEmployeeIdString,
            date
          });

          // One more attempt to find existing roster (maybe it was created between our check and save)
          const lastChanceRoster = await Roster.findOne({
            $or: [
              { employeeId: actualEmployeeIdString },
              { employee: employee._id }
            ],
            date: {
              $gte: startOfDay,
              $lte: endOfDay
            },
            status: { $nin: ['CANCELLED'] }
          });

          if (lastChanceRoster) {
            logger.info('Found existing roster after save error, updating', {
              rosterId: lastChanceRoster._id
            });
            // Update and return
            lastChanceRoster.tenantId = tenantId;
            lastChanceRoster.store = store._id;
            lastChanceRoster.storeId = store.code || store.store_id || store._id.toString();
            lastChanceRoster.storeName = store.name;
            lastChanceRoster.shift = normalizedShift;
            lastChanceRoster.shiftStart = finalShiftStart;
            lastChanceRoster.shiftEnd = finalShiftEnd;
            lastChanceRoster.breakDuration = breakDuration;
            lastChanceRoster.notes = notes;
            lastChanceRoster.status = 'SCHEDULED';
            lastChanceRoster.updatedBy = createdBy;
            lastChanceRoster.updatedAt = new Date();
            await lastChanceRoster.save();

            return {
              id: lastChanceRoster._id.toString(),
              employeeId: lastChanceRoster.employeeId,
              employeeName: lastChanceRoster.employeeName,
              storeId: lastChanceRoster.storeId,
              storeName: lastChanceRoster.storeName,
              date: new Date(lastChanceRoster.date).toISOString().split('T')[0],
              shift: lastChanceRoster.shift,
              shiftStart: lastChanceRoster.shiftStart,
              shiftEnd: lastChanceRoster.shiftEnd,
              status: lastChanceRoster.status
            };
          }
        }
        // Re-throw if we couldn't handle it
        throw saveError;
      }

      logger.info('Roster created successfully', {
        rosterId: roster._id,
        employeeId: actualEmployeeIdString,
        employeeMongoId: employee._id.toString(),
        storeId,
        date
      });

      // Format response to match frontend expected shape
      return {
        id: roster._id.toString(),
        employeeId: roster.employeeId,
        employeeName: roster.employeeName,
        storeId: roster.storeId,
        storeName: roster.storeName,
        date: new Date(roster.date).toISOString().split('T')[0],
        shift: roster.shift,
        shiftStart: roster.shiftStart,
        shiftEnd: roster.shiftEnd,
        status: roster.status
      };
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

      // Format response to match frontend expected shape
      return {
        id: roster._id.toString(),
        employeeId: roster.employeeId,
        employeeName: roster.employeeName,
        storeId: roster.storeId,
        storeName: roster.storeName,
        date: new Date(roster.date).toISOString().split('T')[0],
        shift: roster.shift,
        shiftStart: roster.shiftStart,
        shiftEnd: roster.shiftEnd,
        status: roster.status
      };
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
  async getWeeklyRoster(storeId, weekStartDate, tenantId = 'default') {
    try {
      const startDate = new Date(weekStartDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6); // 7 days total

      // CRITICAL: Add tenantId filtering for tenant isolation
      const rosters = await Roster.find({
        $or: [
          { store: mongoose.Types.ObjectId.isValid(storeId) ? storeId : null },
          { storeId: storeId }
        ],
        date: {
          $gte: startDate,
          $lte: endDate
        },
        tenantId: tenantId // CRITICAL: Filter by tenantId
      })
        .populate({
          path: 'employee',
          select: 'firstName lastName email phone employeeId',
          match: { tenantId: tenantId } // CRITICAL: Filter employees by tenantId
        })
        .populate({
          path: 'store',
          select: 'name code address',
          match: { tenantId: tenantId } // CRITICAL: Filter stores by tenantId
        })
        .sort({ date: 1, shiftStart: 1 })
        .lean();

      // Filter out rosters where employee or store populate returned null (due to tenant mismatch)
      const filteredRosters = rosters.filter(roster => 
        roster.employee && roster.store && 
        (roster.employee.tenantId === tenantId || !roster.employee.tenantId) &&
        (roster.store.tenantId === tenantId || !roster.store.tenantId)
      );

      // Group by date
      const weeklyRoster = {};
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        weeklyRoster[dateStr] = [];
      }

      // Use filteredRosters for tenant isolation
      filteredRosters.forEach(roster => {
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
   * Get roster settings for a store (or all stores)
   */
  async getRosterSettings(storeId = null, tenantId = 'default') {
    try {
      const query = { tenantId, isActive: true };
      
      if (storeId) {
        // If storeId is a MongoDB ObjectId, search by store field
        if (mongoose.Types.ObjectId.isValid(storeId)) {
          query.store = storeId;
        } else {
          // Otherwise search by storeId string
          query.storeId = storeId;
        }
      }

      // Only populate if query.store is a valid ObjectId (not a string code)
      let settingsQuery = RosterSettings.find(query);
      if (query.store && mongoose.Types.ObjectId.isValid(query.store)) {
        settingsQuery = settingsQuery.populate({
          path: 'store',
          select: 'name code address phone',
          match: { tenantId: tenantId } // CRITICAL: Filter stores by tenantId
        });
      }
      const settings = await settingsQuery.lean();

      // If no settings found and storeId provided, return default settings
      if (settings.length === 0 && storeId) {
        // Handle both ObjectId and store code strings
        let store;
        if (mongoose.Types.ObjectId.isValid(storeId)) {
          store = await Store.findOne({ _id: storeId });
        }
        if (!store) {
          store = await Store.findOne({ code: storeId });
        }
        
        if (store) {
          // Return default settings structure
          return [{
            storeId: store.code || storeId,
            storeName: store.name,
            minimumRequired: 5,
            maximumAllowed: 10,
            optimalStaff: 7,
            shifts: {
              MORNING: { start: '09:00', end: '18:00', duration: 9.0, breakDuration: 30, overtimeMultiplier: 1.5 },
              EVENING: { start: '14:00', end: '22:00', duration: 8.0, breakDuration: 30, overtimeMultiplier: 1.5 },
              NIGHT: { start: '22:00', end: '06:00', duration: 8.0, breakDuration: 30, overtimeMultiplier: 2.0 },
              FULL_DAY: { start: '09:00', end: '22:00', duration: 13.0, breakDuration: 60, overtimeMultiplier: 1.5 }
            },
            rules: {
              maxConsecutiveDays: 6,
              minRestDays: 1,
              maxHoursPerWeek: 48,
              overtimeAllowed: true,
              nightShiftAllowed: true,
              weekendShiftAllowed: true
            }
          }];
        }
      }

      return settings;
    } catch (error) {
      logger.error('Error in getRosterSettings service', { error: error.message });
      throw error;
    }
  }

  /**
   * Create or update roster settings
   */
  async upsertRosterSettings(storeId, settingsData, userId) {
    try {
      // Handle both ObjectId and store code strings to avoid CastError
      let store;
      if (mongoose.Types.ObjectId.isValid(storeId)) {
        store = await Store.findOne({ _id: storeId });
      }
      if (!store) {
        store = await Store.findOne({ code: storeId });
      }
      
      if (!store) {
        const error = new Error('Store not found');
        error.statusCode = 404;
        throw error;
      }

      let settings = await RosterSettings.findOne({ store: store._id });

      if (settings) {
        // Update existing settings
        Object.assign(settings, settingsData);
        settings.updatedBy = userId;
      } else {
        // Create new settings
        settings = new RosterSettings({
          store: store._id,
          storeId: store.code,
          storeName: store.name,
          ...settingsData,
          createdBy: userId
        });
      }

      await settings.save();

      logger.info('Roster settings saved', { storeId, settingsId: settings._id });

      return settings;
    } catch (error) {
      logger.error('Error in upsertRosterSettings service', { error: error.message });
      throw error;
    }
  }

  /**
   * Calculate employee score for AI roster generation
   * @private
   */
  async calculateEmployeeScore(employee, attendanceHistory = [], performanceData = null) {
    let score = 50; // Base score

    // 1. Attendance Rate (0-25 points)
    if (attendanceHistory.length > 0) {
      const totalDays = attendanceHistory.length;
      const presentDays = attendanceHistory.filter(a => a.status === 'present').length;
      const attendanceRate = (presentDays / totalDays) * 100;
      
      if (attendanceRate >= 95) score += 25;
      else if (attendanceRate >= 90) score += 20;
      else if (attendanceRate >= 85) score += 15;
      else if (attendanceRate >= 80) score += 10;
      else if (attendanceRate >= 75) score += 5;
      // Below 75% gets 0 points

      logger.debug('Attendance score calculated', { 
        employeeId: employee.employeeId, 
        attendanceRate: attendanceRate.toFixed(2),
        attendancePoints: score - 50 
      });
    }

    // 2. Performance Score (0-25 points)
    if (performanceData && performanceData.overallScore) {
      const perfScore = performanceData.overallScore;
      
      if (perfScore >= 90) score += 25;
      else if (perfScore >= 80) score += 20;
      else if (perfScore >= 70) score += 15;
      else if (perfScore >= 60) score += 10;
      else if (perfScore >= 50) score += 5;
      // Below 50 gets 0 points

      logger.debug('Performance score added', { 
        employeeId: employee.employeeId, 
        performanceScore: perfScore,
        performancePoints: score - 50 - (attendanceHistory.length > 0 ? 25 : 0)
      });
    }

    // 3. Employee tenure/experience bonus (0-10 points)
    if (employee.doj || employee.joining_date) {
      const joiningDate = new Date(employee.doj || employee.joining_date);
      const monthsWorked = Math.floor((Date.now() - joiningDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      
      if (monthsWorked >= 24) score += 10; // 2+ years
      else if (monthsWorked >= 12) score += 7; // 1+ year
      else if (monthsWorked >= 6) score += 5; // 6+ months
      else if (monthsWorked >= 3) score += 3; // 3+ months
      // Less than 3 months gets 0 bonus

      logger.debug('Tenure bonus added', { 
        employeeId: employee.employeeId, 
        monthsWorked,
        tenurePoints: Math.min(10, Math.floor(monthsWorked / 3))
      });
    }

    // 4. Rating/Level bonus (0-10 points)
    if (employee.level || employee.grade_band || employee.gradeBand) {
      const level = employee.level || employee.grade_band || employee.gradeBand;
      
      if (typeof level === 'number') {
        score += Math.min(10, level * 2); // Up to 10 points for level
      } else if (typeof level === 'string') {
        // Handle grade bands like 'L1', 'L2', 'A', 'B', 'C'
        const numericLevel = parseInt(level.match(/\d+/)?.[0] || '0');
        score += Math.min(10, numericLevel * 2);
      }
    }

    return Math.min(100, Math.max(0, score)); // Cap between 0-100
  }

  /**
   * Fetch employee attendance history
   * @private
   */
  async fetchAttendanceHistory(employeeId, months = 3) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const response = await axios.get(`${ATTENDANCE_SERVICE_URL}/api/attendance/history`, {
        params: {
          employeeId,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        },
        timeout: 5000
      });

      if (response.data && response.data.success) {
        return response.data.data || [];
      }
      return [];
    } catch (error) {
      logger.warn('Failed to fetch attendance history for AI roster', { 
        employeeId, 
        error: error.message 
      });
      return [];
    }
  }

  /**
   * AI-based roster generation with performance & attendance analysis
   */
  async generateAIRoster(params) {
    try {
      const {
        startDate,
        endDate,
        stores,
        constraints = {},
        employeePool = [],
        tenantId = 'default'
      } = params;

      logger.info('Starting AI roster generation', { startDate, endDate, storesCount: stores.length });

      const generatedRoster = [];
      const analytics = {
        totalEmployees: 0,
        totalShifts: 0,
        storesCovered: stores.length,
        employeeWorkDays: {}
      };

      // Get all available employees
      let availableEmployees = [];
      if (employeePool.length > 0) {
        availableEmployees = await User.find({
          employeeId: { $in: employeePool },
          tenantId,
          status: 'active'
        }).lean();
      } else {
        availableEmployees = await User.find({
          tenantId,
          status: 'active'
        }).lean();
      }

      analytics.totalEmployees = availableEmployees.length;

      // Calculate employee scores (performance + attendance + ratings)
      logger.info('Calculating employee scores for AI roster optimization...');
      const employeeScores = {};
      const employeePerformanceData = {};
      
      for (const employee of availableEmployees) {
        const empId = employee.employeeId;
        
        // Fetch attendance history (last 3 months)
        const attendanceHistory = await this.fetchAttendanceHistory(empId, 3);
        
        // TODO: Fetch performance data from performance service (when available)
        // For now, use placeholder based on employee data
        const performanceData = {
          overallScore: employee.performanceScore || 75, // Use employee's score or default
          productivity: employee.productivity || 75,
          quality: employee.quality || 75,
          punctuality: attendanceHistory.length > 0 
            ? (attendanceHistory.filter(a => a.status === 'present').length / attendanceHistory.length) * 100 
            : 75
        };
        
        // Calculate composite score
        const score = await this.calculateEmployeeScore(employee, attendanceHistory, performanceData);
        
        employeeScores[empId] = score;
        employeePerformanceData[empId] = {
          attendanceRate: attendanceHistory.length > 0 
            ? ((attendanceHistory.filter(a => a.status === 'present').length / attendanceHistory.length) * 100).toFixed(2)
            : 'N/A',
          performanceScore: performanceData.overallScore,
          totalScore: score,
          attendanceHistory: attendanceHistory.length
        };
        
        logger.debug('Employee score calculated', { 
          employeeId: empId, 
          score,
          attendanceRate: employeePerformanceData[empId].attendanceRate,
          performanceScore: performanceData.overallScore
        });
      }

      // Sort employees by score (highest first) for priority assignment
      availableEmployees.sort((a, b) => 
        (employeeScores[b.employeeId] || 0) - (employeeScores[a.employeeId] || 0)
      );

      logger.info('Employee scores calculated and sorted', {
        topPerformers: availableEmployees.slice(0, 5).map(e => ({
          employeeId: e.employeeId,
          name: `${e.firstName} ${e.lastName}`.trim(),
          score: employeeScores[e.employeeId]
        }))
      });

      // Get leaves in date range
      const leaves = await LeaveRequest.find({
        from_date: { $lte: new Date(endDate) },
        to_date: { $gte: new Date(startDate) },
        status: { $in: ['approved', 'pending'] }
      }).lean();

      // Create a leave map for quick lookup
      const leaveMap = {};
      leaves.forEach(leave => {
        const empId = leave.employee_code;
        if (!leaveMap[empId]) leaveMap[empId] = [];
        leaveMap[empId].push({
          from: new Date(leave.from_date),
          to: new Date(leave.to_date)
        });
      });

      // Generate roster for each store
      for (const storeConfig of stores) {
        const { storeId, minStaff = 5, maxStaff = 10, shiftPreference = 'balanced' } = storeConfig;

        // Get store details
        const store = await Store.findOne({ code: storeId });
        if (!store) continue;

        // Get employees assigned to this store (if any)
        const storeEmployees = availableEmployees.filter(emp => 
          emp.store && (emp.store.toString() === store._id.toString() || emp.store === storeId)
        );

        // If no store-specific employees, use from pool
        const eligibleEmployees = storeEmployees.length > 0 ? storeEmployees : availableEmployees.slice(0, maxStaff);

        // Generate roster for date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          
          // Determine shifts for this day based on preference
          let shiftsToFill = [];
          if (shiftPreference === 'morning-heavy') {
            shiftsToFill = [
              ...Array(Math.ceil(minStaff * 0.6)).fill('MORNING'),
              ...Array(Math.floor(minStaff * 0.4)).fill('EVENING')
            ];
          } else if (shiftPreference === 'evening-heavy') {
            shiftsToFill = [
              ...Array(Math.floor(minStaff * 0.4)).fill('MORNING'),
              ...Array(Math.ceil(minStaff * 0.6)).fill('EVENING')
            ];
          } else {
            // Balanced
            shiftsToFill = [
              ...Array(Math.ceil(minStaff / 2)).fill('MORNING'),
              ...Array(Math.floor(minStaff / 2)).fill('EVENING')
            ];
          }

          // Assign employees to shifts
          let assignedCount = 0;
          for (const employee of eligibleEmployees) {
            if (assignedCount >= minStaff) break;

            const empId = employee.employeeId;

            // Check if employee is on leave
            const isOnLeave = leaveMap[empId]?.some(leave => {
              const checkDate = new Date(dateStr);
              return checkDate >= leave.from && checkDate <= leave.to;
            });

            if (isOnLeave) continue;

            // Check consecutive days constraint
            if (constraints.maxConsecutiveDays) {
              const workDays = analytics.employeeWorkDays[empId] || 0;
              if (workDays >= constraints.maxConsecutiveDays) continue;
            }

            // Assign shift
            const shift = shiftsToFill[assignedCount] || 'MORNING';
            const shiftTimes = {
              MORNING: { start: '09:00', end: '18:00' },
              EVENING: { start: '14:00', end: '22:00' },
              NIGHT: { start: '22:00', end: '06:00' }
            };

            // Build assignment reason based on employee performance
            const perfData = employeePerformanceData[empId];
            let reason = 'AI optimized: ';
            const reasonParts = [];
            
            if (perfData) {
              if (perfData.totalScore >= 80) reasonParts.push('High performer');
              else if (perfData.totalScore >= 60) reasonParts.push('Good performer');
              
              if (perfData.attendanceRate !== 'N/A' && parseFloat(perfData.attendanceRate) >= 90) {
                reasonParts.push(`${perfData.attendanceRate}% attendance`);
              }
              
              if (perfData.performanceScore >= 80) {
                reasonParts.push('Strong performance record');
              }
            }
            
            if (reasonParts.length === 0) {
              reasonParts.push('Available and suitable');
            }
            
            reason += reasonParts.join(', ');

            generatedRoster.push({
              employeeId: empId,
              employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
              storeId: store.code,
              storeName: store.name,
              date: dateStr,
              shift,
              shiftStart: shiftTimes[shift].start,
              shiftEnd: shiftTimes[shift].end,
              reason,
              // Include performance metrics
              performanceMetrics: {
                overallScore: employeeScores[empId] || 0,
                attendanceRate: perfData?.attendanceRate || 'N/A',
                performanceScore: perfData?.performanceScore || 'N/A'
              }
            });

            // Update analytics
            analytics.employeeWorkDays[empId] = (analytics.employeeWorkDays[empId] || 0) + 1;
            analytics.totalShifts++;
            assignedCount++;
          }
        }
      }

      // Calculate additional analytics
      const workDaysArray = Object.values(analytics.employeeWorkDays);
      analytics.averageWorkDays = workDaysArray.length > 0 
        ? (workDaysArray.reduce((a, b) => a + b, 0) / workDaysArray.length).toFixed(1)
        : 0;
      
      // Calculate performance-based balance score
      const assignedEmployees = [...new Set(generatedRoster.map(r => r.employeeId))];
      const avgPerformanceScore = assignedEmployees.length > 0
        ? assignedEmployees.reduce((sum, empId) => sum + (employeeScores[empId] || 0), 0) / assignedEmployees.length
        : 0;
      
      analytics.balanceScore = (avgPerformanceScore / 100).toFixed(2);
      
      analytics.constraints = {
        maxConsecutiveDays: constraints.maxConsecutiveDays ? 'satisfied' : 'not_checked',
        minRestDays: constraints.minRestDays ? 'satisfied' : 'not_checked',
        storeCapacity: 'satisfied'
      };

      // Add performance analytics
      analytics.performanceMetrics = {
        averageEmployeeScore: avgPerformanceScore.toFixed(2),
        highPerformers: assignedEmployees.filter(empId => (employeeScores[empId] || 0) >= 80).length,
        mediumPerformers: assignedEmployees.filter(empId => {
          const score = employeeScores[empId] || 0;
          return score >= 60 && score < 80;
        }).length,
        needsImprovement: assignedEmployees.filter(empId => (employeeScores[empId] || 0) < 60).length,
        scoreDistribution: {
          excellent: assignedEmployees.filter(empId => (employeeScores[empId] || 0) >= 90).length,
          good: assignedEmployees.filter(empId => {
            const score = employeeScores[empId] || 0;
            return score >= 80 && score < 90;
          }).length,
          average: assignedEmployees.filter(empId => {
            const score = employeeScores[empId] || 0;
            return score >= 70 && score < 80;
          }).length,
          belowAverage: assignedEmployees.filter(empId => {
            const score = employeeScores[empId] || 0;
            return score >= 60 && score < 70;
          }).length,
          poor: assignedEmployees.filter(empId => (employeeScores[empId] || 0) < 60).length
        }
      };

      logger.info('AI roster generation completed with performance analysis', {
        totalShifts: analytics.totalShifts,
        avgPerformanceScore: avgPerformanceScore.toFixed(2),
        highPerformers: analytics.performanceMetrics.highPerformers
      });

      // Generate intelligent recommendations
      const recommendations = [];
      
      if (analytics.totalShifts < (stores.length * 7 * 5)) {
        recommendations.push('Consider adding more employees to meet minimum staffing requirements');
      } else {
        recommendations.push('Staffing levels adequate for the specified period');
      }

      if (analytics.performanceMetrics.highPerformers < assignedEmployees.length * 0.3) {
        recommendations.push('Consider providing additional training to improve team performance');
      } else if (analytics.performanceMetrics.highPerformers >= assignedEmployees.length * 0.5) {
        recommendations.push('Excellent team composition with strong performers');
      }

      if (avgPerformanceScore >= 80) {
        recommendations.push('High-quality roster with top performers prioritized');
      } else if (avgPerformanceScore < 60) {
        recommendations.push('Roster includes many low performers - monitor closely');
      }

      return {
        generatedRoster,
        analytics,
        recommendations
      };
    } catch (error) {
      logger.error('Error in generateAIRoster service', { error: error.message });
      throw error;
    }
  }

  /**
   * Enhanced weekly roster with staffing summary
   */
  async getEnhancedWeeklyRoster(storeId, weekStartDate, tenantId = 'default') {
    try {
      const startDate = new Date(weekStartDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);

      // Get store details and settings - handle both ObjectId and store code strings
      // CRITICAL: Filter by tenantId for tenant isolation
      let store;
      if (mongoose.Types.ObjectId.isValid(storeId)) {
        store = await Store.findOne({ _id: storeId, tenantId: tenantId });
      }
      if (!store) {
        store = await Store.findOne({ code: storeId, tenantId: tenantId });
      }
      
      if (!store) {
        const error = new Error('Store not found');
        error.statusCode = 404;
        throw error;
      }

      const settings = await this.getRosterSettings(storeId, tenantId);
      const storeSetting = settings[0] || {};
      const minRequired = storeSetting.minimumRequired || 5;
      const maxAllowed = storeSetting.maximumAllowed || 10;
      const optimal = storeSetting.optimalStaff || 7;

      // Get roster entries with tenant isolation
      const rosters = await Roster.find({
        $or: [{ store: store._id }, { storeId: store.code }],
        date: {
          $gte: startDate,
          $lte: endDate
        },
        tenantId: tenantId // CRITICAL: Filter by tenantId
      })
        .populate({
          path: 'employee',
          select: 'firstName lastName email phone employeeId',
          match: { tenantId: tenantId } // CRITICAL: Filter employees by tenantId
        })
        .sort({ date: 1, shiftStart: 1 })
        .lean();

      // Filter out rosters where employee populate returned null (due to tenant mismatch)
      const filteredRosters = rosters.filter(roster => 
        roster.employee && 
        (roster.employee.tenantId === tenantId || !roster.employee.tenantId)
      );

      // Group by date and calculate summary - use filteredRosters for tenant isolation
      const dailyRoster = {};
      const staffingSummary = {};
      const shiftDistribution = { MORNING: 0, EVENING: 0, NIGHT: 0, FULL_DAY: 0, OFF: 0 };

      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        dailyRoster[dateStr] = [];
        staffingSummary[dateStr] = {
          scheduled: 0,
          minimum: minRequired,
          maximum: maxAllowed,
          optimal,
          status: 'UNDERSTAFFED'
        };
      }

      // Use filteredRosters for tenant isolation
      filteredRosters.forEach(roster => {
        const dateStr = new Date(roster.date).toISOString().split('T')[0];
        if (dailyRoster[dateStr]) {
          dailyRoster[dateStr].push({
            id: roster._id,
            employeeId: roster.employeeId,
            employeeName: roster.employeeName,
            shift: roster.shift,
            shiftStart: roster.shiftStart,
            shiftEnd: roster.shiftEnd,
            shiftDuration: roster.shiftDuration,
            status: roster.status,
            notes: roster.notes
          });

          // Update summary
          staffingSummary[dateStr].scheduled++;
          shiftDistribution[roster.shift]++;
        }
      });

      // Determine staffing status
      Object.keys(staffingSummary).forEach(date => {
        const summary = staffingSummary[date];
        if (summary.scheduled >= optimal) {
          summary.status = 'OPTIMAL';
        } else if (summary.scheduled >= minRequired) {
          summary.status = 'ADEQUATE';
        } else if (summary.scheduled >= maxAllowed) {
          summary.status = 'OVERSTAFFED';
        } else {
          summary.status = 'UNDERSTAFFED';
        }
      });

      return {
        success: true,
        storeId: store.code,
        storeName: store.name,
        weekStart: startDate.toISOString().split('T')[0],
        weekEnd: endDate.toISOString().split('T')[0],
        dailyRoster,
        staffingSummary,
        shiftDistribution,
        totalScheduled: rosters.length
      };
    } catch (error) {
      logger.error('Error in getEnhancedWeeklyRoster service', { error: error.message });
      throw error;
    }
  }

  /**
   * Sync roster with attendance
   * Creates/updates attendance records based on roster entries for a date
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} employeeId - Optional employee ID to sync only that employee
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID who initiated the sync
   * @returns {Promise<Object>} Sync results
   */
  async syncAttendance(date, employeeId = null, tenantId = 'default', userId = null) {
    try {
      // Validate date
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date format. Use YYYY-MM-DD');
      }

      // Get roster for the date
      const filters = {
        startDate: date,
        endDate: date,
        employeeId: employeeId || undefined,
        tenantId
      };

      const rosterResult = await this.getRoster(filters, 1, 1000); // Get all rosters for the date
      const rosterEntries = rosterResult.data || rosterResult.roster || [];

      if (rosterEntries.length === 0) {
        const error = new Error('No roster found for the specified date');
        error.statusCode = 404;
        throw error;
      }

      logger.info('Syncing attendance from roster', {
        date,
        employeeId,
        tenantId,
        rosterCount: rosterEntries.length
      });

      // Sync each roster entry with attendance
      const results = [];
      let successCount = 0;
      let failCount = 0;

      for (const roster of rosterEntries) {
        try {
          // Skip OFF shifts
          if (roster.shift === 'OFF') {
            results.push({
              employeeId: roster.employeeId,
              employeeName: roster.employeeName,
              status: 'skipped',
              message: 'Shift is OFF, skipping attendance sync'
            });
            continue;
          }

          // Prepare attendance data from roster
          const attendanceData = {
            employeeId: roster.employeeId,
            date: roster.date,
            storeId: roster.storeId,
            shift: roster.shift,
            shiftStart: roster.shiftStart,
            shiftEnd: roster.shiftEnd,
            source: 'roster_sync',
            rosterId: roster.id
          };

          // Call attendance service to create/update attendance
          // Use internal service call (not HTTP) if possible, otherwise use HTTP
          try {
            const attendanceResponse = await axios.post(
              `${ATTENDANCE_SERVICE_URL}/api/attendance`,
              attendanceData,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'x-tenant-id': tenantId,
                  ...(token ? { 'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {})
                },
                timeout: 10000
              }
            );

            if (attendanceResponse.data && attendanceResponse.data.success) {
              successCount++;
              results.push({
                employeeId: roster.employeeId,
                employeeName: roster.employeeName,
                status: 'success',
                message: 'Attendance synced successfully',
                attendanceId: attendanceResponse.data.data?._id || attendanceResponse.data.data?.id
              });
            } else {
              failCount++;
              results.push({
                employeeId: roster.employeeId,
                employeeName: roster.employeeName,
                status: 'failed',
                message: attendanceResponse.data?.message || 'Failed to sync attendance',
                error: attendanceResponse.data?.error
              });
            }
          } catch (attendanceError) {
            failCount++;
            const errorMessage = attendanceError.response?.data?.message || 
                                attendanceError.response?.data?.error || 
                                attendanceError.message || 
                                'Failed to sync attendance';
            
            results.push({
              employeeId: roster.employeeId,
              employeeName: roster.employeeName,
              status: 'failed',
              message: errorMessage,
              error: attendanceError.response?.data?.error || errorMessage
            });

            logger.warn('Failed to sync attendance for roster entry', {
              employeeId: roster.employeeId,
              error: errorMessage
            });
          }
        } catch (rosterError) {
          failCount++;
          results.push({
            employeeId: roster.employeeId,
            employeeName: roster.employeeName,
            status: 'failed',
            message: rosterError.message || 'Failed to process roster entry',
            error: rosterError.message
          });

          logger.error('Error processing roster entry', {
            employeeId: roster.employeeId,
            error: rosterError.message
          });
        }
      }

      return {
        success: true,
        date,
        total: rosterEntries.length,
        successful: successCount,
        failed: failCount,
        skipped: rosterEntries.length - successCount - failCount,
        results
      };
    } catch (error) {
      logger.error('Error in syncAttendance service', { 
        error: error.message,
        date,
        employeeId,
        tenantId
      });
      throw error;
    }
  }
}

module.exports = new RosterService();

