# Private Key Status from Azure Key Vault

## Current Situation

✅ **Certificate Retrieved**: Successfully downloaded from Key Vault
- Location: `ssl/production/cert.pem`
- Source: Azure Key Vault certificate `etelios-wildcard`

❌ **Private Key NOT Found**: The private key is not stored as a separate secret in Key Vault

## What We Found

1. **Certificate exists** as a certificate object in Key Vault
2. **Certificate downloaded** as PEM format (not PFX bundle)
3. **Private key is NOT** stored as a separate secret
4. **Private key is NOT** embedded in the downloaded certificate file

## Why This Happens

When you upload a certificate to Azure Key Vault:
- If uploaded as a **certificate object**: The private key is stored internally but not directly accessible via `az keyvault secret show`
- If uploaded as a **secret**: Both certificate and key would be accessible as secrets
- The private key might be stored in Key Vault's internal certificate store, but requires special permissions to access

## Solutions

### Option 1: Download Certificate with Private Key (Recommended)

If the certificate was originally uploaded with the private key, you need to download it in a way that includes the key:

```bash
# Try downloading as secret (might contain both)
az keyvault secret show \
  --vault-name etelios-keyvault \
  --name etelios-wildcard \
  --query value -o tsv > certificate-with-key.pem

# Or try to get the certificate with its secret reference
az keyvault certificate show \
  --vault-name etelios-keyvault \
  --name etelios-wildcard \
  --query "sid" -o tsv
```

### Option 2: Use Azure Portal

1. Go to Azure Portal → Key Vault → `etelios-keyvault`
2. Navigate to **Certificates** → `etelios-wildcard`
3. Click **Download in CER/PEM format** or **Download in PFX/PKCS#12 format**
4. If PFX format is available, it will contain the private key
5. Extract using: `openssl pkcs12 -in certificate.pfx -nocerts -nodes -out key.pem`

### Option 3: Re-upload Certificate with Private Key

If you have the original certificate files:

```bash
# Upload certificate with private key as a secret
az keyvault secret set \
  --vault-name etelios-keyvault \
  --name etelios-wildcard-private-key \
  --file /path/to/private-key.pem
```

### Option 4: Use Certificate from Original Source

- Check your Sectigo account for the original certificate download
- The original download should include both certificate and private key
- Re-download if needed

### Option 5: Use SSL Termination at Ingress (Current Setup)

Since you're using Kubernetes, SSL termination happens at the ingress level:

✅ **You don't need the private key in your application code!**

The ingress controller handles SSL, and you only need to:
1. Create a Kubernetes secret with certificate and key (when you get the key)
2. Reference it in your ingress configuration (already configured)

## For Kubernetes/Production

Since SSL termination is at the ingress level:

1. **Keep `ENABLE_SSL=false`** in your application code
2. **The ingress controller handles SSL** (already configured in `k8s/ingress.yaml`)
3. **When you get the private key**, create the Kubernetes secret:

```bash
kubectl create secret tls etelios-tls \
  --cert=ssl/production/cert.pem \
  --key=/path/to/private-key.pem \
  -n etelios-backend-prod
```

## Next Steps

1. ✅ Certificate is ready: `ssl/production/cert.pem`
2. ⚠️ Get private key from:
   - Azure Portal (download as PFX)
   - Original Sectigo download
   - Re-upload to Key Vault as secret
3. ✅ For now: Use SSL termination at ingress (no app-level SSL needed)

## Summary

- **Certificate**: ✅ Ready
- **Private Key**: ❌ Not in Key Vault as accessible secret
- **Solution**: Get from Azure Portal or original source, OR use ingress-level SSL (current setup)

