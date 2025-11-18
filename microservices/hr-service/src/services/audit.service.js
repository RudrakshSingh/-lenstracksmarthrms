const AuditLog = require('../models/AuditLog.model');
const logger = require('../config/logger');

class AuditService {
  
  /**
   * Log an action
   */
  async logAction(action, entity, entityId, actorId, changes = {}, metadata = {}) {
    try {
      // Get snapshot before changes (if entity exists)
      let beforeSnapshot = null;
      if (entityId && entity) {
        // This would fetch the current state before changes
        // For now, we'll store the changes as the snapshot
        beforeSnapshot = changes;
      }
      
      const auditLog = new AuditLog({
        actor_id: actorId,
        action,
        entity,
        entity_id: entityId,
        snapshot: {
          before: beforeSnapshot,
          after: changes
        },
        metadata,
        ip_address: metadata.ip_address,
        user_agent: metadata.user_agent,
        timestamp: new Date()
      });
      
      await auditLog.save();
      
      logger.info(`Audit log created: ${action} on ${entity} ${entityId}`);
      return auditLog;
    } catch (error) {
      logger.error('Error creating audit log:', error);
      // Don't throw - audit logging should not break the main flow
      return null;
    }
  }
  
  /**
   * Get audit logs
   */
  async getAuditLogs(filters = {}) {
    try {
      const {
        entity,
        entity_id,
        actor_id,
        action,
        start_date,
        end_date,
        page = 1,
        limit = 50
      } = filters;
      
      const query = {};
      if (entity) query.entity = entity;
      if (entity_id) query.entity_id = entity_id;
      if (actor_id) query.actor_id = actor_id;
      if (action) query.action = action;
      if (start_date || end_date) {
        query.timestamp = {};
        if (start_date) query.timestamp.$gte = new Date(start_date);
        if (end_date) query.timestamp.$lte = new Date(end_date);
      }
      
      const logs = await AuditLog.find(query)
        .populate('actor_id', 'name email')
        .sort({ timestamp: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean(); // Use lean() for read-only queries
      
      const total = await AuditLog.countDocuments(query);
      
      return {
        logs,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_records: total
        }
      };
    } catch (error) {
      logger.error('Error getting audit logs:', error);
      throw error;
    }
  }
  
  /**
   * Check for retroactive changes
   */
  async checkRetroactiveChanges(entity, entityId, newDate, actorId) {
    try {
      // Find existing records with later dates
      const laterRecords = await AuditLog.find({
        entity,
        entity_id: entityId,
        'snapshot.after.date': { $gt: newDate },
        timestamp: { $lt: new Date() }
      }).sort({ timestamp: -1 });
      
      if (laterRecords.length > 0) {
        // Log alert
        await this.logAction(
          'RETRO_CHANGE_ALERT',
          entity,
          entityId,
          actorId,
          {
            new_date: newDate,
            affected_records: laterRecords.length
          },
          {
            alert_type: 'RETROACTIVE_CHANGE',
            severity: 'HIGH'
          }
        );
        
        return {
          has_retro_changes: true,
          affected_records: laterRecords.length,
          alerts: laterRecords
        };
      }
      
      return { has_retro_changes: false };
    } catch (error) {
      logger.error('Error checking retroactive changes:', error);
      throw error;
    }
  }
  
  /**
   * Verify consistency
   */
  async verifyConsistency(entity, entityId) {
    try {
      const logs = await AuditLog.find({
        entity,
        entity_id: entityId
      }).sort({ timestamp: 1 });
      
      const inconsistencies = [];
      
      // Check for gaps or inconsistencies in sequence
      for (let i = 1; i < logs.length; i++) {
        const prev = logs[i - 1];
        const curr = logs[i];
        
        // Check if timestamps are in order
        if (curr.timestamp < prev.timestamp) {
          inconsistencies.push({
            type: 'TIMESTAMP_ORDER',
            log_id: curr._id,
            message: 'Timestamp out of order'
          });
        }
      }
      
      return {
        consistent: inconsistencies.length === 0,
        inconsistencies
      };
    } catch (error) {
      logger.error('Error verifying consistency:', error);
      throw error;
    }
  }
}

module.exports = new AuditService();

