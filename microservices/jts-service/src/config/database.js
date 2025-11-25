const mongoose = require('mongoose');
const logger = require('./logger');

let isConnected = false;

const connectDB = async () => {
  try {
    if (isConnected) {
      logger.info('Database already connected');
      return;
    }

    const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/etelios_jts`;
    
    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
      bufferMaxEntries: 0,
      bufferCommands: false
    };

    await mongoose.connect(mongoUri, options);
    
    isConnected = true;
    logger.info('JTS Service: MongoDB connected successfully', {
      database: mongoose.connection.name,
      host: mongoose.connection.host
    });

    // Connection event listeners
    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('JTS Service: MongoDB disconnected');
    });

    mongoose.connection.on('connected', () => {
      isConnected = true;
      logger.info('JTS Service: MongoDB reconnected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('JTS Service: MongoDB connection error', { error: err.message });
    });

  } catch (error) {
    isConnected = false;
    logger.error('JTS Service: Database connection failed', {
      error: error.message,
      note: 'Service will continue but database operations will fail'
    });
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('JTS Service: MongoDB disconnected');
  } catch (error) {
    logger.error('JTS Service: Error disconnecting from MongoDB', { error: error.message });
  }
};

module.exports = { connectDB, disconnectDB, isConnected: () => isConnected };

