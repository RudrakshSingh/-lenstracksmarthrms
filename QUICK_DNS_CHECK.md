# 🔍 Quick DNS Check Commands

## Step 1: Check DNS Resolution

```bash
nslookup api.etelios.com
```

**Expected Result:**
```
api.etelios.com canonical name = k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
```

**If it fails or shows wrong IP:** DNS not configured ❌

## Step 2: Test Direct ALB (Bypass DNS)

```bash
curl -I http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/health --max-time 5
```

**If this works:** DNS issue - need to configure DNS ✅  
**If this also fails:** ALB/network issue ❌

---

## 🎯 Most Likely Issue: DNS Not Configured

**Solution:** Configure DNS in GoDaddy

1. Go to GoDaddy → My Products → etelios.com → DNS
2. Add CNAME record:
   - **Name:** `api`
   - **Value:** `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com`
3. Wait 5-30 minutes for propagation

---

**Run these commands and share the output!**
