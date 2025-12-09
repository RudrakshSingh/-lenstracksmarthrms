# Connection Strings Configuration Guide

## 🔗 Two Types of Connection Strings

### 1. **Azure DevOps Service Connections** (in Pipeline)

These are configured in Azure DevOps and referenced in the pipeline:

#### A. ACR Connection
- **Name**: `eteliosacr-connection`
- **Type**: Docker Registry
- **Purpose**: Push Docker images to Azure Container Registry
- **Location in pipeline**: Line 38
- **Action Required**: Create this service connection in Azure DevOps if it doesn't exist

#### B. Azure Service Connection
- **Name**: `Azure-Service-Connection`
- **Type**: Azure Resource Manager
- **Purpose**: Access AKS cluster and deploy resources
- **Location in pipeline**: Multiple places (lines 95, 117, 128, etc.)
- **Action Required**: Create this service connection in Azure DevOps if it doesn't exist

---

### 2. **Application Connection Strings** (in Kubernetes Secrets)

These are stored in Kubernetes Secrets and used by your applications:

#### Required Connection Strings:
- **MongoDB Connection Strings**:
  - `mongo-uri-auth` - For auth service
  - `mongo-uri-hr` - For HR service
  - `mongo-uri-common` - For common services

- **Redis Connection**:
  - `redis-password` - Redis password (if required)

- **Azure Storage**:
  - `azure-storage-connection-string` - Azure Blob Storage connection

- **Other Secrets**:
  - `jwt-secret` - JWT signing secret
  - `jwt-refresh-secret` - JWT refresh secret
  - Email configuration
  - Encryption keys
  - Cloudinary/Twilio (if used)

**Location**: `k8s/secrets.yaml` (created from `k8s/secrets.yaml.template`)

---

## ✅ What You Need to Do

### Step 1: Verify/Create Service Connections in Azure DevOps

1. Go to: `https://dev.azure.com/Hindempire-devops1/etelios`
2. Navigate to: **Project Settings** → **Service connections**

**Check if these exist:**
- ✅ `eteliosacr-connection` (Docker Registry type)
- ✅ `Azure-Service-Connection` (Azure Resource Manager type)

**If missing, create them** (see SERVICE_CONNECTIONS_CHECK.md for details)

### Step 2: Create Kubernetes Secrets

**Before first deployment, you MUST create `k8s/secrets.yaml`:**

```bash
# Option 1: Use the setup script
./k8s/setup-secrets.sh

# Option 2: Manually create from template
cp k8s/secrets.yaml.template k8s/secrets.yaml
# Then edit k8s/secrets.yaml and replace <base64-encoded-...> with actual base64 values
```

**To generate base64 values:**
```bash
echo -n "your-secret-value" | base64
```

**Example for MongoDB:**
```bash
echo -n "mongodb://user:pass@host:27017/dbname" | base64
```

---

## 📋 Current Configuration

### Pipeline Service Connections:
- **ACR**: `eteliosacr-connection` → Points to ACR: `eteliosacr.azurecr.io`
- **Azure**: `Azure-Service-Connection` → Points to AKS: `Etelios-AKS` in RG: `Etelios-AKS-RG`

### Application Secrets:
- Stored in: `k8s/secrets.yaml` (must be created)
- Namespace: `etelios-backend-prod`
- Secret name: `etelios-secrets`

---

## ⚠️ Important Notes

1. **Service Connections** are created in Azure DevOps UI, not in code
2. **Application Secrets** are stored in Kubernetes, not in the pipeline
3. **Never commit** `k8s/secrets.yaml` to Git (it should be in .gitignore)
4. **Secrets must be created** before the first deployment
5. **Service connections** must exist before the pipeline runs

---

## 🔍 Verification

### Check Service Connections:
- Azure DevOps → Project Settings → Service connections

### Check if Secrets File Exists:
```bash
ls -la k8s/secrets.yaml
```

### Verify Secrets in Kubernetes (after deployment):
```bash
kubectl get secrets -n etelios-backend-prod
kubectl describe secret etelios-secrets -n etelios-backend-prod
```

---

## 🚨 Common Issues

### Issue: "Service connection not found"
**Solution**: Create the service connection in Azure DevOps with the exact name

### Issue: "Secrets file not found"
**Solution**: Create `k8s/secrets.yaml` from template before deployment

### Issue: "Cannot pull images from ACR"
**Solution**: Ensure AKS has AcrPull permission on ACR, or attach ACR to AKS

