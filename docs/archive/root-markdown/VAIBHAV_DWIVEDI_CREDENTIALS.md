# Vaibhav Dwivedi - Employee Credentials

## 👤 Employee Information

**Name**: Vaibhav Dwivedi  
**Employee ID**: `VAIBHAV-218926`  
**Email**: `vaibhav.dwivedi@upcapto.com`  
**Password**: `Vaibhav@123`  
**Tenant**: `upcapto`  
**Role**: `employee`  
**Department**: Sales  
**Designation**: Sales Executive  
**Status**: Active  

---

## 🔐 Login Credentials

```
Email:    vaibhav.dwivedi@upcapto.com
Password: Vaibhav@123
Tenant:   upcapto
```

---

## 🧪 Test Login

```bash
curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vaibhav.dwivedi@upcapto.com",
    "password": "Vaibhav@123"
  }'
```

---

## 📅 Attendance Status

✅ **Clock-In**: Completed  
📊 **Attendance Record**: Created  

---

## 🧪 Test Clock-In

```bash
TOKEN="<token-from-login>"

curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/clock-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 19.0760,
    "longitude": 72.8777,
    "notes": "Clock-in from office"
  }'
```

---

## 📊 Get Attendance Records

```bash
TOKEN="<token-from-login>"

curl -X GET "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance?date=2026-02-15" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto"
```

---

**Last Updated**: 2026-02-15  
**Status**: ✅ Employee created, auth user created, and attendance marked

---

## ✅ Setup Complete!

**Employee**: Vaibhav Dwivedi  
**Employee ID**: VAIBHAV-218926  
**Email**: vaibhav.dwivedi@upcapto.com  
**Password**: Vaibhav@123  
**Login**: ✅ Working  
**Attendance**: ✅ Marked
