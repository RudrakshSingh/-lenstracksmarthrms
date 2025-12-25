const mongoose = require('mongoose');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

const connectDB = async () => {
  try {
    let mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/etelios_hrms';

    // If DB_NAME is provided, ensure it matches the URI database name
    const dbName = process.env.DB_NAME;
    if (dbName) {
      // Extract database name from URI and validate
      const uriMatch = mongoURI.match(/\/([^/?]*)/);
      const uriDbName = uriMatch ? uriMatch[1] : null;
      if (uriDbName && uriDbName !== dbName) {
        logger.warn(`Database name mismatch: URI specifies '${uriDbName}', but DB_NAME is '${dbName}'`, {
          uriDbName,
          envDbName: dbName
        });
      }
    }

    // Validate MongoDB URI format
    if (!mongoURI.startsWith('mongodb://') && !mongoURI.startsWith('mongodb+srv://')) {
      logger.error('Invalid MongoDB URI scheme. URI must start with mongodb:// or mongodb+srv://', {
        providedURI: mongoURI.substring(0, 50) + '...'
      });
      throw new Error('Invalid scheme, expected connection string to start with "mongodb://" or "mongodb+srv://"');
    }
    
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 60000, // 60 seconds
      connectTimeoutMS: 30000, // 30 seconds
      maxPoolSize: 10, // Maximum connections
      minPoolSize: 2, // Minimum connections
      maxIdleTimeMS: 30000, // Close idle connections
      retryWrites: true,
      retryReads: true,
      // Optimize for performance
      bufferCommands: false,
      bufferMaxEntries: 0
    });

    logger.info('MongoDB connected successfully', {
      service: 'hrms-backend',
      host: conn.connection.host,
      port: conn.connection.port,
      name: conn.connection.name,
      replicaSet: conn.connection.replicaSet || 'none'
    });

    console.log('Database connected successfully');
    return conn;
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
