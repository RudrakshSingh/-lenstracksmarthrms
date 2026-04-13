# 🚀 Start AWS Deployment

## Choose Your Method:

---

## Option 1: Deploy via CloudShell (EASIEST) ⭐

### Step 1: Open AWS CloudShell
1. Go to https://console.aws.amazon.com
2. Click **CloudShell** icon (top-right, terminal icon)
3. Wait for CloudShell to open (~30 seconds)

### Step 2: Copy Script to CloudShell

**Copy-paste this entire block into CloudShell:**

```bash
#!/bin/bash
# Quick AWS Deployment Script

REGION="ap-south-1"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"
ACCOUNT_ID="383234048604"

echo "Installing eksctl..."
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin
echo "✅ eksctl installed"

echo "Creating cluster config..."
cat > /tmp/cluster.yaml <<EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: ${CLUSTER_NAME}
  region: ${REGION}
  version: "1.30"
managedNodeGroups:
  - name: main-workers
    instanceType: t3.medium
    desiredCapacity: 3
    minSize: 2
    maxSize: 10
    privateNetworking: false
iam:
  withOIDC: true
EOF

echo "Creating EKS cluster (takes 15-20 minutes)..."
echo "☕ Go get coffee, this will take a while..."
eksctl create cluster -f /tmp/cluster.yaml

echo "✅ Cluster created!"

echo "Creating namespace..."
kubectl create namespace ${NAMESPACE}

echo "Deploying MongoDB..."
kubectl apply -f - <<MONGO
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb
  namespace: ${NAMESPACE}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:5.0
        ports:
        - containerPort: 27017
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          value: "admin"
        - name: MONGO_INITDB_ROOT_PASSWORD
          value: "etelios123"
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb
  namespace: ${NAMESPACE}
spec:
  selector:
    app: mongodb
  ports:
  - port: 27017
MONGO

echo "Waiting for MongoDB..."
kubectl wait --for=condition=Available deployment/mongodb -n ${NAMESPACE} --timeout=300s

echo "Creating ConfigMap..."
kubectl apply -f - <<CONFIG
apiVersion: v1
kind: ConfigMap
metadata:
  name: etelios-config
  namespace: ${NAMESPACE}
data:
  MONGODB_URI: "mongodb://admin:etelios123@mongodb.${NAMESPACE}.svc.cluster.local:27017/etelios?authSource=admin"
  NODE_ENV: "production"
  JWT_SECRET: "etelios-super-secret-jwt-key-2024"
  PORT: "3000"
CONFIG

echo "Deploying Auth Service..."
kubectl apply -f - <<AUTH
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: ${NAMESPACE}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/etelios-auth-service:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: etelios-config
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: ${NAMESPACE}
spec:
  selector:
    app: auth-service
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
AUTH

echo "Deploying HR Service..."
kubectl apply -f - <<HR
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hr-service
  namespace: ${NAMESPACE}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hr-service
  template:
    metadata:
      labels:
        app: hr-service
    spec:
      containers:
      - name: hr-service
        image: ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/etelios-hr-service:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: etelios-config
---
apiVersion: v1
kind: Service
metadata:
  name: hr-service
  namespace: ${NAMESPACE}
spec:
  selector:
    app: hr-service
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
HR

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "Check services (wait 2-3 min for LoadBalancers):"
echo "  kubectl get svc -n ${NAMESPACE}"
echo ""
echo "Check pods:"
echo "  kubectl get pods -n ${NAMESPACE}"
echo ""
echo "Get Auth URL:"
echo "  kubectl get svc auth-service -n ${NAMESPACE}"
echo ""
echo "🎉 Your app is deploying!"
```

### Step 3: Press Enter and Wait
- Script will run automatically
- Takes **20-30 minutes total**
- You'll see progress messages

### Step 4: Get Service URLs

After deployment completes, run:
```bash
kubectl get svc -n etelios-prod
```

Copy the LoadBalancer URLs and test:
```bash
# Get auth service URL
AUTH_URL=$(kubectl get svc auth-service -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl http://${AUTH_URL}/health
```

---

## Option 2: Deploy from Local Machine

### Prerequisites

1. **Configure AWS Credentials**
```bash
aws configure
```

Enter:
- AWS Access Key ID: [Your key from IAM]
- AWS Secret Access Key: [Your secret]
- Default region: `ap-south-1`
- Default output format: `json`

2. **Verify Credentials**
```bash
aws sts get-caller-identity
```

### Run Deployment

```bash
cd ~/Desktop/lenstracksmarthrms
./deploy-to-aws.sh
```

---

## 📊 What Gets Deployed

### Infrastructure:
- ✅ EKS Cluster (Kubernetes 1.30)
- ✅ 3x t3.medium nodes (auto-scaling 2-10)
- ✅ MongoDB database (in-cluster)

### Services:
- ✅ Auth Service (2 replicas)
- ✅ HR Service (2 replicas)
- ✅ LoadBalancers (2 public URLs)

### Time:
- Cluster creation: **15-20 minutes**
- MongoDB + Services: **5-10 minutes**
- **Total: ~30 minutes**

### Cost:
- EKS Control Plane: **$73/month**
- EC2 (3x t3.medium): **$90/month**
- LoadBalancers (2): **$18/month**
- Storage: **$6/month**
- **Total: ~$187/month**

---

## ✅ Verify Deployment

### Check Cluster
```bash
kubectl get nodes
# Should show 3 nodes, all Ready
```

### Check Pods
```bash
kubectl get pods -n etelios-prod
# Should show:
# - mongodb-xxx (1/1 Running)
# - auth-service-xxx (2/2 Running)
# - hr-service-xxx (2/2 Running)
```

### Check Services
```bash
kubectl get svc -n etelios-prod
# Should show LoadBalancer URLs
```

### Test Auth Service
```bash
AUTH_URL=$(kubectl get svc auth-service -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl http://${AUTH_URL}/health

# Expected: {"status": "ok"}
```

---

## 🔥 Quick Commands

### Scale Up
```bash
kubectl scale deployment auth-service -n etelios-prod --replicas=5
```

### View Logs
```bash
kubectl logs -l app=auth-service -n etelios-prod --tail=100
```

### Restart Service
```bash
kubectl rollout restart deployment auth-service -n etelios-prod
```

### Delete Everything
```bash
eksctl delete cluster --name etelios-prod-v2 --region ap-south-1
```

---

## 🐛 Troubleshooting

### Pods CrashLooping
```bash
kubectl logs <pod-name> -n etelios-prod
kubectl describe pod <pod-name> -n etelios-prod
```

### Can't Pull ECR Images
```bash
# Check if images exist
aws ecr describe-images --repository-name etelios-auth-service --region ap-south-1

# If not, you need to build and push images first
```

### MongoDB Connection Issues
```bash
# Check MongoDB logs
kubectl logs -l app=mongodb -n etelios-prod

# Test connection
kubectl run mongo-test --image=mongo:5.0 --restart=Never -n etelios-prod -- \
  mongosh "mongodb://admin:etelios123@mongodb:27017/test?authSource=admin" --eval "db.adminCommand({ping: 1})"
```

---

## 📈 Next Steps

### 1. Deploy More Services
```bash
# Add payroll, attendance, etc.
# Copy the deployment pattern from auth/hr
```

### 2. Setup Ingress (Save $160/month)
```bash
# Use single ALB instead of multiple LoadBalancers
# Deploy AWS Load Balancer Controller
```

### 3. Add Monitoring
```bash
# CloudWatch Container Insights
# Prometheus + Grafana
```

### 4. Setup CI/CD
```bash
# GitHub Actions
# Auto-deploy on git push
```

---

## 🎯 Ready?

**EASIEST:** Use CloudShell method (copy-paste script above)

**ADVANCED:** Configure local AWS credentials, then run `./deploy-to-aws.sh`

**Time:** 30 minutes total

**Cost:** ~$187/month (for Auth + HR only)

---

**Let's go! 🚀**
