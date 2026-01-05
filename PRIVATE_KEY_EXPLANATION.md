# Private Key Kya Hai? (What is Private Key?)

## 🔐 Private Key Kya Hai?

**Private Key** ek secret cryptographic key hai jo SSL/TLS certificate ke saath aata hai. Ye **bahut hi sensitive** file hai.

### Simple Explanation:
- **Certificate (cert.pem)**: Public key - sabko dikh sakti hai ✅
- **Private Key (key.pem)**: Secret key - sirf server ko pata hona chahiye 🔒

### Analogy:
- Certificate = Lock (public - sabko dikhta hai)
- Private Key = Key (secret - sirf aapke paas honi chahiye)

---

## 📋 Private Key Details

### File Format:
- **Extension**: `.pem`, `.key`, `.p12`, `.pfx`
- **Content**: `-----BEGIN PRIVATE KEY-----` se start hota hai
- **Size**: Usually 2048 or 4096 bits

### Example Format:
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
(many lines of encrypted text)
...
-----END PRIVATE KEY-----
```

---

## 🔍 Aapki Private Key Kahan Hai?

### Option 1: Azure Key Vault (Most Likely)
Aapne certificate Azure Key Vault se liya tha. Private key bhi wahi honi chahiye.

**Check karein**:
```bash
# Azure CLI se check karein
az keyvault secret show \
  --vault-name etelios-keyvault \
  --name etelios-wildcard-key

# Ya certificate bundle se extract karein
az keyvault certificate show \
  --vault-name etelios-keyvault \
  --name etelios-wildcard \
  --query 'cer' -o tsv | base64 -d > certificate.cer
```

### Option 2: Certificate Provider (Sectigo)
Agar aapne Sectigo se certificate liya:
- Email me private key bheji hogi
- Ya certificate download me included hogi
- Check your email for Sectigo certificate files

### Option 3: Server/System Jahan Certificate Install Kiya
- Agar kisi aur server pe install kiya tha
- Us server ki files check karein
- Usually: `/etc/ssl/private/` ya `/etc/nginx/ssl/`

### Option 4: Certificate Bundle (PFX/P12)
Agar aapke paas `.pfx` ya `.p12` file hai:
```bash
# Extract private key from PFX
openssl pkcs12 -in certificate.pfx -nocerts -nodes -out private-key.pem
```

---

## 🚨 Important Security Notes

### ❌ NEVER Do:
- Git me commit mat karo
- Publicly share mat karo
- Email me plain text me mat bhejo
- Logs me mat print karo

### ✅ Always Do:
- Secure location me store karo (Azure Key Vault)
- 600 permissions set karo (owner read/write only)
- Encrypted form me store karo
- Backup securely rakho

---

## 🔧 Private Key Kaise Use Karein?

### 1. TLS Secret Create Karne Ke Liye:
```bash
kubectl create secret tls etelios-tls \
  --cert=ssl/production/cert.pem \
  --key=private-key.pem \
  --namespace=etelios-backend-prod
```

### 2. Nginx Configuration Me:
```nginx
ssl_certificate /etc/nginx/ssl/cert.pem;
ssl_certificate_key /etc/nginx/ssl/key.pem;
```

### 3. Node.js HTTPS Server Me:
```javascript
const https = require('https');
const fs = require('fs');

const options = {
  cert: fs.readFileSync('cert.pem'),
  key: fs.readFileSync('private-key.pem')
};

https.createServer(options, app).listen(443);
```

---

## 📍 Aapki Private Key Kahan Se Milegi?

### Step 1: Azure Key Vault Check
```bash
# List all secrets
az keyvault secret list --vault-name etelios-keyvault

# Check for private key
az keyvault secret show \
  --vault-name etelios-keyvault \
  --name etelios-wildcard-key
```

### Step 2: Certificate Download Check
- Azure Portal → Key Vault → Certificates
- Download certificate bundle (PFX format)
- Extract private key from PFX

### Step 3: Certificate Provider
- Sectigo account me login karein
- Certificate download section check karein
- Private key file download karein

### Step 4: System/Server Files
- Jahan certificate install kiya tha
- `/etc/ssl/private/` directory check karein
- `.key` files search karein

---

## 🛠️ Private Key Extract Karne Ke Commands

### From PFX/P12:
```bash
openssl pkcs12 -in certificate.pfx -nocerts -nodes -out private-key.pem
```

### From Certificate Bundle:
```bash
# If certificate has embedded key
openssl x509 -in cert.pem -noout -text
```

### From Azure Key Vault:
```bash
# Download certificate bundle
az keyvault certificate download \
  --vault-name etelios-keyvault \
  --name etelios-wildcard \
  --file certificate.pfx

# Extract key
openssl pkcs12 -in certificate.pfx -nocerts -nodes -out private-key.pem
```

---

## ✅ Verification

### Private Key Valid Hai Ya Nahi Check Karein:
```bash
# Check if key matches certificate
openssl x509 -noout -modulus -in cert.pem | openssl md5
openssl rsa -noout -modulus -in private-key.pem | openssl md5

# If both MD5 hashes match, key is correct ✅
```

---

## 📞 Next Steps

1. **Azure Key Vault check karein** - Most likely wahi hai
2. **Certificate provider (Sectigo) se contact** - Agar missing hai
3. **System files check karein** - Jahan install kiya tha
4. **New certificate request** - Agar completely missing hai

---

**Status**: Private key locate karni hai. Azure Key Vault se check karein pehle.

