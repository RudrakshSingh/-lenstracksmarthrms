# AWS DocumentDB Setup Guide

## 📋 Overview

This guide helps you create and configure an AWS DocumentDB cluster for the Lenstrack Smart HRMS application.

**What is DocumentDB?**
- AWS managed MongoDB-compatible database service
- Fully managed, scalable, and highly available
- Compatible with MongoDB drivers and tools
- Automatic backups and point-in-time recovery

---

## 🚀 Quick Start

### Prerequisites

1. **AWS CLI installed and configured**
   ```bash
   aws --version
   aws configure
   ```

2. **Required IAM Permissions:**
   - `docdb:*` (DocumentDB full access)
   - `ec2:DescribeVpcs`
   - `ec2:DescribeSubnets`
   - `ec2:CreateSecurityGroup`
   - `ec2:AuthorizeSecurityGroupIngress`
   - `ec2:DescribeSecurityGroups`
   - `eks:ListClusters`
   - `eks:DescribeCluster`
   - `eks:ListNodegroups`
   - `eks:DescribeNodegroup`

3. **VPC with at least 2 subnets in different Availability Zones**

### Run the Script

```bash
# Basic usage (uses defaults)
./scripts/create-aws-documentdb.sh

# With custom region
AWS_REGION=ap-south-1 ./scripts/create-aws-documentdb.sh

# With custom cluster name
DOCDB_CLUSTER_ID=my-docdb-cluster ./scripts/create-aws-documentdb.sh

# With custom instance class
DOCDB_INSTANCE_CLASS=db.r6g.xlarge ./scripts/create-aws-documentdb.sh
```

**Time Required:** 15-20 minutes (cluster creation takes 10-15 minutes)

---

## 📊 What the Script Does

### Step 1: Find VPC and Subnets
- Automatically detects your VPC (default VPC or EKS VPC)
- Finds at least 2 subnets in different Availability Zones
- Uses these for high availability

### Step 2: Create Subnet Group
- Creates a DocumentDB subnet group
- Associates it with the selected subnets
- Required for cluster creation

### Step 3: Create Security Group
- Creates a security group for DocumentDB
- Adds ingress rule for VPC CIDR (port 27017)
- If EKS cluster exists, adds EKS node security groups automatically

### Step 4: Create DocumentDB Cluster
- Creates the cluster with specified configuration
- Sets up master username and password
- Configures backups and maintenance windows
- Enables encryption at rest

### Step 5: Create DocumentDB Instance
- Creates the first instance in the cluster
- Uses specified instance class
- Places in first availability zone

### Step 6: Output Connection Details
- Displays cluster endpoint
- Shows connection string
- Saves credentials to file

---

## ⚙️ Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_REGION` | `ap-south-1` | AWS region for DocumentDB |
| `DOCDB_CLUSTER_ID` | `lenstrack-docdb-cluster` | Cluster identifier |
| `DOCDB_INSTANCE_ID` | `lenstrack-docdb-instance-1` | Instance identifier |
| `DOCDB_INSTANCE_CLASS` | `db.r6g.large` | Instance class (see below) |
| `DOCDB_ENGINE_VERSION` | `5.0.0` | DocumentDB engine version |
| `DOCDB_MASTER_USER` | `admin` | Master username |
| `DOCDB_MASTER_PASSWORD` | *(auto-generated)* | Master password (32 chars) |
| `DOCDB_SUBNET_GROUP` | `lenstrack-docdb-subnet-group` | Subnet group name |
| `DOCDB_SG_NAME` | `lenstrack-docdb-sg` | Security group name |
| `DOCDB_BACKUP_RETENTION` | `7` | Backup retention (days) |
| `DOCDB_BACKUP_WINDOW` | `03:00-04:00` | Backup window (UTC) |
| `DOCDB_MAINTENANCE_WINDOW` | `mon:04:00-mon:05:00` | Maintenance window (UTC) |

### Instance Classes

**Memory Optimized (r6g):**
- `db.r6g.large` - 2 vCPU, 15.25 GB RAM (default)
- `db.r6g.xlarge` - 4 vCPU, 30.5 GB RAM
- `db.r6g.2xlarge` - 8 vCPU, 61 GB RAM
- `db.r6g.4xlarge` - 16 vCPU, 122 GB RAM

**General Purpose (t4g):**
- `db.t4g.medium` - 2 vCPU, 4 GB RAM (dev/test)
- `db.t4g.large` - 2 vCPU, 8 GB RAM

**Choose based on:**
- **Development/Testing:** `db.t4g.medium` or `db.t4g.large`
- **Production (Small):** `db.r6g.large` (default)
- **Production (Medium):** `db.r6g.xlarge`
- **Production (Large):** `db.r6g.2xlarge` or higher

---

## 🔐 Security Configuration

### Security Group Rules

The script automatically configures:

1. **VPC CIDR Access** (port 27017)
   - Allows access from any resource in the VPC
   - Required for EKS pods to connect

2. **EKS Node Security Groups** (if EKS exists)
   - Automatically adds EKS node security groups
   - Allows pods to connect to DocumentDB

### Manual Security Group Configuration

If you need to add additional access:

```bash
# Get security group ID
SG_ID=$(aws ec2 describe-security-groups \
    --region ap-south-1 \
    --filters "Name=group-name,Values=lenstrack-docdb-sg" \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

# Add rule for specific IP
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 27017 \
    --cidr YOUR_IP/32 \
    --region ap-south-1
```

---

## 📝 Connection String Format

### Standard Connection String

```
mongodb://username:password@endpoint:port/database?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

### With CA Certificate

```
mongodb://username:password@endpoint:port/database?tls=true&tlsCAFile=rds-combined-ca-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

### Download CA Certificate

```bash
# Download AWS RDS CA certificate bundle
curl -o rds-combined-ca-bundle.pem \
    https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# Verify certificate
openssl x509 -in rds-combined-ca-bundle.pem -text -noout
```

---

## 🔧 Application Configuration

### Environment Variables

Add to your `.env` file or Kubernetes secrets:

```bash
# Connection String (recommended)
MONGO_URI=mongodb://admin:password@lenstrack-docdb-cluster.cluster-xxxxx.ap-south-1.docdb.amazonaws.com:27017/hrms?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false

# OR separate variables
DOCDB_ENDPOINT=lenstrack-docdb-cluster.cluster-xxxxx.ap-south-1.docdb.amazonaws.com
DOCDB_PORT=27017
DOCDB_USERNAME=admin
DOCDB_PASSWORD=your-password
MONGO_DB_NAME=hrms
```

### Kubernetes Secret

```bash
# Create secret
kubectl create secret generic docdb-credentials \
    -n etelios-prod \
    --from-literal=endpoint="lenstrack-docdb-cluster.cluster-xxxxx.ap-south-1.docdb.amazonaws.com:27017" \
    --from-literal=username="admin" \
    --from-literal=password="your-password"

# Use in deployment
env:
  - name: MONGO_URI
    valueFrom:
      secretKeyRef:
        name: docdb-credentials
        key: endpoint
```

---

## ✅ Verification

### Test Connection from Local Machine

```bash
# Install MongoDB client
brew install mongodb-community  # macOS
# OR
sudo apt-get install mongodb-clients  # Ubuntu

# Test connection
mongosh "mongodb://admin:password@lenstrack-docdb-cluster.cluster-xxxxx.ap-south-1.docdb.amazonaws.com:27017/hrms?tls=true&replicaSet=rs0" \
    --tlsCAFile=rds-combined-ca-bundle.pem
```

### Test Connection from EKS Pod

```bash
# Exec into a pod
kubectl exec -it deployment/attendance-service -n etelios-prod -- bash

# Test connection
mongosh "$MONGO_URI"
```

### Check Cluster Status

```bash
# Get cluster status
aws docdb describe-db-clusters \
    --db-cluster-identifier lenstrack-docdb-cluster \
    --region ap-south-1 \
    --query 'DBClusters[0].[Status,Endpoint,Port]' \
    --output table
```

### Check Instance Status

```bash
# Get instance status
aws docdb describe-db-instances \
    --db-instance-identifier lenstrack-docdb-instance-1 \
    --region ap-south-1 \
    --query 'DBInstances[0].[DBInstanceStatus,Endpoint.Address,Endpoint.Port]' \
    --output table
```

---

## 🔄 Adding More Instances

For high availability, add more instances:

```bash
# Add second instance
aws docdb create-db-instance \
    --db-instance-identifier lenstrack-docdb-instance-2 \
    --db-instance-class db.r6g.large \
    --engine docdb \
    --db-cluster-identifier lenstrack-docdb-cluster \
    --availability-zone ap-south-1b \
    --region ap-south-1

# Add third instance (optional)
aws docdb create-db-instance \
    --db-instance-identifier lenstrack-docdb-instance-3 \
    --db-instance-class db.r6g.large \
    --engine docdb \
    --db-cluster-identifier lenstrack-docdb-cluster \
    --availability-zone ap-south-1c \
    --region ap-south-1
```

**Benefits:**
- High availability (automatic failover)
- Read scaling (use reader endpoint)
- Better performance

---

## 💰 Cost Estimation

### Instance Pricing (ap-south-1, On-Demand)

| Instance Class | vCPU | RAM | Price/Hour | Price/Month (approx) |
|---------------|------|-----|------------|----------------------|
| `db.t4g.medium` | 2 | 4 GB | $0.10 | ~$73 |
| `db.t4g.large` | 2 | 8 GB | $0.20 | ~$146 |
| `db.r6g.large` | 2 | 15.25 GB | $0.30 | ~$219 |
| `db.r6g.xlarge` | 4 | 30.5 GB | $0.60 | ~$438 |
| `db.r6g.2xlarge` | 8 | 61 GB | $1.20 | ~$876 |

### Additional Costs

- **Storage:** $0.10/GB-month (first 10 GB free)
- **I/O:** $0.20 per million I/O requests
- **Backup Storage:** $0.095/GB-month (first 20% of provisioned storage free)
- **Data Transfer:** Free within same region

### Example Monthly Cost (Single Instance)

**Small Production (db.r6g.large):**
- Instance: ~$219/month
- Storage (100 GB): ~$10/month
- I/O (10M requests): ~$2/month
- **Total: ~$231/month**

**Medium Production (db.r6g.xlarge):**
- Instance: ~$438/month
- Storage (200 GB): ~$20/month
- I/O (50M requests): ~$10/month
- **Total: ~$468/month**

---

## 🛠️ Troubleshooting

### Issue: Cluster Creation Fails

**Error:** `InvalidParameterValue: Subnet group requires at least 2 subnets`

**Solution:**
- Ensure VPC has at least 2 subnets in different Availability Zones
- Check subnet configuration

### Issue: Cannot Connect from EKS Pods

**Error:** `Connection timeout` or `ECONNREFUSED`

**Solutions:**
1. **Check Security Group:**
   ```bash
   # Verify security group allows EKS nodes
   aws ec2 describe-security-groups \
       --group-ids <DOCDB_SG_ID> \
       --region ap-south-1
   ```

2. **Check VPC Configuration:**
   - Ensure DocumentDB and EKS are in same VPC
   - Verify route tables allow communication

3. **Test from Pod:**
   ```bash
   kubectl exec -it <pod-name> -n <namespace> -- \
       nc -zv <docdb-endpoint> 27017
   ```

### Issue: Authentication Failed

**Error:** `Authentication failed`

**Solutions:**
1. Verify username and password
2. Check connection string format
3. Ensure `authSource=admin` if using admin user

### Issue: TLS/SSL Error

**Error:** `SSL handshake failed`

**Solutions:**
1. Download CA certificate:
   ```bash
   curl -o rds-combined-ca-bundle.pem \
       https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
   ```

2. Use `tlsCAFile` in connection string:
   ```
   ?tls=true&tlsCAFile=/path/to/rds-combined-ca-bundle.pem
   ```

### Issue: Slow Queries

**Solutions:**
1. **Add Read Replicas:**
   - Use reader endpoint for read queries
   - Distribute read load

2. **Optimize Indexes:**
   - Add indexes for frequently queried fields
   - Use compound indexes

3. **Upgrade Instance:**
   - Move to larger instance class
   - More CPU and RAM

---

## 📚 Additional Resources

### AWS Documentation
- [DocumentDB User Guide](https://docs.aws.amazon.com/documentdb/latest/developerguide/)
- [DocumentDB Best Practices](https://docs.aws.amazon.com/documentdb/latest/developerguide/best-practices.html)
- [DocumentDB Pricing](https://aws.amazon.com/documentdb/pricing/)

### MongoDB Compatibility
- [MongoDB Driver Compatibility](https://docs.aws.amazon.com/documentdb/latest/developerguide/compatibility.html)
- [MongoDB Migration Guide](https://docs.aws.amazon.com/documentdb/latest/developerguide/migration.html)

### Monitoring
- [CloudWatch Metrics](https://docs.aws.amazon.com/documentdb/latest/developerguide/monitoring.html)
- [Performance Insights](https://docs.aws.amazon.com/documentdb/latest/developerguide/performance-insights.html)

---

## 🎯 Next Steps

After creating DocumentDB:

1. ✅ **Save Connection Details**
   - Connection info saved to `documentdb-connection-info.txt`
   - Keep password secure!

2. ✅ **Download CA Certificate**
   ```bash
   curl -o rds-combined-ca-bundle.pem \
       https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
   ```

3. ✅ **Update Application Configuration**
   - Add `MONGO_URI` to environment variables
   - Update Kubernetes secrets
   - Restart services

4. ✅ **Test Connection**
   - Test from local machine
   - Test from EKS pods
   - Verify application connectivity

5. ✅ **Set Up Monitoring**
   - Enable CloudWatch alarms
   - Set up performance insights
   - Configure backup alerts

6. ✅ **Add Read Replicas** (Optional)
   - For high availability
   - For read scaling

---

**Last Updated:** 2026-02-26  
**Version:** 1.0.0  
**Maintained By:** DevOps Team
