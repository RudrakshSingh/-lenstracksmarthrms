# Auth Service Register API Fix

## Issue
Register API was returning 500 Internal Server Error when trying to create auth account for employee.

## Root Cause
The User model requires these fields:
- `department` - must be one of: ['SALES', 'TECH', 'ACCOUNTS', 'ECOMMERCE', 'FRANCHISE', 'LAB', 'DELIVERY', 'HR']
- `band_level` - required (default: 'F')
- `hierarchy_level` - required (default: 'STORE')

But the `register` function in `auth.service.js` was not setting these required fields, causing validation errors when saving the user.

## Fix Applied
Updated `microservices/auth-service/src/services/auth.service.js`:

1. **Added validation** for required fields (employee_id, name, email, password)
2. **Added default values** for required User model fields:
   - `department`: Defaults to 'HR' if not provided
   - `band_level`: Defaults to 'F' if not provided
   - `hierarchy_level`: Defaults to 'STORE' if not provided
3. **Improved error handling** with proper field normalization

## Changes Made

### 1. Added Required Field Validation
```javascript
// Validate required fields
if (!employee_id) {
  throw new Error('Employee ID is required');
}
if (!name) {
  throw new Error('Name is required');
}
if (!email) {
  throw new Error('Email is required');
}
if (!password) {
  throw new Error('Password is required');
}
```

### 2. Added Default Values for User Model
```javascript
// Handle required fields for User model
const userDepartment = department ? department.toUpperCase() : 'HR';
const validDepartments = ['SALES', 'TECH', 'ACCOUNTS', 'ECOMMERCE', 'FRANCHISE', 'LAB', 'DELIVERY', 'HR'];
const finalDepartment = validDepartments.includes(userDepartment) ? userDepartment : 'HR';

const user = new User({
  // ... other fields
  department: finalDepartment, // Required field with valid enum value
  band_level: userData.band_level || 'F', // Required field with default
  hierarchy_level: userData.hierarchy_level || 'STORE', // Required field with default
  // ... other fields
});
```

## Deployment

Run the deployment script:
```bash
./deploy-auth-register-fix.sh
```

Or manually:
```bash
# Build and push image
docker buildx build --platform linux/amd64 \
  --file microservices/auth-service/Dockerfile \
  --tag 383234048604.dkr.ecr.ap-south-1.amazonaws.com/etelios-auth-service:latest \
  --push .

# Deploy to Kubernetes
aws eks update-kubeconfig --region ap-south-1 --name etelios-prod-v2
kubectl set image deployment/auth-service auth-service=383234048604.dkr.ecr.ap-south-1.amazonaws.com/etelios-auth-service:latest -n default
kubectl rollout status deployment/auth-service -n default --timeout=120s
```

## Testing

After deployment, test the register API:
```bash
API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
TOKEN=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"Admin@lenstrack.com","password":"Kadarkhan@123"}' \
  | jq -r '.data.accessToken')

# Register new user
curl -X POST "$API_BASE/api/auth/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "yuvraj.chuchi@gmail.com",
    "password": "Yuvraj@123",
    "employee_id": "EMP-2026-",
    "name": "yuvraj muthmare",
    "phone": "+919999999999",
    "role": "employee"
  }'
```

## Expected Result
- Register API should return 201 Created with user data
- User should be able to login with the provided credentials
- All required User model fields should be set correctly
