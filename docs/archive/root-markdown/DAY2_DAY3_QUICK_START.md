# Day 2 & Day 3 Quick Start Guide

## 🎯 Overview

**Day 2:** Container Migration, DocumentDB, K8s Setup, CI/CD  
**Day 3:** Database Migration, Service Deployment, Monitoring

---

## 📋 Prerequisites

Before running Day 2, ensure:
- ✅ Day 1 setup is complete (EKS cluster running)
- ✅ AWS credentials configured
- ✅ Docker is running
- ✅ kubectl configured for EKS cluster

Check Day 1 completion:
```bash
aws eks describe-cluster --name etelios-prod --region ap-south-1
kubectl cluster-info
```

---

## 🚀 Day 2 Execution

### Step 1: Run Day 2 Script

```bash
./day2-aws-setup.sh
```

### What Day 2 Does:

1. **Builds & Pushes Docker Images (60-90 min)**
   - Builds all 20 microservice Docker images
   - Pushes to ECR (Elastic Container Registry)
   - Progress shown for each service

2. **Creates DocumentDB Cluster (10-15 min)**
   - Creates DocumentDB cluster in private subnets
   - Sets up security groups
   - Creates master credentials
   - **⚠️ Save the password from output!**

3. **Kubernetes Setup**
   - Creates `etelios-prod` namespace
   - Creates DocumentDB secrets
   - Creates ECR image pull secrets

4. **ALB Ingress Controller**
   - Installs AWS Load Balancer Controller
   - Configures IAM service account
   - Enables ALB creation for Ingress

5. **CI/CD Pipelines**
   - Creates CodeBuild projects for each service
   - Sets up automated build pipelines
   - **⚠️ Update GitHub repo URL after creation**

### Expected Duration: 90-120 minutes

### Important Notes:
- DocumentDB password is saved in `aws-resources-day2-*.txt`
- Some services may fail to build - check logs
- CI/CD projects need GitHub repo URL update

---

## 🚀 Day 3 Execution

### Step 1: Run Day 3 Script

```bash
./day3-aws-setup.sh
```

### What Day 3 Does:

1. **Creates Kubernetes Manifests**
   - Generates deployment YAML for all 20 services
   - Creates Service resources
   - Configures health checks
   - Sets resource limits

2. **Deploys Services to EKS**
   - Applies all deployment manifests
   - Waits for pods to be ready
   - Shows deployment status

3. **Creates Ingress & ALB**
   - Creates main API Gateway Ingress
   - Routes all services under single domain
   - Creates Application Load Balancer
   - **ALB URL provided in output**

4. **CloudWatch Logging**
   - Installs Fluent Bit
   - Configures log groups
   - Enables container logging

5. **Monitoring Setup**
   - Enables EKS logging
   - Creates CloudWatch dashboard
   - Sets up metrics collection

6. **Health Checks**
   - Verifies all services are running
   - Shows pod status
   - Reports healthy/unhealthy services

### Expected Duration: 30-45 minutes

### Important Notes:
- ALB creation takes 2-3 minutes
- Some pods may take time to become ready
- Check pod logs if services fail: `kubectl logs -n etelios-prod <pod-name>`

---

## 🔍 Verification Commands

### Check EKS Cluster
```bash
kubectl cluster-info
kubectl get nodes
```

### Check Services
```bash
kubectl get pods -n etelios-prod
kubectl get services -n etelios-prod
kubectl get deployments -n etelios-prod
```

### Check Ingress/ALB
```bash
kubectl get ingress -n etelios-prod
kubectl describe ingress etelios-api-ingress -n etelios-prod
```

### Check DocumentDB
```bash
aws docdb describe-db-clusters --db-cluster-identifier etelios-docdb-cluster --region ap-south-1
```

### View Logs
```bash
# Service logs
kubectl logs -n etelios-prod -l app=auth-service

# All pods
kubectl get pods -n etelios-prod -o wide
```

---

## 🐛 Troubleshooting

### Day 2 Issues

**Docker build fails:**
- Check Dockerfile exists: `ls microservices/<service>/Dockerfile`
- Check build logs in script output
- Try building manually: `docker build -t test -f microservices/<service>/Dockerfile microservices/<service>`

**ECR push fails:**
- Verify ECR login: `aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 383234048604.dkr.ecr.ap-south-1.amazonaws.com`
- Check ECR repository exists

**DocumentDB creation fails:**
- Check subnet group exists
- Verify security group allows DocumentDB
- Check IAM permissions

### Day 3 Issues

**Pods not starting:**
```bash
kubectl describe pod <pod-name> -n etelios-prod
kubectl logs <pod-name> -n etelios-prod
```

**Image pull errors:**
- Verify ECR secret: `kubectl get secret ecr-registry-secret -n etelios-prod`
- Check image exists in ECR: `aws ecr list-images --repository-name etelios-<service> --region ap-south-1`

**ALB not created:**
- Check ALB controller logs: `kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller`
- Verify IAM service account: `kubectl get sa aws-load-balancer-controller -n kube-system`

**Services not accessible:**
- Check ingress: `kubectl get ingress -n etelios-prod`
- Check ALB status: `kubectl describe ingress etelios-api-ingress -n etelios-prod`
- Verify security groups allow traffic

---

## 📝 Manual Steps After Day 3

1. **Database Migration**
   - Export from Azure Cosmos DB
   - Import to DocumentDB (see script output for commands)
   - Verify data integrity

2. **DNS Configuration**
   - Create Route53 hosted zone
   - Request ACM SSL certificate
   - Update Ingress with certificate ARN
   - Create A record pointing to ALB

3. **Update Application Configs**
   - Update connection strings to DocumentDB
   - Update service URLs
   - Test all endpoints

4. **End-to-End Testing**
   - Test authentication
   - Test all service endpoints
   - Verify multi-tenant isolation
   - Check monitoring and logging

---

## 📊 Resource Files

All resource IDs and credentials are saved in:
- Day 1: `aws-resources-*.txt`
- Day 2: `aws-resources-day2-*.txt`
- Day 3: `aws-resources-day3-*.txt`

**⚠️ Keep these files secure! They contain passwords and resource IDs.**

---

## ✅ Success Criteria

**Day 2 Complete When:**
- ✅ All 20 Docker images in ECR
- ✅ DocumentDB cluster running
- ✅ Kubernetes namespace and secrets created
- ✅ ALB Ingress Controller installed

**Day 3 Complete When:**
- ✅ All 20 services deployed to EKS
- ✅ All pods in Running state
- ✅ ALB created and accessible
- ✅ CloudWatch logging working
- ✅ Monitoring dashboard created

---

## 🎯 Next Steps After Day 3

1. Complete database migration
2. Configure DNS and SSL
3. Run comprehensive tests
4. Update documentation
5. Plan Day 4 (Production cutover)

---

**Ready to start? Run:**
```bash
./day2-aws-setup.sh
```
