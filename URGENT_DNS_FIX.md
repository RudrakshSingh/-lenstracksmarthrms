# 🚨 URGENT: api.etelios.com DNS Fix

**Problem:** DNS not resolving - `Could not resolve host: api.etelios.com`

---

## ✅ IMMEDIATE FIX

### Step 1: GoDaddy में DNS Check करें

1. **GoDaddy login:**
   - https://www.godaddy.com
   - My Products → etelios.com → DNS

2. **Check `api` record:**
   - CNAME record होना चाहिए
   - Value: `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com`

3. **अगर record नहीं है:**
   - Add करें:
     - Type: **CNAME**
     - Name: **api**
     - Value: **k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com**
     - TTL: **600**

---

## 🔍 Test Commands

```bash
# DNS check
nslookup api.etelios.com 8.8.8.8

# Direct ALB test
curl -I http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/health --max-time 10

# Ingress check
kubectl get ingress etelios-ingress -n etelios-prod
```

---

## ⏱️ After Fix

- **Wait:** 10-15 minutes (DNS propagation)
- **Then test:** `curl -I https://api.etelios.com/health --max-time 10`

---

**GoDaddy में DNS record check करें और fix करें!**
