const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Database connection manager for multi-tenant architecture
 * Handles tenant-specific database connections
 */
class DatabaseRouter {
  constructor() {
    this.connections = new Map();
    this.registryConnection = null;
    this.redisClient = null;
  }

  /**
   * Initialize registry database connection
   */
  async initializeRegistry() {
    try {
      // Support both REGISTRY_DATABASE_URL and MONGO_URI
      let registryUrl = process.env.REGISTRY_DATABASE_URL || process.env.MONGO_URI || process.env.MONGODB_URI;
      
      // Fallback to local MongoDB for development
      if (!registryUrl) {
        registryUrl = 'mongodb://localhost:27017/etelios_registry';
        logger.warn('REGISTRY_DATABASE_URL not set. Using local MongoDB.');
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
        const url = new URL(registryUrl);
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
          registryUrl = url.toString();
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
          registryUrl = url.toString();
          logger.info('✅ Database name forced to main database', { database: targetDbName });
        } else {
          logger.info('✅ Database name already correct', { database: existingDbName });
        }
      } catch (urlError) {
        logger.warn('URL parsing failed, using regex-based database name extraction', { error: urlError.message });
        const dbNameMatch = registryUrl.match(/\/([^/?]+)(\?|$)/);
        const existingDbName = dbNameMatch ? dbNameMatch[1] : null;
        
        if (!existingDbName || existingDbName.trim() === '' || existingDbName.toLowerCase().includes('test')) {
          if (registryUrl.includes('?')) {
            registryUrl = registryUrl.replace(/\/(\?)/, `/${targetDbName}$1`);
          } else if (registryUrl.endsWith('/')) {
            registryUrl = `${registryUrl}${targetDbName}`;
          } else {
            const lastSlashIndex = registryUrl.lastIndexOf('/');
            if (lastSlashIndex !== -1) {
              const beforeSlash = registryUrl.substring(0, lastSlashIndex + 1);
              const afterSlash = registryUrl.substring(lastSlashIndex + 1);
              if (afterSlash.includes('@') || afterSlash.includes('?')) {
                registryUrl = `${beforeSlash}${targetDbName}${afterSlash.includes('?') ? '' : '?'}${afterSlash.includes('?') ? afterSlash.substring(afterSlash.indexOf('?')) : ''}`;
              } else {
                registryUrl = `${beforeSlash}${targetDbName}`;
              }
            } else {
              registryUrl = `${registryUrl}/${targetDbName}`;
            }
          }
          logger.info('✅ Database name set using regex method', { database: targetDbName });
        }
      }
      
      // Determine if this is Cosmos DB
      const isCosmosDB = registryUrl.includes('cosmos.azure.com') || registryUrl.includes('documents.azure.com');
      
      // Set connection options optimized for Azure Cosmos DB
      const connectionOptions = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 60000,
        connectTimeoutMS: 30000,
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
      
      this.registryConnection = await mongoose.createConnection(registryUrl, connectionOptions);
      
      const actualDbName = this.registryConnection.name;
      logger.info('═══════════════════════════════════════════════════════');
      logger.info('✅ tenant-registry-service: Registry database connected successfully');
      logger.info('═══════════════════════════════════════════════════════', {
        database: actualDbName,
        targetDatabase: targetDbName,
        host: this.registryConnection.host,
        readyState: this.registryConnection.readyState
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
      
      return this.registryConnection;
    } catch (error) {
      logger.error('Registry database connection failed:', error);
      throw error;
    }
  }

  /**
   * Get tenant-specific database connection
   */
  async getTenantConnection(tenantId) {
    try {
      // Check if connection already exists
      if (this.connections.has(tenantId)) {
        const connection = this.connections.get(tenantId);
        if (connection.readyState === 1) {
          return connection;
        }
      }

      // Create new connection
      const databaseName = `etelios_${tenantId}`;
      const tenantUrl = process.env.TENANT_DATABASE_URL || `mongodb://localhost:27017/${databaseName}`;
      
      const connection = await mongoose.createConnection(tenantUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      // Store connection
      this.connections.set(tenantId, connection);
      
      logger.info(`Tenant database connected: ${tenantId}`, {
        tenantId,
        database: databaseName
      });

      return connection;
    } catch (error) {
      logger.error(`Tenant database connection failed: ${tenantId}`, error);
      throw error;
    }
  }

  /**
   * Create tenant database
   */
  async createTenantDatabase(tenantId) {
    try {
      const connection = await this.getTenantConnection(tenantId);
      
      // Initialize tenant-specific collections
      await this.initializeTenantCollections(connection, tenantId);
      
      logger.info(`Tenant database created: ${tenantId}`);
      return connection;
    } catch (error) {
      logger.error(`Tenant database creation failed: ${tenantId}`, error);
      throw error;
    }
  }

  /**
   * Initialize tenant-specific collections
   */
  async initializeTenantCollections(connection, tenantId) {
    try {
      // Create indexes for performance
      await connection.db.collection('users').createIndex({ tenantId: 1 });
      await connection.db.collection('users').createIndex({ email: 1, tenantId: 1 });
      
      await connection.db.collection('employees').createIndex({ tenantId: 1 });
      await connection.db.collection('employees').createIndex({ employeeId: 1, tenantId: 1 });
      
      await connection.db.collection('attendance').createIndex({ tenantId: 1 });
      await connection.db.collection('attendance').createIndex({ employeeId: 1, tenantId: 1 });
      await connection.db.collection('attendance').createIndex({ date: 1, tenantId: 1 });
      
      await connection.db.collection('payroll').createIndex({ tenantId: 1 });
      await connection.db.collection('payroll').createIndex({ employeeId: 1, tenantId: 1 });
      await connection.db.collection('payroll').createIndex({ month: 1, year: 1, tenantId: 1 });
      
      await connection.db.collection('inventory').createIndex({ tenantId: 1 });
      await connection.db.collection('inventory').createIndex({ productCode: 1, tenantId: 1 });
      
      await connection.db.collection('sales').createIndex({ tenantId: 1 });
      await connection.db.collection('sales').createIndex({ invoiceNumber: 1, tenantId: 1 });
      await connection.db.collection('sales').createIndex({ date: 1, tenantId: 1 });
      
      await connection.db.collection('purchases').createIndex({ tenantId: 1 });
      await connection.db.collection('purchases').createIndex({ purchaseOrder: 1, tenantId: 1 });
      await connection.db.collection('purchases').createIndex({ date: 1, tenantId: 1 });
      
      await connection.db.collection('customers').createIndex({ tenantId: 1 });
      await connection.db.collection('customers').createIndex({ email: 1, tenantId: 1 });
      await connection.db.collection('customers').createIndex({ phone: 1, tenantId: 1 });
      
      await connection.db.collection('suppliers').createIndex({ tenantId: 1 });
      await connection.db.collection('suppliers').createIndex({ email: 1, tenantId: 1 });
      
      await connection.db.collection('documents').createIndex({ tenantId: 1 });
      await connection.db.collection('documents').createIndex({ type: 1, tenantId: 1 });
      
      await connection.db.collection('notifications').createIndex({ tenantId: 1 });
      await connection.db.collection('notifications').createIndex({ userId: 1, tenantId: 1 });
      await connection.db.collection('notifications').createIndex({ createdAt: 1, tenantId: 1 });
      
      await connection.db.collection('audit_logs').createIndex({ tenantId: 1 });
      await connection.db.collection('audit_logs').createIndex({ userId: 1, tenantId: 1 });
      await connection.db.collection('audit_logs').createIndex({ action: 1, tenantId: 1 });
      await connection.db.collection('audit_logs').createIndex({ createdAt: 1, tenantId: 1 });

      logger.info(`Tenant collections initialized: ${tenantId}`);
    } catch (error) {
      logger.error(`Tenant collections initialization failed: ${tenantId}`, error);
      throw error;
    }
  }

  /**
   * Get tenant model with connection
   */
  getTenantModel(tenantId, modelName, schema) {
    const connection = this.connections.get(tenantId);
    if (!connection) {
      throw new Error(`No connection found for tenant: ${tenantId}`);
    }
    return connection.model(modelName, schema);
  }

  /**
   * Close tenant connection
   */
  async closeTenantConnection(tenantId) {
    try {
      const connection = this.connections.get(tenantId);
      if (connection) {
        await connection.close();
        this.connections.delete(tenantId);
        logger.info(`Tenant connection closed: ${tenantId}`);
      }
    } catch (error) {
      logger.error(`Error closing tenant connection: ${tenantId}`, error);
    }
  }

  /**
   * Close all connections
   */
  async closeAllConnections() {
    try {
      // Close tenant connections
      for (const [tenantId, connection] of this.connections) {
        await connection.close();
        logger.info(`Tenant connection closed: ${tenantId}`);
      }
      this.connections.clear();

      // Close registry connection
      if (this.registryConnection) {
        await this.registryConnection.close();
        logger.info('Registry connection closed');
      }
    } catch (error) {
      logger.error('Error closing connections:', error);
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    const status = {
      registry: this.registryConnection ? this.registryConnection.readyState : 0,
      tenants: {}
    };

    for (const [tenantId, connection] of this.connections) {
      status.tenants[tenantId] = connection.readyState;
    }

    return status;
  }

  /**
   * Health check for all connections
   */
  async healthCheck() {
    const health = {
      registry: false,
      tenants: {},
      totalConnections: this.connections.size
    };

    try {
      // Check registry connection
      if (this.registryConnection && this.registryConnection.readyState === 1) {
        await this.registryConnection.db.admin().ping();
        health.registry = true;
      }

      // Check tenant connections
      for (const [tenantId, connection] of this.connections) {
        try {
          if (connection.readyState === 1) {
            await connection.db.admin().ping();
            health.tenants[tenantId] = true;
          } else {
            health.tenants[tenantId] = false;
          }
        } catch (error) {
          health.tenants[tenantId] = false;
        }
      }
    } catch (error) {
      logger.error('Health check failed:', error);
    }

    return health;
  }
}

// Create singleton instance
const databaseRouter = new DatabaseRouter();

module.exports = databaseRouter;
