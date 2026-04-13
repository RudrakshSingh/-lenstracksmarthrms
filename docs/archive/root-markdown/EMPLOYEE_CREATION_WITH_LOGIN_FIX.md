# Employee Creation with Login Fix

## Issue
Employee creation script was not creating auth accounts, so employees couldn't login. Also, `designation` field was required but not always provided.

## Fixes Applied

### 1. Auth Service - Designation Field
**File:** `microservices/auth-service/src/services/auth.service.js`

- Added default value for `designation` if not provided
- Defaults to role name (e.g., "Employee" for employee role)
- Ensures all required User model fields are set

### 2. HR Service - Designation Auto-Set
**File:** `microservices/hr-service/src/services/hr.service.js`

- Added logic to auto-set `designation` if not provided
- Uses `jobTitle` if available, otherwise defaults based on role
- Ensures employee creation always includes designation

### 3. Test Script - Auth Account Creation
**File:** `test-create-employee-and-attendance.sh`

- Added step to create auth account after HR employee creation
- Ensures employee can login immediately after creation
- Handles case where auth account already exists

## Changes Made

### Auth Service Register Function
```javascript
designation: designation ? designation.trim() : 
  (normalizedRole === 'employee' ? 'Employee' : 
   normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1))
```

### HR Service Create Employee
```javascript
// Ensure designation exists (required by User model)
if (!userData.designation && !userData.jobTitle) {
  const roleName = role?.name || normalizedRole || 'employee';
  userData.designation = roleName.charAt(0).toUpperCase() + roleName.slice(1);
} else if (!userData.designation && userData.jobTitle) {
  userData.designation = userData.jobTitle;
}
```

### Test Script Flow
1. Admin login
2. Get store and department
3. Create employee in HR service
4. **NEW:** Create auth account for login
5. Employee login
6. Mark attendance
7. Verify in dashboard

## Deployment

### Deploy Auth Service
```bash
./deploy-auth-register-fix.sh
```

### Deploy HR Service
```bash
# Build and push HR service
AWS_REGION="ap-south-1"
ECR_REGISTRY="383234048604.dkr.ecr.ap-south-1.amazonaws.com"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"
SERVICE="hr-service"
IMAGE_NAME="$ECR_REGISTRY/etelios-$SERVICE:latest"

aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
docker buildx build --platform linux/amd64 \
  --file "microservices/$SERVICE/Dockerfile" \
  --tag "$IMAGE_NAME" \
  --push .

aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME
kubectl set image deployment/$SERVICE $SERVICE=$IMAGE_NAME -n $NAMESPACE
kubectl rollout restart deployment/$SERVICE -n $NAMESPACE
kubectl rollout status deployment/$SERVICE -n $NAMESPACE --timeout=120s
```

## Testing

After deployment, test the complete flow:
```bash
./test-create-employee-and-attendance.sh
```

Expected result:
- ✅ Employee created in HR service
- ✅ Auth account created
- ✅ Employee can login
- ✅ Attendance can be marked
- ✅ Dashboard shows attendance

## Employee Creation Request Body

The script now includes all required fields:
```json
{
  "firstName": "Test",
  "lastName": "Employee",
  "fullName": "Test Employee",
  "email": "test@example.com",
  "phone": "+919876543210",
  "employeeId": "EMP-TEST-123",
  "department": "Engineering",
  "jobTitle": "Software Engineer",
  "designation": "Software Engineer",  // Required
  "roleName": "employee",
  "storeId": "store-id",
  "doj": "2026-02-20",
  "password": "Employee@123",
  "annual_ctc": 500000,
  "roleFamily": "Engineering",
  "gradeBand": "E"
}
```

## Notes

- `designation` is now required by User model in auth service
- HR service auto-sets designation if not provided
- Auth account is created automatically after HR employee creation
- Employee can login immediately after creation
- All onboarding flow requirements are met
