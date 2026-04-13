# SSL Certificate Setup Guide

## ✅ Certificate Status

**Certificate has been saved to:** `ssl/production/etelios-cert.pem` ✅

### Certificate Details:
- **Issuer:** Sectigo Public Server Authentication CA DV R36
- **Domain:** `*.etelios.com` (wildcard certificate)
- **Valid From:** 2026-01-02 00:00:00 GMT
- **Valid Until:** 2027-01-02 23:59:59 GMT
- **Status:** ✅ Valid and configured
- **Type:** CA-signed (production-ready)

---

## ⚠️ IMPORTANT: Private Key Required

**You still need the private key to use this certificate!**

The certificate file alone is not enough. You need:
1. ✅ **Certificate** (already saved): `ssl/production/etelios-cert.pem`
2. ❌ **Private Key** (MISSING): Should be saved as `ssl/production/private/etelios-key.pem`

### Where to get the private key:
- If you generated the certificate yourself, you should have the private key
- If you received the certificate from Sectigo, you should have received the private key separately
- **NEVER share or commit the private key to Git** (it's already in `.gitignore`)

---

## 📁 File Structure

```
ssl/
└── production/
    ├── etelios-cert.pem          ✅ (Certificate - saved)
    └── private/
        └── etelios-key.pem        ❌ (Private Key - MISSING - you need to add this)
```

---

## 🔧 Setup Instructions

### Step 1: Add Private Key

1. **Save your private key** to:
   ```
   ssl/production/private/etelios-key.pem
   ```

2. **Set proper permissions** (IMPORTANT for security):
   ```bash
   chmod 600 ssl/production/private/etelios-key.pem
   chmod 644 ssl/production/etelios-cert.pem
   ```

### Step 2: Configure Environment Variables

For **development/testing** (using local paths):
```bash
ENABLE_SSL=true
SSL_CERT_PATH=./ssl/production/etelios-cert.pem
SSL_KEY_PATH=./ssl/production/private/etelios-key.pem
```

For **production** (using system paths):
```bash
ENABLE_SSL=true
SSL_CERT_PATH=/etc/ssl/certs/etelios-cert.pem
SSL_KEY_PATH=/etc/ssl/private/etelios-key.pem
```

### Step 3: Copy to Production Server (if needed)

If deploying to a production server, copy files to system locations:

```bash
# Copy certificate
sudo cp ssl/production/etelios-cert.pem /etc/ssl/certs/etelios-cert.pem
sudo chmod 644 /etc/ssl/certs/etelios-cert.pem

# Copy private key
sudo cp ssl/production/private/etelios-key.pem /etc/ssl/private/etelios-key.pem
sudo chmod 600 /etc/ssl/private/etelios-key.pem
```

---

## 🔒 Security Notes

1. ✅ **Certificate is safe to commit** (it's public)
2. ❌ **Private key is NEVER committed** (already in `.gitignore`)
3. ✅ **Certificate covers:** `*.etelios.com` (all subdomains)
   - ✅ `api.etelios.com` (backend)
   - ✅ `www.etelios.com` (if needed)
   - ✅ Any other subdomain

---

## 🧪 Testing

Once you have both certificate and private key:

1. **Test certificate loading:**
   ```bash
   node -e "const ssl = require('./microservices/shared/utils/ssl'); console.log(ssl.loadSSLCertificates());"
   ```

2. **Start server with SSL:**
   ```bash
   ENABLE_SSL=true SSL_CERT_PATH=./ssl/production/etelios-cert.pem SSL_KEY_PATH=./ssl/production/private/etelios-key.pem npm start
   ```

3. **Test HTTPS connection:**
   ```bash
   curl -k https://localhost:PORT/health
   ```

---

## 📝 Next Steps

1. [ ] Add private key to `ssl/production/private/etelios-key.pem`
2. [ ] Set proper file permissions (600 for key, 644 for cert)
3. [ ] Update environment variables
4. [ ] Test SSL certificate loading
5. [ ] Deploy to production (if applicable)

---

## ❓ FAQ

**Q: Do I need the private key?**  
A: Yes! Without the private key, the certificate cannot be used for HTTPS.

**Q: Where do I get the private key?**  
A: It should have been generated/provided when you created/requested the certificate. Check your certificate provider or certificate generation process.

**Q: Can I use this certificate for `etelios.com` (root domain)?**  
A: This certificate is for `*.etelios.com` (wildcard). It covers:
- ✅ `api.etelios.com`
- ✅ `www.etelios.com`
- ❌ `etelios.com` (root domain - NOT covered)

If you need the root domain, you'll need a certificate that includes both `etelios.com` and `*.etelios.com`.
