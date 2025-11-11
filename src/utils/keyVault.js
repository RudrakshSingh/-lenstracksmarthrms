/**
 * Azure Key Vault Configuration Loader
 * Loads secrets from Azure Key Vault with fallback to environment variables
 * 
 * Usage:
 *   const config = require('./utils/keyVault');
 *   const mongoUri = await config.getSecret('mongo-uri'); // or config.get('MONGO_URI')
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
    this.secretNameMap = {
      // Database
      'MONGO_URI': 'kv-mongo-uri',
      'MONGODB_URI': 'kv-mongodb-uri',
      'REDIS_URL': 'kv-redis-url',
      'REDIS_HOST': 'kv-redis-host',
      'REDIS_PORT': 'kv-redis-port',
      'REDIS_PASSWORD': 'kv-redis-password',
      
      // Authentication
      'JWT_SECRET': 'kv-jwt-secret',
      'JWT_REFRESH_SECRET': 'kv-jwt-refresh-secret',
      'JWT_EXPIRES_IN': 'kv-jwt-expires-in',
      'JWT_REFRESH_EXPIRES_IN': 'kv-jwt-refresh-expires-in',
      
      // Email
      'EMAIL_HOST': 'kv-email-host',
      'EMAIL_PORT': 'kv-email-port',
      'EMAIL_USER': 'kv-email-user',
      'EMAIL_PASS': 'kv-email-pass',
      'EMAIL_FROM': 'kv-email-from',
      'SENDGRID_API_KEY': 'kv-sendgrid-api-key',
      'SENDGRID_FROM_EMAIL': 'kv-sendgrid-from-email',
      
      // SMS
      'TWILIO_ACCOUNT_SID': 'kv-twilio-account-sid',
      'TWILIO_AUTH_TOKEN': 'kv-twilio-auth-token',
      'TWILIO_PHONE_NUMBER': 'kv-twilio-phone-number',
      'SMS_ENABLED': 'kv-sms-enabled',
      'AZURE_COMMUNICATION_CONNECTION_STRING': 'kv-azure-communication-connection-string',
      
      // WhatsApp
      'WHATSAPP_API_URL': 'kv-whatsapp-api-url',
      'WHATSAPP_ACCESS_TOKEN': 'kv-whatsapp-access-token',
      'WHATSAPP_PHONE_NUMBER_ID': 'kv-whatsapp-phone-number-id',
      
      // File Storage
      'CLOUDINARY_CLOUD_NAME': 'kv-cloudinary-cloud-name',
      'CLOUDINARY_API_KEY': 'kv-cloudinary-api-key',
      'CLOUDINARY_API_SECRET': 'kv-cloudinary-api-secret',
      'AZURE_STORAGE_CONNECTION_STRING': 'kv-azure-storage-connection-string',
      'AZURE_STORAGE_ACCOUNT_NAME': 'kv-azure-storage-account-name',
      'AZURE_STORAGE_ACCOUNT_KEY': 'kv-azure-storage-account-key',
      'AZURE_STORAGE_CONTAINER_NAME': 'kv-azure-storage-container-name',
      
      // Security
      'ENCRYPTION_MASTER_KEY': 'kv-encryption-master-key',
      'ENCRYPTION_KEY': 'kv-encryption-key',
      'BCRYPT_ROUNDS': 'kv-bcrypt-rounds',
      
      // Payment Gateways
      'RAZORPAY_KEY_ID': 'kv-razorpay-key-id',
      'RAZORPAY_KEY_SECRET': 'kv-razorpay-key-secret',
      'RAZORPAY_WEBHOOK_SECRET': 'kv-razorpay-webhook-secret',
      'STRIPE_SECRET_KEY': 'kv-stripe-secret-key',
      'STRIPE_PUBLISHABLE_KEY': 'kv-stripe-publishable-key',
      
      // E-Signature
      'DOCUSIGN_API_KEY': 'kv-docusign-api-key',
      'DOCUSIGN_API_SECRET': 'kv-docusign-api-secret',
      'DOCUSIGN_ACCOUNT_ID': 'kv-docusign-account-id',
      'DIGIO_API_KEY': 'kv-digio-api-key',
      'DIGIO_API_SECRET': 'kv-digio-api-secret',
      'AADHAAR_API_KEY': 'kv-aadhaar-api-key',
      'AADHAAR_API_SECRET': 'kv-aadhaar-api-secret',
      
      // DigiLocker
      'DIGILOCKER_API_URL': 'kv-digilocker-api-url',
      'DIGILOCKER_API_KEY': 'kv-digilocker-api-key',
      'DIGILOCKER_CLIENT_ID': 'kv-digilocker-client-id',
      'DIGILOCKER_CLIENT_SECRET': 'kv-digilocker-client-secret',
      
      // Tax & Government APIs
      'GST_API_URL': 'kv-gst-api-url',
      'GST_API_KEY': 'kv-gst-api-key',
      'EINVOICE_API_URL': 'kv-einvoice-api-url',
      'EINVOICE_API_KEY': 'kv-einvoice-api-key',
      'TAX_API_URL': 'kv-tax-api-url',
      'TAX_API_KEY': 'kv-tax-api-key',
      
      // AI Services
      'OPENAI_API_KEY': 'kv-openai-api-key',
      'OPENAI_ENDPOINT': 'kv-openai-endpoint',
      'OPENAI_API_VERSION': 'kv-openai-api-version',
      'OPENAI_CHAT_DEPLOYMENT': 'kv-openai-chat-deployment',
      'OPENAI_EMBEDDING_DEPLOYMENT': 'kv-openai-embedding-deployment',
      'AI_SEARCH_ENDPOINT': 'kv-ai-search-endpoint',
      'AI_SEARCH_KEY': 'kv-ai-search-key',
      
      // Monitoring
      'APPINSIGHTS_INSTRUMENTATIONKEY': 'kv-appinsights-instrumentation-key',
      'APPLICATIONINSIGHTS_CONNECTION_STRING': 'kv-appinsights-connection-string',
      
      // Push Notifications
      'FCM_SERVER_KEY': 'kv-fcm-server-key',
      'FCM_PROJECT_ID': 'kv-fcm-project-id',
      
      // Drug Database
      'DRUG_DB_API_URL': 'kv-drug-db-api-url',
      'DRUG_DB_API_KEY': 'kv-drug-db-api-key',
      
      // Service URLs
      'AUTH_SERVICE_URL': 'kv-auth-service-url',
      'NOTIFICATION_SERVICE_URL': 'kv-notification-service-url',
      
      // Multi-tenant
      'TENANT_DB_PREFIX': 'kv-tenant-db-prefix',
      'TENANT_AUTO_PROVISION': 'kv-tenant-auto-provision'
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
      console.log('🔑 Key Vault: Using environment variables (Key Vault disabled)');
      this.initialized = true;
      return;
    }

    try {
      if (!this.keyVaultUrl) {
        if (this.keyVaultName) {
          this.keyVaultUrl = `https://${this.keyVaultName}.vault.azure.net`;
        } else {
          console.warn('⚠️  Key Vault: AZURE_KEY_VAULT_URL or AZURE_KEY_VAULT_NAME not set. Falling back to environment variables.');
          this.useKeyVault = false;
          this.initialized = true;
          return;
        }
      }

      const credential = new DefaultAzureCredential();
      this.secretClient = new SecretClient(this.keyVaultUrl, credential);
      
      // Test connection (try to list secrets to verify access)
      try {
        await this.secretClient.getSecret('kv-test-connection');
      } catch (error) {
        // Ignore 404 (secret doesn't exist), but connection is successful
        if (error.statusCode !== 404) {
          throw error;
        }
      }
      console.log(`✅ Key Vault: Connected to ${this.keyVaultUrl}`);
    } catch (error) {
      if (error.statusCode === 404) {
        // Test secret doesn't exist, but Key Vault is accessible
        console.log(`✅ Key Vault: Connected to ${this.keyVaultUrl} (test secret not found, but connection successful)`);
      } else {
        console.warn(`⚠️  Key Vault: Failed to connect. Error: ${error.message}. Falling back to environment variables.`);
        this.useKeyVault = false;
      }
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
        // Secret not found in Key Vault
        console.warn(`⚠️  Key Vault: Secret '${secretName}' not found. Using default value.`);
      } else {
        console.error(`❌ Key Vault: Error retrieving secret '${secretName}': ${error.message}`);
      }
    }

    return defaultValue;
  }

  /**
   * Get secret synchronously (from cache or env, throws if Key Vault needed)
   * Use this only for secrets that must be available immediately
   * @param {string} envVarName - Environment variable name
   * @param {string} defaultValue - Default value
   * @returns {string} Secret value
   */
  get(envVarName, defaultValue = null) {
    // Check environment variables first
    if (process.env[envVarName]) {
      return process.env[envVarName];
    }

    // Check cache
    const secretName = this.secretNameMap[envVarName] || `kv-${envVarName.toLowerCase().replace(/_/g, '-')}`;
    const cached = this.secretCache.get(secretName);
    if (cached) {
      return cached.value;
    }

    // If Key Vault is enabled but not initialized, warn
    if (this.useKeyVault && !this.initialized) {
      console.warn(`⚠️  Key Vault: get() called before initialization. Use getSecret() for async access or call initialize() first.`);
    }

    return defaultValue;
  }

  /**
   * Get multiple secrets at once
   * @param {string[]} envVarNames - Array of environment variable names
   * @returns {Promise<Object>} Object with env var names as keys and secret values as values
   */
  async getSecrets(envVarNames) {
    await this.initialize();

    const secrets = {};
    const promises = envVarNames.map(async (envVarName) => {
      secrets[envVarName] = await this.getSecret(envVarName);
    });

    await Promise.all(promises);
    return secrets;
  }

  /**
   * Clear secret cache
   */
  clearCache() {
    this.secretCache.clear();
  }

  /**
   * Preload common secrets (call this at startup)
   */
  async preloadCommonSecrets() {
    await this.initialize();

    const commonSecrets = [
      'MONGO_URI',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'REDIS_URL',
      'EMAIL_HOST',
      'SENDGRID_API_KEY'
    ];

    console.log('🔑 Preloading common secrets from Key Vault...');
    await this.getSecrets(commonSecrets);
    console.log('✅ Common secrets preloaded');
  }
}

// Export singleton instance
module.exports = new KeyVaultConfig();

// Also export the class for testing
module.exports.KeyVaultConfig = KeyVaultConfig;

