# SSL/TLS Configuration Guide

This guide explains how to configure SSL/TLS (HTTPS) for the entire codebase.

## Overview

The codebase now supports full SSL/TLS encryption with the following features:
- ✅ HTTPS support for all microservices
- ✅ HTTPS support for API Gateway
- ✅ HTTPS support for Nginx reverse proxy
- ✅ Self-signed certificate generation for development
- ✅ Production-ready SSL configuration
- ✅ Automatic HTTP to HTTPS redirect (optional)

## Quick Start

### 1. Generate SSL Certificates (Development)

For development/testing, generate self-signed certificates:

```bash
# Generate certificates for localhost
./scripts/generate-ssl-certs.sh

# Or specify a domain/IP
SSL_DOMAIN=98.70.245.87 ./scripts/generate-ssl-certs.sh
```

This creates:
- `ssl/cert.pem` - SSL certificate
- `ssl/key.pem` - Private key

### 2. Enable SSL in Environment Variables

Add to your `.env` file or environment:

```bash
# Enable SSL/HTTPS
ENABLE_SSL=true
ENABLE_HTTPS=true

# Certificate paths (optional, defaults to ./ssl/cert.pem and ./ssl/key.pem)
SSL_CERT_PATH=./ssl/cert.pem
SSL_KEY_PATH=./ssl/key.pem

# SSL Security Settings
SSL_MIN_VERSION=TLSv1.2
SSL_MAX_VERSION=TLSv1.3
SSL_REJECT_UNAUTHORIZED=true  # Set to false only for self-signed in development
```

### 3. Start Services with HTTPS

All services will automatically use HTTPS when `ENABLE_SSL=true`:

```bash
# Start individual service
cd microservices/hr-service
ENABLE_SSL=true npm start

# Or start all services via docker-compose
ENABLE_SSL=true docker-compose up
```

## Architecture

### SSL Termination Points

1. **Kubernetes Ingress** (Production)
   - SSL termination at ingress controller
   - Uses cert-manager for Let's Encrypt certificates
   - Configured in `k8s/ingress.yaml`

2. **Nginx Reverse Proxy** (Docker/Local)
   - SSL termination at Nginx
   - Configured in `docker/nginx/conf.d/default.conf`
   - Requires certificates mounted at `/etc/nginx/ssl/`

3. **Application Level** (Direct)
   - Each microservice can run HTTPS directly
   - Uses shared SSL utility: `microservices/shared/utils/ssl.js`
   - Automatically falls back to HTTP if certificates not available

## Configuration Details

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ENABLE_SSL` | Enable SSL/HTTPS | `false` | No |
| `ENABLE_HTTPS` | Alias for ENABLE_SSL | `false` | No |
| `SSL_CERT_PATH` | Path to SSL certificate | `./ssl/cert.pem` | No |
| `SSL_KEY_PATH` | Path to SSL private key | `./ssl/key.pem` | No |
| `SSL_MIN_VERSION` | Minimum TLS version | `TLSv1.2` | No |
| `SSL_MAX_VERSION` | Maximum TLS version | `TLSv1.3` | No |
| `SSL_REJECT_UNAUTHORIZED` | Reject unauthorized certs | `true` | No |

### Certificate Requirements

#### Development (Self-Signed)
- Generate using `scripts/generate-ssl-certs.sh`
- Valid for 365 days by default
- Browser will show security warning (expected)

#### Production (CA-Signed)
- Use Let's Encrypt (free) via cert-manager
- Or commercial CA certificates
- Must be valid and trusted by browsers

## Service Configuration

### Microservices

All microservices use the shared SSL utility:

```javascript
const { createServer } = require('../../shared/utils/ssl');

// Automatically uses HTTPS if ENABLE_SSL=true
const server = createServer(app, PORT, HOST, () => {
  logger.info('Server started');
});
```

### API Gateway

The main API Gateway (`src/server.js`) also supports HTTPS:

```javascript
const { createServer } = require('./microservices/shared/utils/ssl');

// Automatically uses HTTPS if ENABLE_SSL=true
const server = createServer(app, PORT, HOST);
```

### Nginx Configuration

Nginx HTTPS is configured in `docker/nginx/conf.d/default.conf`:

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... rest of configuration
}
```

## Docker Configuration

### Mount SSL Certificates

In `docker-compose.yml`:

```yaml
services:
  nginx:
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
    environment:
      - ENABLE_SSL=true
```

### Generate Certificates in Container

```bash
# Inside container
docker exec -it <container> ./scripts/generate-ssl-certs.sh
```

## Kubernetes Configuration

### Using cert-manager (Recommended)

The ingress is already configured for cert-manager:

```yaml
annotations:
  cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
    - hosts:
        - api.etelios.com
      secretName: etelios-tls
```

### Manual Certificate Secret

```bash
# Create secret from certificate files
kubectl create secret tls etelios-tls \
  --cert=ssl/cert.pem \
  --key=ssl/key.pem \
  -n etelios-backend-prod
```

## Security Best Practices

### 1. Certificate Management
- ✅ Use Let's Encrypt for production (free, automated)
- ✅ Rotate certificates before expiration
- ✅ Use strong key sizes (2048+ bits)
- ✅ Store private keys securely (never commit to Git)

### 2. TLS Configuration
- ✅ Use TLS 1.2 minimum (TLS 1.3 preferred)
- ✅ Disable weak ciphers
- ✅ Enable HSTS (HTTP Strict Transport Security)
- ✅ Use secure cipher suites

### 3. Development vs Production
- ✅ Self-signed certificates for development only
- ✅ Always use CA-signed certificates in production
- ✅ Never disable certificate validation in production
- ✅ Set `SSL_REJECT_UNAUTHORIZED=true` in production

## Troubleshooting

### Certificate Not Found

**Error**: `SSL certificate files not found`

**Solution**:
1. Generate certificates: `./scripts/generate-ssl-certs.sh`
2. Check paths in environment variables
3. Verify file permissions (key should be 600)

### Self-Signed Certificate Warning

**Issue**: Browser shows "Not Secure" warning

**Solution**: This is expected for self-signed certificates. In production, use CA-signed certificates.

### Port Already in Use

**Error**: `EADDRINUSE`

**Solution**: 
- Check if another service is using the port
- Change PORT environment variable
- Kill the process using the port

### HTTPS Not Working

**Checklist**:
1. ✅ `ENABLE_SSL=true` is set
2. ✅ Certificate files exist and are readable
3. ✅ Certificate paths are correct
4. ✅ Port 443 is not blocked by firewall
5. ✅ Service logs show HTTPS startup message

## Testing

### Test HTTPS Endpoint

```bash
# Test with curl (ignore self-signed cert warning)
curl -k https://localhost:3001/health

# Test with certificate validation
curl --cacert ssl/cert.pem https://localhost:3001/health
```

### Verify SSL Configuration

```bash
# Check SSL certificate
openssl x509 -in ssl/cert.pem -text -noout

# Test SSL connection
openssl s_client -connect localhost:3001 -servername localhost
```

## Migration from HTTP to HTTPS

### Step 1: Generate Certificates
```bash
./scripts/generate-ssl-certs.sh
```

### Step 2: Update Environment
```bash
export ENABLE_SSL=true
```

### Step 3: Restart Services
```bash
# Restart all services
docker-compose restart

# Or restart individual service
pm2 restart hr-service
```

### Step 4: Update Frontend URLs
Update all API URLs from `http://` to `https://`:

```javascript
// Before
const API_URL = 'http://api.etelios.com';

// After
const API_URL = 'https://api.etelios.com';
```

## Support

For issues or questions:
1. Check service logs for SSL-related errors
2. Verify certificate validity and paths
3. Ensure environment variables are set correctly
4. Review this guide for common issues

## References

- [Node.js HTTPS Documentation](https://nodejs.org/api/https.html)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [TLS Best Practices](https://www.ssllabs.com/projects/best-practices/)

