const logger = require('../config/logger');
const { getKafkaService } = require('../../shared/services/kafka.service');
const { KAFKA_TOPICS, createEvent } = require('../../shared/config/kafka.config');

async function publishPayrollEvent(topic, type, data = {}) {
  if (process.env.ENABLE_KAFKA_PRODUCER !== 'true') return;
  try {
    const kafka = getKafkaService();
    await kafka.initialize();
    const event = createEvent(type, data, {
      tenantId: data.tenantId,
      requestId: data.requestId
    });
    await kafka.publishEvent(topic, event, data.employeeCode || data.employee_id || data.employeeId || null);
  } catch (error) {
    logger.warn('Failed to publish payroll event', { topic, type, error: error.message });
  }
}

async function publishSalaryCalculated(data) {
  return publishPayrollEvent(KAFKA_TOPICS.SALARY_CALCULATED, 'salary.calculated', data);
}

async function publishPayrollProcessed(data) {
  return publishPayrollEvent(KAFKA_TOPICS.PAYROLL_PROCESSED, 'payroll.processed', data);
}

async function publishPayrollApproved(data) {
  return publishPayrollEvent(KAFKA_TOPICS.PAYROLL_APPROVED, 'payroll.approved', data);
}

module.exports = {
  publishSalaryCalculated,
  publishPayrollProcessed,
  publishPayrollApproved
};
