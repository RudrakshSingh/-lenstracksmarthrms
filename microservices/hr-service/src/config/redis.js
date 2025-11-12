const Redis = require('ioredis');
const logger = require('./logger');

let redis = null;

/**
 * Parse Azure Redis connection string
 * Format: <hostname>:<port>,password=<password>,ssl=True,abortConnect=False
 * Or: :<port>,password=<password>,ssl=True,abortConnect=False (hostname missing)
 */
const parseRedisConnectionString = (connectionString) => {
  if (!connectionString) return null;

  const config = {};
  const parts = connectionString.split(',');

  // Parse host:port from first part
  const firstPart = parts[0].trim();
  if (firstPart.includes(':')) {
    const [host, port] = firstPart.split(':');
    if (host) config.host = host;
    if (port) config.port = parseInt(port);
  } else if (firstPart.startsWith(':')) {
    // Handle case where only port is provided
    config.port = parseInt(firstPart.substring(1));
  }

  // Parse other parameters
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();
    if (part.startsWith('password=')) {
      config.password = part.substring('password='.length);
    } else if (part.startsWith('ssl=')) {
      config.ssl = part.substring('ssl='.length).toLowerCase() === 'true';
    } else if (part.startsWith('abortConnect=')) {
      config.abortConnect = part.substring('abortConnect='.length).toLowerCase() === 'true';
    } else if (part.startsWith('host=')) {
      config.host = part.substring('host='.length);
    }
  }

  return config;
};

const connectRedis = () => {
  if (redis) return redis;

  // Check if Redis is disabled
  if (process.env.REDIS_DISABLED === '1') {
    logger.info('Redis is disabled, using in-memory fallback');
    return createInMemoryRedis();
  }

  let options = {
    db: parseInt(process.env.REDIS_DB) || 0,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      logger.warn(`Redis retry attempt ${times}, delay: ${delay}ms`);
      return delay;
    },
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000,
  };

  // Check for Azure Redis connection string (REDIS_URI or REDIS_CONNECTION_STRING)
  const connectionString = process.env.REDIS_URI || 
                          process.env.REDIS_CONNECTION_STRING || 
                          process.env.REDIS_PRIMARY_CONNECTION_STRING;
  
  if (connectionString) {
    const parsed = parseRedisConnectionString(connectionString);
    if (parsed) {
      if (parsed.host) options.host = parsed.host;
      if (parsed.port) options.port = parsed.port;
      if (parsed.password) options.password = parsed.password;
      if (parsed.ssl) {
        options.tls = {
          rejectUnauthorized: false // Azure Redis requires this
        };
      }
      logger.info('Using Azure Redis connection string', {
        host: parsed.host || 'from connection string',
        port: parsed.port,
        ssl: parsed.ssl
      });
    }
  } else {
    // Fallback to individual environment variables
    options.host = process.env.REDIS_HOST || 'localhost';
    options.port = parseInt(process.env.REDIS_PORT) || 6379;

    // Add authentication if provided
    if (process.env.REDIS_USERNAME) {
      options.username = process.env.REDIS_USERNAME;
    }
    if (process.env.REDIS_PASSWORD) {
      options.password = process.env.REDIS_PASSWORD;
    }

    // Add TLS if enabled
    if (process.env.REDIS_TLS === '1' || process.env.REDIS_TLS === 'true') {
      options.tls = {
        rejectUnauthorized: false
      };
    }
  }

  redis = new Redis(options);

  // Event listeners
  redis.on('connect', () => {
    logger.info('Redis connected successfully', {
      host: options.host,
      port: options.port,
      db: options.db
    });
  });

  redis.on('error', (err) => {
    logger.error('Redis connection error', { error: err.message });
  });

  redis.on('close', () => {
    logger.warn('Redis connection closed');
  });

  redis.on('reconnecting', (delay) => {
    logger.info(`Redis reconnecting in ${delay}ms`);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    try {
      await redis.quit();
      logger.info('Redis connection closed due to app termination');
    } catch (err) {
      logger.error('Error during Redis shutdown', { error: err.message });
    }
  });

  return redis;
};

// Redis store for rate limiting
const createRedisStore = () => {
  const client = connectRedis();
  
  return {
    async increment(key, windowMs) {
      const pipeline = client.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, Math.ceil(windowMs / 1000));
      const results = await pipeline.exec();
      return results[0][1];
    },
    
    async decrement(key) {
      return await client.decr(key);
    },
    
    async resetKey(key) {
      return await client.del(key);
    }
  };
};

// In-memory Redis fallback when Redis is disabled
const createInMemoryRedis = () => {
  const store = new Map();
  
  return {
    get: async (key) => store.get(key) || null,
    set: async (key, value, mode, duration) => {
      store.set(key, value);
      if (duration) {
        setTimeout(() => store.delete(key), duration * 1000);
      }
      return 'OK';
    },
    del: async (key) => {
      const existed = store.has(key);
      store.delete(key);
      return existed ? 1 : 0;
    },
    incr: async (key) => {
      const current = parseInt(store.get(key) || '0');
      const newValue = current + 1;
      store.set(key, newValue.toString());
      return newValue;
    },
    decr: async (key) => {
      const current = parseInt(store.get(key) || '0');
      const newValue = current - 1;
      store.set(key, newValue.toString());
      return newValue;
    },
    expire: async (key, seconds) => {
      if (store.has(key)) {
        setTimeout(() => store.delete(key), seconds * 1000);
        return 1;
      }
      return 0;
    },
    pipeline: () => {
      const commands = [];
      const pipeline = {
        incr: (key) => {
          commands.push(['incr', key]);
          return pipeline;
        },
        expire: (key, seconds) => {
          commands.push(['expire', key, seconds]);
          return pipeline;
        },
        exec: async () => {
          const results = [];
          for (const [cmd, ...args] of commands) {
            if (cmd === 'incr') {
              const current = parseInt(store.get(args[0]) || '0');
              const newValue = current + 1;
              store.set(args[0], newValue.toString());
              results.push([null, newValue]);
            } else if (cmd === 'expire') {
              if (store.has(args[0])) {
                setTimeout(() => store.delete(args[0]), args[1] * 1000);
                results.push([null, 1]);
              } else {
                results.push([null, 0]);
              }
            }
          }
          return results;
        }
      };
      return pipeline;
    },
    quit: async () => {
      store.clear();
      return 'OK';
    },
    on: () => {}, // No-op for event listeners
    connect: async () => {},
    disconnect: async () => {}
  };
};

module.exports = { connectRedis, createRedisStore };