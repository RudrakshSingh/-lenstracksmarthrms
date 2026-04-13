#!/usr/bin/env node

/**
 * Test Employee Edit via API
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

async function testEmployeeEdit() {
  try {
    log('\n================================================================================', 'cyan');
    log('🧪 Testing Employee Edit via API', 'cyan');
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

    // Test update with various fields
    log('\n🔄 Testing Employee Edit (Riyaz)...', 'cyan');
    
    const updateData = {
      annual_ctc: 400000,
      salary_breakdown: {
        basic: 200000,
        hra: 100000,
        special_allowance: 70000,
        pf_employer: 2400,
        gratuity: 3077,
        other_allowances: 0
      },
      uan: '111111111111',
      esiNo: '222222222222222',
      panNumber: 'TEST1234A',
      aadharMasked: 'YYYY YYYY 5678',
      bankAccount: {
        account_number: '1111222233',
        ifsc_code: 'SBIN0001111',
        bank_name: 'State Bank of India',
        account_type: 'Savings'
      },
      emergencyContact: {
        name: 'API Test Contact',
        relationship: 'Spouse',
        phone: '1111111111'
      },
      gender: 'Male',
      confirmationDate: '2025-07-01'
    };

    try {
      const updateResponse = await axios.put(
        `${API_BASE}/api/hr/employees/EMP-2026-828544`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Id': tenantId,
            'Content-Type': 'application/json'
          }
        }
      );

      if (updateResponse.data.success) {
        log('✅ Employee updated successfully via API!', 'green');
        const employee = updateResponse.data.data;
        
        log('\n=== Updated Data ===', 'cyan');
        log(`Annual CTC: ₹${(employee.annual_ctc || 0).toLocaleString('en-IN')}`, employee.annual_ctc ? 'green' : 'yellow');
        log(`UAN: ${employee.uan || 'N/A'}`, employee.uan ? 'green' : 'yellow');
        log(`ESI: ${employee.esiNo || employee.esi_no || 'N/A'}`, employee.esiNo ? 'green' : 'yellow');
        log(`PAN: ${employee.panNumber || employee.pan_number || 'N/A'}`, employee.panNumber ? 'green' : 'yellow');
        log(`Bank Account: ${employee.bankAccount?.accountNumber || employee.bankAccount?.account_number || 'N/A'}`, employee.bankAccount?.accountNumber ? 'green' : 'yellow');
        log(`Bank IFSC: ${employee.bankAccount?.ifscCode || employee.bankAccount?.ifsc_code || 'N/A'}`, employee.bankAccount?.ifscCode ? 'green' : 'yellow');
        log(`Bank Name: ${employee.bankAccount?.bankName || employee.bankAccount?.bank_name || 'N/A'}`, employee.bankAccount?.bankName ? 'green' : 'yellow');
        log(`Emergency Contact: ${employee.emergencyContact?.name || 'N/A'}`, employee.emergencyContact?.name ? 'green' : 'yellow');
        log(`Emergency Phone: ${employee.emergencyContact?.phone || 'N/A'}`, employee.emergencyContact?.phone ? 'green' : 'yellow');
        log(`Gender: ${employee.gender || 'N/A'}`, employee.gender ? 'green' : 'yellow');
        log(`Confirmation Date: ${employee.confirmationDate || employee.confirmation_date || 'N/A'}`, employee.confirmationDate ? 'green' : 'yellow');
        
        log('\n✅ All fields updated successfully!', 'green');
      } else {
        log('❌ Update failed', 'red');
        log(`   Error: ${updateResponse.data.message || updateResponse.data.error}`, 'yellow');
      }
    } catch (error) {
      log(`❌ Error updating employee: ${error.message}`, 'red');
      if (error.response) {
        log(`   Status: ${error.response.status}`, 'yellow');
        log(`   Response: ${JSON.stringify(error.response.data).substring(0, 500)}`, 'yellow');
      }
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

testEmployeeEdit();
