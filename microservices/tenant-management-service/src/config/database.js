const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/etelios_tenant_management';
    
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
      bufferMaxEntries: 0,
      bufferCommands: false
    });

    logger.info('MongoDB connected successfully', {
      service: 'tenant-management-service',
      host: conn.connection.host,
      port: conn.connection.port,
      name: conn.connection.name
    });

    return conn;
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    console.error('Database connection failed:', error.message);
    throw error;
  }
};

module.exports = connectDB;

