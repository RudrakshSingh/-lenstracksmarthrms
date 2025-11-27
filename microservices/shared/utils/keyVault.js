/**
 * Azure Key Vault Configuration Loader for Microservices
 * Loads secrets from Azure Key Vault with fallback to environment variables
 * 
 * Usage:
 *   const keyVault = require('../../shared/utils/keyVault');
 *   const mongoUri = await keyVault.getSecret('MONGO_URI');
 */

const { SecretClient } = require('@azure/keyvault-secrets');
const { DefaultAzureCredential } = require('@azure/identity');

class KeyVaultConfig {
  constructor() {
    this.keyVaultName = process.env.AZURE_KEY_VAULT_NAME || null;
    this.keyVaultUrl = process.env.AZURE_KEY_VAULT_URL || null;
    this.secretClient = null;
    this.secretCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
    this.initialized = false;
    this.useKeyVault = process.env.USE_KEY_VAULT === 'true' || process.env.AZURE_KEY_VAULT_URL ? true : false;
    
    // Secret name mapping (env var name -> Key Vault secret name)
    // Note: Service-specific secrets use SERVICE_NAME environment variable
    const serviceName = process.env.SERVICE_NAME || 'default';
    this.secretNameMap = {
      // Database - Service specific
      'MONGO_URI': `kv-mongo-uri-${serviceName}`,
      'MONGODB_URI': `kv-mongodb-uri-${serviceName}`,
      
      // Authentication
      'JWT_SECRET': 'kv-jwt-secret',
      'JWT_REFRESH_SECRET': 'kv-jwt-refresh-secret',
      
      // Redis
      'REDIS_URL': 'kv-redis-url',
      
      // Other common secrets
      'AZURE_STORAGE_CONNECTION_STRING': 'kv-azure-storage-connection-string',
    };
  }

  /**
   * Initialize Key Vault client
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    if (!this.useKeyVault) {
      this.initialized = true;
      return;
    }

    try {
      if (!this.keyVaultUrl) {
        if (this.keyVaultName) {
          this.keyVaultUrl = `https://${this.keyVaultName}.vault.azure.net`;
        } else {
          this.useKeyVault = false;
          this.initialized = true;
          return;
        }
      }

      const credential = new DefaultAzureCredential();
      this.secretClient = new SecretClient(this.keyVaultUrl, credential);
      
      // Test connection
      try {
        await this.secretClient.getSecret('kv-test-connection');
      } catch (error) {
        if (error.statusCode !== 404) {
          throw error;
        }
      }
    } catch (error) {
      if (error.statusCode !== 404) {
        console.warn(`Key Vault: Failed to connect. Error: ${error.message}. Falling back to environment variables.`);
      }
      this.useKeyVault = false;
    }

    this.initialized = true;
  }

  /**
   * Get secret from Key Vault or environment variable
   * @param {string} envVarName - Environment variable name (e.g., 'MONGO_URI')
   * @param {string} defaultValue - Default value if not found
   * @returns {Promise<string>} Secret value
   */
  async getSecret(envVarName, defaultValue = null) {
    await this.initialize();

    // First, check environment variables (for local development or override)
    if (process.env[envVarName]) {
      return process.env[envVarName];
    }

    // If Key Vault is not enabled, return default
    if (!this.useKeyVault || !this.secretClient) {
      return defaultValue;
    }

    // Get Key Vault secret name from mapping
    const secretName = this.secretNameMap[envVarName] || `kv-${envVarName.toLowerCase().replace(/_/g, '-')}`;

    // Check cache first
    const cached = this.secretCache.get(secretName);
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.value;
    }

    try {
      // Get secret from Key Vault
      const secret = await this.secretClient.getSecret(secretName);
      
      if (secret && secret.value) {
        // Cache the secret
        this.secretCache.set(secretName, {
          value: secret.value,
          timestamp: Date.now()
        });
        
        return secret.value;
      }
    } catch (error) {
      if (error.statusCode === 404) {
        console.warn(`Key Vault: Secret '${secretName}' not found. Using default value.`);
      } else {
        console.error(`Key Vault: Error retrieving secret '${secretName}': ${error.message}`);
      }
    }

    return defaultValue;
  }
}

// Export singleton instance
module.exports = new KeyVaultConfig();

