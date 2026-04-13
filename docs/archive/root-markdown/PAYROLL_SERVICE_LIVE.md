# Payroll Service - Live Status

## ✅ Service Deployed and Running

**Status:** Payroll service is now live and running in Kubernetes.

---

## 🔧 What Was Fixed

### 1. **MongoDB Connection Issue**
- **Problem:** Service was trying to connect to `localhost:27017`
- **Fix:** Updated to use Kubernetes MongoDB service:
  ```
  mongodb://admin:etelios123@mongodb.etelios-prod.svc.cluster.local:27017/etelios?authSource=admin
  ```

### 2. **Service Port Configuration**
- **Problem:** Service was exposing port 3004, but ingress expected port 80
- **Fix:** Updated service to expose port 80 (routes to container port 3004)

### 3. **Code Update**
- Updated `server.js` to check `MONGODB_URI` environment variable first

---

## 📋 Service Details

### Kubernetes Resources
- **Namespace:** `etelios-prod`
- **Deployment:** `payroll-service`
- **Service:** `payroll-service` (ClusterIP)
- **Replicas:** 2
- **Container Port:** 3004
- **Service Port:** 80

### Docker Image
```
383234048604.dkr.ecr.ap-south-1.amazonaws.com/etelios-payroll-service:latest
```

---

## 🌐 API Endpoints

### Base URL
```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

### Available Endpoints

#### 1. Health Check
```
GET /api/payroll/health
```

#### 2. Service Status
```
GET /api/payroll/status
```

#### 3. Calculate Salary
```
POST /api/payroll/salary/calculate
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
{
  "employee_id": "EMP001",
  "gross_monthly": 50000,
  "variable_incentive": 5000,
  "professional_tax": 200,
  "tds": 0
}
```

#### 4. Get Current Salary
```
GET /api/payroll/salary/employee/:employeeId
Headers:
  Authorization: Bearer <token>
```

#### 5. Get Salary History
```
GET /api/payroll/salary/employee/:employeeId/history?limit=12
Headers:
  Authorization: Bearer <token>
```

#### 6. Update Salary
```
PUT /api/payroll/salary/employee/:employeeId
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
{
  "gross_monthly": 55000,
  "variable_incentive": 5000
}
```

#### 7. Payroll Summary
```
GET /api/payroll/salary/payroll-summary?month=2&year=2026
Headers:
  Authorization: Bearer <token>
```

#### 8. Bulk Calculate Salaries
```
POST /api/payroll/salary/bulk-calculate
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
{
  "employees": [
    {
      "employee_id": "EMP001",
      "gross_monthly": 50000
    },
    {
      "employee_id": "EMP002",
      "gross_monthly": 60000
    }
  ]
}
```

---

## 🧪 Quick Test

```bash
# Health Check
curl http://API_URL/api/payroll/health

# Service Status
curl http://API_URL/api/payroll/status

# Calculate Salary (with auth)
curl -X POST http://API_URL/api/payroll/salary/calculate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "EMP001",
    "gross_monthly": 50000
  }'
```

---

## 📊 Salary Breakdown Calculator

The payroll service includes a **compensation breakdown calculator** that:

1. Takes `gross_monthly` salary as input
2. Calculates:
   - Basic Salary (50% of gross)
   - HRA (50% of basic)
   - Special Allowance (remaining)
   - EPF (12% of basic, max ₹1,800)
   - ESIC (0.75% if gross ≤ ₹21,000)
   - Gratuity (4.81% of basic)
   - Employer Contributions
   - Monthly & Annual CTC
   - Net Take Home

See `CTC_BREAKDOWN_CALCULATOR.md` for complete details.

---

## ✅ Status

- ✅ Service deployed
- ✅ MongoDB connection fixed
- ✅ Service port configured
- ✅ Ingress routing configured
- ✅ Health check endpoint working
- ✅ Salary calculation endpoints available

**Payroll Service is LIVE!** 🎉

---

## 🔗 Related Files

- `k8s/etelios-prod/payroll-service-deployment.yaml`
- `microservices/payroll-service/src/server.js`
- `microservices/payroll-service/src/services/salary.service.js`
- `CTC_BREAKDOWN_CALCULATOR.md`
