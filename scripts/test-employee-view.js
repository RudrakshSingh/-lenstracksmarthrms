#!/usr/bin/env node

/**
 * Test Employee View API
 * Tests if employee details are returned correctly
 */

const axios = require('axios');

const API_BASE = process.env.API_BASE_URL || 'https://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEmployeeView() {
  try {
    log('\n================================================================================', 'cyan');
    log('🧪 Testing Employee View API', 'cyan');
    log('================================================================================', 'cyan');

    // Login
    log('\n🔐 Logging in...', 'cyan');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@upcapto.com',
      password: 'Upcapto@2026'
    });

    if (!loginResponse.data.success) {
      log('❌ Login failed', 'red');
      return;
    }

    const token = loginResponse.data.data.accessToken;
    const tenantId = 'upcapto';
    log('✅ Login successful', 'green');
    log(`   Tenant: ${tenantId}`, 'blue');

    // Test getting yuvraj (from images)
    log('\n👤 Testing Employee View - Yuvraj (EMP-2026-223156)...', 'cyan');
    const employeeResponse = await axios.get(`${API_BASE}/api/hr/employees/EMP-2026-223156`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId,
        'Content-Type': 'application/json'
      }
    });

    if (employeeResponse.data.success) {
      const employee = employeeResponse.data.data;
      
      log('✅ Employee retrieved successfully', 'green');
      log('\n=== Employee Data Check ===', 'cyan');
      
      // Check basic fields
      const basicFields = {
        'id': employee.id || employee._id,
        'name': employee.name || employee.fullName,
        'firstName': employee.firstName || employee.first_name,
        'lastName': employee.lastName || employee.last_name,
        'email': employee.email,
        'phone': employee.phone,
        'employeeId': employee.employeeId || employee.employee_id,
        'status': employee.status
      };
      
      log('\n📋 Basic Fields:', 'cyan');
      Object.entries(basicFields).forEach(([key, value]) => {
        if (value) {
          log(`   ✅ ${key}: ${value}`, 'green');
        } else {
          log(`   ❌ ${key}: MISSING`, 'red');
        }
      });
      
      // Check personal details
      const personalFields = {
        'dob': employee.dob || employee.dateOfBirth || employee.date_of_birth,
        'gender': employee.gender
      };
      
      log('\n👤 Personal Details:', 'cyan');
      Object.entries(personalFields).forEach(([key, value]) => {
        if (value) {
          log(`   ✅ ${key}: ${value}`, 'green');
        } else {
          log(`   ⚠️  ${key}: ${value || 'N/A'}`, 'yellow');
        }
      });
      
      // Check work details
      const workFields = {
        'department': employee.department || employee.departmentRef?.name,
        'jobTitle': employee.jobTitle || employee.designation,
        'doj': employee.doj || employee.joinDate || employee.join_date,
        'confirmationDate': employee.confirmationDate || employee.confirmation_date,
        'reportingManagerName': employee.reportingManagerName || employee.reporting_manager_name
      };
      
      log('\n💼 Work Details:', 'cyan');
      Object.entries(workFields).forEach(([key, value]) => {
        if (value) {
          log(`   ✅ ${key}: ${value}`, 'green');
        } else {
          log(`   ⚠️  ${key}: ${value || 'N/A'}`, 'yellow');
        }
      });
      
      // Check salary
      const salaryFields = {
        'annual_ctc': employee.annual_ctc || employee.annualCtc,
        'salary_breakdown': employee.salary_breakdown || employee.salaryBreakdown
      };
      
      log('\n💰 Salary:', 'cyan');
      Object.entries(salaryFields).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          log(`   ✅ ${key}: ${JSON.stringify(value).substring(0, 50)}`, 'green');
        } else {
          log(`   ⚠️  ${key}: ${value || 'N/A'}`, 'yellow');
        }
      });
      
      // Check statutory
      const statutoryFields = {
        'uan': employee.uan,
        'esiNo': employee.esiNo || employee.esi_no || employee.esiNumber || employee.esi_number,
        'panNumber': employee.panNumber || employee.pan_number || employee.pan,
        'aadharMasked': employee.aadharMasked || employee.aadhar_masked || employee.aadhar
      };
      
      log('\n📄 Statutory:', 'cyan');
      Object.entries(statutoryFields).forEach(([key, value]) => {
        if (value) {
          log(`   ✅ ${key}: ${value}`, 'green');
        } else {
          log(`   ⚠️  ${key}: ${value || 'N/A'}`, 'yellow');
        }
      });
      
      // Check bank details
      const bankAccount = employee.bankAccount || employee.bank_account;
      log('\n🏦 Bank Details:', 'cyan');
      if (bankAccount) {
        const bankFields = {
          'accountNumber': bankAccount.accountNumber || bankAccount.account_number,
          'bankName': bankAccount.bankName || bankAccount.bank_name,
          'ifscCode': bankAccount.ifscCode || bankAccount.ifsc_code,
          'branchName': bankAccount.branchName || bankAccount.branch_name
        };
        Object.entries(bankFields).forEach(([key, value]) => {
          if (value) {
            log(`   ✅ ${key}: ${value}`, 'green');
          } else {
            log(`   ⚠️  ${key}: ${value || 'N/A'}`, 'yellow');
          }
        });
      } else {
        log('   ⚠️  bankAccount: N/A', 'yellow');
      }
      
      // Check address
      const currentAddress = employee.currentAddress || employee.current_address;
      log('\n📍 Current Address:', 'cyan');
      if (currentAddress) {
        log(`   ✅ city: ${currentAddress.city || 'N/A'}`, currentAddress.city ? 'green' : 'yellow');
        log(`   ✅ state: ${currentAddress.state || 'N/A'}`, currentAddress.state ? 'green' : 'yellow');
        log(`   ✅ pincode: ${currentAddress.pincode || 'N/A'}`, currentAddress.pincode ? 'green' : 'yellow');
      } else {
        log('   ⚠️  currentAddress: N/A', 'yellow');
      }
      
      // Check emergency contact
      const emergencyContact = employee.emergencyContact || employee.emergency_contact;
      log('\n🚨 Emergency Contact:', 'cyan');
      if (emergencyContact) {
        log(`   ✅ name: ${emergencyContact.name || 'N/A'}`, emergencyContact.name ? 'green' : 'yellow');
        log(`   ✅ phone: ${emergencyContact.phone || 'N/A'}`, emergencyContact.phone ? 'green' : 'yellow');
      } else {
        log('   ⚠️  emergencyContact: N/A', 'yellow');
      }
      
      // Check work location
      const workLocation = employee.workLocation || employee.work_location;
      log('\n🏪 Work Location:', 'cyan');
      if (workLocation) {
        log(`   ✅ city: ${workLocation.city || 'N/A'}`, workLocation.city ? 'green' : 'yellow');
        log(`   ✅ state: ${workLocation.state || 'N/A'}`, workLocation.state ? 'green' : 'yellow');
      } else {
        log('   ⚠️  workLocation: N/A', 'yellow');
      }
      
      // Summary
      log('\n=== Summary ===', 'cyan');
      const totalFields = Object.keys(basicFields).length + 
                         Object.keys(personalFields).length + 
                         Object.keys(workFields).length + 
                         Object.keys(salaryFields).length + 
                         Object.keys(statutoryFields).length;
      
      const presentFields = Object.values(basicFields).filter(Boolean).length +
                           Object.values(personalFields).filter(Boolean).length +
                           Object.values(workFields).filter(Boolean).length +
                           Object.values(salaryFields).filter(v => v !== undefined && v !== null).length +
                           Object.values(statutoryFields).filter(Boolean).length;
      
      log(`Fields present: ${presentFields}/${totalFields}`, presentFields === totalFields ? 'green' : 'yellow');
      
      if (presentFields < totalFields) {
        log('⚠️  Some fields are missing (showing N/A is expected for empty fields)', 'yellow');
      } else {
        log('✅ All fields are present!', 'green');
      }
      
    } else {
      log('❌ Failed to retrieve employee', 'red');
      log(`   Error: ${employeeResponse.data.message || employeeResponse.data.error}`, 'yellow');
    }

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'yellow');
      log(`   Response: ${JSON.stringify(error.response.data).substring(0, 200)}`, 'yellow');
    }
    process.exit(1);
  }
}

testEmployeeView();
