# Lenstrack Tenant - Admin Credentials

## Tenant Information

- **Tenant ID**: `lenstrack`
- **Domain**: `lenstrack`
- **Base URL**: `https://98.70.245.87`
- **Tenant Header**: `X-Tenant-Id: lenstrack`

---

## Admin User Credentials

### Admin User
- **Email**: `admin@lenstrack.etelios.com`
- **Password**: `Lenstrack@Admin123` ✅ (Changed from temporary password)
- **Role**: `admin`
- **Employee ID**: `ADMIN-LENSTRACK-001`
- **Status**: Active

### Super Admin User
- **Email**: `superadmin@lenstrack.etelios.com`
- **Password**: `9J4s#cHfcsoG` ⚠️ (Temporary password - needs to be changed)
- **Role**: `superadmin`
- **Employee ID**: `SUPERADMIN-LENSTRACK-001`
- **Status**: Active

---

## Login Instructions

### For Admin User

1. **Endpoint**: `POST /api/auth/login`
2. **Headers**:
   ```json
   {
     "Content-Type": "application/json",
     "Host": "api.etelios.com",
     "X-Tenant-Id": "lenstrack"
   }
   ```
3. **Request Body**:
   ```json
   {
     "emailOrEmployeeId": "admin@lenstrack.etelios.com",
     "password": "Lenstrack@Admin123"
   }
   ```

### For Super Admin User

1. **Endpoint**: `POST /api/auth/login`
2. **Headers**:
   ```json
   {
     "Content-Type": "application/json",
     "Host": "api.etelios.com",
     "X-Tenant-Id": "lenstrack"
   }
   ```
3. **Request Body**:
   ```json
   {
     "emailOrEmployeeId": "superadmin@lenstrack.etelios.com",
     "password": "9J4s#cHfcsoG"
   }
   ```
4. **⚠️ Important**: Super Admin will be required to change password on first login.

---

## Change Password (First Login)

If you need to change the Super Admin password:

1. **Login** with temporary password
2. **Endpoint**: `POST /api/auth/change-password`
3. **Headers**:
   ```json
   {
     "Content-Type": "application/json",
     "Host": "api.etelios.com",
     "Authorization": "Bearer <token>",
     "X-Tenant-Id": "lenstrack"
   }
   ```
4. **Request Body**:
   ```json
   {
     "currentPassword": "9J4s#cHfcsoG",
     "newPassword": "YourNewPassword@123"
   }
   ```

---

## Quick Test

You can test the credentials using the test script:

```bash
node test-complete-lenstrack-flow.js
```

Or manually:

```bash
curl -X POST https://98.70.245.87/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Host: api.etelios.com" \
  -H "X-Tenant-Id: lenstrack" \
  -d '{
    "emailOrEmployeeId": "admin@lenstrack.etelios.com",
    "password": "Lenstrack@Admin123"
  }'
```

---

## Notes

- ✅ **Admin password has been changed** from temporary to `Lenstrack@Admin123`
- ⚠️ **Super Admin password is still temporary** and needs to be changed on first login
- Both users are active and ready to use
- All credentials are for **Production environment** (`https://98.70.245.87`)

---

**Last Updated**: January 19, 2026  
**Status**: Active
