# AWS Certificate में Domain Names Edit करना

## ❌ Important: Domain Names Edit नहीं हो सकते

**AWS Certificate Manager में एक बार certificate request करने के बाद, domain names को edit नहीं कर सकते।**

---

## ✅ Good News: `*.etelios.com` Perfect है!

अगर आपने `*.etelios.com` add किया है, तो यह **सभी subdomains** को cover करता है:

- ✅ `api.etelios.com` - Backend APIs
- ✅ `www.etelios.com` - Frontend (अगर चाहें)
- ✅ `app.etelios.com` - Frontend app
- ✅ `hr.etelios.com` - HR service
- ✅ कोई भी subdomain

**तो backend के लिए `*.etelios.com` बिल्कुल सही है!**

---

## 🤔 अगर Root Domain (`etelios.com`) भी चाहिए

अगर आपको root domain (`etelios.com`) भी चाहिए (frontend के लिए), तो दो options हैं:

### Option 1: Current Certificate Delete करके नया बनाएं (Recommended)

**Steps:**

1. **Current Certificate Delete करें:**
   - AWS Console → Certificate Manager
   - अपना certificate select करें
   - **"Delete"** button click करें
   - Confirm करें

2. **नया Certificate Request करें:**
   - **"Request a certificate"** click करें
   - Domain names में add करें:
     ```
     etelios.com
     *.etelios.com
     ```
   - **DNS validation** select करें
   - **"Request"** click करें

3. **CNAME Records Add करें:**
   - AWS से CNAME records copy करें
   - GoDaddy में add करें (2 CNAME records होंगे)

**Result:**
- ✅ `etelios.com` covered
- ✅ `*.etelios.com` covered (सभी subdomains)
- ✅ एक ही certificate में सब कुछ

---

### Option 2: Separate Certificate बनाएं

अगर current certificate को delete नहीं करना चाहते:

1. **Current Certificate रखें:** `*.etelios.com` (backend के लिए)
2. **नया Certificate बनाएं:** `etelios.com` (frontend के लिए)

**Steps:**

1. AWS Certificate Manager में जाएं
2. **"Request a certificate"** click करें
3. Domain name: `etelios.com`
4. DNS validation select करें
5. Request करें
6. CNAME record GoDaddy में add करें

**Result:**
- ✅ दो certificates होंगे
- ✅ एक `*.etelios.com` के लिए
- ✅ एक `etelios.com` के लिए

---

## 📋 Current Situation Check करें

### Step 1: AWS Certificate Manager में Check करें

1. AWS Console → Certificate Manager
2. अपना certificate click करें
3. **"Domains"** section देखें

**अगर दिख रहा है:**
```
*.etelios.com - Pending validation
```

**तो:**
- ✅ Backend के लिए perfect है
- ✅ `api.etelios.com` automatically covered है
- ✅ कोई edit की जरूरत नहीं

---

## 🎯 Recommendation

### Scenario 1: सिर्फ Backend चाहिए

**Current Setup Perfect है!**
- `*.etelios.com` certificate है
- `api.etelios.com` automatically covered है
- **कुछ edit करने की जरूरत नहीं**

**Next Steps:**
1. CNAME record GoDaddy में add करें
2. Wait for validation (5-30 minutes)
3. Certificate issued होगा
4. ALB में attach करें

---

### Scenario 2: Frontend भी Same Domain पर चाहिए

**Option A: Path-based (Recommended)**
- Frontend: `https://etelios.com/`
- Backend: `https://etelios.com/api/*`
- **Root domain certificate चाहिए**

**Steps:**
1. Current certificate delete करें (अगर अभी तक issued नहीं हुआ)
2. नया certificate request करें:
   - `etelios.com`
   - `*.etelios.com`
3. दोनों CNAME records GoDaddy में add करें

---

### Scenario 3: Frontend अलग Subdomain पर

**Option B: Subdomain approach**
- Frontend: `https://www.etelios.com`
- Backend: `https://api.etelios.com`
- **Current certificate perfect है!**

**Steps:**
1. Current certificate रखें (`*.etelios.com`)
2. `www.etelios.com` automatically covered है
3. `api.etelios.com` automatically covered है
4. **कुछ edit करने की जरूरत नहीं**

---

## 🔍 Certificate Status Check करें

### अगर Certificate अभी "Pending validation" है:

**तो delete कर सकते हैं और नया बना सकते हैं:**

```bash
# AWS CLI से check करें
aws acm list-certificates --region ap-south-1

# Certificate details देखें
aws acm describe-certificate \
  --certificate-arn <your-cert-arn> \
  --region ap-south-1
```

**Delete करने के लिए:**
1. AWS Console → Certificate Manager
2. Certificate select करें
3. **"Delete"** button
4. Confirm करें

---

### अगर Certificate Already "Issued" है:

**तो delete नहीं करें!**

**Options:**
1. **Current certificate use करें** - `*.etelios.com` सभी subdomains cover करता है
2. **Separate certificate बनाएं** - अगर root domain चाहिए

---

## 📝 Quick Decision Guide

### Question: Root Domain (`etelios.com`) चाहिए?

**अगर NO:**
- ✅ Current certificate perfect है
- ✅ `*.etelios.com` सब cover करता है
- ✅ कुछ edit करने की जरूरत नहीं

**अगर YES:**
- Option 1: Delete करके नया बनाएं (अगर issued नहीं हुआ)
- Option 2: Separate certificate बनाएं (अगर already issued है)

---

## 🚀 Next Steps

### अगर Current Certificate Perfect है:

1. **CNAME Record GoDaddy में Add करें:**
   - AWS Certificate Manager से CNAME record copy करें
   - GoDaddy DNS में add करें
   - Wait 5-30 minutes

2. **Certificate Validation Check करें:**
   ```bash
   # AWS Console में check करें
   # Status: Pending validation → Issued ✅
   ```

3. **ALB में Attach करें:**
   - EC2 → Load Balancers
   - ALB select करें
   - Listeners → Edit
   - Certificate select करें
   - Save

---

## 💡 Important Notes

### Wildcard Certificate Coverage

`*.etelios.com` certificate covers:
- ✅ `api.etelios.com`
- ✅ `www.etelios.com`
- ✅ `app.etelios.com`
- ✅ कोई भी subdomain
- ❌ `etelios.com` (root domain) - **NOT covered**

### Root Domain Certificate

`etelios.com` certificate covers:
- ✅ `etelios.com` (root)
- ❌ `api.etelios.com` - **NOT covered**
- ❌ `www.etelios.com` - **NOT covered**

### Both Domains

`etelios.com` + `*.etelios.com` covers:
- ✅ `etelios.com` (root)
- ✅ `api.etelios.com` (subdomain)
- ✅ `www.etelios.com` (subdomain)
- ✅ सभी subdomains

---

## ✅ Summary

**Current Situation:**
- आपने `*.etelios.com` add किया है
- यह backend (`api.etelios.com`) के लिए **perfect** है
- Edit करने की जरूरत नहीं

**अगर Root Domain चाहिए:**
- Certificate delete करें (अगर issued नहीं हुआ)
- नया certificate request करें: `etelios.com` + `*.etelios.com`

**अगर सिर्फ Backend:**
- Current certificate perfect है
- CNAME record add करें
- Wait for validation
- Done! ✅

---

**Last Updated:** 2026-03-05  
**Current Certificate:** `*.etelios.com`  
**Status:** Perfect for backend! ✅
