#!/usr/bin/env node

/**
 * Test Azure Key Vault Connection
 * 
 * Usage:
 *   node scripts/test-keyvault.js \
 *     --vault-url https://etelios-kv-prod.vault.azure.net \
 *     --secret-name kv-mongo-uri
 */

const { SecretClient } = require('@azure/keyvault-secrets');
const { DefaultAzureCredential } = require('@azure/identity');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    vaultUrl: null,
    secretName: null
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--vault-url' && args[i + 1]) {
      options.vaultUrl = args[i + 1];
      i++;
    } else if (args[i] === '--secret-name' && args[i + 1]) {
      options.secretName = args[i + 1];
      i++;
    }
  }

  if (!options.vaultUrl) {
    console.error('❌ Error: --vault-url is required');
    console.log('Usage: node scripts/test-keyvault.js --vault-url <URL> [--secret-name <NAME>]');
    process.exit(1);
  }

  return options;
}

async function testKeyVault(options) {
  console.log('🔐 Testing Azure Key Vault Connection\n');
  console.log(`Vault URL: ${options.vaultUrl}`);
  if (options.secretName) {
    console.log(`Secret Name: ${options.secretName}\n`);
  }

  try {
    // Initialize client
    const credential = new DefaultAzureCredential();
    const secretClient = new SecretClient(options.vaultUrl, credential);

    console.log('📡 Connecting to Key Vault...');

    // Test connection by listing secrets
    console.log('📋 Listing secrets...');
    const secrets = [];
    for await (const secretProperties of secretClient.listPropertiesOfSecrets()) {
      secrets.push(secretProperties.name);
    }

    console.log(`✅ Connected successfully! Found ${secrets.length} secrets.\n`);

    // If specific secret requested, try to retrieve it
    if (options.secretName) {
      console.log(`🔍 Retrieving secret: ${options.secretName}...`);
      try {
        const secret = await secretClient.getSecret(options.secretName);
        console.log(`✅ Secret retrieved successfully!`);
        console.log(`   Value: ${secret.value.substring(0, 20)}... (hidden)`);
        console.log(`   Version: ${secret.properties.version}`);
      } catch (error) {
        if (error.statusCode === 404) {
          console.log(`⚠️  Secret '${options.secretName}' not found in Key Vault.`);
        } else {
          throw error;
        }
      }
    } else {
      // Show first 10 secrets
      if (secrets.length > 0) {
        console.log('📝 Available secrets (first 10):');
        secrets.slice(0, 10).forEach(name => {
          console.log(`   - ${name}`);
        });
        if (secrets.length > 10) {
          console.log(`   ... and ${secrets.length - 10} more`);
        }
      } else {
        console.log('📝 No secrets found in Key Vault.');
      }
    }

    console.log('\n✅ Key Vault connection test completed successfully!');
  } catch (error) {
    console.error(`\n❌ Key Vault connection failed:`);
    console.error(`   Error: ${error.message}`);
    
    if (error.statusCode === 403) {
      console.error('\n💡 This might be a permissions issue.');
      console.error('   Run: az keyvault set-policy --name <vault-name> --upn <your-email> --secret-permissions get list');
    } else if (error.statusCode === 401) {
      console.error('\n💡 Authentication failed. Try: az login');
    }
    
    process.exit(1);
  }
}

const options = parseArgs();
testKeyVault(options).catch(error => {
  console.error(`❌ Test failed: ${error.message}`);
  process.exit(1);
});

