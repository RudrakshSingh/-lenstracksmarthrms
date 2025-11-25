/**
 * Kafka Service - Event Streaming and Message Queue
 * Production-grade Kafka client for microservices communication
 */

const { Kafka, logLevel } = require('kafkajs');

// Simple logger fallback if not available
let logger = {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args)
};

// Try to use service logger if available
try {
  const path = require('path');
  const serviceLogger = require(path.join(process.cwd(), 'src', 'config', 'logger'));
  if (serviceLogger) logger = serviceLogger;
} catch (e) {
  // Use fallback logger
}

class KafkaService {
  constructor() {
    this.kafka = null;
    this.producer = null;
    this.consumers = new Map();
    this.isConnected = false;
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Initialize Kafka connection
   */
  async initialize() {
    try {
      // Determine brokers - support Azure Event Hubs or local Kafka
      let brokers;
      if (process.env.KAFKA_BROKERS) {
        brokers = process.env.KAFKA_BROKERS.split(',');
      } else if (process.env.EVENTHUB_CONNECTION_STRING) {
        // Extract broker from Azure Event Hub connection string
        const connectionString = process.env.EVENTHUB_CONNECTION_STRING;
        const match = connectionString.match(/Endpoint=sb:\/\/([^\/]+)/);
        if (match) {
          brokers = [`${match[1]}:9093`];
        } else {
          brokers = ['localhost:9092'];
        }
      } else {
        brokers = ['localhost:9092'];
      }

      // Check if using Azure Event Hubs (SASL_SSL)
      const isAzureEventHubs = process.env.KAFKA_SECURITY_PROTOCOL === 'SASL_SSL' || 
                                process.env.EVENTHUB_CONNECTION_STRING;

      // Get connection string for Azure Event Hubs
      const connectionString = process.env.EVENTHUB_CONNECTION_STRING || 
                               process.env.KAFKA_SASL_PASSWORD;

      // Build Kafka configuration
      const kafkaConfig = {
        clientId: process.env.SERVICE_NAME || 'etelios-service',
        brokers: brokers,
        retry: {
          retries: 8,
          initialRetryTime: 100,
          multiplier: 2,
          maxRetryTime: 30000
        },
        logLevel: this.isProduction ? logLevel.ERROR : logLevel.INFO,
        logCreator: () => ({ level, log }) => {
          const { message, ...extra } = log;
          if (level >= logLevel.ERROR) {
            logger.error('Kafka error', { message, ...extra });
          } else if (!this.isProduction) {
            logger.info('Kafka log', { message, ...extra });
          }
        }
      };

      // Add SSL and SASL configuration for Azure Event Hubs
      if (isAzureEventHubs && connectionString) {
        kafkaConfig.ssl = {
          rejectUnauthorized: false
        };
        kafkaConfig.sasl = {
          mechanism: process.env.KAFKA_SASL_MECHANISM || 'plain',
          username: process.env.KAFKA_SASL_USERNAME || '$ConnectionString',
          password: connectionString
        };
      }

      this.kafka = new Kafka(kafkaConfig);

      // Create producer
      this.producer = this.kafka.producer({
        allowAutoTopicCreation: true,
        transactionTimeout: 30000,
        maxInFlightRequests: 1,
        idempotent: true
      });

      await this.producer.connect();
      this.isConnected = true;
      
      if (!this.isProduction) {
        logger.info('Kafka producer connected', { brokers });
      }

      return true;
    } catch (error) {
      logger.error('Kafka initialization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Publish event to Kafka topic
   * @param {string} topic - Topic name
   * @param {object} event - Event data
   * @param {string} key - Optional partition key
   */
  async publishEvent(topic, event, key = null) {
    if (!this.isConnected || !this.producer) {
      await this.initialize();
    }

    try {
      const message = {
        topic,
        messages: [{
          key: key || event.id || event.userId || event.employeeId || null,
          value: JSON.stringify({
            ...event,
            timestamp: new Date().toISOString(),
            service: process.env.SERVICE_NAME || 'unknown',
            version: '1.0.0'
          }),
          headers: {
            'content-type': 'application/json',
            'event-type': event.type || 'unknown'
          }
        }]
      };

      await this.producer.send(message);
      
      if (!this.isProduction) {
        logger.info('Event published', { topic, eventType: event.type });
      }

      return true;
    } catch (error) {
      logger.error('Failed to publish event', { 
        topic, 
        error: error.message,
        eventType: event.type 
      });
      throw error;
    }
  }

  /**
   * Subscribe to Kafka topic
   * @param {string} topic - Topic name
   * @param {string} groupId - Consumer group ID
   * @param {function} handler - Event handler function
   * @param {object} options - Consumer options
   */
  async subscribe(topic, groupId, handler, options = {}) {
    if (!this.kafka) {
      await this.initialize();
    }

    try {
      const consumer = this.kafka.consumer({
        groupId: groupId || `${process.env.SERVICE_NAME || 'service'}-${topic}`,
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
        maxBytesPerPartition: 1048576, // 1MB
        minBytes: 1,
        maxBytes: 10485760, // 10MB
        maxWaitTimeInMs: 5000,
        ...options
      });

      await consumer.connect();
      await consumer.subscribe({ topic, fromBeginning: options.fromBeginning || false });

      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const event = JSON.parse(message.value.toString());
            const headers = {};
            
            if (message.headers) {
              Object.keys(message.headers).forEach(key => {
                headers[key] = message.headers[key].toString();
              });
            }

            await handler(event, {
              topic,
              partition,
              offset: message.offset,
              key: message.key?.toString(),
              headers,
              timestamp: message.timestamp
            });

            if (!this.isProduction) {
              logger.info('Event consumed', { 
                topic, 
                partition, 
                offset: message.offset,
                eventType: event.type 
              });
            }
          } catch (error) {
            logger.error('Error processing event', {
              topic,
              partition,
              offset: message.offset,
              error: error.message
            });
            // Don't throw - continue processing other messages
          }
        }
      });

      this.consumers.set(`${topic}-${groupId}`, consumer);
      
      if (!this.isProduction) {
        logger.info('Subscribed to topic', { topic, groupId });
      }

      return consumer;
    } catch (error) {
      logger.error('Failed to subscribe to topic', { 
        topic, 
        groupId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Unsubscribe from topic
   * @param {string} topic - Topic name
   * @param {string} groupId - Consumer group ID
   */
  async unsubscribe(topic, groupId) {
    const key = `${topic}-${groupId}`;
    const consumer = this.consumers.get(key);
    
    if (consumer) {
      await consumer.disconnect();
      this.consumers.delete(key);
      
      if (!this.isProduction) {
        logger.info('Unsubscribed from topic', { topic, groupId });
      }
    }
  }

  /**
   * Disconnect all Kafka connections
   */
  async disconnect() {
    try {
      // Disconnect all consumers
      for (const [key, consumer] of this.consumers.entries()) {
        await consumer.disconnect();
      }
      this.consumers.clear();

      // Disconnect producer
      if (this.producer) {
        await this.producer.disconnect();
        this.producer = null;
      }

      this.isConnected = false;
      
      if (!this.isProduction) {
        logger.info('Kafka disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting Kafka', { error: error.message });
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      connected: this.isConnected,
      producer: !!this.producer,
      consumers: this.consumers.size,
      brokers: process.env.KAFKA_BROKERS || 'localhost:9092'
    };
  }
}

// Singleton instance
let kafkaServiceInstance = null;

function getKafkaService() {
  if (!kafkaServiceInstance) {
    kafkaServiceInstance = new KafkaService();
  }
  return kafkaServiceInstance;
}

module.exports = {
  KafkaService,
  getKafkaService
};

