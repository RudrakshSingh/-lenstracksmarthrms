#!/usr/bin/env node

/**
 * Update Riyaz's Employee Data
 * Updates salary/compensation and statutory information via API
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

// TODO: Fill in actual values for Riyaz
const RIYAZ_DATA = {
  employeeId: 'EMP-2026-828544',
  
  // Salary & Compensation
  annual_ctc: 0, // TODO: Fill actual annual CTC
  salary_breakdown: {
    basic: 0, // TODO: Fill actual basic salary
    hra: 0, // TODO: Fill actual HRA
    special_allowance: 0, // TODO: Fill actual special allowance
    pf_employer: 0, // TODO: Fill actual PF employer contribution
    gratuity: 0, // TODO: Fill actual gratuity
    other_allowances: 0 // TODO: Fill actual other allowances
  },
  
  // Statutory Information
  uan: '', // TODO: Fill actual UAN (12 digits)
  esiNo: '', // TODO: Fill actual ESI number (15 digits)
  panNumber: '', // TODO: Fill actual PAN (e.g., ABCDE1234F)
  aadharMasked: '', // TODO: Fill actual Aadhar (masked, e.g., XXXX XXXX 1234)
  
  // Bank Account
  bankAccount: {
    account_number: '', // TODO: Fill actual account number
    ifsc_code: '', // TODO: Fill actual IFSC (e.g., HDFC0001234)
    bank_name: '', // TODO: Fill actual bank name
    account_type: 'Savings' // Options: 'Savings', 'Current', 'Salary'
  },
  
  // Emergency Contact
  emergencyContact: {
    name: '', // TODO: Fill actual emergency contact name
    relationship: 'Other', // Options: 'Father', 'Mother', 'Spouse', 'Sibling', 'Child', 'Friend', 'Other'
    phone: '' // TODO: Fill actual emergency contact phone
  }
};

async function updateRiyazData() {
  try {
    log('\n================================================================================', 'cyan');
    log('🔄 Updating Riyaz Employee Data', 'cyan');
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

    // Step 1: Update Salary/Compensation
    log('\n💰 Step 1: Updating Salary & Compensation...', 'cyan');
    
    const salaryUpdateData = {
      annual_ctc: RIYAZ_DATA.annual_ctc,
      salary_breakdown: RIYAZ_DATA.salary_breakdown
    };

    // Validate that we have actual values
    if (RIYAZ_DATA.annual_ctc === 0) {
      log('⚠️  WARNING: annual_ctc is 0. Please update RIYAZ_DATA in the script with actual values.', 'yellow');
      log('   Skipping salary update...', 'yellow');
    } else {
      try {
        const salaryResponse = await axios.put(
          `${API_BASE}/api/hr/employees/${RIYAZ_DATA.employeeId}`,
          salaryUpdateData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Tenant-Id': tenantId,
              'Content-Type': 'application/json'
            }
          }
        );

        if (salaryResponse.data.success) {
          log('✅ Salary & Compensation updated successfully', 'green');
          log(`   Annual CTC: ₹${RIYAZ_DATA.annual_ctc.toLocaleString('en-IN')}`, 'blue');
        } else {
          log('❌ Failed to update salary', 'red');
          log(`   Error: ${salaryResponse.data.message || salaryResponse.data.error}`, 'yellow');
        }
      } catch (error) {
        log(`❌ Error updating salary: ${error.message}`, 'red');
        if (error.response) {
          log(`   Status: ${error.response.status}`, 'yellow');
          log(`   Response: ${JSON.stringify(error.response.data).substring(0, 200)}`, 'yellow');
        }
      }
    }

    // Step 2: Update Statutory Information
    log('\n📄 Step 2: Updating Statutory Information...', 'cyan');
    
    const statutoryUpdateData = {
      bankAccount: RIYAZ_DATA.bankAccount,
      uan: RIYAZ_DATA.uan || undefined,
      esiNo: RIYAZ_DATA.esiNo || undefined,
      panNumber: RIYAZ_DATA.panNumber || undefined
    };

    // Validate that we have actual values
    const hasStatutoryData = RIYAZ_DATA.uan || RIYAZ_DATA.esiNo || RIYAZ_DATA.panNumber || 
                             (RIYAZ_DATA.bankAccount && RIYAZ_DATA.bankAccount.account_number);

    if (!hasStatutoryData) {
      log('⚠️  WARNING: No statutory data provided. Please update RIYAZ_DATA in the script with actual values.', 'yellow');
      log('   Skipping statutory update...', 'yellow');
    } else {
      try {
        const statutoryResponse = await axios.patch(
          `${API_BASE}/api/hr/employees/${RIYAZ_DATA.employeeId}/statutory`,
          statutoryUpdateData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Tenant-Id': tenantId,
              'Content-Type': 'application/json'
            }
          }
        );

        if (statutoryResponse.data.success) {
          log('✅ Statutory Information updated successfully', 'green');
          if (RIYAZ_DATA.uan) log(`   UAN: ${RIYAZ_DATA.uan}`, 'blue');
          if (RIYAZ_DATA.esiNo) log(`   ESI: ${RIYAZ_DATA.esiNo}`, 'blue');
          if (RIYAZ_DATA.panNumber) log(`   PAN: ${RIYAZ_DATA.panNumber}`, 'blue');
          if (RIYAZ_DATA.bankAccount.account_number) log(`   Bank Account: ${RIYAZ_DATA.bankAccount.account_number}`, 'blue');
        } else {
          log('❌ Failed to update statutory info', 'red');
          log(`   Error: ${statutoryResponse.data.message || statutoryResponse.data.error}`, 'yellow');
        }
      } catch (error) {
        log(`❌ Error updating statutory info: ${error.message}`, 'red');
        if (error.response) {
          log(`   Status: ${error.response.status}`, 'yellow');
          log(`   Response: ${JSON.stringify(error.response.data).substring(0, 200)}`, 'yellow');
        }
      }
    }

    // Step 3: Update Emergency Contact (via general employee update)
    log('\n🚨 Step 3: Updating Emergency Contact...', 'cyan');
    
    if (!RIYAZ_DATA.emergencyContact.name || !RIYAZ_DATA.emergencyContact.phone) {
      log('⚠️  WARNING: Emergency contact data not provided. Skipping...', 'yellow');
    } else {
      try {
        const emergencyResponse = await axios.put(
          `${API_BASE}/api/hr/employees/${RIYAZ_DATA.employeeId}`,
          {
            emergencyContact: RIYAZ_DATA.emergencyContact
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Tenant-Id': tenantId,
              'Content-Type': 'application/json'
            }
          }
        );

        if (emergencyResponse.data.success) {
          log('✅ Emergency Contact updated successfully', 'green');
          log(`   Name: ${RIYAZ_DATA.emergencyContact.name}`, 'blue');
          log(`   Phone: ${RIYAZ_DATA.emergencyContact.phone}`, 'blue');
        } else {
          log('❌ Failed to update emergency contact', 'red');
          log(`   Error: ${emergencyResponse.data.message || emergencyResponse.data.error}`, 'yellow');
        }
      } catch (error) {
        log(`❌ Error updating emergency contact: ${error.message}`, 'red');
        if (error.response) {
          log(`   Status: ${error.response.status}`, 'yellow');
          log(`   Response: ${JSON.stringify(error.response.data).substring(0, 200)}`, 'yellow');
        }
      }
    }

    // Verify updated data
    log('\n🔍 Verifying updated data...', 'cyan');
    try {
      const verifyResponse = await axios.get(
        `${API_BASE}/api/hr/employees/${RIYAZ_DATA.employeeId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Id': tenantId,
            'Content-Type': 'application/json'
          }
        }
      );

      if (verifyResponse.data.success) {
        const employee = verifyResponse.data.data;
        log('✅ Employee data retrieved', 'green');
        log('\n=== Updated Data ===', 'cyan');
        log(`Annual CTC: ₹${(employee.annual_ctc || 0).toLocaleString('en-IN')}`, employee.annual_ctc ? 'green' : 'yellow');
        log(`UAN: ${employee.uan || 'N/A'}`, employee.uan ? 'green' : 'yellow');
        log(`ESI: ${employee.esiNo || employee.esi_no || 'N/A'}`, employee.esiNo ? 'green' : 'yellow');
        log(`PAN: ${employee.panNumber || employee.pan_number || 'N/A'}`, employee.panNumber ? 'green' : 'yellow');
        log(`Bank Account: ${employee.bankAccount?.accountNumber || employee.bankAccount?.account_number || 'N/A'}`, employee.bankAccount?.accountNumber ? 'green' : 'yellow');
        log(`Emergency Contact: ${employee.emergencyContact?.name || 'N/A'}`, employee.emergencyContact?.name ? 'green' : 'yellow');
      }
    } catch (error) {
      log(`⚠️  Could not verify updated data: ${error.message}`, 'yellow');
    }

    log('\n✅ Update process completed!', 'green');
    log('\n⚠️  NOTE: If values are still showing as 0 or N/A, please update RIYAZ_DATA in the script with actual values and run again.', 'yellow');

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'yellow');
      log(`   Response: ${JSON.stringify(error.response.data).substring(0, 200)}`, 'yellow');
    }
    process.exit(1);
  }
}

// Check if values are filled
const hasValues = RIYAZ_DATA.annual_ctc > 0 || 
                  RIYAZ_DATA.uan || 
                  RIYAZ_DATA.esiNo || 
                  RIYAZ_DATA.panNumber ||
                  (RIYAZ_DATA.bankAccount && RIYAZ_DATA.bankAccount.account_number);

if (!hasValues) {
  log('\n⚠️  WARNING: No actual values provided in RIYAZ_DATA!', 'yellow');
  log('   Please edit this script and fill in the actual values for Riyaz:', 'yellow');
  log('   - annual_ctc', 'yellow');
  log('   - salary_breakdown', 'yellow');
  log('   - uan, esiNo, panNumber', 'yellow');
  log('   - bankAccount', 'yellow');
  log('   - emergencyContact', 'yellow');
  log('\n   Then run: node scripts/update-riyaz-data.js', 'yellow');
  log('\n   Proceeding with update anyway (will skip empty fields)...\n', 'yellow');
}

updateRiyazData();
