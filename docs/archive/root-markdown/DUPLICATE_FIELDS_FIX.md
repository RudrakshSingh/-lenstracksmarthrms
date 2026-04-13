# Duplicate Fields in Employee Response - Fix Guide

## Problem
Frontend is receiving employee responses with duplicate fields in both camelCase and snake_case formats:
- `firstName` and `first_name`
- `lastName` and `last_name`
- `employeeId` and `employee_id`
- `fullName` and `full_name`
- etc.

This makes the response unnecessarily large and confusing.

## Root Cause
The `formatEmployee` function in `microservices/shared/utils/response.util.js` is intentionally adding both formats for backward compatibility. This was done to support:
- Old frontend code using snake_case
- New frontend code using camelCase

## Solution Options

### Option 1: Return Only camelCase (Recommended for Modern Frontend)
Update `formatEmployee` to return only camelCase fields. This is the modern standard.

### Option 2: Add Query Parameter to Control Format
Add a query parameter like `?format=camelCase` or `?format=snake_case` to let frontend choose.

### Option 3: Keep Both but Document It
Keep both formats but document that frontend should use camelCase and ignore snake_case.

## Recommended Fix: Option 1 (camelCase Only)

Update the `formatEmployee` function to return only camelCase fields. This will:
- Reduce response size by ~50%
- Make the API cleaner and more consistent
- Follow modern JavaScript/TypeScript conventions
- Still be backward compatible if frontend uses camelCase

## Implementation

The fix involves modifying `microservices/shared/utils/response.util.js` to remove all `snake_case` duplicate fields and keep only `camelCase` versions.

## Impact

- ✅ Response size reduced significantly
- ✅ Cleaner API response
- ✅ Better performance (less data to transfer)
- ⚠️ Breaking change for any frontend code using snake_case (should migrate to camelCase)

## Migration Guide for Frontend

If frontend is using snake_case fields, update to camelCase:
- `first_name` → `firstName`
- `last_name` → `lastName`
- `employee_id` → `employeeId`
- `full_name` → `fullName`
- `date_of_birth` → `dateOfBirth`
- `join_date` → `joinDate`
- `work_location` → `workLocation`
- `current_address` → `currentAddress`
- `emergency_contact` → `emergencyContact`
- `bank_account` → `bankAccount`
- `previous_employment` → `previousEmployment`
- `salary_breakdown` → `salaryBreakdown`
- `annual_ctc` → `annualCtc`
- `esi_no` → `esiNo`
- `pan_number` → `panNumber`
- `aadhar_masked` → `aadharMasked`
- `created_at` → `createdAt`
- `updated_at` → `updatedAt`
