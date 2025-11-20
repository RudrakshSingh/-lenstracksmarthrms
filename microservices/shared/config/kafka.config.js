/**
 * Kafka Configuration
 * Centralized Kafka topic and event definitions
 */

const KAFKA_TOPICS = {
  // User Events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  
  // Employee Events
  EMPLOYEE_CREATED: 'employee.created',
  EMPLOYEE_UPDATED: 'employee.updated',
  EMPLOYEE_DELETED: 'employee.deleted',
  EMPLOYEE_TRANSFER: 'employee.transfer',
  
  // Attendance Events
  ATTENDANCE_CHECKIN: 'attendance.checkin',
  ATTENDANCE_CHECKOUT: 'attendance.checkout',
  ATTENDANCE_APPROVED: 'attendance.approved',
  ATTENDANCE_REJECTED: 'attendance.rejected',
  
  // Payroll Events
  PAYROLL_PROCESSED: 'payroll.processed',
  SALARY_CALCULATED: 'salary.calculated',
  PAYROLL_APPROVED: 'payroll.approved',
  
  // CRM Events
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  
  // Sales Events
  SALE_CREATED: 'sale.created',
  SALE_COMPLETED: 'sale.completed',
  SALE_CANCELLED: 'sale.cancelled',
  
  // Inventory Events
  STOCK_UPDATED: 'inventory.stock.updated',
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  
  // Notification Events
  NOTIFICATION_SENT: 'notification.sent',
  EMAIL_SENT: 'email.sent',
  SMS_SENT: 'sms.sent',
  
  // Document Events
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_APPROVED: 'document.approved',
  DOCUMENT_REJECTED: 'document.rejected',
  
  // Audit Events
  AUDIT_LOG: 'audit.log',
  SECURITY_EVENT: 'security.event',
  
  // System Events
  SERVICE_HEALTH: 'service.health',
  SERVICE_ERROR: 'service.error'
};

const KAFKA_CONSUMER_GROUPS = {
  NOTIFICATION_SERVICE: 'notification-service',
  ANALYTICS_SERVICE: 'analytics-service',
  MONITORING_SERVICE: 'monitoring-service',
  AUDIT_SERVICE: 'audit-service',
  HR_SERVICE: 'hr-service',
  PAYROLL_SERVICE: 'payroll-service'
};

/**
 * Get topic name
 */
function getTopic(eventType) {
  return KAFKA_TOPICS[eventType] || eventType;
}

/**
 * Get consumer group
 */
function getConsumerGroup(serviceName) {
  return KAFKA_CONSUMER_GROUPS[serviceName] || `${serviceName}-consumer`;
}

/**
 * Create event payload
 */
function createEvent(type, data, metadata = {}) {
  return {
    type,
    data,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
      service: process.env.SERVICE_NAME || 'unknown',
      version: '1.0.0'
    }
  };
}

module.exports = {
  KAFKA_TOPICS,
  KAFKA_CONSUMER_GROUPS,
  getTopic,
  getConsumerGroup,
  createEvent
};

