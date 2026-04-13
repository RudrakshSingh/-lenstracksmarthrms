# 🔧 GoDaddy DNS - Record Name Clarification

## ⚠️ Important: Record Name in GoDaddy

जब आप GoDaddy में `etelios.com` domain के लिए DNS manage कर रहे हैं, तो:

### ✅ Correct Record Name

**Name field में सिर्फ `api` लिखें** (NOT `api.etelios` या `api.etelios.com`)

```
Type: CNAME
Name: api                    ← सिर्फ "api" (बिना .etelios.com)
Value: k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com
TTL: 600
```

**Result:** यह `api.etelios.com` बनाएगा ✅

---

## ❌ Common Mistakes

### Mistake 1: Full Name
```
Name: api.etelios.com       ❌ WRONG
Result: api.etelios.com.etelios.com (wrong!)
```

### Mistake 2: With Domain
```
Name: api.etelios           ❌ WRONG  
Result: api.etelios.etelios.com (wrong!)
```

### Mistake 3: Empty Name
```
Name: (empty)               ⚠️ This creates root domain (etelios.com)
```

---

## ✅ Correct Way

### Step 1: GoDaddy DNS Management में जाएं

1. Login to GoDaddy
2. My Products → etelios.com → DNS

### Step 2: Record खोजें

**Look for:**
- Type: A या CNAME
- Name: `api` (सिर्फ "api")
- Value: `98.70.245.87` (current wrong value)

**OR**

- Name: `api.etelios` (अगर यह दिख रहा है, तो यह भी edit कर सकते हैं)

### Step 3: Edit करें

**अगर Name में `api` है:**
```
Type: CNAME
Name: api                    ← Keep as is
Value: k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com
TTL: 600
```

**अगर Name में `api.etelios` है:**
```
Type: CNAME
Name: api.etelios            ← Change to just "api"
Value: k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com
TTL: 600
```

---

## 🔍 How to Check Current Record

GoDaddy में DNS records देखने पर:

| Type | Name | Value | What It Creates |
|------|------|-------|-----------------|
| A | api | 98.70.245.87 | api.etelios.com ✅ |
| CNAME | api | old-hostname | api.etelios.com ✅ |
| A | api.etelios | 98.70.245.87 | api.etelios.etelios.com ❌ |

**अगर Name में `api.etelios` दिख रहा है:**
- यह गलत है
- इसे `api` में change करें

---

## 📝 Step-by-Step Update

### Option 1: Edit Existing Record

1. GoDaddy DNS में `api` या `api.etelios` record find करें
2. Edit button click करें
3. Update करें:
   - **Type:** CNAME (अगर A है तो change करें)
   - **Name:** `api` (अगर `api.etelios` है तो change करें)
   - **Value:** `k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com`
   - **TTL:** 600
4. Save करें

### Option 2: Delete & Recreate

1. Old record delete करें
2. New record add करें:
   - Type: CNAME
   - Name: `api` (सिर्फ "api")
   - Value: `k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com`
   - TTL: 600
3. Save करें

---

## ✅ Verification

### After Update, Check:

```bash
# DNS check
nslookup api.etelios.com

# Should show:
# Name: api.etelios.com
# Address: <ALB IP> (not 98.70.245.87)
```

### Expected Result:

```
Name: api.etelios.com
Address: 13.206.17.102 (or similar ALB IP)
```

---

## 🎯 Summary

| Field | Value |
|-------|-------|
| **Type** | CNAME |
| **Name** | `api` (सिर्फ "api", NOT "api.etelios") |
| **Value** | `k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com` |
| **TTL** | 600 |

**Result:** `api.etelios.com` → ALB hostname → Secure SSL ✅

---

**Important:** GoDaddy में कभी-कभी full name (`api.etelios.com`) दिखता है, लेकिन edit करते समय सिर्फ `api` लिखें!
