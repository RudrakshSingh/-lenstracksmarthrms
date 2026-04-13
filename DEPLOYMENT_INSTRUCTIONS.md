# Deployment Instructions - All Fixes

## ✅ All Fixes Completed

### 1. Sales Validation ✅
- ✅ Allow 0 and positive values
- ✅ Reject negative values
- ✅ Updated model schema (quantity min: 0)

### 2. Attendance JWT Fix ✅
- ✅ Added issuer/audience fallback
- ✅ Multiple secret support

### 3. Sales Proxy Route ✅
- ✅ Added `/api/sales/*` proxy in HR service

### 4. Dashboard Sales Integration ✅
- ✅ Sales data in admin/HR dashboard
- ✅ Employee-wise sales grouping

## 🚀 Manual Deployment Steps

### Step 1: Build and Push HR Service
```bash
cd microservices/hr-service
docker buildx build --platform linux/amd64 -t etelios-hr-service:latest -f Dockerfile --load ../../
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin etelios.dkr.ecr.ap-south-1.amazonaws.com
docker tag etelios-hr-service:latest etelios.dkr.ecr.ap-south-1.amazonaws.com/etelios-hr-service:latest
docker push etelios.dkr.ecr.ap-south-1.amazonaws.com/etelios-hr-service:latest
kubectl set image deployment/hr-service hr-service=etelios.dkr.ecr.ap-south-1.amazonaws.com/etelios-hr-service:latest -n etelios-prod
kubectl rollout status deployment/hr-service -n etelios-prod --timeout=300s
```

### Step 2: Build and Push Attendance Service
```bash
cd microservices/attendance-service
docker buildx build --platform linux/amd64 -t etelios-attendance-service:latest -f Dockerfile --load ../../
docker tag etelios-attendance-service:latest etelios.dkr.ecr.ap-south-1.amazonaws.com/etelios-attendance-service:latest
docker push etelios.dkr.ecr.ap-south-1.amazonaws.com/etelios-attendance-service:latest
kubectl set image deployment/attendance-service attendance-service=etelios.dkr.ecr.ap-south-1.amazonaws.com/etelios-attendance-service:latest -n etelios-prod
kubectl rollout status deployment/attendance-service -n etelios-prod --timeout=300s
```

### Step 3: Build and Push Sales Service
```bash
cd microservices/sales-service
docker buildx build --platform linux/amd64 -t etelios-sales-service:latest -f Dockerfile --load ../../
docker tag etelios-sales-service:latest etelios.dkr.ecr.ap-south-1.amazonaws.com/etelios-sales-service:latest
docker push etelios.dkr.ecr.ap-south-1.amazonaws.com/etelios-sales-service:latest
kubectl set image deployment/sales-service sales-service=etelios.dkr.ecr.ap-south-1.amazonaws.com/etelios-sales-service:latest -n etelios-prod
kubectl rollout status deployment/sales-service -n etelios-prod --timeout=300s
```

## 🧪 Testing After Deployment

### Test All APIs
```bash
BASE_URL=http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com \
EMPLOYEE_PASSWORD=Employee123! \
node scripts/test-all-tenant-apis.js
```

### Test Sales Validation
```bash
# Test with ₹0
curl -X POST http://<BASE_URL>/api/sales/manual-entry \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: lenstrack" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Test",
    "items": [{"product_name": "Test", "quantity": 1, "unit_price": 0}],
    "store_id": "...",
    "payment_method": "CASH"
  }'

# Test with ₹30,000
curl -X POST http://<BASE_URL>/api/sales/manual-entry \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: lenstrack" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Test",
    "items": [{"product_name": "Test", "quantity": 1, "unit_price": 30000}],
    "store_id": "...",
    "payment_method": "CASH"
  }'

# Test with negative (should fail)
curl -X POST http://<BASE_URL>/api/sales/manual-entry \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: lenstrack" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Test",
    "items": [{"product_name": "Test", "quantity": 1, "unit_price": -100}],
    "store_id": "...",
    "payment_method": "CASH"
  }'
```

## 📋 Files Changed

1. `microservices/sales-service/src/services/salesService.js` - Validation updates
2. `microservices/sales-service/src/models/SalesOrder.model.js` - Schema update
3. `microservices/hr-service/src/server.js` - Sales proxy route
4. `microservices/hr-service/src/services/dashboard.service.js` - Sales integration
5. `microservices/attendance-service/src/middleware/auth.middleware.js` - JWT fix

## ✅ Expected Results

After deployment:
- ✅ Sales entry with ₹0 works
- ✅ Sales entry with ₹30,000 works
- ✅ Sales entry with negative amount is rejected
- ✅ Attendance APIs work with JWT tokens
- ✅ Dashboard shows sales data
- ✅ Admin/HR dashboard shows employee sales
