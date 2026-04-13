# ✅ Quick Status Check Commands

## 🔍 Check Ingress Configuration

```bash
# Check if annotations are applied correctly
kubectl get ingress etelios-ingress -n etelios-prod -o yaml | grep -A 1 "certificate-arn\|listen-ports\|ssl-redirect"
```

**Expected output:**
```yaml
alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:ap-south-1:383234048604:certificate/f28621bc-c8c2-431f-80cd-ca34a2f82b8b
alb.ingress.kubernetes.io/ssl-redirect: '443'
```

## ⏱️ Check Ingress Status (Wait 5-10 minutes)

```bash
# Check if HTTPS port (443) appears
kubectl get ingress etelios-ingress -n etelios-prod
```

**Currently shows:** `PORTS  80`  
**Will show:** `PORTS  80, 443` (after ALB updates)

## 🌐 Test HTTPS Connection

```bash
# Test HTTPS (use curl, not url)
curl -I https://api.etelios.com/health

# Test HTTP redirect
curl -I http://api.etelios.com/health
```

## 📊 Check ALB Listeners (AWS Console)

1. Go to **AWS Console → EC2 → Load Balancers**
2. Find: `k8s-eteliosp-eteliosi-f5ad4f50f3-842295189`
3. Click **Listeners** tab
4. Should show:
   - **Port 80** (HTTP)
   - **Port 443** (HTTPS) with certificate

---

## ⏰ Timeline

- **Now:** Ingress configured ✅
- **2-5 minutes:** ALB Ingress Controller processing
- **5-10 minutes:** HTTPS listener created, certificate attached
- **10+ minutes:** Fully operational

**Wait 5-10 minutes, then re-check!**
