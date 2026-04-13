# 🚀 Deploy to AWS - Quick Start

## ⚡ One-Command Deployment

```bash
chmod +x deploy-to-aws.sh
./deploy-to-aws.sh
```

**Time:** ~30-40 minutes total
**Cost:** ~$200-250/month

---

## 📋 What It Does

### Automatic Steps:
1. ✅ **Creates EKS Cluster** (15-20 min)
   - 3x t3.medium nodes
   - Auto-scaling 2-10 nodes
   - Kubernetes 1.30

2. ✅ **Deploys MongoDB** (2-3 min)
   - In-cluster MongoDB
   - 20GB persistent storage
   - No DNS issues

3. ✅ **Deploys All 20 Services** (5-10 min)
   - Auth, HR, Payroll, etc.
   - Auto-configured with MongoDB
   - Health checks enabled

4. ✅ **Creates LoadBalancers** (5 min)
   - Public URLs for each service
   - AWS ELB integration

---

## 🔧 Prerequisites

### 1. Install Tools (if not already)

```bash
# eksctl
brew install eksctl

# kubectl
brew install kubectl

# AWS CLI (should already be configured)
aws configure
```

### 2. Verify AWS Credentials

```bash
aws sts get-caller-identity
```

Should show:
```json
{
    "UserId": "...",
    "Account": "383234048604",
    "Arn": "arn:aws:iam::383234048604:user/etelios-rudraksh"
}
```

### 3. Check Docker Images in ECR

```bash
aws ecr describe-repositories --region ap-south-1 --query 'repositories[*].repositoryName'
```

Should show your 20+ repositories.

---

## 🚀 Run Deployment

```bash
cd ~/Desktop/lenstracksmarthrms
chmod +x deploy-to-aws.sh
./deploy-to-aws.sh
```

### What Happens:

```
[00:00] Creating EKS cluster configuration...
[00:01] Launching EKS cluster (this takes 15-20 minutes)...
[18:00] ✅ EKS Cluster ready!
[18:05] Creating namespace and ConfigMap...
[18:10] Deploying MongoDB...
[18:15] ✅ MongoDB ready!
[18:20] Deploying 20 services...
[23:00] ✅ All services deployed!
[25:00] Waiting for LoadBalancers...
[30:00] ✅ DEPLOYMENT COMPLETE!
```

---

## 📊 Check Status

### View All Services
```bash
kubectl get svc -n etelios-prod
```

Output:
```
NAME                    TYPE           EXTERNAL-IP
auth-service            LoadBalancer   a123...elb.amazonaws.com
hr-service              LoadBalancer   b456...elb.amazonaws.com
payroll-service         LoadBalancer   c789...elb.amazonaws.com
...
```

### View Pods
```bash
kubectl get pods -n etelios-prod
```

### View Logs
```bash
# All pods
kubectl logs -n etelios-prod -l app=auth-service

# Specific pod
kubectl logs -n etelios-prod auth-service-xxx-yyy
```

---

## 🧪 Test Services

### Test Auth Service
```bash
AUTH_URL=$(kubectl get svc auth-service -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl http://${AUTH_URL}/health
```

Should return:
```json
{"status": "ok"}
```

### Test HR Service
```bash
HR_URL=$(kubectl get svc hr-service -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl http://${HR_URL}/health
```

---

## 📈 Scale Services

### Scale Up
```bash
kubectl scale deployment auth-service -n etelios-prod --replicas=5
```

### Scale Down
```bash
kubectl scale deployment auth-service -n etelios-prod --replicas=1
```

### Auto-scale Nodes
```bash
# Nodes will auto-scale from 2 to 10 based on demand
kubectl get nodes --watch
```

---

## 💰 Cost Breakdown

| Resource | Quantity | Monthly Cost |
|----------|----------|--------------|
| EKS Control Plane | 1 | $73 |
| EC2 t3.medium | 3 nodes | $90 |
| EBS Storage | 60GB | $6 |
| LoadBalancers | 20 | $180 |
| Data Transfer | ~100GB | $10 |
| **Total** | | **~$359/month** |

### Cost Optimization Options:

1. **Use Ingress Instead of LoadBalancers** (-$160/month)
   - Deploy AWS Load Balancer Controller
   - Use single ALB with Ingress rules
   - **New cost: ~$199/month**

2. **Reduce to Auth + HR Only** (-$90/month)
   - Delete 18 other services
   - Keep only 2 LoadBalancers
   - **New cost: ~$109/month**

3. **Use Spot Instances** (-$30/month)
   - Replace on-demand with spot
   - **New cost: ~$60-90/month**

---

## 🔥 Quick Commands

### Get Service URLs
```bash
kubectl get svc -n etelios-prod -o wide
```

### Restart Service
```bash
kubectl rollout restart deployment auth-service -n etelios-prod
```

### Delete Everything
```bash
eksctl delete cluster --name etelios-prod-v2 --region ap-south-1
```

### Update Service Image
```bash
kubectl set image deployment/auth-service auth-service=383234048604.dkr.ecr.ap-south-1.amazonaws.com/etelios-auth-service:v2 -n etelios-prod
```

---

## 🐛 Troubleshooting

### Pods Not Starting
```bash
kubectl describe pod <pod-name> -n etelios-prod
kubectl logs <pod-name> -n etelios-prod
```

### MongoDB Connection Issues
```bash
# Check MongoDB
kubectl get pods -n etelios-prod -l app=mongodb

# Test connection
kubectl run mongo-test --image=mongo:5.0 --restart=Never -n etelios-prod -- \
  mongosh "mongodb://admin:etelios123@mongodb:27017/test?authSource=admin" --eval "db.adminCommand({ping: 1})"

kubectl logs mongo-test -n etelios-prod
kubectl delete pod mongo-test -n etelios-prod
```

### LoadBalancer Not Getting IP
```bash
# Check events
kubectl describe svc auth-service -n etelios-prod

# Usually takes 2-5 minutes
kubectl get svc -n etelios-prod --watch
```

### CoreDNS Not Working
```bash
# Check CoreDNS
kubectl get pods -n kube-system -l k8s-app=kube-dns

# If broken, restart
kubectl rollout restart deployment coredns -n kube-system
```

---

## ✅ Success Checklist

- [ ] AWS credentials configured
- [ ] eksctl installed
- [ ] kubectl installed
- [ ] ECR images exist
- [ ] Run `./deploy-to-aws.sh`
- [ ] Wait 30-40 minutes
- [ ] Check services: `kubectl get svc -n etelios-prod`
- [ ] Test URLs: `curl http://<service-url>/health`
- [ ] ✅ **DONE!**

---

## 🎯 Next Steps After Deployment

1. **Setup Custom Domain**
   - Point DNS to LoadBalancer URLs
   - Add SSL certificates

2. **Setup CI/CD**
   - GitHub Actions
   - Auto-deploy on push

3. **Setup Monitoring**
   - CloudWatch dashboards
   - Alerts for errors

4. **Optimize Costs**
   - Implement Ingress controller
   - Use spot instances
   - Scale down non-critical services

---

## 📞 Support

If anything fails:
1. Check logs: `./deploy-to-aws.sh` creates log file
2. Check pod logs: `kubectl logs <pod> -n etelios-prod`
3. Check AWS Console for resource creation status

---

**🚀 Ready? Run the deployment now!**

```bash
chmod +x deploy-to-aws.sh
./deploy-to-aws.sh
```
