/**
 * Configuration Loader with Azure Key Vault Support
 * 
 * This module provides a unified way to access configuration values,
 * supporting both Azure Key Vault and environment variables.
 * 
 * Usage:
 *   const config = require('./utils/config');
 *   const mongoUri = await config.get('MONGO_URI');
 *   
 *   // Or use the synchronous version (for already-loaded configs)
 *   const port = config.getSync('PORT', 3000);
 */

const keyVault = require('./keyVault');

class ConfigLoader {
  constructor() {
    this.configCache = new Map();
    this.initialized = false;
  }

  /**
   * Initialize configuration (preload common secrets)
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    await keyVault.preloadCommonSecrets();
    this.initialized = true;
  }

  /**
   * Get configuration value from Key Vault or environment variable
   * @param {string} key - Configuration key (environment variable name)
   * @param {any} defaultValue - Default value if not found
   * @returns {Promise<any>} Configuration value
   */
  async get(key, defaultValue = null) {
    await this.initialize();

    // Check cache first
    if (this.configCache.has(key)) {
      return this.configCache.get(key);
    }

    // Get from Key Vault or environment
    const value = await keyVault.getSecret(key, defaultValue);

    // Cache the value
    if (value !== null && value !== undefined) {
      this.configCache.set(key, value);
    }

    return value;
  }

  /**
   * Get configuration value synchronously
   * Note: This only works for environment variables or cached values
   * @param {string} key - Configuration key
   * @param {any} defaultValue - Default value
   * @returns {any} Configuration value
   */
  getSync(key, defaultValue = null) {
    // Check environment variables first
    if (process.env[key]) {
      return process.env[key];
    }

    // Check cache
    if (this.configCache.has(key)) {
      return this.configCache.get(key);
    }

    // Try Key Vault cache
    const secretName = keyVault.secretNameMap[key] || `kv-${key.toLowerCase().replace(/_/g, '-')}`;
    const cached = keyVault.secretCache.get(secretName);
    if (cached) {
      return cached.value;
    }

    return defaultValue;
  }

  /**
   * Get multiple configuration values
   * @param {string[]} keys - Array of configuration keys
   * @returns {Promise<Object>} Object with keys as property names
   */
  async getMultiple(keys) {
    await this.initialize();

    const config = {};
    const promises = keys.map(async (key) => {
      config[key] = await this.get(key);
    });

    await Promise.all(promises);
    return config;
  }

  /**
   * Clear configuration cache
   */
  clearCache() {
    this.configCache.clear();
    keyVault.clearCache();
  }

  /**
   * Get all environment variables as an object (for backward compatibility)
   * Note: This will only return environment variables, not Key Vault secrets
   * @returns {Object} Configuration object
   */
  getAllSync() {
    return { ...process.env };
  }
}

// Export singleton instance
module.exports = new ConfigLoader();

// Also export the class for testing
module.exports.ConfigLoader = ConfigLoader;

