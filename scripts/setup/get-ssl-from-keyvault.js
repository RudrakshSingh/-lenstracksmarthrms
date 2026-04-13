#!/usr/bin/env node

/**
 * Retrieve SSL Certificate and Private Key from Azure Key Vault
 * 
 * Usage:
 *   node scripts/get-ssl-from-keyvault.js
 * 
 * Environment Variables Required:
 *   AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net
 *   CERTIFICATE_NAME=etelios-wildcard (optional, defaults to etelios-wildcard)
 */

const { SecretClient, CertificateClient } = require('@azure/keyvault-secrets');
const { DefaultAzureCredential } = require('@azure/identity');
const fs = require('fs');
const path = require('path');

const KEY_VAULT_URL = process.env.AZURE_KEY_VAULT_URL || 'https://etelios-keyvault.vault.azure.net';
const CERTIFICATE_NAME = process.env.CERTIFICATE_NAME || 'etelios-wildcard';
const OUTPUT_DIR = path.join(__dirname, '../ssl/production');

async function getSSLCertificateFromKeyVault() {
  try {
    console.log('🔐 Retrieving SSL Certificate from Azure Key Vault');
    console.log('==================================================');
    console.log(`Key Vault: ${KEY_VAULT_URL}`);
    console.log(`Certificate Name: ${CERTIFICATE_NAME}`);
    console.log('');

    // Initialize Azure credentials
    const credential = new DefaultAzureCredential();
    const secretClient = new SecretClient(KEY_VAULT_URL, credential);

    // In Azure Key Vault, when you store a certificate, the private key is stored as a secret
    // with the same name as the certificate
    console.log('📥 Retrieving certificate and private key...');

    // Get the certificate (as a secret - Key Vault stores certs as secrets)
    let certificateSecret;
    let privateKeySecret;

    try {
      // Try to get the certificate secret
      certificateSecret = await secretClient.getSecret(CERTIFICATE_NAME);
      console.log('✅ Certificate retrieved from Key Vault');
    } catch (error) {
      if (error.statusCode === 404) {
        console.error(`❌ Certificate '${CERTIFICATE_NAME}' not found in Key Vault`);
        console.error('   Please check the certificate name and Key Vault URL');
        process.exit(1);
      } else {
        throw error;
      }
    }

    // The certificate secret might contain the full certificate chain
    // The private key is typically stored as a separate secret with suffix '-key' or as part of the certificate
    let privateKeyName = `${CERTIFICATE_NAME}-key`;
    
    try {
      privateKeySecret = await secretClient.getSecret(privateKeyName);
      console.log('✅ Private key retrieved from Key Vault');
    } catch (error) {
      if (error.statusCode === 404) {
        // Try alternative names
        const alternativeNames = [
          `${CERTIFICATE_NAME}-private-key`,
          `${CERTIFICATE_NAME}PrivateKey`,
          `${CERTIFICATE_NAME}_key`
        ];
        
        let found = false;
        for (const altName of alternativeNames) {
          try {
            privateKeySecret = await secretClient.getSecret(altName);
            console.log(`✅ Private key found as '${altName}'`);
            found = true;
            break;
          } catch (e) {
            // Continue trying
          }
        }
        
        if (!found) {
          console.warn('⚠️  Private key not found as separate secret');
          console.warn('   In Key Vault, certificates sometimes store the key within the certificate object');
          console.warn('   You may need to extract it manually or check the certificate object');
        }
      } else {
        throw error;
      }
    }

    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    if (!fs.existsSync(path.join(OUTPUT_DIR, 'private'))) {
      fs.mkdirSync(path.join(OUTPUT_DIR, 'private'), { recursive: true });
    }

    // Save certificate
    const certPath = path.join(OUTPUT_DIR, 'cert.pem');
    let certContent = certificateSecret.value;

    // If the certificate content doesn't have BEGIN/END markers, it might be base64 encoded
    if (!certContent.includes('BEGIN CERTIFICATE')) {
      // Try to parse as base64
      try {
        const decoded = Buffer.from(certContent, 'base64').toString('utf8');
        if (decoded.includes('BEGIN CERTIFICATE')) {
          certContent = decoded;
        }
      } catch (e) {
        // Not base64, use as is
      }
    }

    // Ensure proper certificate format
    if (!certContent.includes('BEGIN CERTIFICATE')) {
      certContent = `-----BEGIN CERTIFICATE-----\n${certContent}\n-----END CERTIFICATE-----\n`;
    }

    fs.writeFileSync(certPath, certContent);
    fs.chmodSync(certPath, 0o644);
    console.log(`✅ Certificate saved to: ${certPath}`);

    // Save private key if found
    if (privateKeySecret) {
      const keyPath = path.join(OUTPUT_DIR, 'private', 'key.pem');
      let keyContent = privateKeySecret.value;

      // Ensure proper key format
      if (!keyContent.includes('BEGIN') && !keyContent.includes('PRIVATE KEY')) {
        // Try to detect format
        if (keyContent.includes('BEGIN')) {
          // Already has BEGIN marker
        } else {
          // Try to add proper markers
          if (keyContent.length > 100) {
            // Likely RSA key
            keyContent = `-----BEGIN RSA PRIVATE KEY-----\n${keyContent}\n-----END RSA PRIVATE KEY-----\n`;
          } else {
            keyContent = `-----BEGIN PRIVATE KEY-----\n${keyContent}\n-----END PRIVATE KEY-----\n`;
          }
        }
      }

      fs.writeFileSync(keyPath, keyContent);
      fs.chmodSync(keyPath, 0o600);
      console.log(`✅ Private key saved to: ${keyPath}`);
    } else {
      console.log('');
      console.log('⚠️  Private key not found. You may need to:');
      console.log('   1. Check if it\'s stored with a different name in Key Vault');
      console.log('   2. Extract it from the certificate object manually');
      console.log('   3. Use Azure CLI: az keyvault secret show --name etelios-wildcard-key --vault-name etelios-keyvault');
    }

    console.log('');
    console.log('✅ SSL certificate retrieval complete!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Verify the certificate: openssl x509 -in ssl/production/cert.pem -text -noout');
    if (privateKeySecret) {
      console.log('   2. Verify key matches: openssl x509 -noout -modulus -in ssl/production/cert.pem | openssl md5');
      console.log('      openssl rsa -noout -modulus -in ssl/production/private/key.pem | openssl md5');
    }
    console.log('   3. Update environment: ENABLE_SSL=true');
    console.log('   4. Set paths: SSL_CERT_PATH=./ssl/production/cert.pem');
    if (privateKeySecret) {
      console.log('      SSL_KEY_PATH=./ssl/production/private/key.pem');
    }

  } catch (error) {
    console.error('❌ Error retrieving certificate from Key Vault:');
    console.error(`   ${error.message}`);
    if (error.statusCode) {
      console.error(`   Status Code: ${error.statusCode}`);
    }
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('');
      console.error('💡 Troubleshooting:');
      console.error('   1. Ensure you\'re logged into Azure: az login');
      console.error('   2. Check Key Vault URL is correct');
      console.error('   3. Verify you have access to the Key Vault');
      console.error('   4. Check certificate name is correct');
    }
    process.exit(1);
  }
}

// Run the script
getSSLCertificateFromKeyVault().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

