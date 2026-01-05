# Azure Key Vault se Private Key Extract Karne Ka Tarika

**Certificate**: `etelios-wildcard`  
**Key Vault**: `etelios-keyvault`  
**Certificate Version**: `377fddf7549144269ff37ae356f741bd`

---

## 🔐 Private Key Kahan Hai?

**Important**: Private key **directly dikhai nahi deti** (security ke liye). Lekin aap ise extract kar sakte hain:

### Option 1: PFX/PEM Format Download (Easiest) ✅

**Azure Portal se:**
1. "Download in PFX/PEM format" button click karein
2. Password enter karna hoga (agar PFX password protected hai)
3. File download hogi jisme **certificate + private key** dono honge

**Extract Private Key:**
```bash
# PFX file se private key extract karein
openssl pkcs12 -in etelios-wildcard.pfx -nocerts -nodes -out private-key.pem

# Password enter karna hoga (agar PFX password protected hai)
```

---

### Option 2: Secret Identifier se Access (Azure CLI)

**Secret Identifier URL:**
```
https://etelios-keyvault.vault.azure.net/secrets/etelios-wildcard/377fddf7549144269ff37ae356f741bd
```

**Azure CLI Command:**
```bash
# Secret download karein (isme certificate + private key hoga)
az keyvault secret show \
  --vault-name etelios-keyvault \
  --name etelios-wildcard \
  --version 377fddf7549144269ff37ae356f741bd \
  --query value -o tsv > certificate-bundle.pem

# Private key extract karein (agar bundle me hai)
openssl x509 -in certificate-bundle.pem -noout -text
```

---

### Option 3: Key Identifier se (Public Key Only - Not Private Key)

**Key Identifier URL:**
```
https://etelios-keyvault.vault.azure.net/keys/etelios-wildcard/377fddf7549144269ff37ae356f741bd
```

⚠️ **Note**: Ye sirf **public key** hai, private key nahi. Private key ke liye Secret Identifier use karein.

---

## 📋 Step-by-Step Guide

### Method 1: Azure Portal se PFX Download (Recommended)

1. **Azure Portal me:**
   - "Download in PFX/PEM format" button click karein
   - Password enter karein (agar required hai)
   - File download karein (`etelios-wildcard.pfx`)

2. **Private Key Extract:**
```bash
# PFX file se private key extract karein
openssl pkcs12 -in etelios-wildcard.pfx -nocerts -nodes -out private-key.pem

# Password enter karna hoga
# Output: private-key.pem (isme private key hogi)
```

3. **Verify Private Key:**
```bash
# Private key format check karein
head -1 private-key.pem
# Should show: -----BEGIN PRIVATE KEY----- or -----BEGIN RSA PRIVATE KEY-----

# Certificate se match verify karein
openssl x509 -noout -modulus -in cert.pem | openssl md5
openssl rsa -noout -modulus -in private-key.pem | openssl md5

# Dono MD5 hash same hone chahiye ✅
```

---

### Method 2: Azure CLI se Secret Download

```bash
# Login karein
az login

# Secret download karein
az keyvault secret download \
  --vault-name etelios-keyvault \
  --name etelios-wildcard \
  --version 377fddf7549144269ff37ae356f741bd \
  --file certificate-secret.pem

# Check karein ki private key hai ya nahi
cat certificate-secret.pem
# Agar private key hai, to -----BEGIN PRIVATE KEY----- dikhega
```

---

## 🔍 Private Key Kaise Identify Karein?

**Private Key Format:**
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
(many lines of encrypted text)
...
-----END PRIVATE KEY-----
```

**Ya:**
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
(many lines of encrypted text)
...
-----END RSA PRIVATE KEY-----
```

---

## ⚠️ Important Notes

1. **PFX Format**: PFX/PKCS#12 file me **certificate + private key** dono hote hain
2. **PEM Format**: PEM file me sirf certificate ho sakta hai, private key alag file me hoti hai
3. **Secret Identifier**: Secret bundle me certificate + private key dono ho sakte hain
4. **Key Identifier**: Sirf public key hai, private key nahi

---

## ✅ Recommended Approach

**Best Method**: Azure Portal se "Download in PFX/PEM format" download karein, phir `openssl` se private key extract karein.

**Why?**
- ✅ Easiest method
- ✅ Certificate + private key dono ek saath
- ✅ Secure (password protected)
- ✅ Standard format (PFX/PKCS#12)

---

## 🛠️ Quick Commands

```bash
# 1. PFX download karein (Azure Portal se manually)
# File: etelios-wildcard.pfx

# 2. Private key extract karein
openssl pkcs12 -in etelios-wildcard.pfx -nocerts -nodes -out private-key.pem

# 3. Certificate extract karein (agar chahiye)
openssl pkcs12 -in etelios-wildcard.pfx -clcerts -nokeys -out cert.pem

# 4. Verify karein
openssl x509 -noout -modulus -in cert.pem | openssl md5
openssl rsa -noout -modulus -in private-key.pem | openssl md5
# Dono hash same hone chahiye ✅
```

---

**Summary**: Private key **PFX download** me included hai. Azure Portal se "Download in PFX/PEM format" download karein, phir `openssl` se extract karein.

