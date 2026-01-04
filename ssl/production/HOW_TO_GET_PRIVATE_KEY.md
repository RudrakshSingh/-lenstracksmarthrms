# How to Get Your Private Key

## ⚠️ Important: You Need the PRIVATE KEY, Not the Certificate

You already have the **certificate** (which is public and safe to share).  
You now need the **PRIVATE KEY** (which is secret and must be kept secure).

## Difference Between Certificate and Private Key

### Certificate (What You Have)
```
-----BEGIN CERTIFICATE-----
MIIGkzCCBPugAwIBAgIRAOhH6MPTbI+ODL4o5soiCZYw...
-----END CERTIFICATE-----
```
- ✅ Public file (safe to share)
- ✅ Already saved at `ssl/production/cert.pem`
- ✅ Used for encryption/verification

### Private Key (What You Need)
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----
```
OR
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
-----END RSA PRIVATE KEY-----
```
- ❌ Secret file (NEVER share)
- ⚠️ Must be kept secure
- ⚠️ Required to use the certificate

## Where to Find Your Private Key

### Option 1: Sectigo Portal
1. Log into your Sectigo account
2. Go to "My Certificates" or "Certificate Management"
3. Find your certificate for `*.etelios.com`
4. Download or view the private key
5. It may be in a `.key`, `.pem`, or `.p12` file

### Option 2: Certificate Download Package
When you originally downloaded the certificate, you should have received:
- Certificate file (`.crt` or `.pem`)
- Private key file (`.key` or `.pem`)
- Sometimes bundled in a `.p12` or `.pfx` file

### Option 3: Server Where Certificate Was Installed
If the certificate was previously installed on a server:
1. Check the server's SSL directory (usually `/etc/ssl/` or `/etc/nginx/ssl/`)
2. Look for files like `private.key`, `server.key`, or `etelios.key`
3. The private key should have 600 permissions

### Option 4: Certificate Provider
Contact Sectigo support:
- Provide your certificate details
- Request the private key
- They may need to verify your identity

## How to Use the Private Key

### Method 1: Using the Helper Script (Easiest)

```bash
# Run the script
./ssl/production/create-private-key.sh

# When prompted, paste your private key content
# Press Enter, then Ctrl+D (or type 'END')
```

### Method 2: Manual File Creation

```bash
# Create the file
nano ssl/production/private/key.pem

# Paste your private key content (including BEGIN and END lines)
# Save and exit (Ctrl+X, then Y, then Enter)

# Set permissions
chmod 600 ssl/production/private/key.pem
```

### Method 3: From Existing File

```bash
# If you have the private key as a file
cp /path/to/your/private-key.key ssl/production/private/key.pem
chmod 600 ssl/production/private/key.pem
```

## Extract from .p12 or .pfx File

If you have a `.p12` or `.pfx` file:

```bash
# Extract private key
openssl pkcs12 -in certificate.p12 -nocerts -nodes -out key.pem

# Enter the password when prompted
# Then move to the correct location
mv key.pem ssl/production/private/key.pem
chmod 600 ssl/production/private/key.pem
```

## Verify You Have the Right Key

After placing the private key, verify it matches your certificate:

```bash
# Get certificate modulus
openssl x509 -noout -modulus -in ssl/production/cert.pem | openssl md5

# Get private key modulus
openssl rsa -noout -modulus -in ssl/production/private/key.pem | openssl md5

# Both should output the SAME hash
```

## Security Reminders

- ❌ **NEVER** commit the private key to Git
- ❌ **NEVER** share the private key publicly
- ✅ Keep it in a secure location
- ✅ Use 600 permissions (owner read/write only)
- ✅ Consider using Azure Key Vault or Kubernetes Secrets in production

## Still Can't Find It?

If you cannot locate the private key:

1. **Check all backup locations** - USB drives, cloud storage, email
2. **Contact Sectigo support** - They may be able to help
3. **Check previous servers** - If the certificate was used before
4. **Check team members** - Someone else might have it
5. **Consider reissuing** - As a last resort, you may need a new certificate

## Next Steps

Once you have the private key:

1. ✅ Place it at `ssl/production/private/key.pem`
2. ✅ Set permissions: `chmod 600 ssl/production/private/key.pem`
3. ✅ Verify it matches the certificate
4. ✅ Update environment variables
5. ✅ Set `ENABLE_SSL=true`
6. ✅ Restart services

