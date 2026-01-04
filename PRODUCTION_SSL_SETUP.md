# Production SSL Certificate Setup Guide

## Certificate Information

Your production SSL certificate has been configured:

- **Certificate File**: `ssl/production/cert.pem`
- **Issuer**: Sectigo Public Server Authentication CA DV R36
- **Domain**: *.etelios.com, etelios.com (Wildcard certificate)
- **Valid Until**: January 2, 2027 23:59:59
- **Type**: CA-signed production certificate

## ⚠️ CRITICAL: Private Key Required

**IMPORTANT**: You need to provide the **private key** file separately. The private key:

- ❌ **MUST NEVER** be committed to Git
- ✅ Should be stored securely (Azure Key Vault, Kubernetes Secrets, etc.)
- ✅ Should have restricted permissions (600 - owner read/write only)
- ✅ Should be kept confidential

## Quick Setup

### 1. Place Your Private Key

Place your private key file in a secure location:

```bash
# Option 1: Standard Linux location
/etc/ssl/private/etelios-key.pem

# Option 2: Application directory (less secure, not recommended)
./ssl/production/key.pem

# Option 3: Azure Key Vault (recommended for production)
# Store as secret: etelios-ssl-private-key
```

### 2. Set Proper Permissions

```bash
# Certificate (readable by all)
chmod 644 ssl/production/cert.pem

# Private Key (owner read/write only - CRITICAL)
chmod 600 /path/to/your/private-key.pem
```

### 3. Update Environment Variables

Create a production `.env` file or set environment variables:

```bash
# Enable SSL
ENABLE_SSL=true
ENABLE_HTTPS=true

# Certificate paths
SSL_CERT_PATH=/etc/ssl/certs/etelios-cert.pem
SSL_KEY_PATH=/etc/ssl/private/etelios-key.pem

# Security settings (production)
SSL_REJECT_UNAUTHORIZED=true
SSL_MIN_VERSION=TLSv1.2
SSL_MAX_VERSION=TLSv1.3
```

### 4. Copy Certificate to Production Location

```bash
# Copy certificate to standard location
sudo cp ssl/production/cert.pem /etc/ssl/certs/etelios-cert.pem
sudo chmod 644 /etc/ssl/certs/etelios-cert.pem

# Copy private key (if using file system)
sudo cp /path/to/your/private-key.pem /etc/ssl/private/etelios-key.pem
sudo chmod 600 /etc/ssl/private/etelios-key.pem
```

## Docker Configuration

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
      - /etc/ssl/private/etelios-key.pem:/etc/ssl/private/etelios-key.pem:ro
```

### Dockerfile

```dockerfile
# Copy certificate
COPY ssl/production/cert.pem /etc/ssl/certs/etelios-cert.pem
RUN chmod 644 /etc/ssl/certs/etelios-cert.pem

# Private key should be mounted as volume or from secrets
```

## Kubernetes Configuration

### Option 1: Kubernetes Secret (Recommended)

```bash
# Create TLS secret
kubectl create secret tls etelios-tls \
  --cert=ssl/production/cert.pem \
  --key=/path/to/your/private-key.pem \
  -n etelios-backend-prod

# Verify secret
kubectl get secret etelios-tls -n etelios-backend-prod
```

### Option 2: Mount Secret as Files

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: hr-service
    env:
    - name: ENABLE_SSL
      value: "true"
    - name: SSL_CERT_PATH
      value: "/etc/ssl/certs/etelios-cert.pem"
    - name: SSL_KEY_PATH
      value: "/etc/ssl/private/etelios-key.pem"
    volumeMounts:
    - name: ssl-cert
      mountPath: /etc/ssl/certs
      readOnly: true
    - name: ssl-key
      mountPath: /etc/ssl/private
      readOnly: true
  volumes:
  - name: ssl-cert
    secret:
      secretName: etelios-tls
      items:
      - key: tls.crt
        path: etelios-cert.pem
  - name: ssl-key
    secret:
      secretName: etelios-tls
      items:
      - key: tls.key
        path: etelios-key.pem
```

## Azure Key Vault (Recommended for Production)

### Store Private Key in Key Vault

```bash
# Store private key as secret
az keyvault secret set \
  --vault-name etelios-keyvault \
  --name etelios-ssl-private-key \
  --file /path/to/your/private-key.pem
```

### Update SSL Utility to Use Key Vault

The SSL utility can be extended to fetch the private key from Azure Key Vault:

```javascript
// In microservices/shared/utils/ssl.js
if (process.env.USE_KEY_VAULT === 'true') {
  const keyVault = require('./keyVault');
  key = await keyVault.getSecret('etelios-ssl-private-key');
}
```

## Nginx Configuration

Update `docker/nginx/conf.d/default.conf` to use production certificates:

```nginx
server {
    listen 443 ssl http2;
    server_name api.etelios.com *.etelios.com;
    
    ssl_certificate /etc/nginx/ssl/certs/etelios-cert.pem;
    ssl_certificate_key /etc/nginx/ssl/private/etelios-key.pem;
    
    # ... rest of configuration
}
```

## Verify Certificate

```bash
# View certificate details
openssl x509 -in ssl/production/cert.pem -text -noout

# Check certificate validity
openssl x509 -in ssl/production/cert.pem -noout -dates

# Verify certificate matches domain
openssl x509 -in ssl/production/cert.pem -noout -subject -issuer
```

Expected output:
```
subject=CN = *.etelios.com
issuer=C = GB, O = Sectigo Limited, CN = Sectigo Public Server Authentication CA DV R36
```

## Test HTTPS Connection

```bash
# Test with curl
curl -v https://api.etelios.com/health

# Test with openssl
openssl s_client -connect api.etelios.com:443 -servername api.etelios.com
```

## Environment File Template

Copy `production.ssl.env.example` to your production environment:

```bash
cp production.ssl.env.example .env.production
# Edit .env.production with your actual paths
```

## Security Checklist

- [ ] Private key stored securely (not in Git)
- [ ] Private key has 600 permissions
- [ ] Certificate has 644 permissions
- [ ] `ENABLE_SSL=true` in production
- [ ] `SSL_REJECT_UNAUTHORIZED=true` in production
- [ ] Certificate paths are correct
- [ ] Certificate is valid and not expired
- [ ] Private key matches certificate
- [ ] SSL/TLS version is 1.2 or higher
- [ ] Secure cipher suites are configured

## Troubleshooting

### Certificate Not Found
```bash
# Check if certificate exists
ls -la /etc/ssl/certs/etelios-cert.pem

# Verify path in environment
echo $SSL_CERT_PATH
```

### Permission Denied
```bash
# Check permissions
ls -la /etc/ssl/private/etelios-key.pem

# Fix permissions
chmod 600 /etc/ssl/private/etelios-key.pem
```

### Certificate Mismatch
```bash
# Verify certificate and key match
openssl x509 -noout -modulus -in cert.pem | openssl md5
openssl rsa -noout -modulus -in key.pem | openssl md5
# Both should output the same hash
```

## Support

For issues:
1. Verify certificate and key file paths
2. Check file permissions
3. Verify environment variables are set
4. Check service logs for SSL errors
5. Test certificate with openssl commands

## Next Steps

1. ✅ Certificate file created at `ssl/production/cert.pem`
2. ⚠️ **Add your private key file** (keep it secure!)
3. Update environment variables with certificate paths
4. Set `ENABLE_SSL=true` in production
5. Restart services to apply SSL configuration
6. Test HTTPS endpoints
7. Update frontend to use HTTPS URLs

