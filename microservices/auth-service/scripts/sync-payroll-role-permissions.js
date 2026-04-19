#!/usr/bin/env node
/**
 * Upserts core Role documents so JWT/effective permissions align with payroll-service requirePayrollAccess.
 *
 * Roles updated: hr (payroll ops + gates + exports), accountant + finance (finance path + exports),
 * employee (payroll_payslip_self).
 *
 *   APPLY=1   required to write to MongoDB
 *
 * After apply: users should re-login (or wait for permission cache refresh) so payroll routes see new codes.
 */
const mongoose = require('mongoose');
const Role = require('../src/models/Role.model');
const { getDefaultRolePermissions } = require('@etelios/shared/utils/defaultRolePermissions');
const { filterValidCodes } = require('@etelios/shared/utils/permissionCatalog');

const ROLES = [
  { name: 'hr', display_name: 'Human Resources', description: 'HR + payroll workflow (gates, run, freeze, payslips, exports)' },
  { name: 'accountant', display_name: 'Accountant', description: 'Books + payroll finance approval / post / reconcile' },
  { name: 'finance', display_name: 'Finance', description: 'Same permission bundle as accountant for payroll finance path' },
  { name: 'employee', display_name: 'Employee', description: 'Self-service payslip download when payroll_payslip_self is granted' }
];

const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true';

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('Set MONGODB_URI');
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });

  for (const meta of ROLES) {
    const raw = getDefaultRolePermissions(meta.name);
    const codes = filterValidCodes(raw);
    const payrollCodes = codes.filter((c) => c.startsWith('payroll_'));
    console.log(`\n${meta.name}: total=${codes.length} payroll_codes=${payrollCodes.length}`);
    console.log('  payroll:', payrollCodes.join(', ') || '(none)');

    if (APPLY) {
      const role = await Role.findOneAndUpdate(
        { name: meta.name },
        {
          $set: {
            display_name: meta.display_name,
            description: meta.description,
            permissions: codes,
            is_active: true
          }
        },
        { upsert: true, new: true }
      );
      console.log('  upserted id:', String(role._id));
    }
  }

  if (!APPLY) {
    console.log('\nDry run. Set APPLY=1 to upsert Role documents.');
  } else {
    console.log('\nDone. Users should re-login for updated JWT permission resolution where applicable.');
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
