const { Kafka } = require('kafkajs');
const logger = require('../config/logger');

class EventBus {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.logger = logger(serviceName);
    this.producer = null;
    this.consumer = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Determine brokers - support Azure Event Hubs or local Kafka
      let brokers;
      if (process.env.KAFKA_BROKER) {
        brokers = [process.env.KAFKA_BROKER];
      } else if (process.env.KAFKA_BROKERS) {
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
        clientId: this.serviceName,
        brokers: brokers,
        retry: {
          initialRetryTime: 100,
          retries: 8
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

      const kafka = new Kafka(kafkaConfig);

      this.producer = kafka.producer();
      this.consumer = kafka.consumer({ groupId: `${this.serviceName}-group` });

      await this.producer.connect();
      await this.consumer.connect();
      
      this.isConnected = true;
      this.logger.info('EventBus connected', { service: this.serviceName });
    } catch (error) {
      this.logger.error('EventBus connection failed', { 
        service: this.serviceName, 
        error: error.message 
      });
      throw error;
    }
  }

  async publish(topic, event) {
    if (!this.isConnected) {
      throw new Error('EventBus not connected');
    }

    try {
      const message = {
        topic,
        messages: [{
          key: event.event_id || event.id,
          value: JSON.stringify({
            ...event,
            published_at: new Date().toISOString(),
            publisher: this.serviceName
          })
        }]
      };

      await this.producer.send(message);
      
      this.logger.info('Event published', {
        service: this.serviceName,
        topic,
        event_id: event.event_id || event.id
      });
    } catch (error) {
      this.logger.error('Event publish failed', {
        service: this.serviceName,
        topic,
        error: error.message
      });
      throw error;
    }
  }

  async subscribe(topics, handler) {
    if (!this.isConnected) {
      throw new Error('EventBus not connected');
    }

    try {
      await this.consumer.subscribe({ topics });
      
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const event = JSON.parse(message.value.toString());
            await handler(topic, event);
            
            this.logger.info('Event processed', {
              service: this.serviceName,
              topic,
              event_id: event.event_id || event.id
            });
          } catch (error) {
            this.logger.error('Event processing failed', {
              service: this.serviceName,
              topic,
              error: error.message
            });
          }
        }
      });

      this.logger.info('EventBus subscribed', {
        service: this.serviceName,
        topics
      });
    } catch (error) {
      this.logger.error('EventBus subscription failed', {
        service: this.serviceName,
        topics,
        error: error.message
      });
      throw error;
    }
  }

  async disconnect() {
    if (this.producer) {
      await this.producer.disconnect();
    }
    if (this.consumer) {
      await this.consumer.disconnect();
    }
    this.isConnected = false;
    this.logger.info('EventBus disconnected', { service: this.serviceName });
  }
}

module.exports = EventBus;