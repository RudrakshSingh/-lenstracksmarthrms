const { getKafkaService } = require('../../shared/services/kafka.service');
const { KAFKA_TOPICS, getConsumerGroup } = require('../../shared/config/kafka.config');
const logger = require('../config/logger');

let started = false;

async function startPayrollNotificationConsumers() {
  if (started || process.env.ENABLE_KAFKA_CONSUMERS !== 'true') return;
  try {
    const kafka = getKafkaService();
    await kafka.initialize();

    await kafka.subscribe(
      KAFKA_TOPICS.PAYROLL_PROCESSED,
      getConsumerGroup('notification-service'),
      async (event) => {
        logger.info('Notification consumer received payroll.processed', {
          employeeCode: event?.data?.employeeCode,
          month: event?.data?.month,
          year: event?.data?.year
        });
      }
    );

    await kafka.subscribe(
      KAFKA_TOPICS.PAYROLL_APPROVED,
      getConsumerGroup('notification-service'),
      async (event) => {
        logger.info('Notification consumer received payroll.approved', {
          employeeCode: event?.data?.employeeCode,
          month: event?.data?.month,
          year: event?.data?.year
        });
      }
    );
    started = true;
  } catch (error) {
    logger.error('Failed to start notification payroll consumers', { error: error.message });
  }
}

module.exports = { startPayrollNotificationConsumers };
