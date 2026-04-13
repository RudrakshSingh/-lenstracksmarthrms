# CTC Breakdown Calculator - Documentation

## ✅ Yes, Compensation Breakdown Calculator Exists!

The codebase has a **compensation breakdown calculator**, but it currently takes **gross monthly salary** as input, not CTC directly.

---

## 📋 Current Implementation

### Location
- **Service:** `microservices/payroll-service/src/services/salary.service.js`
- **Model:** `microservices/payroll-service/src/models/Salary.model.js`
- **Controller:** `microservices/payroll-service/src/controllers/salaryController.js`
- **Routes:** `microservices/payroll-service/src/routes/salary.routes.js`

### Current Flow
```
Input: gross_monthly → Calculate Breakdown → Output: CTC + Components
```

### API Endpoint
```
POST /api/payroll/salary/calculate
```

---

## 🔧 How It Works (Current)

### Input
```json
{
  "employee_id": "EMP001",
  "gross_monthly": 50000,
  "variable_incentive": 5000,
  "professional_tax": 200,
  "tds": 0
}
```

### Calculation Logic
```javascript
// 1. Basic Salary (50% of gross)
basicSalary = grossMonthly * 0.5

// 2. HRA (50% of basic)
hra = basicSalary * 0.5

// 3. Special Allowance (remaining)
specialAllowance = grossMonthly - basicSalary - hra

// 4. EPF (12% of basic, capped at ₹1,800)
epfEmployee = Math.min(basicSalary * 0.12, 1800)
epfEmployer = Math.min(basicSalary * 0.12, 1800)

// 5. ESIC (only if gross <= ₹21,000)
esicEmployee = grossMonthly <= 21000 ? grossMonthly * 0.0075 : 0
esicEmployer = grossMonthly <= 21000 ? grossMonthly * 0.0325 : 0

// 6. Gratuity (4.81% of basic)
gratuity = basicSalary * 0.0481

// 7. Employer Contributions
employerContributions = epfEmployer + esicEmployer + gratuity

// 8. CTC Calculation
monthlyCTC = grossMonthly + employerContributions
annualCTC = monthlyCTC * 12
```

### Output
```json
{
  "success": true,
  "data": {
    "employee_id": "EMP001",
    "gross_monthly": 50000,
    "basic_salary": 25000,
    "hra": 12500,
    "special_allowance": 12500,
    "total_earnings": 55000,
    "epf_employee": 1800,
    "esic_employee": 0,
    "professional_tax": 200,
    "tds": 0,
    "total_deductions": 2000,
    "net_take_home": 48000,
    "epf_employer": 1800,
    "esic_employer": 0,
    "gratuity": 1202.5,
    "employer_contributions": 3002.5,
    "monthly_ctc": 53002.5,
    "annual_ctc": 636030
  }
}
```

---

## ❌ What's Missing: CTC-to-Breakdown Calculator

**Current:** `gross_monthly` → breakdown → CTC  
**Needed:** `annual_ctc` → breakdown → components

### Reverse Calculation Needed

To calculate breakdown from CTC, we need to reverse the formula:

```javascript
// Given: annualCTC
// Find: grossMonthly, then calculate breakdown

// Step 1: Calculate monthly CTC
monthlyCTC = annualCTC / 12

// Step 2: Reverse calculate gross monthly
// monthlyCTC = grossMonthly + employerContributions
// employerContributions = epfEmployer + esicEmployer + gratuity
// epfEmployer = min(basic * 0.12, 1800)
// esicEmployer = grossMonthly <= 21000 ? grossMonthly * 0.0325 : 0
// gratuity = basic * 0.0481
// basic = grossMonthly * 0.5

// This requires iterative calculation or approximation
```

---

## 💡 Solution: Add CTC-to-Breakdown Function

### Proposed Function

```javascript
/**
 * Calculate salary breakdown from Annual CTC
 * @param {number} annualCTC - Annual Cost to Company
 * @param {number} variableIncentive - Variable incentive (optional)
 * @param {number} professionalTax - Professional tax (optional)
 * @param {number} tds - TDS (optional)
 * @returns {object} Salary breakdown
 */
static calculateFromCTC(annualCTC, variableIncentive = 0, professionalTax = 0, tds = 0) {
  // Step 1: Approximate gross monthly from CTC
  // CTC = Gross + Employer Contributions
  // Employer Contributions ≈ 15-20% of gross (EPF + ESIC + Gratuity)
  // So: CTC ≈ Gross * 1.15 to 1.20
  
  const monthlyCTC = annualCTC / 12;
  
  // Approximation: Assume employer contributions are ~15% of gross
  // monthlyCTC = grossMonthly * 1.15
  // grossMonthly = monthlyCTC / 1.15
  let grossMonthly = monthlyCTC / 1.15;
  
  // Iterative refinement to get exact match
  let iterations = 0;
  let calculatedCTC = 0;
  
  while (Math.abs(calculatedCTC - monthlyCTC) > 1 && iterations < 10) {
    const basicSalary = grossMonthly * 0.5;
    const epfEmployer = Math.min(basicSalary * 0.12, 1800);
    const esicEmployer = grossMonthly <= 21000 ? grossMonthly * 0.0325 : 0;
    const gratuity = basicSalary * 0.0481;
    const employerContributions = epfEmployer + esicEmployer + gratuity;
    calculatedCTC = grossMonthly + employerContributions;
    
    // Adjust gross monthly
    const difference = monthlyCTC - calculatedCTC;
    grossMonthly += difference * 0.9; // Damping factor
    iterations++;
  }
  
  // Now calculate breakdown using the refined grossMonthly
  return this.calculateSalaryComponents(grossMonthly, variableIncentive, professionalTax, tds);
}
```

---

## 🚀 API Endpoints Available

### 1. Calculate Salary (from gross_monthly)
```
POST /api/payroll/salary/calculate
```

**Request:**
```json
{
  "employee_id": "EMP001",
  "gross_monthly": 50000,
  "variable_incentive": 5000,
  "professional_tax": 200,
  "tds": 0
}
```

### 2. Get Current Salary
```
GET /api/payroll/salary/employee/:employeeId
```

### 3. Get Salary History
```
GET /api/payroll/salary/employee/:employeeId/history
```

### 4. Update Salary
```
PUT /api/payroll/salary/employee/:employeeId
```

### 5. Payroll Summary
```
GET /api/payroll/salary/payroll-summary
```

### 6. Bulk Calculate
```
POST /api/payroll/salary/bulk-calculate
```

---

## 📊 Breakdown Components

### Earnings
- **Basic Salary** (50% of gross)
- **HRA** (50% of basic)
- **Special Allowance** (remaining)
- **Variable Incentive** (optional)

### Employee Deductions
- **EPF** (12% of basic, max ₹1,800)
- **ESIC** (0.75% if gross ≤ ₹21,000)
- **Professional Tax** (varies by state)
- **TDS** (tax deducted at source)

### Employer Contributions
- **EPF Employer** (12% of basic, max ₹1,800)
- **ESIC Employer** (3.25% if gross ≤ ₹21,000)
- **Gratuity** (4.81% of basic)

### Final Values
- **Net Take Home** = Gross - Deductions
- **Monthly CTC** = Gross + Employer Contributions
- **Annual CTC** = Monthly CTC × 12

---

## 🧪 Example Calculation

### Input: Annual CTC = ₹6,00,000

**Step 1: Calculate Monthly CTC**
```
Monthly CTC = 6,00,000 / 12 = ₹50,000
```

**Step 2: Reverse Calculate Gross Monthly**
```
Approximate Gross = 50,000 / 1.15 ≈ ₹43,478
```

**Step 3: Calculate Breakdown**
```
Basic = 43,478 × 0.5 = ₹21,739
HRA = 21,739 × 0.5 = ₹10,870
Special Allowance = 43,478 - 21,739 - 10,870 = ₹10,869

EPF Employee = min(21,739 × 0.12, 1800) = ₹1,800
EPF Employer = ₹1,800
ESIC Employee = 0 (gross > 21,000)
ESIC Employer = 0
Gratuity = 21,739 × 0.0481 = ₹1,046

Employer Contributions = 1,800 + 0 + 1,046 = ₹2,846
Monthly CTC = 43,478 + 2,846 = ₹46,324
Annual CTC = 46,324 × 12 = ₹5,55,888
```

**Note:** This is an approximation. Exact calculation requires iteration.

---

## ✅ Summary

### What Exists:
- ✅ Salary breakdown calculator
- ✅ Takes `gross_monthly` as input
- ✅ Calculates all components
- ✅ Returns CTC + breakdown

### What's Missing:
- ❌ Direct CTC-to-breakdown calculator
- ❌ Takes `annual_ctc` as input
- ❌ Reverse calculates gross monthly

### Recommendation:
Add a new function `calculateFromCTC()` that:
1. Takes annual CTC as input
2. Reverse calculates gross monthly
3. Uses existing `calculateSalaryComponents()` for breakdown
4. Returns complete breakdown

---

## 🔗 Related Files

- `microservices/payroll-service/src/services/salary.service.js`
- `microservices/payroll-service/src/models/Salary.model.js`
- `microservices/payroll-service/src/controllers/salaryController.js`
- `microservices/payroll-service/src/routes/salary.routes.js`

---

**Status:** Calculator exists but takes gross_monthly, not CTC directly.  
**Action Needed:** Add CTC-to-breakdown reverse calculation function.
