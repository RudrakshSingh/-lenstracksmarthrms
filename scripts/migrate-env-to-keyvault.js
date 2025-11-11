#!/usr/bin/env node

/**
 * Migrate Environment Variables to Azure Key Vault
 * 
 * This script reads environment variables from a .env file and uploads them to Azure Key Vault.
 * 
 * Usage:
 *   node scripts/migrate-env-to-keyvault.js \
 *     --vault-name etelios-kv-prod \
 *     --env-file .env \
 *     --dry-run
 */

const { SecretClient } = require('@azure/keyvault-secrets');
const { DefaultAzureCredential } = require('@azure/identity');
const fs = require('fs');
const path = require('path');

// Secret name mapping (same as in keyVault.js)
const secretNameMap = {
  'MONGO_URI': 'kv-mongo-uri',
  'MONGODB_URI': 'kv-mongodb-uri',
  'REDIS_URL': 'kv-redis-url',
  'REDIS_HOST': 'kv-redis-host',
  'REDIS_PORT': 'kv-redis-port',
  'REDIS_PASSWORD': 'kv-redis-password',
  'JWT_SECRET': 'kv-jwt-secret',
  'JWT_REFRESH_SECRET': 'kv-jwt-refresh-secret',
  'JWT_EXPIRES_IN': 'kv-jwt-expires-in',
  'JWT_REFRESH_EXPIRES_IN': 'kv-jwt-refresh-expires-in',
  'EMAIL_HOST': 'kv-email-host',
  'EMAIL_PORT': 'kv-email-port',
  'EMAIL_USER': 'kv-email-user',
  'EMAIL_PASS': 'kv-email-pass',
  'EMAIL_FROM': 'kv-email-from',
  'SENDGRID_API_KEY': 'kv-sendgrid-api-key',
  'SENDGRID_FROM_EMAIL': 'kv-sendgrid-from-email',
  'TWILIO_ACCOUNT_SID': 'kv-twilio-account-sid',
  'TWILIO_AUTH_TOKEN': 'kv-twilio-auth-token',
  'TWILIO_PHONE_NUMBER': 'kv-twilio-phone-number',
  'SMS_ENABLED': 'kv-sms-enabled',
  'AZURE_COMMUNICATION_CONNECTION_STRING': 'kv-azure-communication-connection-string',
  'WHATSAPP_API_URL': 'kv-whatsapp-api-url',
  'WHATSAPP_ACCESS_TOKEN': 'kv-whatsapp-access-token',
  'WHATSAPP_PHONE_NUMBER_ID': 'kv-whatsapp-phone-number-id',
  'CLOUDINARY_CLOUD_NAME': 'kv-cloudinary-cloud-name',
  'CLOUDINARY_API_KEY': 'kv-cloudinary-api-key',
  'CLOUDINARY_API_SECRET': 'kv-cloudinary-api-secret',
  'AZURE_STORAGE_CONNECTION_STRING': 'kv-azure-storage-connection-string',
  'AZURE_STORAGE_ACCOUNT_NAME': 'kv-azure-storage-account-name',
  'AZURE_STORAGE_ACCOUNT_KEY': 'kv-azure-storage-account-key',
  'AZURE_STORAGE_CONTAINER_NAME': 'kv-azure-storage-container-name',
  'ENCRYPTION_MASTER_KEY': 'kv-encryption-master-key',
  'ENCRYPTION_KEY': 'kv-encryption-key',
  'BCRYPT_ROUNDS': 'kv-bcrypt-rounds',
  'RAZORPAY_KEY_ID': 'kv-razorpay-key-id',
  'RAZORPAY_KEY_SECRET': 'kv-razorpay-key-secret',
  'RAZORPAY_WEBHOOK_SECRET': 'kv-razorpay-webhook-secret',
  'STRIPE_SECRET_KEY': 'kv-stripe-secret-key',
  'STRIPE_PUBLISHABLE_KEY': 'kv-stripe-publishable-key',
  'DOCUSIGN_API_KEY': 'kv-docusign-api-key',
  'DOCUSIGN_API_SECRET': 'kv-docusign-api-secret',
  'DOCUSIGN_ACCOUNT_ID': 'kv-docusign-account-id',
  'DIGIO_API_KEY': 'kv-digio-api-key',
  'DIGIO_API_SECRET': 'kv-digio-api-secret',
  'AADHAAR_API_KEY': 'kv-aadhaar-api-key',
  'AADHAAR_API_SECRET': 'kv-aadhaar-api-secret',
  'DIGILOCKER_API_URL': 'kv-digilocker-api-url',
  'DIGILOCKER_API_KEY': 'kv-digilocker-api-key',
  'DIGILOCKER_CLIENT_ID': 'kv-digilocker-client-id',
  'DIGILOCKER_CLIENT_SECRET': 'kv-digilocker-client-secret',
  'GST_API_URL': 'kv-gst-api-url',
  'GST_API_KEY': 'kv-gst-api-key',
  'EINVOICE_API_URL': 'kv-einvoice-api-url',
  'EINVOICE_API_KEY': 'kv-einvoice-api-key',
  'TAX_API_URL': 'kv-tax-api-url',
  'TAX_API_KEY': 'kv-tax-api-key',
  'OPENAI_API_KEY': 'kv-openai-api-key',
  'OPENAI_ENDPOINT': 'kv-openai-endpoint',
  'OPENAI_API_VERSION': 'kv-openai-api-version',
  'OPENAI_CHAT_DEPLOYMENT': 'kv-openai-chat-deployment',
  'OPENAI_EMBEDDING_DEPLOYMENT': 'kv-openai-embedding-deployment',
  'AI_SEARCH_ENDPOINT': 'kv-ai-search-endpoint',
  'AI_SEARCH_KEY': 'kv-ai-search-key',
  'APPINSIGHTS_INSTRUMENTATIONKEY': 'kv-appinsights-instrumentation-key',
  'APPLICATIONINSIGHTS_CONNECTION_STRING': 'kv-appinsights-connection-string',
  'FCM_SERVER_KEY': 'kv-fcm-server-key',
  'FCM_PROJECT_ID': 'kv-fcm-project-id',
  'DRUG_DB_API_URL': 'kv-drug-db-api-url',
  'DRUG_DB_API_KEY': 'kv-drug-db-api-key',
  'AUTH_SERVICE_URL': 'kv-auth-service-url',
  'NOTIFICATION_SERVICE_URL': 'kv-notification-service-url',
  'TENANT_DB_PREFIX': 'kv-tenant-db-prefix',
  'TENANT_AUTO_PROVISION': 'kv-tenant-auto-provision'
};

// Variables to skip (not secrets)
const skipVariables = [
  'NODE_ENV',
  'PORT',
  'SERVICE_NAME',
  'CORS_ORIGIN',
  'LOG_LEVEL',
  'LOG_FILE',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS',
  'MAX_FILE_SIZE',
  'UPLOAD_PATH',
  'USE_KEY_VAULT',
  'AZURE_KEY_VAULT_URL',
  'AZURE_KEY_VAULT_NAME'
];

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    vaultName: null,
    vaultUrl: null,
    envFile: '.env',
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--vault-name' && args[i + 1]) {
      options.vaultName = args[i + 1];
      i++;
    } else if (args[i] === '--vault-url' && args[i + 1]) {
      options.vaultUrl = args[i + 1];
      i++;
    } else if (args[i] === '--env-file' && args[i + 1]) {
      options.envFile = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      options.dryRun = true;
    }
  }

  if (!options.vaultName && !options.vaultUrl) {
    console.error('❌ Error: --vault-name or --vault-url is required');
    process.exit(1);
  }

  if (options.vaultName && !options.vaultUrl) {
    options.vaultUrl = `https://${options.vaultName}.vault.azure.net`;
  }

  return options;
}

function parseEnvFile(filePath) {
  const envPath = path.resolve(filePath);
  
  if (!fs.existsSync(envPath)) {
    console.error(`❌ Error: .env file not found at ${envPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const envVars = {};

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const envKey = key.trim();
      const envValue = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      
      if (envKey && envValue && !skipVariables.includes(envKey)) {
        envVars[envKey] = envValue;
      }
    }
  }

  return envVars;
}

async function migrateSecrets(options) {
  console.log('🔐 Migrating Environment Variables to Azure Key Vault\n');
  console.log(`Vault: ${options.vaultUrl}`);
  console.log(`Env File: ${options.envFile}`);
  console.log(`Dry Run: ${options.dryRun ? 'Yes' : 'No'}\n`);

  // Parse .env file
  const envVars = parseEnvFile(options.envFile);
  console.log(`📝 Found ${Object.keys(envVars).length} environment variables\n`);

  // Initialize Key Vault client
  let secretClient = null;
  if (!options.dryRun) {
    try {
      const credential = new DefaultAzureCredential();
      secretClient = new SecretClient(options.vaultUrl, credential);
      console.log('✅ Connected to Azure Key Vault\n');
    } catch (error) {
      console.error(`❌ Failed to connect to Key Vault: ${error.message}`);
      process.exit(1);
    }
  }

  // Migrate secrets
  const results = {
    success: 0,
    failed: 0,
    skipped: 0
  };

  for (const [envKey, envValue] of Object.entries(envVars)) {
    const secretName = secretNameMap[envKey] || `kv-${envKey.toLowerCase().replace(/_/g, '-')}`;
    
    // Skip empty values
    if (!envValue || envValue === '') {
      console.log(`⏭️  Skipping ${envKey} (empty value)`);
      results.skipped++;
      continue;
    }

    // Skip placeholder values
    if (envValue.includes('your-') || envValue.includes('example') || envValue === 'null') {
      console.log(`⏭️  Skipping ${envKey} (placeholder value)`);
      results.skipped++;
      continue;
    }

    try {
      if (options.dryRun) {
        console.log(`📝 Would store: ${secretName} = ${envKey}`);
      } else {
        await secretClient.setSecret(secretName, envValue);
        console.log(`✅ Stored: ${secretName}`);
        results.success++;
      }
    } catch (error) {
      console.error(`❌ Failed to store ${secretName}: ${error.message}`);
      results.failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Success: ${results.success}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   ⏭️  Skipped: ${results.skipped}`);
  console.log('='.repeat(60));

  if (options.dryRun) {
    console.log('\n💡 This was a dry run. Run without --dry-run to actually store secrets.');
  }
}

// Run migration
const options = parseArgs();
migrateSecrets(options).catch(error => {
  console.error(`❌ Migration failed: ${error.message}`);
  process.exit(1);
});

