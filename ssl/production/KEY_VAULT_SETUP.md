# Get SSL Certificate from Azure Key Vault

You have your SSL certificate stored in Azure Key Vault! Here's how to retrieve it.

## Your Key Vault Certificate

- **Key Vault**: `etelios-keyvault`
- **Certificate Name**: `etelios-wildcard`
- **URL**: `https://etelios-keyvault.vault.azure.net/certificates/etelios-wildcard/377fddf7549144269ff37ae356f741bd`

## Method 1: Using Node.js Script (Recommended)

### Prerequisites

```bash
# Install Azure SDK if not already installed
npm install @azure/keyvault-secrets @azure/identity
```

### Run the Script

```bash
# Set environment variables
export AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net
export CERTIFICATE_NAME=etelios-wildcard

# Run the script
node scripts/get-ssl-from-keyvault.js
```

The script will:
- ✅ Retrieve the certificate from Key Vault
- ✅ Try to find the private key (may be stored separately)
- ✅ Save certificate to `ssl/production/cert.pem`
- ✅ Save private key to `ssl/production/private/key.pem` (if found)

## Method 2: Using Azure CLI (Alternative)

### Prerequisites

```bash
# Install Azure CLI if not installed
# macOS: brew install azure-cli
# Then login: az login
```

### Run the Script

```bash
# Set variables
export AZURE_KEY_VAULT_NAME=etelios-keyvault
export CERTIFICATE_NAME=etelios-wildcard

# Run the script
./scripts/get-ssl-from-keyvault-azure-cli.sh
```

## Method 3: Manual Azure CLI Commands

### Get Certificate

```bash
# Get certificate as secret
az keyvault secret show \
  --vault-name etelios-keyvault \
  --name etelios-wildcard \
  --query value -o tsv > ssl/production/cert.pem

chmod 644 ssl/production/cert.pem
```

### Get Private Key

The private key might be stored with a different name. Try:

```bash
# Try common private key names
az keyvault secret show \
  --vault-name etelios-keyvault \
  --name etelios-wildcard-key \
  --query value -o tsv > ssl/production/private/key.pem

# Or try:
az keyvault secret show \
  --vault-name etelios-keyvault \
  --name etelios-wildcard-private-key \
  --query value -o tsv > ssl/production/private/key.pem

chmod 600 ssl/production/private/key.pem
```

### Download Certificate Bundle (PFX)

If the private key is embedded in the certificate bundle:

```bash
# Download as PFX
az keyvault certificate download \
  --vault-name etelios-keyvault \
  --name etelios-wildcard \
  --file certificate.pfx

# Extract private key from PFX
openssl pkcs12 -in certificate.pfx -nocerts -nodes -out ssl/production/private/key.pem

# Extract certificate from PFX
openssl pkcs12 -in certificate.pfx -clcerts -nokeys -out ssl/production/cert.pem

# Set permissions
chmod 600 ssl/production/private/key.pem
chmod 644 ssl/production/cert.pem
```

## Verify Certificate

After retrieving, verify it:

```bash
# View certificate details
openssl x509 -in ssl/production/cert.pem -text -noout

# Check validity
openssl x509 -in ssl/production/cert.pem -noout -dates

# Verify key matches (if you have the key)
openssl x509 -noout -modulus -in ssl/production/cert.pem | openssl md5
openssl rsa -noout -modulus -in ssl/production/private/key.pem | openssl md5
# Both should output the same hash
```

## List Available Secrets

To see what's available in your Key Vault:

```bash
# List all secrets
az keyvault secret list --vault-name etelios-keyvault --query "[].name" -o tsv

# List all certificates
az keyvault certificate list --vault-name etelios-keyvault --query "[].name" -o tsv
```

## Troubleshooting

### "Certificate not found"
- Check the certificate name is correct
- Verify you have access to the Key Vault
- List certificates: `az keyvault certificate list --vault-name etelios-keyvault`

### "Private key not found"
- The private key might be embedded in the certificate bundle
- Try downloading as PFX and extracting
- Check if it's stored with a different name

### "Access denied"
- Ensure you're logged in: `az login`
- Check you have "Get" permission on the Key Vault
- Verify your Azure account has access

## Next Steps

Once you have both certificate and private key:

1. ✅ Certificate at: `ssl/production/cert.pem`
2. ✅ Private key at: `ssl/production/private/key.pem`
3. ✅ Update environment variables:
   ```bash
   ENABLE_SSL=true
   SSL_CERT_PATH=./ssl/production/cert.pem
   SSL_KEY_PATH=./ssl/production/private/key.pem
   ```
4. ✅ Restart services

## Using Key Vault Directly (No File Download)

You can also configure the SSL utility to fetch from Key Vault directly at runtime. This is more secure but requires updating the SSL utility code.

