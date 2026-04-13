# Private Key कहाँ से लाएं? 🔐

## 📋 Private Key क्या है?

Private key वो file है जो certificate के साथ आती है। बिना private key के certificate काम नहीं करेगा।

---

## 🔍 Private Key कहाँ से मिलेगी?

### Option 1: Sectigo से मिली होगी (सबसे common)

अगर आपने Sectigo से certificate लिया है, तो private key भी उसी समय मिली होगी:

1. **Sectigo Account/Portal में check करें:**
   - Sectigo dashboard login करें
   - Certificate download section में जाएं
   - वहाँ certificate के साथ private key भी download होगी

2. **Email में check करें:**
   - जब certificate issue हुआ था, उस समय का email देखें
   - Private key अलग file में या email body में हो सकती है

3. **Certificate request के समय save की गई होगी:**
   - जब आपने certificate request किया था, private key generate हुई होगी
   - उस समय की files/backup check करें

---

### Option 2: Azure Key Vault में हो सकती है

अगर आप Azure use कर रहे हैं, तो private key Key Vault में store हो सकती है:

```bash
# Azure Key Vault से check करें
az keyvault secret show \
  --name etelios-wildcard-key \
  --vault-name etelios-keyvault \
  --query value -o tsv
```

या script run करें:
```bash
node scripts/setup/get-ssl-from-keyvault.js
```

---

### Option 3: Server पर पहले से हो सकती है

अगर certificate पहले से किसी server पर configured है:

1. **Production server पर check करें:**
   ```bash
   # Linux/Unix server पर
   ls -la /etc/ssl/private/etelios-key.pem
   ls -la /etc/ssl/certs/etelios-cert.pem
   ```

2. **Docker container में check करें:**
   ```bash
   docker exec -it <container-name> ls -la /etc/ssl/private/
   ```

---

## ✅ Private Key कैसी दिखती है?

Private key file में ये lines होनी चाहिए:

```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
(many lines of encoded text)
...
-----END PRIVATE KEY-----
```

या:

```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
(many lines of encoded text)
...
-----END RSA PRIVATE KEY-----
```

**⚠️ Important:** Certificate file अलग होती है:
- Certificate: `-----BEGIN CERTIFICATE-----`
- Private Key: `-----BEGIN PRIVATE KEY-----` या `-----BEGIN RSA PRIVATE KEY-----`

---

## 🔧 Private Key कैसे Add करें?

### Method 1: Script Use करें (Recommended)

अगर आपके पास private key का content है:

```bash
cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms
bash ssl/production/create-private-key.sh
```

यह script आपसे private key content paste करने को कहेगी।

### Method 2: Manually File बनाएं

1. **File create करें:**
   ```bash
   mkdir -p ssl/production/private
   nano ssl/production/private/etelios-key.pem
   ```

2. **Private key content paste करें** (BEGIN और END lines सहित)

3. **Save करें** (Ctrl+X, फिर Y, फिर Enter)

4. **Permissions set करें:**
   ```bash
   chmod 600 ssl/production/private/etelios-key.pem
   ```

---

## 🧪 Test करें

Private key add करने के बाद test करें:

```bash
# Certificate और key दोनों check करें
ENABLE_SSL=true \
SSL_CERT_PATH=./ssl/production/etelios-cert.pem \
SSL_KEY_PATH=./ssl/production/private/etelios-key.pem \
node -e "const ssl = require('./microservices/shared/utils/ssl'); const result = ssl.loadSSLCertificates(); console.log(result ? '✅ SSL loaded!' : '❌ Failed');"
```

---

## ❓ अगर Private Key नहीं मिल रही?

1. **Sectigo Support से contact करें:**
   - Certificate re-issue करवाएं
   - Private key फिर से provide करवाएं

2. **New Certificate Request करें:**
   - नया certificate request करें
   - इस बार private key को secure location पर save करें

3. **Azure Key Vault use करें:**
   - Private key को Azure Key Vault में store करें
   - Application automatically वहाँ से load करेगी

---

## 📝 Important Notes

- ✅ Private key **NEVER** Git में commit नहीं होनी चाहिए (`.gitignore` में already है)
- ✅ Private key permissions हमेशा `600` रखें (owner read/write only)
- ✅ Private key को secure location पर store करें
- ❌ Private key को कभी share न करें या email में न भेजें

---

## 🆘 Help चाहिए?

अगर private key नहीं मिल रही:
1. Sectigo account check करें
2. Email history check करें
3. Server backups check करें
4. Azure Key Vault check करें (अगर Azure use कर रहे हैं)
