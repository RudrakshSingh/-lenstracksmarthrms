/**
 * Kafka Event Consumers for Auth Service
 * Example implementation for consuming events from other services
 */

const { getKafkaService } = require('../../shared/services/kafka.service');
const { KAFKA_TOPICS, getConsumerGroup } = require('../../shared/config/kafka.config');
const logger = require('../config/logger');

let kafkaConsumers = [];

/**
 * Start all Kafka consumers for auth service
 */
async function startKafkaConsumers() {
  try {
    const kafka = getKafkaService();
    await kafka.initialize();

    // Example: Consume employee events to sync user data
    if (process.env.ENABLE_EMPLOYEE_SYNC === 'true') {
      const employeeConsumer = await kafka.subscribe(
        KAFKA_TOPICS.EMPLOYEE_CREATED,
        getConsumerGroup('auth-service'),
        async (event, metadata) => {
          try {
            logger.info('Employee created event received', {
              employeeId: event.data.employeeId,
              eventId: metadata.offset
            });

            // Sync employee data to user if needed
            // This is just an example - implement your logic here
            // await syncEmployeeToUser(event.data);
          } catch (error) {
            logger.error('Error processing employee created event', {
              error: error.message,
              event
            });
          }
        }
      );
      kafkaConsumers.push(employeeConsumer);
    }

    logger.info('Kafka consumers started', {
      consumers: kafkaConsumers.length
    });
  } catch (error) {
    logger.error('Failed to start Kafka consumers', {
      error: error.message
    });
    // Don't throw - service can still work without Kafka
  }
}

/**
 * Stop all Kafka consumers
 */
async function stopKafkaConsumers() {
  try {
    const kafka = getKafkaService();
    await kafka.disconnect();
    kafkaConsumers = [];
    logger.info('Kafka consumers stopped');
  } catch (error) {
    logger.error('Error stopping Kafka consumers', {
      error: error.message
    });
  }
}

module.exports = {
  startKafkaConsumers,
  stopKafkaConsumers
};

