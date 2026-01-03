# Real Admin User Created Successfully

**Date**: 2026-01-02  
**Status**: ✅ **Success**

---

## 👤 Admin User Details

### Credentials
- **Email**: `admin@etelios.com`
- **Password**: `Admin@123456`
- **Employee ID**: `ADMIN-001`
- **Role**: `admin`
- **User ID**: `6957c0f2225ae3aa15970e8a`

### User Information
- **Name**: System Administrator
- **Department**: TECH
- **Designation**: System Administrator
- **Band Level**: A
- **Hierarchy Level**: NATIONAL
- **Status**: Active

---

## 🔑 Bearer Token

### Access Token
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTU3YzBmMjIyNWFlM2FhMTU5NzBlOGEiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjczNTg3MDYsImV4cCI6MTc2NzM1OTYwNiwiYXVkIjoiaHJtcy1mcm9udGVuZCIsImlzcyI6ImhybXMtYmFja2VuZCJ9.BU1o7Y0HoignBKKf_wt4FKI6RvK0A5sQtbHPiIdxCBA
```

### Refresh Token
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTU3YzBmMjIyNWFlM2FhMTU5NzBlOGEiLCJpYXQiOjE3NjczNTg3MDYsImV4cCI6MTc2Nzk2MzUwNiwiYXVkIjoiaHJtcy1mcm9udGVuZCIsImlzcyI6ImhybXMtYmFja2VuZCJ9.5SZkj1xQ_sMcpf08ENze2l7-5rv8eCHah-jZcZ-ipSo
```

### Token Expiry
- **Access Token**: 15 minutes (default)
- **Refresh Token**: 7 days (default)

---

## 📋 Usage

### API Request Headers
```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTU3YzBmMjIyNWFlM2FhMTU5NzBlOGEiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjczNTg3MDYsImV4cCI6MTc2NzM1OTYwNiwiYXVkIjoiaHJtcy1mcm9udGVuZCIsImlzcyI6ImhybXMtYmFja2VuZCJ9.BU1o7Y0HoignBKKf_wt4FKI6RvK0A5sQtbHPiIdxCBA
Host: api.etelios.com
Content-Type: application/json
```

### Example API Calls

#### 1. Get User Profile
```bash
curl -k -X GET "https://98.70.245.87/api/auth/profile" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <TOKEN>"
```

#### 2. Create Employee
```bash
curl -k -X POST "https://98.70.245.87/api/hr/employees" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@etelios.com",
    "phone": "+919999999999",
    "department": "SALES",
    "designation": "Sales Executive",
    "joiningDate": "2026-01-02T00:00:00.000Z",
    "role": "employee"
  }'
```

#### 3. Get Employees List
```bash
curl -k -X GET "https://98.70.245.87/api/hr/employees?page=1&limit=10" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <TOKEN>"
```

#### 4. Update Employee
```bash
curl -k -X PUT "https://98.70.245.87/api/hr/employees/<EMPLOYEE_ID>" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "designation": "Senior Sales Executive"
  }'
```

#### 5. Get Employee by ID
```bash
curl -k -X GET "https://98.70.245.87/api/hr/employees/<EMPLOYEE_ID>" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <TOKEN>"
```

---

## ✅ Permissions

The admin user has the following permissions:

### User Management
- `read_users`, `write_users`, `delete_users`, `create_users`, `update_users`
- `activate_users`, `deactivate_users`

### Attendance Management
- `read_attendance`, `write_attendance`, `approve_attendance`
- `create_attendance`, `update_attendance`, `delete_attendance`

### Reports
- `read_reports`, `write_reports`, `export_reports`
- `create_reports`, `update_reports`, `delete_reports`

### Asset Management
- `read_assets`, `write_assets`, `assign_assets`
- `create_assets`, `update_assets`, `delete_assets`

### Document Management
- `read_documents`, `write_documents`, `delete_documents`
- `upload_documents`, `download_documents`, `update_documents`

### Transfer Management
- `read_transfers`, `write_transfers`, `approve_transfers`
- `create_transfers`, `update_transfers`, `delete_transfers`

### Store Management
- `read_stores`, `write_stores`, `create_stores`, `update_stores`

### Role Management
- `read_roles`, `write_roles`, `create_roles`, `update_roles`

### System Administration
- `system_admin`, `audit_logs`, `backup_restore`

### Dashboard Permissions
- `view_dashboard`, `manage_dashboard`, `view_all_widgets`, `manage_widgets`
- `view_attendance_summary`, `view_employee_count`, `view_asset_summary`
- `view_transfer_requests`, `view_document_status`, `view_store_performance`
- `view_attendance_chart`, `view_employee_chart`, `view_asset_chart`
- `view_transfer_chart`, `view_document_chart`, `view_store_chart`
- `view_recent_activities`, `view_pending_approvals`, `view_system_alerts`
- `view_attendance_trends`, `view_employee_trends`, `view_asset_trends`
- `view_compliance_status`, `view_audit_logs`, `view_system_metrics`

---

## 📁 Token File

The token has been saved to:
```
scripts/admin-token.json
```

### File Contents
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6957c0f2225ae3aa15970e8a",
    "email": "admin@etelios.com",
    "employee_id": "ADMIN-001",
    "name": "System Administrator",
    "role": "admin"
  },
  "createdAt": "2026-01-02T..."
}
```

---

## 🔄 Token Refresh

If the access token expires, use the refresh token to get a new access token:

```bash
curl -k -X POST "https://98.70.245.87/api/auth/refresh-token" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<REFRESH_TOKEN>"
  }'
```

---

## 🧪 Testing

### Test Script
Run the test script to verify all APIs work:
```bash
node scripts/test-admin-token.js
```

### Manual Testing
1. Use the bearer token in API requests
2. Test GET, POST, PUT, PATCH, DELETE endpoints
3. Verify all HR, Attendance, and other service APIs work

---

## ⚠️ Important Notes

1. **Database**: User is created in `auth-db` database
2. **Token Expiry**: Access token expires in 15 minutes (default)
3. **Security**: Keep the token secure and do not commit it to version control
4. **Production**: This token works on production environment (`https://98.70.245.87`)
5. **Permissions**: Admin role has full access to all APIs

---

## ✅ Status

- ✅ Admin user created in database
- ✅ Admin role created with all permissions
- ✅ Bearer token generated
- ✅ Token saved to file
- ✅ Ready for API testing

---

**Next Steps**:
1. Test the token with all API endpoints
2. Verify employee creation works
3. Test GET, PUT, POST, PATCH, DELETE operations
4. Confirm all HRMS services are accessible

---

**Created By**: `scripts/create-real-admin.js`  
**Database**: `auth-db`  
**Environment**: Production

