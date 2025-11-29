#!/usr/bin/env node

/**
 * Test Azure Key Vault Connection
 * Quick test to verify Key Vault connectivity and Managed Identity
 * 
 * Usage:
 *   node scripts/test-keyvault-connection.js
 */

const { SecretClient } = require("@azure/keyvault-secrets");
const { DefaultAzureCredential } = require("@azure/identity");
require('dotenv').config();

const KEY_VAULT_NAME = process.env.AZURE_KEY_VAULT_NAME || "etelios-keyvault";
const KEY_VAULT_URL = process.env.AZURE_KEY_VAULT_URL || `https://${KEY_VAULT_NAME}.vault.azure.net/`;

async function testKeyVaultConnection() {
  console.log('🔐 Testing Azure Key Vault Connection\n');
  console.log(`Key Vault: ${KEY_VAULT_NAME}`);
  console.log(`URL: ${KEY_VAULT_URL}\n`);

  try {
    // Initialize credentials
    console.log('1. Initializing Azure credentials...');
    const credential = new DefaultAzureCredential();
    console.log('   ✅ Credentials initialized\n');

    // Create client
    console.log('2. Creating SecretClient...');
    const client = new SecretClient(KEY_VAULT_URL, credential);
    console.log('   ✅ SecretClient created\n');

    // Test: List secrets (this requires 'List' permission)
    console.log('3. Testing List permission...');
    try {
      const secrets = [];
      for await (const secretProperties of client.listPropertiesOfSecrets()) {
        secrets.push(secretProperties.name);
      }
      console.log(`   ✅ List permission OK (found ${secrets.length} secrets)\n`);
    } catch (error) {
      console.log(`   ⚠️  List permission failed: ${error.message}\n`);
    }

    // Test: Read a specific secret (this requires 'Get' permission)
    console.log('4. Testing Get permission...');
    const testSecretName = 'kv-jwt-secret'; // Try to read a common secret
    try {
      const secret = await client.getSecret(testSecretName);
      console.log(`   ✅ Get permission OK`);
      console.log(`   ✅ Secret "${testSecretName}" exists\n`);
    } catch (error) {
      if (error.statusCode === 404) {
        console.log(`   ⚠️  Secret "${testSecretName}" not found (but Get permission works)\n`);
      } else {
        console.log(`   ❌ Get permission failed: ${error.message}\n`);
      }
    }

    // Test: Create a test secret (this requires 'Set' permission)
    console.log('5. Testing Set permission...');
    const testSecretName2 = 'kv-test-connection';
    try {
      const testValue = `test-${Date.now()}`;
      await client.setSecret(testSecretName2, testValue);
      console.log(`   ✅ Set permission OK`);
      console.log(`   ✅ Created test secret: ${testSecretName2}`);
      
      // Clean up: Delete the test secret
      await client.beginDeleteSecret(testSecretName2);
      console.log(`   ✅ Cleaned up test secret\n`);
    } catch (error) {
      console.log(`   ⚠️  Set permission failed: ${error.message}\n`);
    }

    console.log('='.repeat(60));
    console.log('✅ Key Vault Connection Test Complete!');
    console.log('='.repeat(60));
    console.log('\n💡 If any permissions failed, ensure your Managed Identity or');
    console.log('   service principal has the following permissions on Key Vault:');
    console.log('   - Get (read secrets)');
    console.log('   - List (list secrets)');
    console.log('   - Set (create/update secrets)\n');

  } catch (error) {
    console.error('\n❌ Connection Test Failed!\n');
    console.error('Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Verify Key Vault name is correct');
    console.error('   2. Check if you\'re logged in: az login');
    console.error('   3. Verify Managed Identity is enabled (if running on App Service)');
    console.error('   4. Check Key Vault access policies\n');
    process.exit(1);
  }
}

// Run test
if (require.main === module) {
  testKeyVaultConnection()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testKeyVaultConnection };

