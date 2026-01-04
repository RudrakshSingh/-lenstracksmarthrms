# Private Key Setup Instructions

## ⚠️ IMPORTANT: You Need to Provide the Private Key

The SSL certificate requires a matching **private key** file. This private key:

- ❌ **MUST NEVER** be committed to Git
- ✅ Should be kept secure and confidential
- ✅ Must match the certificate in `ssl/production/cert.pem`

## Option 1: Local Development Setup (macOS/Linux)

### Step 1: Create Directory (if needed)

```bash
# For local development, use project directory
mkdir -p ssl/production/private
```

### Step 2: Place Your Private Key

Place your private key file in the directory:

```bash
# Copy your private key file to:
ssl/production/private/key.pem

# Or if you have it elsewhere:
cp /path/to/your/private-key.pem ssl/production/private/key.pem
```

### Step 3: Set Permissions

```bash
# Set secure permissions (owner read/write only)
chmod 600 ssl/production/private/key.pem

# Verify permissions
ls -la ssl/production/private/key.pem
# Should show: -rw------- (600)
```

### Step 4: Update Environment Variables

For local development, update your `.env` file:

```bash
ENABLE_SSL=true
SSL_CERT_PATH=./ssl/production/cert.pem
SSL_KEY_PATH=./ssl/production/private/key.pem
```

## Option 2: System-Wide Setup (Linux Production)

### Step 1: Create System Directories

```bash
# Create directories (requires sudo)
sudo mkdir -p /etc/ssl/certs
sudo mkdir -p /etc/ssl/private
```

### Step 2: Copy Certificate

```bash
# Copy certificate
sudo cp ssl/production/cert.pem /etc/ssl/certs/etelios-cert.pem
sudo chmod 644 /etc/ssl/certs/etelios-cert.pem
```

### Step 3: Copy Private Key

```bash
# Copy your private key
sudo cp /path/to/your/private-key.pem /etc/ssl/private/etelios-key.pem
sudo chmod 600 /etc/ssl/private/etelios-key.pem
```

### Step 4: Update Environment Variables

```bash
ENABLE_SSL=true
SSL_CERT_PATH=/etc/ssl/certs/etelios-cert.pem
SSL_KEY_PATH=/etc/ssl/private/etelios-key.pem
```

## Option 3: Docker/Kubernetes (Recommended for Production)

### Docker Compose

```yaml
services:
  hr-service:
    environment:
      - ENABLE_SSL=true
      - SSL_CERT_PATH=/etc/ssl/certs/etelios-cert.pem
      - SSL_KEY_PATH=/etc/ssl/private/etelios-key.pem
    volumes:
      - ./ssl/production/cert.pem:/etc/ssl/certs/etelios-cert.pem:ro
      - ./ssl/production/private/key.pem:/etc/ssl/private/etelios-key.pem:ro
```

### Kubernetes Secret

```bash
# Create TLS secret from certificate and key
kubectl create secret tls etelios-tls \
  --cert=ssl/production/cert.pem \
  --key=/path/to/your/private-key.pem \
  -n etelios-backend-prod

# Then mount in deployment
```

## Verify Private Key Matches Certificate

```bash
# Get certificate modulus
openssl x509 -noout -modulus -in ssl/production/cert.pem | openssl md5

# Get private key modulus
openssl rsa -noout -modulus -in ssl/production/private/key.pem | openssl md5

# Both should output the SAME hash - this confirms they match
```

## Security Checklist

- [ ] Private key file exists
- [ ] Private key has 600 permissions (owner read/write only)
- [ ] Private key matches certificate (verified with openssl)
- [ ] Private key is NOT committed to Git
- [ ] Environment variables point to correct paths
- [ ] `ENABLE_SSL=true` is set

## Common Issues

### "No such file or directory"
- The directory doesn't exist - create it first
- The file doesn't exist - you need to provide the private key

### "Permission denied"
- Check file permissions: `ls -la ssl/production/private/key.pem`
- Set permissions: `chmod 600 ssl/production/private/key.pem`

### "Certificate and key don't match"
- Verify they match using openssl commands above
- Ensure you're using the correct private key for this certificate

## Next Steps

1. ✅ Certificate is ready at `ssl/production/cert.pem`
2. ⚠️ **You need to add your private key file**
3. Set proper permissions (600)
4. Update environment variables
5. Set `ENABLE_SSL=true`
6. Restart services

## Where to Get the Private Key

The private key should have been provided when you obtained the SSL certificate from Sectigo. If you don't have it:

1. Check your certificate provider's portal
2. Contact your certificate issuer
3. If you generated it yourself, check where you saved it

**Note**: The private key is typically provided as a `.key` or `.pem` file when you purchase/download the certificate.

