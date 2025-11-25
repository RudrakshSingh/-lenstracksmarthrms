const Redis = require('ioredis');
const logger = require('./logger');

let redisClient = null;
let redisConnection = null;

const connectRedis = () => {
  try {
    if (redisClient) {
      return redisClient;
    }

    const redisUrl = process.env.REDIS_URL || process.env.REDIS_URI || 'redis://localhost:6379';
    
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      }
    });

    redisClient.on('connect', () => {
      logger.info('JTS Service: Redis connected');
    });

    redisClient.on('error', (err) => {
      logger.error('JTS Service: Redis connection error', { error: err.message });
    });

    redisClient.on('close', () => {
      logger.warn('JTS Service: Redis connection closed');
    });

    redisConnection = redisClient;
    return redisClient;
  } catch (error) {
    logger.error('JTS Service: Failed to connect to Redis', { error: error.message });
    return null;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    return connectRedis();
  }
  return redisClient;
};

const disconnectRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      redisConnection = null;
      logger.info('JTS Service: Redis disconnected');
    }
  } catch (error) {
    logger.error('JTS Service: Error disconnecting from Redis', { error: error.message });
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  disconnectRedis,
  redisClient: () => redisClient
};

