#!/usr/bin/env node

/**
 * Update Riyaz's Employee Data Directly via Database
 * This script runs inside the pod and updates data directly
 */

// PLACEHOLDER VALUES FOR TESTING - Replace with actual values for production
const RIYAZ_DATA = {
  employeeId: 'EMP-2026-828544',
  
  // Salary & Compensation (PLACEHOLDER - Replace with actual values)
  annual_ctc: 300000, // Placeholder: ₹3L annual CTC
  salary_breakdown: {
    basic: 150000, // Placeholder: 50% of CTC
    hra: 75000, // Placeholder: 25% of CTC
    special_allowance: 50000, // Placeholder
    pf_employer: 1800, // Placeholder: 12% of basic
    gratuity: 2308, // Placeholder: ~4.81% of basic
    other_allowances: 0
  },
  
  // Statutory Information (PLACEHOLDER - Replace with actual values)
  uan: '123456789012', // Placeholder: 12 digits
  esiNo: '123456789012345', // Placeholder: 15 digits
  panNumber: 'ABCDE1234F', // Placeholder: Format ABCDE1234F
  aadharMasked: 'XXXX XXXX 1234', // Placeholder: Masked format
  
  // Bank Account (PLACEHOLDER - Replace with actual values)
  bankAccount: {
    account_number: '1234567890', // Placeholder
    ifsc_code: 'HDFC0001234', // Placeholder: Format HDFC0001234
    bank_name: 'HDFC Bank', // Placeholder
    account_type: 'Savings' // Options: 'Savings', 'Current', 'Salary'
  },
  
  // Emergency Contact (PLACEHOLDER - Replace with actual values)
  emergencyContact: {
    name: 'Test Contact', // Placeholder
    relationship: 'Father', // Options: 'Father', 'Mother', 'Spouse', 'Sibling', 'Child', 'Friend', 'Other'
    phone: '9876543210' // Placeholder: 10 digits
  }
};

async function updateRiyazDirect() {
  try {
    const mongoose = require('mongoose');
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    console.log('🔗 Connecting to database...');
    await mongoose.connect(mongoUri, {
      tls: true,
      replicaSet: 'rs0',
      readPreference: 'secondaryPreferred',
      retryWrites: false,
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ Connected to database');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const CompensationProfile = mongoose.model('CompensationProfile', new mongoose.Schema({}, { strict: false }), 'compensationprofiles');

    // Find Riyaz
    console.log(`\n🔍 Finding employee: ${RIYAZ_DATA.employeeId}...`);
    const riyaz = await User.findOne({
      tenantId: 'upcapto',
      $or: [
        { employeeId: RIYAZ_DATA.employeeId },
        { employee_id: RIYAZ_DATA.employeeId }
      ]
    });

    if (!riyaz) {
      console.error('❌ Employee not found');
      process.exit(1);
    }

    console.log('✅ Employee found:', riyaz.name || riyaz.firstName);
    console.log('   Email:', riyaz.email);

    let updated = false;

    // Update Salary/Compensation
    if (RIYAZ_DATA.annual_ctc > 0) {
      console.log('\n💰 Updating Salary & Compensation...');
      riyaz.annual_ctc = RIYAZ_DATA.annual_ctc;
      riyaz.annualCtc = RIYAZ_DATA.annual_ctc;
      
      if (RIYAZ_DATA.salary_breakdown && Object.values(RIYAZ_DATA.salary_breakdown).some(v => v > 0)) {
        riyaz.salary_breakdown = RIYAZ_DATA.salary_breakdown;
        riyaz.salaryBreakdown = RIYAZ_DATA.salary_breakdown;
      }
      
      updated = true;
      console.log(`   ✅ Annual CTC: ₹${RIYAZ_DATA.annual_ctc.toLocaleString('en-IN')}`);
    } else {
      console.log('\n⚠️  Skipping salary update (annual_ctc is 0)');
    }

    // Update Statutory Information
    const hasStatutoryData = RIYAZ_DATA.uan || RIYAZ_DATA.esiNo || RIYAZ_DATA.panNumber || 
                            (RIYAZ_DATA.bankAccount && RIYAZ_DATA.bankAccount.account_number);

    if (hasStatutoryData) {
      console.log('\n📄 Updating Statutory Information...');
      
      if (RIYAZ_DATA.uan) {
        riyaz.uan = RIYAZ_DATA.uan;
        console.log(`   ✅ UAN: ${RIYAZ_DATA.uan}`);
      }
      
      if (RIYAZ_DATA.esiNo) {
        riyaz.esiNo = RIYAZ_DATA.esiNo;
        riyaz.esi_no = RIYAZ_DATA.esiNo;
        riyaz.esiNumber = RIYAZ_DATA.esiNo;
        riyaz.esi_number = RIYAZ_DATA.esiNo;
        console.log(`   ✅ ESI: ${RIYAZ_DATA.esiNo}`);
      }
      
      if (RIYAZ_DATA.panNumber) {
        riyaz.panNumber = RIYAZ_DATA.panNumber.toUpperCase();
        riyaz.pan_number = RIYAZ_DATA.panNumber.toUpperCase();
        riyaz.pan = RIYAZ_DATA.panNumber.toUpperCase();
        console.log(`   ✅ PAN: ${RIYAZ_DATA.panNumber.toUpperCase()}`);
      }
      
      if (RIYAZ_DATA.aadharMasked) {
        riyaz.aadharMasked = RIYAZ_DATA.aadharMasked;
        riyaz.aadhar_masked = RIYAZ_DATA.aadharMasked;
        riyaz.aadhar = RIYAZ_DATA.aadharMasked;
        console.log(`   ✅ Aadhar: ${RIYAZ_DATA.aadharMasked}`);
      }
      
      if (RIYAZ_DATA.bankAccount && RIYAZ_DATA.bankAccount.account_number) {
        riyaz.bankAccount = {
          accountNumber: RIYAZ_DATA.bankAccount.account_number,
          account_number: RIYAZ_DATA.bankAccount.account_number,
          account_no: RIYAZ_DATA.bankAccount.account_number,
          ifscCode: RIYAZ_DATA.bankAccount.ifsc_code?.toUpperCase(),
          ifsc_code: RIYAZ_DATA.bankAccount.ifsc_code?.toUpperCase(),
          ifsc: RIYAZ_DATA.bankAccount.ifsc_code?.toUpperCase(),
          bankName: RIYAZ_DATA.bankAccount.bank_name,
          bank_name: RIYAZ_DATA.bankAccount.bank_name,
          accountType: RIYAZ_DATA.bankAccount.account_type,
          account_type: RIYAZ_DATA.bankAccount.account_type
        };
        console.log(`   ✅ Bank Account: ${RIYAZ_DATA.bankAccount.account_number}`);
      }
      
      updated = true;
    } else {
      console.log('\n⚠️  Skipping statutory update (no data provided)');
    }

    // Update Emergency Contact
    if (RIYAZ_DATA.emergencyContact && RIYAZ_DATA.emergencyContact.name && RIYAZ_DATA.emergencyContact.phone) {
      console.log('\n🚨 Updating Emergency Contact...');
      riyaz.emergencyContact = {
        name: RIYAZ_DATA.emergencyContact.name,
        relationship: RIYAZ_DATA.emergencyContact.relationship,
        phone: RIYAZ_DATA.emergencyContact.phone,
        contact_number: RIYAZ_DATA.emergencyContact.phone
      };
      riyaz.emergency_contact = riyaz.emergencyContact;
      updated = true;
      console.log(`   ✅ Name: ${RIYAZ_DATA.emergencyContact.name}`);
      console.log(`   ✅ Phone: ${RIYAZ_DATA.emergencyContact.phone}`);
    } else {
      console.log('\n⚠️  Skipping emergency contact update (no data provided)');
    }

    // Save User
    if (updated) {
      console.log('\n💾 Saving changes...');
      await riyaz.save();
      console.log('✅ Employee data updated successfully!');
    } else {
      console.log('\n⚠️  No updates to save (all values are empty/0)');
      console.log('   Please fill in RIYAZ_DATA with actual values and run again');
    }

    // Also update CompensationProfile if it exists
    try {
      let profile = await CompensationProfile.findOne({
        $or: [
          { employee: riyaz._id },
          { employeeId: riyaz.employeeId }
        ]
      });

      if (profile) {
        console.log('\n📋 Updating CompensationProfile...');
        
        if (RIYAZ_DATA.annual_ctc > 0) {
          profile.annual_ctc = RIYAZ_DATA.annual_ctc;
          profile.ctc = RIYAZ_DATA.annual_ctc;
        }
        
        if (RIYAZ_DATA.uan) profile.uan = RIYAZ_DATA.uan;
        if (RIYAZ_DATA.esiNo) profile.esiNo = RIYAZ_DATA.esiNo;
        if (RIYAZ_DATA.panNumber) profile.panNumber = RIYAZ_DATA.panNumber.toUpperCase();
        
        if (RIYAZ_DATA.bankAccount && RIYAZ_DATA.bankAccount.account_number) {
          profile.bankAccount = {
            accountNumber: RIYAZ_DATA.bankAccount.account_number,
            ifscCode: RIYAZ_DATA.bankAccount.ifsc_code?.toUpperCase(),
            bankName: RIYAZ_DATA.bankAccount.bank_name,
            accountType: RIYAZ_DATA.bankAccount.account_type
          };
        }
        
        await profile.save();
        console.log('✅ CompensationProfile updated');
      } else {
        console.log('\n⚠️  CompensationProfile not found (will be created on next onboarding update)');
      }
    } catch (profileError) {
      console.log(`\n⚠️  Could not update CompensationProfile: ${profileError.message}`);
    }

    // Verify
    console.log('\n🔍 Verifying updated data...');
    const updatedRiyaz = await User.findById(riyaz._id).lean();
    console.log('\n=== Updated Data ===');
    console.log(`Annual CTC: ₹${(updatedRiyaz.annual_ctc || 0).toLocaleString('en-IN')}`);
    console.log(`UAN: ${updatedRiyaz.uan || 'N/A'}`);
    console.log(`ESI: ${updatedRiyaz.esiNo || updatedRiyaz.esi_no || 'N/A'}`);
    console.log(`PAN: ${updatedRiyaz.panNumber || updatedRiyaz.pan_number || 'N/A'}`);
    console.log(`Bank Account: ${updatedRiyaz.bankAccount?.accountNumber || updatedRiyaz.bankAccount?.account_number || 'N/A'}`);
    console.log(`Emergency Contact: ${updatedRiyaz.emergencyContact?.name || 'N/A'}`);

    await mongoose.disconnect();
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Check if values are filled
const hasValues = RIYAZ_DATA.annual_ctc > 0 || 
                  RIYAZ_DATA.uan || 
                  RIYAZ_DATA.esiNo || 
                  RIYAZ_DATA.panNumber ||
                  (RIYAZ_DATA.bankAccount && RIYAZ_DATA.bankAccount.account_number) ||
                  (RIYAZ_DATA.emergencyContact && RIYAZ_DATA.emergencyContact.name);

if (!hasValues) {
  console.log('\n⚠️  WARNING: No actual values provided in RIYAZ_DATA!');
  console.log('   Please edit this script and fill in the actual values for Riyaz.');
  console.log('   Then run via kubectl:');
  console.log('   kubectl exec -n etelios-prod deployment/hr-service -- node /path/to/update-riyaz-data-direct.js');
  console.log('\n   Proceeding with update anyway (will skip empty fields)...\n');
}

updateRiyazDirect();
