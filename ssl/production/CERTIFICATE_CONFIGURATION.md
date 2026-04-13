# SSL Certificate Configuration Guide

## ✅ Certificate Status

**Certificate Location:** `ssl/production/etelios-cert.pem`

**Certificate Details:**
- **Subject:** `*.etelios.com` (wildcard certificate)
- **Issuer:** Sectigo Public Server Authentication CA DV R36
- **Valid From:** January 2, 2026 00:00:00 GMT
- **Valid Until:** January 2, 2027 23:59:59 GMT
- **Status:** ✅ Valid and ready to use

---

## 🔧 Quick Configuration

### For Local Development/Testing

Add these environment variables to your `.env` file:

```bash
ENABLE_SSL=true
ENABLE_HTTPS=true
SSL_CERT_PATH=./ssl/production/etelios-cert.pem
SSL_CERTIFICATE_PATH=./ssl/production/etelios-cert.pem
SSL_KEY_PATH=./ssl/production/private/etelios-key.pem
SSL_CERTIFICATE_KEY_PATH=./ssl/production/private/etelios-key.pem
```

### For Production Deployment

1. **Copy certificate to system location:**
   ```bash
   sudo cp ssl/production/etelios-cert.pem /etc/ssl/certs/etelios-cert.pem
   sudo chmod 644 /etc/ssl/certs/etelios-cert.pem
   ```

2. **Copy private key to secure location:**
   ```bash
   sudo cp ssl/production/private/etelios-key.pem /etc/ssl/private/etelios-key.pem
   sudo chmod 600 /etc/ssl/private/etelios-key.pem
   ```

3. **Set environment variables:**
   ```bash
   ENABLE_SSL=true
   ENABLE_HTTPS=true
   SSL_CERT_PATH=/etc/ssl/certs/etelios-cert.pem
   SSL_CERTIFICATE_PATH=/etc/ssl/certs/etelios-cert.pem
   SSL_KEY_PATH=/etc/ssl/private/etelios-key.pem
   SSL_CERTIFICATE_KEY_PATH=/etc/ssl/private/etelios-key.pem
   ```

---

## ⚠️ Important Notes

1. **Private Key Required:** You need the private key (`etelios-key.pem`) to use this certificate. The private key should be stored securely and never committed to Git.

2. **Certificate Coverage:** This wildcard certificate (`*.etelios.com`) covers:
   - ✅ `api.etelios.com`
   - ✅ `www.etelios.com`
   - ✅ Any other subdomain of `etelios.com`
   - ❌ `etelios.com` (root domain - NOT covered by wildcard)

3. **Security:** 
   - Certificate file permissions: `644` (readable by all, writable by owner)
   - Private key permissions: `600` (readable/writable by owner only)

---

## 🧪 Testing

### Test Certificate Loading

```bash
node -e "const ssl = require('./microservices/shared/utils/ssl'); console.log(ssl.loadSSLCertificates() ? '✅ SSL certificates loaded successfully' : '❌ SSL certificates failed to load');"
```

### Start Server with SSL

```bash
ENABLE_SSL=true \
SSL_CERT_PATH=./ssl/production/etelios-cert.pem \
SSL_KEY_PATH=./ssl/production/private/etelios-key.pem \
npm start
```

### Verify HTTPS Connection

```bash
curl -k https://localhost:PORT/health
```

---

## 📝 How It Works

The application uses the SSL utility (`microservices/shared/utils/ssl.js`) which:

1. Checks if `ENABLE_SSL=true` or `ENABLE_HTTPS=true`
2. Loads certificate and key from paths specified in environment variables
3. Falls back to default paths if environment variables are not set
4. Creates HTTPS server with proper security settings (TLS 1.2/1.3, secure ciphers)

---

## 📚 Related Documentation

- Full setup guide: `ssl/production/SSL_CERTIFICATE_SETUP.md`
- Production config example: `production.ssl.env.example`
- Environment variables: `microservices/env.example`
