# ACR Repository Information

## Main API Gateway (Root Pipeline)

**ACR Registry:** `eteliosacr-hvawabdbgge7e0fu.azurecr.io`

**Repository Name:** `eteliosbackend`

**Full Image Path:** `eteliosacr-hvawabdbgge7e0fu.azurecr.io/eteliosbackend:latest`

**Pipeline File:** `azure-pipelines.yml`

**Tags Pushed:**
- `latest` - Only tag pushed (no serial numbers)

**App Service:** `etelios-app-service-cxf6hvgjb7gah7dr`
- Pulls from: `eteliosacr-hvawabdbgge7e0fu.azurecr.io/eteliosbackend:latest`

---

## HR Service

**ACR Registry:** `eteliosregistry.azurecr.io`

**Repository Name:** `hr-service`

**Full Image Path:** `eteliosregistry.azurecr.io/hr-service:latest`

**Pipeline File:** `microservices/hr-service/azure-pipelines.yml`

**Tags Pushed:**
- `latest` - Only tag pushed (no serial numbers)

**App Service:** `etelios-hr-service`
- Pulls from: `eteliosregistry.azurecr.io/hr-service:latest`

---

## Verify Images in ACR

### Check Main API Gateway Images

```bash
# List all tags for eteliosbackend repository
az acr repository show-tags \
  --name eteliosacr-hvawabdbgge7e0fu \
  --repository eteliosbackend \
  --orderby time_desc \
  --output table
```

### Check HR Service Images

```bash
# List all tags for hr-service repository
az acr repository show-tags \
  --name eteliosregistry \
  --repository hr-service \
  --orderby time_desc \
  --output table
```

---

## Current Pipeline Configuration

Both pipelines are already configured to push `latest` tag:

### Main Pipeline (`azure-pipelines.yml`)
```yaml
tags: |
  latest      # Only latest tag (no serial numbers)
```

### HR Service Pipeline (`microservices/hr-service/azure-pipelines.yml`)
```yaml
tags: |
  latest      # Only latest tag (no serial numbers)
```

---

## Summary

✅ **Main API Gateway:**
- Repository: `eteliosbackend`
- Registry: `eteliosacr-hvawabdbgge7e0fu.azurecr.io`
- Latest images: `eteliosacr-hvawabdbgge7e0fu.azurecr.io/eteliosbackend:latest`

✅ **HR Service:**
- Repository: `hr-service`
- Registry: `eteliosregistry.azurecr.io`
- Latest images: `eteliosregistry.azurecr.io/hr-service:latest`

Both pipelines are correctly configured to push both the build ID tag and the `latest` tag.

