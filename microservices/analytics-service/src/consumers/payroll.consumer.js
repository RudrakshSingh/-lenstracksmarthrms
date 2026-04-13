const { getKafkaService } = require('../../shared/services/kafka.service');
const { KAFKA_TOPICS, getConsumerGroup } = require('../../shared/config/kafka.config');
const logger = require('../config/logger');

let started = false;

async function startPayrollConsumers() {
  if (started || process.env.ENABLE_KAFKA_CONSUMERS !== 'true') return;
  try {
    const kafka = getKafkaService();
    await kafka.initialize();

    await kafka.subscribe(
      KAFKA_TOPICS.PAYROLL_PROCESSED,
      getConsumerGroup('analytics-service'),
      async (event) => {
        logger.info('Analytics consumer received payroll.processed', {
          employeeCode: event?.data?.employeeCode,
          month: event?.data?.month,
          year: event?.data?.year
        });
      }
    );

    await kafka.subscribe(
      KAFKA_TOPICS.SALARY_CALCULATED,
      getConsumerGroup('analytics-service'),
      async (event) => {
        logger.info('Analytics consumer received salary.calculated', {
          employeeCode: event?.data?.employeeCode || event?.data?.employee_id
        });
      }
    );

    started = true;
  } catch (error) {
    logger.error('Failed to start analytics payroll consumers', { error: error.message });
  }
}

module.exports = { startPayrollConsumers };
