# 🎯 AWS Cost Optimization Guide - Lenstrack Smart HRMS

**Date:** February 2026  
**Current Monthly Cost:** ~$272-590/month (depending on configuration)  
**Target Monthly Cost:** ~$150-200/month  
**Potential Savings:** $70-390/month (25-66% reduction)

---

## 📊 Current Cost Breakdown

| Service | Current Cost | Optimization Potential |
|---------|--------------|------------------------|
| EKS Control Plane | $73/month | ❌ Fixed (cannot reduce) |
| EC2 Nodes (5x t3.medium) | $150/month | ✅ **High** - Can save $60-90/month |
| DocumentDB (db.t3.medium) | $69.35/month | ✅ **Medium** - Can save $20-35/month |
| NAT Gateways (2) | $64.80/month | ✅ **High** - Can save $32/month |
| EBS Storage (40GB gp2) | $4/month | ✅ **Low** - Can save $1-2/month |
| Application Load Balancer | $18/month | ✅ **Low** - Already optimized |
| Grafana LoadBalancer | $9/month | ✅ **High** - Can save $9/month |
| CloudWatch Logs/Metrics | $5-8/month | ✅ **Medium** - Can save $2-4/month |
| S3 Storage | $0.12/month | ✅ **Low** - Minimal impact |
| Data Transfer | $10-20/month | ✅ **Medium** - Can save $5-10/month |
| **TOTAL** | **$272-590/month** | **Potential: $70-390/month savings** |

---

## 🚀 Priority 1: High-Impact Optimizations (Save $100-140/month)

### 1.1 Reduce NAT Gateways: 2 → 1 (Save $32/month)

**Current:** 2 NAT Gateways for high availability  
**Optimization:** Use 1 NAT Gateway (sufficient for most workloads)

**Implementation:**
```bash
# Delete one NAT Gateway
NAT2=$(aws ec2 describe-nat-gateways \
  --filter "Name=tag:Name,Values=etelios-nat-2" \
  --query 'NatGateways[0].NatGatewayId' \
  --output text \
  --region ap-south-1)

aws ec2 delete-nat-gateway --nat-gateway-id $NAT2 --region ap-south-1

# Update route tables to use single NAT Gateway
# (Update private subnet route tables to point to NAT1)
```

**Savings:** $32.40/month  
**Risk:** Low - Single NAT Gateway handles typical workloads  
**Impact:** Minimal - Only affects outbound internet traffic from private subnets

---

### 1.2 Use Spot Instances for Non-Critical Workloads (Save $60-90/month)

**Current:** All On-Demand t3.medium instances  
**Optimization:** Use Spot Instances for 50-70% of capacity

**Implementation:**
```yaml
# Update cluster-config.yaml
managedNodeGroups:
  - name: main-workers
    instanceType: t3.medium
    desiredCapacity: 3
    minSize: 2
    maxSize: 10
    privateNetworking: false
    # Add spot instances
    spot: true
    instanceTypes:
      - t3.medium
      - t3.small  # Fallback option
    maxPrice: "0.02"  # Max 50% of on-demand price
    onDemandBaseCapacity: 1  # Keep 1 on-demand for critical workloads
    onDemandPercentageAboveBaseCapacity: 0  # Rest are spot
```

**Alternative: Create separate node groups:**
```bash
# On-demand for critical services
eksctl create nodegroup \
  --cluster=etelios-prod-v2 \
  --name=on-demand-workers \
  --instance-types=t3.medium \
  --nodes=2 \
  --nodes-min=1 \
  --nodes-max=5 \
  --region=ap-south-1

# Spot instances for non-critical services
eksctl create nodegroup \
  --cluster=etelios-prod-v2 \
  --name=spot-workers \
  --instance-types=t3.medium,t3.small \
  --spot=true \
  --nodes=3 \
  --nodes-min=2 \
  --nodes-max=8 \
  --region=ap-south-1
```

**Add node selectors to deployments:**
```yaml
# For non-critical services (analytics, monitoring, etc.)
spec:
  template:
    spec:
      nodeSelector:
        eks.amazonaws.com/capacityType: SPOT
      tolerations:
      - key: "spot"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
```

**Savings:** $60-90/month (50-70% discount on spot instances)  
**Risk:** Medium - Spot instances can be interrupted  
**Mitigation:** Use for non-critical services, keep on-demand for auth/hr/payroll

---

### 1.3 Remove Grafana LoadBalancer (Save $9/month)

**Current:** Grafana exposed via dedicated LoadBalancer  
**Optimization:** Use Ingress or port-forward for access

**Implementation:**
```bash
# Delete Grafana LoadBalancer service
kubectl delete svc prometheus-grafana -n monitoring

# Create ClusterIP service instead
kubectl expose deployment prometheus-grafana \
  --type=ClusterIP \
  --port=80 \
  --target-port=3000 \
  -n monitoring

# Access via Ingress (add to existing ALB) or port-forward
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
```

**Or add to existing Ingress:**
```yaml
# Add to existing ingress.yaml
- host: grafana.yourdomain.com
  http:
    paths:
    - path: /
      pathType: Prefix
      backend:
        service:
          name: prometheus-grafana
          port:
            number: 80
```

**Savings:** $9/month  
**Risk:** Low - Only affects external Grafana access  
**Impact:** Use port-forward for development, Ingress for production

---

## 🎯 Priority 2: Medium-Impact Optimizations (Save $25-50/month)

### 2.1 Optimize DocumentDB Instance Size (Save $20-35/month)

**Current:** db.t3.medium ($69.35/month)  
**Optimization:** Right-size based on actual usage

**Check current usage:**
```bash
# Check DocumentDB metrics in CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace AWS/DocDB \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=lenstrack-docdb-instance-1 \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average \
  --region ap-south-1
```

**Options:**

**Option A: Downsize to db.t4g.medium** (if CPU < 40%)
```bash
aws docdb modify-db-instance \
  --db-instance-identifier lenstrack-docdb-instance-1 \
  --db-instance-class db.t4g.medium \
  --apply-immediately \
  --region ap-south-1
```
**Savings:** $20/month (from $69 to $49)

**Option B: Use Reserved Instances** (1-year term)
- 1-year Standard RI: ~30% discount = $20/month savings
- 3-year Standard RI: ~50% discount = $35/month savings

**Option C: Use Serverless (if workload is variable)**
- Pay per request + storage
- Good for variable workloads
- Can save 40-60% for low-traffic periods

**Savings:** $20-35/month  
**Risk:** Low - Can monitor and adjust  
**Impact:** Monitor performance after change

---

### 2.2 Optimize CloudWatch Logging (Save $2-4/month)

**Current:** All logs enabled, 7-day retention  
**Optimization:** Selective logging + lifecycle policies

**Implementation:**

**A. Reduce log retention:**
```yaml
# Update cluster-config.yaml
cloudWatch:
  clusterLogging:
    enableTypes: ["api", "audit", "authenticator"]  # Remove "controllerManager", "scheduler"
    # Or keep all but reduce retention
```

**B. Set log retention policies:**
```bash
# Set retention to 3 days for most logs
aws logs put-retention-policy \
  --log-group-name /aws/eks/etelios-prod-v2/cluster \
  --retention-in-days 3 \
  --region ap-south-1

# Keep only error logs longer
aws logs put-retention-policy \
  --log-group-name /aws/containerinsights/etelios-prod-v2/application \
  --retention-in-days 7 \
  --region ap-south-1
```

**C. Filter application logs:**
```javascript
// In logger.js - reduce verbose logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'warn',  // Change from 'info' to 'warn'
  // ... rest of config
});
```

**Savings:** $2-4/month  
**Risk:** Low - Can adjust retention as needed  
**Impact:** Reduced log history, but errors still tracked

---

### 2.3 Optimize EBS Storage (Save $1-2/month)

**Current:** 40GB gp2 storage  
**Optimization:** Use gp3 (cheaper) + right-size volumes

**Implementation:**
```bash
# Check actual usage
kubectl exec -n etelios-prod deployment/mongodb -- df -h

# If using < 15GB, resize volumes
# Note: gp3 is 20% cheaper than gp2
# Convert existing gp2 to gp3 (requires volume modification)
```

**For new volumes, use gp3:**
```yaml
# Update storage class
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"  # Default, can increase if needed
  throughput: "125"  # MB/s
volumeBindingMode: WaitForFirstConsumer
```

**Savings:** $1-2/month  
**Risk:** Low - gp3 is compatible with gp2  
**Impact:** Minimal - Better performance at lower cost

---

### 2.4 Optimize Data Transfer (Save $5-10/month)

**Current:** ~100GB/month data transfer  
**Optimization:** Use CloudFront for static assets, optimize API responses

**Implementation:**

**A. Enable CloudFront for S3:**
```bash
# Create CloudFront distribution for S3 bucket
aws cloudfront create-distribution \
  --origin-domain-name etelios-prod-storage.s3.ap-south-1.amazonaws.com \
  --default-root-object index.html
```

**B. Enable compression in ALB:**
```yaml
# Add to Ingress annotations
metadata:
  annotations:
    alb.ingress.kubernetes.io/load-balancer-attributes: |
      idle_timeout.timeout_seconds=60,
      routing.http2.enabled=true,
      routing.http.compression.enabled=true
```

**C. Optimize API responses:**
- Enable gzip compression in services
- Use pagination for large datasets
- Implement response caching

**Savings:** $5-10/month  
**Risk:** Low  
**Impact:** Better performance + lower costs

---

## 💡 Priority 3: Advanced Optimizations (Save $15-30/month)

### 3.1 Right-Size EC2 Instances (Save $15-25/month)

**Current:** 5x t3.medium (2 vCPU, 4GB RAM each)  
**Optimization:** Use smaller instances or mixed sizes

**Check actual resource usage:**
```bash
# Check node resource usage
kubectl top nodes

# Check pod resource usage
kubectl top pods -n etelios-prod --sort-by=memory
```

**Options:**

**Option A: Use t3.small for some nodes** (if CPU < 50%)
```yaml
# Create mixed node group
managedNodeGroups:
  - name: small-workers
    instanceType: t3.small
    desiredCapacity: 2
    minSize: 1
    maxSize: 5
  - name: medium-workers
    instanceType: t3.medium
    desiredCapacity: 3
    minSize: 2
    maxSize: 5
```

**Option B: Use t3a instances** (AMD-based, 10% cheaper)
```yaml
managedNodeGroups:
  - name: main-workers
    instanceType: t3a.medium  # 10% cheaper than t3.medium
    desiredCapacity: 5
```

**Savings:** $15-25/month  
**Risk:** Medium - Monitor performance  
**Impact:** May need to adjust based on workload

---

### 3.2 Optimize Resource Requests/Limits (Save $5-10/month)

**Current:** Many services over-provisioned  
**Optimization:** Right-size based on actual usage

**Check current requests:**
```bash
# Analyze resource usage
kubectl top pods -n etelios-prod --containers
```

**Example optimization:**
```yaml
# Before (auth-service)
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"

# After (if actual usage is lower)
resources:
  requests:
    memory: "128Mi"  # Reduced
    cpu: "100m"      # Reduced
  limits:
    memory: "256Mi"  # Reduced
    cpu: "250m"      # Reduced
```

**Benefits:**
- More pods per node = fewer nodes needed
- Better resource utilization
- Lower overall costs

**Savings:** $5-10/month  
**Risk:** Low - Can monitor and adjust  
**Impact:** Better cluster efficiency

---

### 3.3 Use S3 Lifecycle Policies (Save $1-2/month)

**Current:** All S3 objects in Standard storage  
**Optimization:** Move old objects to cheaper storage classes

**Implementation:**
```bash
# Create lifecycle policy
cat > lifecycle-policy.json <<EOF
{
  "Rules": [
    {
      "Id": "MoveOldFilesToIA",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket etelios-prod-storage \
  --lifecycle-configuration file://lifecycle-policy.json \
  --region ap-south-1
```

**Savings:** $1-2/month (for old/infrequently accessed files)  
**Risk:** Low  
**Impact:** Minimal - Only affects old files

---

### 3.4 Use Reserved Instances or Savings Plans (Save $20-40/month)

**For predictable workloads:**

**Option A: EC2 Reserved Instances**
- 1-year Standard RI: ~30% discount
- 3-year Standard RI: ~50% discount
- Convertible RI: ~20% discount (more flexibility)

**Option B: Compute Savings Plans**
- 1-year: ~30% discount
- 3-year: ~50% discount
- Applies to EC2, Fargate, Lambda

**Implementation:**
```bash
# Purchase via AWS Console or CLI
# Go to: AWS Console → EC2 → Reserved Instances → Purchase Reserved Instances
```

**Savings:** $20-40/month (for 1-year commitment)  
**Risk:** Low - Committed spend  
**Impact:** Significant savings for stable workloads

---

## 📋 Implementation Checklist

### Immediate Actions (Save $40-50/month)
- [ ] **Reduce NAT Gateways:** 2 → 1
- [ ] **Remove Grafana LoadBalancer:** Use Ingress or port-forward
- [ ] **Optimize CloudWatch Logging:** Reduce retention to 3 days

### Short-term Actions (Save $60-90/month)
- [ ] **Implement Spot Instances:** For non-critical services
- [ ] **Right-size DocumentDB:** Monitor and downsize if possible
- [ ] **Optimize EBS:** Convert gp2 to gp3

### Medium-term Actions (Save $20-40/month)
- [ ] **Right-size EC2 Instances:** Use t3a or smaller instances
- [ ] **Optimize Resource Requests:** Based on actual usage
- [ ] **Purchase Reserved Instances:** For stable workloads

### Long-term Actions (Save $10-20/month)
- [ ] **S3 Lifecycle Policies:** Move old files to cheaper storage
- [ ] **Optimize Data Transfer:** Use CloudFront, compression
- [ ] **Review and optimize:** Monthly cost review

---

## 📊 Expected Cost Reduction

### Current Cost: $272-590/month

### After Priority 1 Optimizations:
- NAT Gateway reduction: -$32/month
- Spot Instances: -$60-90/month
- Grafana LB removal: -$9/month
**New Total: $171-459/month** (Save $101-131/month)

### After Priority 2 Optimizations:
- DocumentDB optimization: -$20-35/month
- CloudWatch optimization: -$2-4/month
- EBS optimization: -$1-2/month
- Data Transfer optimization: -$5-10/month
**New Total: $143-408/month** (Additional $28-51/month savings)

### After Priority 3 Optimizations:
- EC2 right-sizing: -$15-25/month
- Resource optimization: -$5-10/month
- S3 lifecycle: -$1-2/month
- Reserved Instances: -$20-40/month
**Final Total: $102-333/month** (Additional $41-77/month savings)

### **Total Potential Savings: $170-259/month (62-44% reduction)**

---

## ⚠️ Risk Assessment

| Optimization | Risk Level | Mitigation |
|--------------|------------|------------|
| Reduce NAT Gateways | Low | Monitor network performance |
| Spot Instances | Medium | Use for non-critical services only |
| Remove Grafana LB | Low | Use Ingress or port-forward |
| DocumentDB Downsize | Medium | Monitor metrics before/after |
| CloudWatch Reduction | Low | Keep error logs longer |
| EBS gp3 Migration | Low | gp3 is compatible with gp2 |
| EC2 Right-sizing | Medium | Monitor performance closely |
| Reserved Instances | Low | Commit to 1-year term |

---

## 🔍 Monitoring & Validation

### Cost Monitoring:
```bash
# Set up AWS Cost Anomaly Detection
aws ce create-anomaly-monitor \
  --anomaly-monitor-name "EKS-Cost-Monitor" \
  --monitor-type DIMENSIONAL \
  --monitor-dimension SERVICE

# Set up billing alerts
aws cloudwatch put-metric-alarm \
  --alarm-name "MonthlyCostAlert" \
  --alarm-description "Alert when monthly cost exceeds $200" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --evaluation-periods 1 \
  --threshold 200 \
  --comparison-operator GreaterThanThreshold
```

### Performance Monitoring:
- Monitor CPU/Memory usage after optimizations
- Track API response times
- Monitor DocumentDB performance metrics
- Check spot instance interruption rates

---

## 🎯 Quick Win Summary

**Top 5 Quick Wins (Save $50-70/month in 1 day):**
1. ✅ Reduce NAT Gateways: 2 → 1 (**$32/month**)
2. ✅ Remove Grafana LoadBalancer (**$9/month**)
3. ✅ Optimize CloudWatch retention (**$2-4/month**)
4. ✅ Convert EBS gp2 → gp3 (**$1-2/month**)
5. ✅ Enable ALB compression (**$5-10/month**)

**Total Quick Wins: $49-57/month savings**

---

## 📞 Next Steps

1. **Review this guide** with your team
2. **Prioritize optimizations** based on risk tolerance
3. **Start with Quick Wins** (Priority 1, low-risk items)
4. **Monitor costs** using AWS Cost Explorer
5. **Iterate** - Review monthly and adjust

---

## 📚 Additional Resources

- [AWS Cost Optimization Best Practices](https://aws.amazon.com/pricing/cost-optimization/)
- [EKS Cost Optimization](https://aws.amazon.com/eks/pricing/)
- [EC2 Spot Instances Best Practices](https://aws.amazon.com/ec2/spot/getting-started/)
- [AWS Savings Plans](https://aws.amazon.com/savingsplans/)

---

**Last Updated:** February 2026  
**Next Review:** Monthly cost review recommended
