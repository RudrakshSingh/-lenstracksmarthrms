# Update Riyaz Employee Data

**Date:** March 8, 2026  
**Employee:** Riyaz (EMP-2026-828544)  
**Issue:** Salary, statutory info, bank account, and emergency contact showing as 0/N/A

---

## 📝 Steps to Update

### 1. Edit the Script

Open `scripts/update-riyaz-data.js` and fill in the actual values in the `RIYAZ_DATA` object:

```javascript
const RIYAZ_DATA = {
  employeeId: 'EMP-2026-828544',
  
  // Salary & Compensation
  annual_ctc: 300000, // Fill actual annual CTC (e.g., 300000 for ₹3L)
  salary_breakdown: {
    basic: 150000, // Fill actual basic salary
    hra: 75000, // Fill actual HRA
    special_allowance: 50000, // Fill actual special allowance
    pf_employer: 1800, // Fill actual PF employer contribution
    gratuity: 2308, // Fill actual gratuity
    other_allowances: 0 // Fill actual other allowances
  },
  
  // Statutory Information
  uan: '123456789012', // Fill actual UAN (12 digits)
  esiNo: '123456789012345', // Fill actual ESI number (15 digits)
  panNumber: 'ABCDE1234F', // Fill actual PAN (format: ABCDE1234F)
  aadharMasked: 'XXXX XXXX 1234', // Fill actual Aadhar (masked)
  
  // Bank Account
  bankAccount: {
    account_number: '1234567890', // Fill actual account number
    ifsc_code: 'HDFC0001234', // Fill actual IFSC (format: HDFC0001234)
    bank_name: 'HDFC Bank', // Fill actual bank name
    account_type: 'Savings' // Options: 'Savings', 'Current', 'Salary'
  },
  
  // Emergency Contact
  emergencyContact: {
    name: 'John Doe', // Fill actual emergency contact name
    relationship: 'Father', // Options: 'Father', 'Mother', 'Spouse', 'Sibling', 'Child', 'Friend', 'Other'
    phone: '9876543210' // Fill actual emergency contact phone
  }
};
```

### 2. Run the Script

```bash
cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms
node scripts/update-riyaz-data.js
```

---

## 🔄 What the Script Does

1. **Login** as admin@upcapto.com
2. **Update Salary/Compensation** via `PUT /api/hr/employees/:id`
   - Updates `annual_ctc`
   - Updates `salary_breakdown`
3. **Update Statutory Information** via `PATCH /api/hr/employees/:id/statutory`
   - Updates `uan`
   - Updates `esiNo`
   - Updates `panNumber`
   - Updates `bankAccount`
4. **Update Emergency Contact** via `PUT /api/hr/employees/:id`
   - Updates `emergencyContact`
5. **Verify** the updated data

---

## 📋 API Endpoints Used

### 1. Update Employee (Salary/Compensation)
```
PUT /api/hr/employees/:employeeId
Headers:
  Authorization: Bearer <token>
  X-Tenant-Id: upcapto
Body:
{
  "annual_ctc": 300000,
  "salary_breakdown": {
    "basic": 150000,
    "hra": 75000,
    "special_allowance": 50000,
    "pf_employer": 1800,
    "gratuity": 2308,
    "other_allowances": 0
  }
}
```

### 2. Update Statutory Information
```
PATCH /api/hr/employees/:employeeId/statutory
Headers:
  Authorization: Bearer <token>
  X-Tenant-Id: upcapto
Body:
{
  "bankAccount": {
    "account_number": "1234567890",
    "ifsc_code": "HDFC0001234",
    "bank_name": "HDFC Bank",
    "account_type": "Savings"
  },
  "uan": "123456789012",
  "esiNo": "123456789012345",
  "panNumber": "ABCDE1234F"
}
```

### 3. Update Emergency Contact
```
PUT /api/hr/employees/:employeeId
Headers:
  Authorization: Bearer <token>
  X-Tenant-Id: upcapto
Body:
{
  "emergencyContact": {
    "name": "John Doe",
    "relationship": "Father",
    "phone": "9876543210"
  }
}
```

---

## ✅ Expected Result

After running the script with actual values:
- ✅ `annual_ctc` will show actual salary (not 0)
- ✅ `salary_breakdown` will show actual breakdown
- ✅ `uan` will show actual UAN (not N/A)
- ✅ `esiNo` will show actual ESI (not N/A)
- ✅ `panNumber` will show actual PAN (not N/A)
- ✅ `bankAccount` will show actual bank details
- ✅ `emergencyContact` will show actual contact info

---

## ⚠️ Important Notes

1. **Fill Actual Values**: The script will skip updates if values are 0 or empty
2. **Validation**: 
   - UAN must be 12 digits
   - ESI must be 15 digits
   - PAN must be in format ABCDE1234F
   - IFSC must be in format HDFC0001234
3. **Tenant Isolation**: All updates are scoped to 'upcapto' tenant
4. **Error Handling**: Script will show detailed errors if any update fails

---

**Last Updated:** March 8, 2026
