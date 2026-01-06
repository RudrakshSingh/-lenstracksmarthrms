# How to Get PFX File from Azure Key Vault

## Method 1: Download from Azure Portal (Easiest)

1. **Go to Azure Portal**: https://portal.azure.com
2. **Navigate to Key Vault**: 
   - Search for "etelios-keyvault" or "etelios-keyvault"
   - Click on your Key Vault
3. **Go to Certificates**:
   - Left sidebar → "Certificates"
   - Find "etelios-wildcard"
   - Click on it
4. **Download PFX**:
   - Click on the latest version (e.g., "377fddf7549144269ff37ae356f741bd")
   - Click "Download in PFX/PKCS#12 format"
   - Save as `etelios-wildcard.pfx` in your project root

5. **Extract Private Key**:
   ```bash
   # You'll be prompted for the PFX password (set when downloading)
   openssl pkcs12 -in etelios-wildcard.pfx -nocerts -nodes -out private-key.pem
   
   # Extract certificate
   openssl pkcs12 -in etelios-wildcard.pfx -clcerts -nokeys -out cert.pem
   ```

## Method 2: Using Azure CLI

```bash
# Login to Azure
az login

# Set your Key Vault name
KEY_VAULT_NAME="etelios-keyvault"
CERT_NAME="etelios-wildcard"

# Download certificate in PFX format
az keyvault certificate download \
  --vault-name $KEY_VAULT_NAME \
  --name $CERT_NAME \
  --file etelios-wildcard.pfx \
  --encoding PKCS12

# You'll be prompted for a password to protect the PFX file
# Remember this password - you'll need it to extract the key

# Extract private key (enter the password you set above)
openssl pkcs12 -in etelios-wildcard.pfx -nocerts -nodes -out private-key.pem

# Extract certificate
openssl pkcs12 -in etelios-wildcard.pfx -clcerts -nokeys -out cert.pem
```

## Method 3: Using the Script

```bash
# Run the Azure CLI script
./scripts/get-ssl-from-keyvault-azure-cli.sh
```

## Important Notes

⚠️ **Security Warning:**
- The PFX file contains both certificate AND private key
- Keep it secure and NEVER commit to Git
- Delete it after extracting the key

✅ **After Extraction:**
- Save `private-key.pem` in a secure location
- Save `cert.pem` (certificate)
- Delete `etelios-wildcard.pfx` (or keep it very secure)
- Add to `.gitignore`:
  ```
  *.pfx
  *.p12
  private-key.pem
  key.pem
  ```

## If You Don't Have Access to Key Vault

If you can't access the Key Vault:
1. Ask your Azure admin for the PFX file
2. OR use self-signed certificates for development:
   ```bash
   ./scripts/generate-ssl-certs.sh
   ```
3. OR keep SSL disabled (current setup works fine):
   ```bash
   ENABLE_SSL=false
   ```
