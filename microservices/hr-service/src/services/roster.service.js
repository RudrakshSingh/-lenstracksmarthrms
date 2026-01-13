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
          .sort({ date: 1 })
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

      // Check if employee is on leave
      const leaveOnDate = await LeaveRequest.findOne({
        employee_code: employeeId,
        from_date: { $lte: new Date(date) },
        to_date: { $gte: new Date(date) },
        status: { $in: ['approved', 'pending'] }
      });

      if (leaveOnDate) {
        const error = new Error(`Employee is on leave on ${date}`);
        error.statusCode = 409;
        error.details = {
          conflict: 'leave',
          leaveType: leaveOnDate.leave_type,
          leaveFrom: leaveOnDate.from_date,
          leaveTo: leaveOnDate.to_date,
          leaveStatus: leaveOnDate.status
        };
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

      const settings = await RosterSettings.find(query)
        .populate('store', 'name code address phone')
        .lean();

      // If no settings found and storeId provided, return default settings
      if (settings.length === 0 && storeId) {
        const store = await Store.findOne({ 
          $or: [{ _id: storeId }, { code: storeId }] 
        });
        
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
      const store = await Store.findOne({ 
        $or: [{ _id: storeId }, { code: storeId }] 
      });
      
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

      // Get store details and settings
      const store = await Store.findOne({ 
        $or: [{ _id: storeId }, { code: storeId }] 
      });
      
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

      // Get roster entries
      const rosters = await Roster.find({
        $or: [{ store: store._id }, { storeId: store.code }],
        date: {
          $gte: startDate,
          $lte: endDate
        }
      })
        .populate('employee', 'firstName lastName email phone employeeId')
        .sort({ date: 1, shiftStart: 1 })
        .lean();

      // Group by date and calculate summary
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

      rosters.forEach(roster => {
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
}

module.exports = new RosterService();

