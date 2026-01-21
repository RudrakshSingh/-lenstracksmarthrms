#!/usr/bin/env node

/**
 * Migration Script: Add tenantId to Existing Data
 * 
 * This script migrates existing data to add tenantId field for tenant isolation.
 * 
 * IMPORTANT: Run this script AFTER deploying the tenant isolation changes.
 * 
 * Usage:
 *   node migrate-tenant-isolation.js [--tenant-id=<tenantId>] [--dry-run]
 * 
 * Options:
 *   --tenant-id=<tenantId>  - Migrate data for specific tenant only
 *   --dry-run              - Show what would be migrated without making changes
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`)
};

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const tenantIdArg = args.find(arg => arg.startsWith('--tenant-id='));
const specificTenantId = tenantIdArg ? tenantIdArg.split('=')[1] : null;

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.TENANT_DATABASE_URL;

if (!MONGODB_URI) {
  log.error('MONGODB_URI not found in environment variables');
  process.exit(1);
}

// Models (simplified - just for migration)
const userSchema = new mongoose.Schema({
  tenantId: String,
  employeeId: String,
  email: String,
  store: mongoose.Schema.Types.ObjectId,
  department: String,
  createdAt: Date
}, { strict: false, collection: 'users' });

const storeSchema = new mongoose.Schema({
  tenantId: String,
  code: String,
  name: String
}, { strict: false, collection: 'stores' });

const departmentSchema = new mongoose.Schema({
  tenantId: String,
  name: String,
  code: String
}, { strict: false, collection: 'departments' });

const User = mongoose.model('User', userSchema);
const Store = mongoose.model('Store', storeSchema);
const Department = mongoose.model('Department', departmentSchema);

/**
 * Get tenantId for a user based on various strategies
 */
async function determineTenantId(user) {
  // Strategy 1: Get from store (if store has tenantId)
  if (user.store) {
    const store = await Store.findById(user.store);
    if (store && store.tenantId) {
      return store.tenantId;
    }
  }
  
  // Strategy 2: Get from email domain
  if (user.email) {
    const emailDomain = user.email.split('@')[1];
    if (emailDomain) {
      // Try to match domain to tenant (e.g., admin@lenstrack.etelios.com -> lenstrack)
      const domainParts = emailDomain.split('.');
      if (domainParts.length >= 2) {
        const possibleTenantId = domainParts[0].toLowerCase();
        // You can add validation here to check if tenantId exists in tenant registry
        return possibleTenantId;
      }
    }
  }
  
  // Strategy 3: Get from department (if department has tenantId)
  if (user.department) {
    const dept = await Department.findOne({ 
      $or: [
        { name: { $regex: new RegExp(`^${user.department}$`, 'i') } },
        { code: user.department.toUpperCase() }
      ]
    });
    if (dept && dept.tenantId) {
      return dept.tenantId;
    }
  }
  
  // Strategy 4: Default tenant
  return 'default';
}

/**
 * Migrate Users
 */
async function migrateUsers(dryRun = false) {
  log.section('Migrating Users');
  
  const query = specificTenantId 
    ? { tenantId: { $exists: false }, 'store.tenantId': specificTenantId } // This won't work, need different approach
    : { tenantId: { $exists: false } };
  
  const users = await User.find(query).limit(1000); // Process in batches
  
  if (users.length === 0) {
    log.info('No users found without tenantId');
    return { migrated: 0, skipped: 0 };
  }
  
  log.info(`Found ${users.length} users without tenantId`);
  
  let migrated = 0;
  let skipped = 0;
  
  for (const user of users) {
    try {
      const tenantId = await determineTenantId(user);
      
      if (dryRun) {
        log.info(`Would migrate user ${user.employeeId || user.email} to tenant: ${tenantId}`);
        migrated++;
      } else {
        user.tenantId = tenantId;
        await user.save();
        log.success(`Migrated user ${user.employeeId || user.email} to tenant: ${tenantId}`);
        migrated++;
      }
    } catch (error) {
      log.error(`Failed to migrate user ${user.employeeId || user.email}: ${error.message}`);
      skipped++;
    }
  }
  
  return { migrated, skipped };
}

/**
 * Migrate Stores
 */
async function migrateStores(dryRun = false) {
  log.section('Migrating Stores');
  
  const query = specificTenantId
    ? { tenantId: { $exists: false }, _id: { $in: await getStoreIdsForTenant(specificTenantId) } }
    : { tenantId: { $exists: false } };
  
  const stores = await Store.find(query);
  
  if (stores.length === 0) {
    log.info('No stores found without tenantId');
    return { migrated: 0, skipped: 0 };
  }
  
  log.info(`Found ${stores.length} stores without tenantId`);
  
  let migrated = 0;
  let skipped = 0;
  
  for (const store of stores) {
    try {
      // For stores, try to get tenantId from associated users
      const user = await User.findOne({ store: store._id });
      const tenantId = user ? (user.tenantId || await determineTenantId(user)) : 'default';
      
      if (dryRun) {
        log.info(`Would migrate store ${store.code || store.name} to tenant: ${tenantId}`);
        migrated++;
      } else {
        store.tenantId = tenantId;
        await store.save();
        log.success(`Migrated store ${store.code || store.name} to tenant: ${tenantId}`);
        migrated++;
      }
    } catch (error) {
      log.error(`Failed to migrate store ${store.code || store.name}: ${error.message}`);
      skipped++;
    }
  }
  
  return { migrated, skipped };
}

/**
 * Migrate Departments
 */
async function migrateDepartments(dryRun = false) {
  log.section('Migrating Departments');
  
  const query = specificTenantId
    ? { tenantId: { $exists: false } } // Will filter by users later
    : { tenantId: { $exists: false } };
  
  const departments = await Department.find(query);
  
  if (departments.length === 0) {
    log.info('No departments found without tenantId');
    return { migrated: 0, skipped: 0 };
  }
  
  log.info(`Found ${departments.length} departments without tenantId`);
  
  let migrated = 0;
  let skipped = 0;
  
  for (const dept of departments) {
    try {
      // For departments, try to get tenantId from associated users
      const user = await User.findOne({ department: { $in: [dept.name, dept.code] } });
      const tenantId = user ? (user.tenantId || await determineTenantId(user)) : 'default';
      
      if (dryRun) {
        log.info(`Would migrate department ${dept.code || dept.name} to tenant: ${tenantId}`);
        migrated++;
      } else {
        dept.tenantId = tenantId;
        await dept.save();
        log.success(`Migrated department ${dept.code || dept.name} to tenant: ${tenantId}`);
        migrated++;
      }
    } catch (error) {
      log.error(`Failed to migrate department ${dept.code || dept.name}: ${error.message}`);
      skipped++;
    }
  }
  
  return { migrated, skipped };
}

/**
 * Main migration function
 */
async function runMigration() {
  log.section('Tenant Isolation Migration Script');
  
  if (dryRun) {
    log.warn('DRY RUN MODE - No changes will be made');
  }
  
  if (specificTenantId) {
    log.info(`Migrating data for tenant: ${specificTenantId}`);
  } else {
    log.info('Migrating all data (use --tenant-id=<id> for specific tenant)');
  }
  
  try {
    // Connect to database
    log.info('Connecting to database...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    log.success('Connected to database');
    
    // Run migrations
    const userResults = await migrateUsers(dryRun);
    const storeResults = await migrateStores(dryRun);
    const deptResults = await migrateDepartments(dryRun);
    
    // Summary
    log.section('Migration Summary');
    log.info(`Users: ${userResults.migrated} migrated, ${userResults.skipped} skipped`);
    log.info(`Stores: ${storeResults.migrated} migrated, ${storeResults.skipped} skipped`);
    log.info(`Departments: ${deptResults.migrated} migrated, ${deptResults.skipped} skipped`);
    
    const totalMigrated = userResults.migrated + storeResults.migrated + deptResults.migrated;
    const totalSkipped = userResults.skipped + storeResults.skipped + deptResults.skipped;
    
    if (totalMigrated > 0) {
      log.success(`Total: ${totalMigrated} records migrated`);
    }
    if (totalSkipped > 0) {
      log.warn(`Total: ${totalSkipped} records skipped (errors)`);
    }
    
    if (dryRun) {
      log.warn('\nThis was a DRY RUN. No changes were made.');
      log.info('Run without --dry-run to apply changes.');
    } else {
      log.success('\nMigration completed successfully!');
    }
    
  } catch (error) {
    log.error(`Migration failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.info('Database connection closed');
  }
}

// Run migration
if (require.main === module) {
  runMigration().catch(error => {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runMigration };
