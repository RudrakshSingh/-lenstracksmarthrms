# Kafka Implementation Guide

## Overview

Kafka has been integrated into the Etelios microservices architecture for event-driven communication, real-time data streaming, and asynchronous processing.

## Architecture

### Components

1. **Zookeeper**: Coordinates Kafka brokers
2. **Kafka Broker**: Message broker for event streaming
3. **Kafka UI**: Web interface for monitoring (port 8080)
4. **Kafka Service**: Shared service library for all microservices

### Topics

Kafka topics are automatically created when first used. Predefined topics include:

- **User Events**: `user.created`, `user.updated`, `user.deleted`, `user.login`, `user.logout`
- **Employee Events**: `employee.created`, `employee.updated`, `employee.deleted`, `employee.transfer`
- **Attendance Events**: `attendance.checkin`, `attendance.checkout`, `attendance.approved`
- **Payroll Events**: `payroll.processed`, `salary.calculated`, `payroll.approved`
- **CRM Events**: `customer.created`, `customer.updated`, `order.created`, `order.updated`
- **Sales Events**: `sale.created`, `sale.completed`, `sale.cancelled`
- **Inventory Events**: `inventory.stock.updated`, `product.created`, `product.updated`
- **Notification Events**: `notification.sent`, `email.sent`, `sms.sent`
- **Document Events**: `document.uploaded`, `document.approved`, `document.rejected`
- **Audit Events**: `audit.log`, `security.event`
- **System Events**: `service.health`, `service.error`

## Setup

### 1. Install Dependencies

Add to your microservice's `package.json`:

```json
{
  "dependencies": {
    "kafkajs": "^2.2.4"
  }
}
```

Or install directly:

```bash
npm install kafkajs
```

### 2. Environment Variables

Add to your `.env` file:

```env
KAFKA_BROKERS=localhost:9092
# For Docker Compose:
KAFKA_BROKERS=kafka:29092
```

### 3. Using Kafka Service

#### Publishing Events

```javascript
const { getKafkaService } = require('../shared/services/kafka.service');
const { KAFKA_TOPICS, createEvent } = require('../shared/config/kafka.config');

// Initialize Kafka
const kafka = getKafkaService();
await kafka.initialize();

// Publish user created event
await kafka.publishEvent(
  KAFKA_TOPICS.USER_CREATED,
  createEvent('USER_CREATED', {
    userId: user._id,
    email: user.email,
    role: user.role
  }),
  user._id.toString() // Partition key
);
```

#### Consuming Events

```javascript
const { getKafkaService } = require('../shared/services/kafka.service');
const { KAFKA_TOPICS, getConsumerGroup } = require('../shared/config/kafka.config');

// Initialize Kafka
const kafka = getKafkaService();
await kafka.initialize();

// Subscribe to user events
await kafka.subscribe(
  KAFKA_TOPICS.USER_CREATED,
  getConsumerGroup('notification-service'),
  async (event, metadata) => {
    console.log('User created:', event.data);
    
    // Send welcome email
    await sendWelcomeEmail(event.data.email);
  }
);
```

## Integration Examples

### Auth Service - Publishing User Events

```javascript
// microservices/auth-service/src/controllers/authController.js
const { getKafkaService } = require('../../shared/services/kafka.service');
const { KAFKA_TOPICS, createEvent } = require('../../shared/config/kafka.config');

const register = async (req, res, next) => {
  try {
    // ... create user logic ...
    
    // Publish user created event
    const kafka = getKafkaService();
    await kafka.publishEvent(
      KAFKA_TOPICS.USER_CREATED,
      createEvent('USER_CREATED', {
        userId: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      }),
      user._id.toString()
    );
    
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
```

### Notification Service - Consuming Events

```javascript
// microservices/notification-service/src/consumers/user.consumer.js
const { getKafkaService } = require('../../shared/services/kafka.service');
const { KAFKA_TOPICS, getConsumerGroup } = require('../../shared/config/kafka.config');
const emailService = require('../services/email.service');

async function startUserEventConsumers() {
  const kafka = getKafkaService();
  await kafka.initialize();
  
  // Consume user created events
  await kafka.subscribe(
    KAFKA_TOPICS.USER_CREATED,
    getConsumerGroup('notification-service'),
    async (event) => {
      await emailService.sendWelcomeEmail(event.data.email, event.data.name);
    }
  );
  
  // Consume user login events
  await kafka.subscribe(
    KAFKA_TOPICS.USER_LOGIN,
    getConsumerGroup('notification-service'),
    async (event) => {
      // Send login notification if needed
      console.log('User logged in:', event.data.userId);
    }
  );
}

module.exports = { startUserEventConsumers };
```

### HR Service - Publishing Employee Events

```javascript
// microservices/hr-service/src/controllers/employee.controller.js
const { getKafkaService } = require('../../shared/services/kafka.service');
const { KAFKA_TOPICS, createEvent } = require('../../shared/config/kafka.config');

const createEmployee = async (req, res, next) => {
  try {
    // ... create employee logic ...
    
    // Publish employee created event
    const kafka = getKafkaService();
    await kafka.publishEvent(
      KAFKA_TOPICS.EMPLOYEE_CREATED,
      createEvent('EMPLOYEE_CREATED', {
        employeeId: employee._id,
        employeeCode: employee.employee_code,
        name: employee.name,
        department: employee.department
      }),
      employee._id.toString()
    );
    
    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    next(error);
  }
};
```

### Analytics Service - Consuming All Events

```javascript
// microservices/analytics-service/src/consumers/analytics.consumer.js
const { getKafkaService } = require('../../shared/services/kafka.service');
const { KAFKA_TOPICS, getConsumerGroup } = require('../../shared/config/kafka.config');
const analyticsService = require('../services/analytics.service');

async function startAnalyticsConsumers() {
  const kafka = getKafkaService();
  await kafka.initialize();
  
  // Consume all user events for analytics
  const userTopics = [
    KAFKA_TOPICS.USER_CREATED,
    KAFKA_TOPICS.USER_UPDATED,
    KAFKA_TOPICS.USER_LOGIN
  ];
  
  for (const topic of userTopics) {
    await kafka.subscribe(
      topic,
      getConsumerGroup('analytics-service'),
      async (event) => {
        await analyticsService.recordEvent(event.type, event.data);
      }
    );
  }
}

module.exports = { startAnalyticsConsumers };
```

## Starting Services

### Local Development

```bash
# Start Kafka infrastructure
docker-compose up -d zookeeper kafka kafka-ui

# Start your microservice
cd microservices/auth-service
npm start
```

### Docker Compose

```bash
# Start all services including Kafka
docker-compose up -d
```

## Monitoring

### Kafka UI

Access Kafka UI at: `http://localhost:8080`

Features:
- View topics and partitions
- Browse messages
- Monitor consumer groups
- View broker metrics

### Health Check

```javascript
const kafka = getKafkaService();
const health = await kafka.healthCheck();
console.log(health);
// {
//   connected: true,
//   producer: true,
//   consumers: 2,
//   brokers: 'localhost:9092'
// }
```

## Best Practices

### 1. Event Schema

Always use structured event data:

```javascript
const event = createEvent('USER_CREATED', {
  userId: user._id,
  email: user.email,
  role: user.role
}, {
  tenantId: user.tenantId,
  source: 'auth-service'
});
```

### 2. Error Handling

Always handle errors in consumers:

```javascript
await kafka.subscribe(
  KAFKA_TOPICS.USER_CREATED,
  getConsumerGroup('notification-service'),
  async (event) => {
    try {
      await processEvent(event);
    } catch (error) {
      logger.error('Error processing event', { error, event });
      // Don't throw - Kafka will retry
    }
  }
);
```

### 3. Idempotency

Make consumers idempotent:

```javascript
await kafka.subscribe(
  KAFKA_TOPICS.ORDER_CREATED,
  getConsumerGroup('inventory-service'),
  async (event) => {
    // Check if already processed
    const processed = await checkIfProcessed(event.metadata.eventId);
    if (processed) {
      return; // Skip
    }
    
    await processOrder(event.data);
    await markAsProcessed(event.metadata.eventId);
  }
);
```

### 4. Partition Keys

Use meaningful partition keys for ordering:

```javascript
// Same user events go to same partition (ordered)
await kafka.publishEvent(
  KAFKA_TOPICS.USER_UPDATED,
  event,
  userId.toString() // Partition key
);
```

## Production Considerations

### Azure Event Hubs (Kafka-compatible)

For production on Azure, use Event Hubs:

```env
KAFKA_BROKERS=your-namespace.servicebus.windows.net:9093
KAFKA_SECURITY_PROTOCOL=SASL_SSL
KAFKA_SASL_MECHANISM=PLAIN
KAFKA_SASL_USERNAME=$ConnectionString
KAFKA_SASL_PASSWORD=Endpoint=sb://...
```

### Scaling

- **Partitions**: Increase partitions for higher throughput
- **Consumer Groups**: Multiple consumers in same group for parallel processing
- **Replication**: Use replication factor > 1 for production

### Monitoring

- Monitor consumer lag
- Set up alerts for failed consumers
- Track event processing times
- Monitor broker health

## Troubleshooting

### Connection Issues

```bash
# Check Kafka is running
docker ps | grep kafka

# Check logs
docker logs kafka

# Test connection
docker exec -it kafka kafka-broker-api-versions --bootstrap-server localhost:9092
```

### Consumer Not Receiving Messages

1. Check consumer group is correct
2. Verify topic exists
3. Check consumer is subscribed
4. Verify offset is correct

### Performance Issues

1. Increase partitions
2. Add more consumers
3. Tune batch sizes
4. Optimize event payload size

## Next Steps

1. Integrate Kafka into each microservice
2. Set up event schemas
3. Implement idempotency checks
4. Add monitoring and alerts
5. Configure for production (Azure Event Hubs)

