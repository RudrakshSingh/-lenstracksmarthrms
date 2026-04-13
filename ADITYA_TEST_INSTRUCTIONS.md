# 🧪 Aditya Account - Sales System Test Instructions

**Account:** Aditya (Employee)  
**Email:** Aditya@gmail.com  
**Password:** yrv0s48mA1!  
**Tenant:** eyekra

---

## 🚀 Quick Test

### Option 1: Run Test Script

```bash
cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms
./scripts/test-aditya-sales-manual.sh
```

### Option 2: Manual Testing with cURL

#### 1. Login
```bash
curl -X POST https://api.etelios.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: eyekra" \
  -d '{"email":"Aditya@gmail.com","password":"yrv0s48mA1!"}'
```

**Save the token from response:**
```bash
TOKEN="<your_token_here>"
```

#### 2. Clock In
```bash
curl -X POST https://api.etelios.com/api/attendance/clock-in \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: eyekra" \
  -d '{"latitude":19.0760,"longitude":72.8777,"notes":"Test sales"}'
```

#### 3. Add Sales Entry
```bash
curl -X POST https://api.etelios.com/api/sales/daily-entry \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: eyekra" \
  -d '{
    "customer_name": "Test Customer",
    "customer_phone": "+911234567890",
    "items": [{
      "product_name": "Test Product",
      "quantity": 1,
      "unit_price": 5000
    }],
    "store_id": "<store_id_from_user_object>",
    "payment_method": "CASH"
  }'
```

**Note:** Get `store_id` from user object after login or from dashboard.

#### 4. Get Today Sales
```bash
curl -X GET https://api.etelios.com/api/sales/employee/today \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: eyekra"
```

#### 5. End Day
```bash
curl -X POST https://api.etelios.com/api/sales/employee/end-day \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: eyekra"
```

#### 6. Clock Out
```bash
curl -X POST https://api.etelios.com/api/attendance/clock-out \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: eyekra" \
  -d '{"latitude":19.0760,"longitude":72.8777,"notes":"End of day"}'
```

#### 7. Check Dashboard
```bash
curl -X GET https://api.etelios.com/api/hr/dashboard \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: eyekra"
```

**Check for:**
- `widgets.sales.today.totalSales`
- `widgets.sales.orders`

---

## ✅ Expected Results

### 1. Login
- ✅ Should return token
- ✅ Should return user object with employee details

### 2. Clock In
- ✅ Should clock in successfully
- ✅ Should return attendance record

### 3. Sales Entry
- ✅ Should return `success: true`
- ✅ Should return `order_number` and `total_amount`
- ✅ Should save to database

### 4. Get Today Sales
- ✅ Should return total sales, orders, items
- ✅ Should return array of today's orders

### 5. End Day
- ✅ Should return sales summary
- ✅ Should push sales to dashboard

### 6. Clock Out
- ✅ Should clock out successfully
- ✅ Should auto-calculate sales (check logs)

### 7. Dashboard
- ✅ Should show `widgets.sales` with today's data
- ✅ Should show sales summary

---

## 🔍 Verification

### Check Sales Auto-Calculation

After clock-out, check attendance service logs:

```bash
kubectl logs -n etelios-prod attendance-service-647b75469b-5glj4 | grep -i sales
```

Look for:
- "Sales auto-calculated and pushed to dashboard"
- "Sales auto-calculated on clock-out"

### Check Dashboard

Verify dashboard shows sales:
- Employee dashboard: `widgets.sales.today.totalSales`
- Admin/HR dashboard: `widgets.employeeSales.summary`

---

## 📝 Notes

1. **Store ID:** You may need to get store_id from user object after login
2. **Multiple Entries:** Can add multiple sales entries during the day
3. **Auto Calculation:** Sales auto-calculate on clock-out (not on geofence violation)

---

## 🐛 Troubleshooting

### Login Fails
- Check email/password
- Check tenant ID
- Verify account is active

### Sales Entry Fails
- Check store_id is valid
- Check all required fields
- Verify employee is clocked in (optional - not required)

### Dashboard Empty
- Check sales were added today
- Verify dashboard endpoint returns data
- Check HR service logs

---

**Status:** Ready for Testing
