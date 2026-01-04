# Production SSL Certificate Setup

## Certificate Information

- **Issuer**: Sectigo Public Server Authentication CA DV R36
- **Domain**: *.etelios.com, etelios.com
- **Valid Until**: January 2, 2027 23:59:59
- **Type**: Wildcard SSL Certificate

## Setup Instructions

### 1. Certificate File

The certificate file (`cert.pem`) has been created. This is the public certificate.

### 2. Private Key (CRITICAL)

**IMPORTANT**: You need to provide the private key file separately. The private key should:

- **NEVER** be committed to Git
- Be stored in a secure location
- Have restricted permissions (600)
- Be kept confidential

### 3. File Locations

For production, place files in:

```
/etc/ssl/certs/etelios-cert.pem    (certificate - 644 permissions)
/etc/ssl/private/etelios-key.pem    (private key - 600 permissions)
```

### 4. Alternative Locations

If using different paths, update the environment variables:

```bash
SSL_CERT_PATH=/path/to/your/cert.pem
SSL_KEY_PATH=/path/to/your/key.pem
```

### 5. Docker/Kubernetes

For containerized deployments:

**Docker Compose:**
```yaml
volumes:
  - /etc/ssl/certs/etelios-cert.pem:/etc/ssl/certs/etelios-cert.pem:ro
  - /etc/ssl/private/etelios-key.pem:/etc/ssl/private/etelios-key.pem:ro
```

**Kubernetes Secret:**
```bash
kubectl create secret tls etelios-tls \
  --cert=/etc/ssl/certs/etelios-cert.pem \
  --key=/etc/ssl/private/etelios-key.pem \
  -n etelios-backend-prod
```

### 6. Verify Certificate

```bash
# View certificate details
openssl x509 -in ssl/production/cert.pem -text -noout

# Check certificate validity
openssl x509 -in ssl/production/cert.pem -noout -dates
```

## Security Best Practices

1. ✅ Private key should have 600 permissions (owner read/write only)
2. ✅ Certificate can have 644 permissions (readable by all)
3. ✅ Never commit private keys to version control
4. ✅ Use secrets management (Azure Key Vault, Kubernetes Secrets) in production
5. ✅ Rotate certificates before expiration
6. ✅ Monitor certificate expiration dates

## Environment Variables

Set these in your production environment:

```bash
ENABLE_SSL=true
SSL_CERT_PATH=/etc/ssl/certs/etelios-cert.pem
SSL_KEY_PATH=/etc/ssl/private/etelios-key.pem
SSL_REJECT_UNAUTHORIZED=true
```

## Troubleshooting

### Certificate Not Found
- Verify file paths are correct
- Check file permissions
- Ensure files are readable by the application user

### Permission Denied
- Check file permissions: `ls -la /etc/ssl/private/etelios-key.pem`
- Ensure application user can read the key file
- Verify SELinux/AppArmor policies if applicable

### Certificate Expired
- Check expiration: `openssl x509 -in cert.pem -noout -enddate`
- Renew certificate before expiration date

