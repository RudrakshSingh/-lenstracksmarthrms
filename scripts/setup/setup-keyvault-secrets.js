#!/usr/bin/env node

/**
 * Azure Key Vault Secrets Setup Script
 * Creates/verifies all required secrets for Etelios microservices
 * 
 * Usage:
 *   node scripts/setup-keyvault-secrets.js
 * 
 * Prerequisites:
 *   - Azure CLI logged in: az login
 *   - Managed Identity enabled on App Service OR
 *   - AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_CLIENT_SECRET set
 */

const { SecretClient } = require("@azure/keyvault-secrets");
const { DefaultAzureCredential } = require("@azure/identity");
require('dotenv').config();

const KEY_VAULT_NAME = process.env.AZURE_KEY_VAULT_NAME || "etelios-keyvault";
const KEY_VAULT_URL = process.env.AZURE_KEY_VAULT_URL || `https://${KEY_VAULT_NAME}.vault.azure.net/`;

// Required secrets for all services
const REQUIRED_SECRETS = {
  // Database connection strings (service-specific)
  'kv-mongo-uri-auth-service': {
    description: 'Auth Service MongoDB Connection String',
    required: true,
    example: 'mongodb://username:password@host:10255/etelios_auth?ssl=true&...'
  },
  'kv-mongo-uri-hr-service': {
    description: 'HR Service MongoDB Connection String',
    required: true,
    example: 'mongodb://username:password@host:10255/etelios_hr?ssl=true&...'
  },
  'kv-mongo-uri-attendance-service': {
    description: 'Attendance Service MongoDB Connection String',
    required: false,
    example: 'mongodb://username:password@host:10255/etelios_attendance?ssl=true&...'
  },
  
  // JWT Secrets (shared across services)
  'kv-jwt-secret': {
    description: 'JWT Access Token Secret',
    required: true,
    example: 'your-64-character-jwt-secret-key-here'
  },
  'kv-jwt-refresh-secret': {
    description: 'JWT Refresh Token Secret',
    required: true,
    example: 'your-64-character-jwt-refresh-secret-key-here'
  },
  
  // Redis (optional)
  'kv-redis-url': {
    description: 'Redis Connection URL',
    required: false,
    example: 'redis://localhost:6379'
  },
  
  // Azure Storage (optional)
  'kv-azure-storage-connection-string': {
    description: 'Azure Storage Connection String',
    required: false,
    example: 'DefaultEndpointsProtocol=https;AccountName=...'
  }
};

async function setupKeyVaultSecrets() {
  try {
    console.log('🔐 Azure Key Vault Secrets Setup\n');
    console.log(`Key Vault: ${KEY_VAULT_NAME}`);
    console.log(`URL: ${KEY_VAULT_URL}\n`);

    // Initialize Azure credentials
    const credential = new DefaultAzureCredential();
    const client = new SecretClient(KEY_VAULT_URL, credential);

    console.log('✅ Connected to Azure Key Vault\n');

    const results = {
      existing: [],
      missing: [],
      created: [],
      errors: []
    };

    // Check each required secret
    for (const [secretName, config] of Object.entries(REQUIRED_SECRETS)) {
      try {
        console.log(`Checking: ${secretName}...`);
        
        // Try to get the secret
        const secret = await client.getSecret(secretName);
        
        if (secret && secret.value) {
          console.log(`  ✅ EXISTS: ${secretName}`);
          console.log(`     Description: ${config.description}`);
          console.log(`     Value: ${secret.value.substring(0, 20)}... (hidden)\n`);
          results.existing.push(secretName);
        }
      } catch (error) {
        if (error.statusCode === 404) {
          // Secret doesn't exist
          console.log(`  ❌ MISSING: ${secretName}`);
          console.log(`     Description: ${config.description}`);
          
          if (config.required) {
            console.log(`     ⚠️  REQUIRED - This secret must be created!\n`);
            results.missing.push({ name: secretName, required: true, config });
          } else {
            console.log(`     ℹ️  Optional - Can be created later\n`);
            results.missing.push({ name: secretName, required: false, config });
          }
        } else {
          console.log(`  ❌ ERROR: ${error.message}\n`);
          results.errors.push({ name: secretName, error: error.message });
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Existing secrets: ${results.existing.length}`);
    console.log(`❌ Missing secrets: ${results.missing.length}`);
    console.log(`⚠️  Errors: ${results.errors.length}\n`);

    // List missing required secrets
    const missingRequired = results.missing.filter(s => s.required);
    if (missingRequired.length > 0) {
      console.log('🔴 MISSING REQUIRED SECRETS:');
      missingRequired.forEach(secret => {
        console.log(`   - ${secret.name}`);
        console.log(`     ${secret.config.description}`);
        console.log(`     Example: ${secret.config.example}\n`);
      });
      
      console.log('\n💡 To create a secret, use:');
      console.log(`   az keyvault secret set --vault-name ${KEY_VAULT_NAME} --name <SECRET_NAME> --value "<SECRET_VALUE>"\n`);
    }

    // List missing optional secrets
    const missingOptional = results.missing.filter(s => !s.required);
    if (missingOptional.length > 0) {
      console.log('🟡 MISSING OPTIONAL SECRETS:');
      missingOptional.forEach(secret => {
        console.log(`   - ${secret.name} (optional)`);
      });
      console.log('');
    }

    // Test creating a secret (if in interactive mode)
    if (process.argv.includes('--interactive') && missingRequired.length > 0) {
      console.log('Would you like to create missing secrets now? (y/n)');
      // In a real implementation, you'd use readline to get user input
      console.log('Use Azure CLI or Azure Portal to create secrets.\n');
    }

    return results;

  } catch (error) {
    console.error('❌ Error connecting to Key Vault:', error.message);
    
    if (error.message.includes('DefaultAzureCredential')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Make sure you\'re logged in: az login');
      console.error('   2. Or set environment variables:');
      console.error('      - AZURE_CLIENT_ID');
      console.error('      - AZURE_TENANT_ID');
      console.error('      - AZURE_CLIENT_SECRET');
      console.error('   3. Or use Managed Identity on App Service\n');
    }
    
    process.exit(1);
  }
}

// Create a secret (helper function)
async function createSecret(secretName, secretValue, description = '') {
  try {
    const credential = new DefaultAzureCredential();
    const client = new SecretClient(KEY_VAULT_URL, credential);
    
    const result = await client.setSecret(secretName, secretValue);
    console.log(`✅ Created secret: ${secretName}`);
    if (description) {
      console.log(`   Description: ${description}`);
    }
    return result;
  } catch (error) {
    console.error(`❌ Failed to create secret ${secretName}:`, error.message);
    throw error;
  }
}

// Read a secret (helper function)
async function readSecret(secretName) {
  try {
    const credential = new DefaultAzureCredential();
    const client = new SecretClient(KEY_VAULT_URL, credential);
    
    const secret = await client.getSecret(secretName);
    return secret.value;
  } catch (error) {
    if (error.statusCode === 404) {
      return null; // Secret doesn't exist
    }
    throw error;
  }
}

// Main execution
if (require.main === module) {
  setupKeyVaultSecrets()
    .then(results => {
      const missingRequired = results.missing.filter(s => s.required);
      if (missingRequired.length > 0) {
        console.log('\n⚠️  Some required secrets are missing. Please create them before deploying.\n');
        process.exit(1);
      } else {
        console.log('\n✅ All required secrets are present!\n');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  setupKeyVaultSecrets,
  createSecret,
  readSecret,
  REQUIRED_SECRETS,
  KEY_VAULT_NAME,
  KEY_VAULT_URL
};

