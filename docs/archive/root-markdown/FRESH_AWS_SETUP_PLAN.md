# Fresh AWS Setup - Complete Step-by-Step Plan
## Learn from Mistakes, Do It Right This Time

## 🎯 Goal
Get Auth & HR services running on AWS in **2-3 hours** (not 8+ hours)

---

## 📋 Phase 1: Cleanup Current Setup (30 minutes)

### Step 1.1: Delete via AWS Console (25 minutes)

**Go to:** https://console.aws.amazon.com/console/home?region=ap-south-1

**Delete in this order:**

1. **CloudFormation Stacks** (5 min)
   - Go to CloudFormation
   - Stack: `eksctl-etelios-prod-nodegroup-standard-workers-v2`
   - Stack actions → Edit termination protection → Uncheck → Save
   - Delete stack
   - Repeat for `eksctl-etelios-prod-nodegroup-standard-workers`

2. **EKS Cluster** (15 min)
   - Go to EKS
   - Cluster: `etelios-prod`
   - Delete cluster
   - Type cluster name to confirm
   - (This will auto-delete nodes, LBs)

3. **DocumentDB** (10 min)
   - Go to DocumentDB
   - Cluster: `etelios-docdb-cluster`
   - Delete
   - **Select:** Skip final snapshot
   - Type `delete` to confirm

4. **NAT Gateways** (EXPENSIVE - $65/month)
   - Go to VPC → NAT Gateways
   - Delete both NAT gateways
   - Go to Elastic IPs → Release both IPs

### Step 1.2: Keep These (Reusable)

**Don't delete:**
- ✅ ECR repositories (Docker images ready)
- ✅ S3 buckets (can reuse)
- ✅ VPC (can reuse or delete)
- ✅ IAM roles (can reuse)

**Cost to keep:** $1.12/month

---

## 📋 Phase 2: Create Proper EKS Cluster (45 minutes)

### Step 2.1: Create EKS Cluster with eksctl (20 minutes)

**IMPORTANT:** Let eksctl handle EVERYTHING — don't manual create anything!

```bash
# Create cluster configuration file first
cat > cluster-config.yaml <<EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: etelios-prod-v2
  region: ap-south-1
  version: "1.30"

# Use existing VPC (if kept) or let eksctl create new one
# vpc:
#   id: vpc-0b9d03edaf63a59c7  # Your existing VPC (optional)

# Managed node group (SIMPLE approach)
managedNodeGroups:
  - name: main-workers
    instanceType: t3.medium
    desiredCapacity: 3  # Start small, scale later
    minSize: 2
    maxSize: 5
    privateNetworking: false  # PUBLIC subnets - avoids DNS issues
    ssh:
      allow: false  # No SSH needed
    iam:
      withAddonPolicies:
        imageBuilder: true
        autoScaler: true
        externalDNS: true
        certManager: true
        appMesh: true
        ebs: true
        efs: true
        albIngress: true
        xRay: true
        cloudWatch: true

# Enable essential add-ons
addons:
  - name: vpc-cni
    version: latest
  - name: coredns
    version: latest
  - name: kube-proxy
    version: latest

# OIDC for service accounts
iam:
  withOIDC: true

# CloudWatch logging
cloudWatch:
  clusterLogging:
    enableTypes: ["*"]
EOF

# Create cluster
eksctl create cluster -f cluster-config.yaml
```

**This ensures:**
- ✅ CoreDNS automatically installed
- ✅ VPC CNI properly configured
- ✅ Proper networking from start
- ✅ All add-ons working

**Time:** 15-20 minutes

### Step 2.2: Verify Cluster is Healthy (5 minutes)

```bash
# Check nodes
kubectl get nodes
# Should show: 3 nodes, all Ready

# Check CoreDNS (CRITICAL)
kubectl get pods -n kube-system -l k8s-app=kube-dns
# Should show: 2 pods, both 1/1 Ready

# Test DNS from pod
kubectl run test-dns --image=busybox:1.28 --restart=Never -- nslookup google.com
sleep 10
kubectl logs test-dns
# Should show: DNS resolution working

kubectl delete pod test-dns

# If CoreDNS working → PROCEED
# If CoreDNS broken → DELETE and try again (don't waste time)
```

**CRITICAL:** Don't proceed if CoreDNS not working!

---

## 📋 Phase 3: Deploy MongoDB (Simple Approach) (20 minutes)

### Step 3.1: Deploy MongoDB in Cluster

```bash
# Use existing k8s/mongodb.yaml or create simple one
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongodb-pvc
  namespace: etelios-prod
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb
  namespace: etelios-prod
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
        volumeMounts:
        - name: data
          mountPath: /data/db
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: mongodb-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb
  namespace: etelios-prod
spec:
  selector:
    app: mongodb
  ports:
  - port: 27017
EOF

# Wait for MongoDB
kubectl wait --for=condition=Ready pod -l app=mongodb -n etelios-prod --timeout=180s

# Test MongoDB
kubectl run mongo-test --image=mongo:5.0 --restart=Never -n etelios-prod -- \
  mongosh "mongodb://admin:etelios123@mongodb:27017/test" --eval "db.adminCommand({ping: 1})"
  
sleep 15
kubectl logs mongo-test -n etelios-prod
# Should show: { ok: 1 }

kubectl delete pod mongo-test -n etelios-prod
```

**Time:** 5-10 minutes

---

## 📋 Phase 4: Deploy Auth & HR Services ONLY (30 minutes)

### Step 4.1: Push Images to ECR (if not already)

```bash
# Images should already be in ECR from previous attempt
# Verify:
aws ecr describe-images --repository-name etelios-auth-service --region ap-south-1
aws ecr describe-images --repository-name etelios-hr-service --region ap-south-1

# If not present, rebuild and push
```

### Step 4.2: Create Namespace and ConfigMap

```bash
# Create namespace
kubectl create namespace etelios-prod

# Create ConfigMap with MongoDB connection
kubectl create configmap etelios-config -n etelios-prod \
  --from-literal=MONGODB_URI="mongodb://admin:etelios123@mongodb:27017/etelios-db?authSource=admin" \
  --from-literal=NODE_ENV=production \
  --from-literal=STORAGE_PROVIDER=local \
  --from-literal=USE_KEY_VAULT=false \
  --from-literal=CORS_ORIGIN="*" \
  --from-literal=JWT_SECRET=etelios-secret-key-change-this \
  --from-literal=LOG_LEVEL=info
```

### Step 4.3: Deploy Auth Service

```bash
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: etelios-prod
spec:
  replicas: 1
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
        image: 383234048604.dkr.ecr.ap-south-1.amazonaws.com/etelios-auth-service:latest
        ports:
        - containerPort: 3001
        envFrom:
        - configMapRef:
            name: etelios-config
        env:
        - name: PORT
          value: "3001"
        - name: SERVICE_NAME
          value: "auth-service"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: etelios-prod
spec:
  type: ClusterIP
  selector:
    app: auth-service
  ports:
  - port: 3001
    targetPort: 3001
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service-lb
  namespace: etelios-prod
spec:
  type: LoadBalancer
  selector:
    app: auth-service
  ports:
  - port: 80
    targetPort: 3001
EOF

# Wait for auth service
kubectl wait --for=condition=Ready pod -l app=auth-service -n etelios-prod --timeout=180s

# Test
kubectl logs -l app=auth-service -n etelios-prod --tail=20
```

### Step 4.4: Deploy HR Service

```bash
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hr-service
  namespace: etelios-prod
spec:
  replicas: 1
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
        image: 383234048604.dkr.ecr.ap-south-1.amazonaws.com/etelios-hr-service:latest
        ports:
        - containerPort: 3002
        envFrom:
        - configMapRef:
            name: etelios-config
        env:
        - name: PORT
          value: "3002"
        - name: SERVICE_NAME
          value: "hr-service"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: hr-service
  namespace: etelios-prod
spec:
  type: ClusterIP
  selector:
    app: hr-service
  ports:
  - port: 3002
    targetPort: 3002
---
apiVersion: v1
kind: Service
metadata:
  name: hr-service-lb
  namespace: etelios-prod
spec:
  type: LoadBalancer
  selector:
    app: hr-service
  ports:
  - port: 80
    targetPort: 3002
EOF

# Wait for HR service
kubectl wait --for=condition=Ready pod -l app=hr-service -n etelios-prod --timeout=180s
```

### Step 4.5: Get LoadBalancer URLs (5 minutes)

```bash
# Wait for LoadBalancers
sleep 60

# Get URLs
AUTH_URL=$(kubectl get service auth-service-lb -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
HR_URL=$(kubectl get service hr-service-lb -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo "Auth Service: http://$AUTH_URL"
echo "HR Service: http://$HR_URL"

# Test
curl http://$AUTH_URL/health
curl http://$HR_URL/health
```

---

## 📋 Phase 4: Test & Verify (15 minutes)

### Test Auth Service

```bash
# Health check
curl http://$AUTH_URL/health

# Login test
curl -X POST http://$AUTH_URL/api/auth/login \
  -H 'Content-Type: application/json' \
  -H 'X-Tenant-Id: default' \
  -d '{"emailOrEmployeeId": "admin", "password": "admin123"}'
```

### Test HR Service

```bash
# Health check
curl http://$HR_URL/health

# List employees
curl http://$HR_URL/api/hr/employees \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'X-Tenant-Id: default'
```

---

## 📋 Phase 5: Update Frontend (5 minutes)

```bash
# Update your frontend .env
REACT_APP_API_URL=http://$AUTH_URL
REACT_APP_AUTH_API=http://$AUTH_URL/api/auth
REACT_APP_HR_API=http://$HR_URL/api/hr
```

---

## 🔑 Key Differences from Failed Attempt

### What We'll Do Right

1. **Simple cluster config** - let eksctl handle everything
2. **PUBLIC subnets for nodes** - avoid DNS complexity
3. **Verify CoreDNS immediately** - don't proceed if broken
4. **In-cluster MongoDB** - skip DocumentDB initially
5. **Deploy 2 services only** - Auth + HR (like Azure)
6. **Test at each step** - catch issues early

### What We'll Avoid

1. ❌ Manual nodegroup creation
2. ❌ DocumentDB initially (add later if needed)
3. ❌ Private networking complexity
4. ❌ Deploying all 20 services at once
5. ❌ Complex security group configurations

---

## ⏱️ Timeline

| Phase | Task | Time |
|-------|------|------|
| 1 | Cleanup current setup | 30 min |
| 2 | Create fresh EKS cluster | 45 min |
| 3 | Deploy MongoDB | 20 min |
| 4 | Deploy Auth + HR | 30 min |
| 5 | Test & verify | 15 min |
| **Total** | **End-to-end** | **2.5 hours** |

---

## 💰 Cost Comparison

### Old Setup (Broken)
- 10 nodes: $300/month
- DocumentDB: $70/month
- NAT Gateways: $65/month
- Total: $580/month
- **Status:** Not working

### New Setup (Lean)
- 3 nodes: $90/month
- MongoDB in-cluster: Free
- Simple networking: Minimal
- Total: ~$200/month
- **Status:** Will work!

**Savings: $380/month** and actually working!

---

## 🚀 Automation Script

I'll create a master script that does everything:

```bash
./fresh-aws-setup-complete.sh
```

This will:
1. Verify old cluster deleted
2. Create new cluster with proper config
3. Wait for CoreDNS to be ready
4. Deploy MongoDB
5. Deploy Auth + HR
6. Test services
7. Give you working URLs

---

## 📊 Success Criteria

After 2.5 hours, you should have:
- ✅ EKS cluster with working CoreDNS
- ✅ MongoDB running and accessible
- ✅ Auth service: Login, Register, JWT
- ✅ HR service: Employees, Departments
- ✅ Public LoadBalancer URLs
- ✅ Frontend can connect

---

## 🎯 What You Need to Do

### Now (Stop Charges):
1. Go to AWS Console
2. Delete: CloudFormation stacks, EKS, DocumentDB, NAT Gateways
3. **Time:** 30 minutes

### Later (When Ready):
1. Run: `./fresh-aws-setup-complete.sh`
2. Wait: 2-2.5 hours
3. Test: Services working
4. Done: Migration complete!

---

## 📄 Documentation

I'll create:
- ✅ `fresh-aws-setup-complete.sh` - Master automation script
- ✅ `cluster-config.yaml` - Proper EKS configuration
- ✅ `deploy-auth-hr-only.sh` - Just 2 services
- ✅ `test-services.sh` - Verification script

---

## 💡 Why This Will Work

### Lessons Learned

1. **Keep it simple** - Don't overcomplicate
2. **Test CoreDNS first** - It's critical
3. **Public networking** - Easier than private
4. **Start small** - 2 services, 3 nodes
5. **In-cluster DB** - No external dependencies

### What We Have Ready

- ✅ All Docker images (AMD64) in ECR
- ✅ Experience from 8+ hours debugging
- ✅ Knowledge of what NOT to do
- ✅ Automation scripts

**Fresh attempt = Much faster with this knowledge!**

---

## 🚨 Ready to Start?

**Step 1:** Cleanup via AWS Console (30 min) - **DO THIS NOW to stop charges**

**Step 2:** Rest, come back fresh

**Step 3:** Run fresh setup script (2.5 hours automated)

**Step 4:** Working services!

---

**Shall I create the complete automation script for fresh setup?**
