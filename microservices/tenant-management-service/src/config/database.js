const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  try {
    // Support both MONGO_URI and MONGODB_URI (common variations)
    let mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    // Fallback to local MongoDB for development
    if (!mongoUri) {
      mongoUri = `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'tenant_management'}`;
      logger.warn('MONGO_URI not set. Using local MongoDB. Set MONGO_URI environment variable.');
    }
    
    // Get target database name - prioritize env vars, but ensure it's MAIN database
    let targetDbName = process.env.DB_NAME || process.env.MONGO_DB_NAME;
    
    // If no env var or env var contains "test", use main production database
    if (!targetDbName || targetDbName.toLowerCase().includes('test')) {
      targetDbName = 'tenant-db';
      if (process.env.MONGO_DB_NAME && process.env.MONGO_DB_NAME.toLowerCase().includes('test')) {
        logger.error('⚠️  ERROR: MONGO_DB_NAME contains "test"! Using main production database instead.', {
          provided: process.env.MONGO_DB_NAME,
          using: targetDbName
        });
      }
    }
    
    // Parse connection string to extract and set database name
    try {
      const url = new URL(mongoUri);
      const existingDbName = url.pathname ? url.pathname.substring(1).split('?')[0] : '';
      
      // Check if existing database name is test or empty
      if (!existingDbName || existingDbName.trim() === '' || existingDbName.toLowerCase().includes('test')) {
        if (existingDbName && existingDbName.toLowerCase().includes('test')) {
          logger.error('⚠️  ERROR: Connection string points to TEST database! Replacing with main production database.', {
            testDbName: existingDbName,
            mainDbName: targetDbName
          });
        }
        url.pathname = `/${targetDbName}`;
        mongoUri = url.toString();
        logger.info('✅ Database name set in connection string', { 
          database: targetDbName,
          wasTestDb: existingDbName && existingDbName.toLowerCase().includes('test'),
          wasEmpty: !existingDbName || existingDbName.trim() === ''
        });
      } else if (existingDbName !== targetDbName) {
        logger.warn('⚠️  Database name in connection string differs from target. Forcing to main database.', {
          uriDbName: existingDbName,
          targetDbName: targetDbName
        });
        url.pathname = `/${targetDbName}`;
        mongoUri = url.toString();
        logger.info('✅ Database name forced to main database', { database: targetDbName });
      } else {
        logger.info('✅ Database name already correct', { database: existingDbName });
      }
    } catch (urlError) {
      logger.warn('URL parsing failed, using regex-based database name extraction', { error: urlError.message });
      const dbNameMatch = mongoUri.match(/\/([^/?]+)(\?|$)/);
      const existingDbName = dbNameMatch ? dbNameMatch[1] : null;
      
      if (!existingDbName || existingDbName.trim() === '' || existingDbName.toLowerCase().includes('test')) {
        if (mongoUri.includes('?')) {
          mongoUri = mongoUri.replace(/\/(\?)/, `/${targetDbName}$1`);
        } else if (mongoUri.endsWith('/')) {
          mongoUri = `${mongoUri}${targetDbName}`;
        } else {
          const lastSlashIndex = mongoUri.lastIndexOf('/');
          if (lastSlashIndex !== -1) {
            const beforeSlash = mongoUri.substring(0, lastSlashIndex + 1);
            const afterSlash = mongoUri.substring(lastSlashIndex + 1);
            if (afterSlash.includes('@') || afterSlash.includes('?')) {
              mongoUri = `${beforeSlash}${targetDbName}${afterSlash.includes('?') ? '' : '?'}${afterSlash.includes('?') ? afterSlash.substring(afterSlash.indexOf('?')) : ''}`;
            } else {
              mongoUri = `${beforeSlash}${targetDbName}`;
            }
          } else {
            mongoUri = `${mongoUri}/${targetDbName}`;
          }
        }
        logger.info('✅ Database name set using regex method', { database: targetDbName });
      }
    }
    
    // Determine if this is Cosmos DB
    const isCosmosDB = mongoUri.includes('cosmos.azure.com') || mongoUri.includes('documents.azure.com');
    
    // Set connection options optimized for Azure Cosmos DB
    const connectionOptions = {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
      dbName: targetDbName, // Explicitly set the database name
    };
    
    // Azure Cosmos DB specific options
    if (isCosmosDB) {
      connectionOptions.tls = true;
      connectionOptions.tlsInsecure = false;
      connectionOptions.retryWrites = true;
      logger.info('Connecting to Azure Cosmos DB (MongoDB API)');
    }
    
    const conn = await mongoose.connect(mongoUri, connectionOptions);
    
    const actualDbName = mongoose.connection.name;
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('✅ tenant-management-service: MongoDB connected successfully');
    logger.info('═══════════════════════════════════════════════════════', {
      database: actualDbName,
      targetDatabase: targetDbName,
      host: conn.connection.host,
      port: conn.connection.port,
      readyState: mongoose.connection.readyState
    });
    
    if (actualDbName.toLowerCase().includes('test')) {
      logger.error('❌ CRITICAL ERROR: Connected to TEST database!', {
        database: actualDbName,
        expected: targetDbName
      });
    } else if (actualDbName !== targetDbName) {
      logger.warn('⚠️  WARNING: Database name mismatch!', {
        actual: actualDbName,
        expected: targetDbName
      });
    } else {
      logger.info('✅ Database connection verified - using MAIN database', {
        database: actualDbName
      });
    }

    return conn;
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    console.error('Database connection failed:', error.message);
    throw error;
  }
};

module.exports = connectDB;

