#!/usr/bin/env node

/**
 * Script to verify database name logic without connecting
 */

require('dotenv').config({ path: './microservices/hr-service/.env' });

function verifyDatabaseName() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Database Name Verification');
  console.log('═══════════════════════════════════════════════════════\n');
  
  let mongoUri = process.env.MONGO_URI;
  const dbName = process.env.DB_NAME || process.env.MONGO_DB_NAME;
  
  console.log('Environment Variables:');
  console.log(`  MONGO_URI: ${mongoUri ? 'SET' : 'NOT SET'}`);
  console.log(`  DB_NAME: ${dbName || 'NOT SET'}`);
  console.log(`  MONGO_DB_NAME: ${process.env.MONGO_DB_NAME || 'NOT SET'}\n`);
  
  if (!mongoUri) {
    console.log('⚠️  No MONGO_URI set. Would use fallback with default database.\n');
    return;
  }
  
  // Check if database name is in URI
  const hasDbName = mongoUri.match(/\/[^/?]+(\?|$)/);
  const dbNameFromUri = hasDbName ? mongoUri.match(/\/([^/?]+)/)[1] : null;
  
  console.log('Current Connection String Analysis:');
  console.log(`  Has Database Name: ${hasDbName ? 'YES' : 'NO'}`);
  if (dbNameFromUri) {
    console.log(`  Database Name in URI: ${dbNameFromUri}`);
    if (dbNameFromUri.toLowerCase().includes('test')) {
      console.log(`  ⚠️  WARNING: Database name contains "test"!`);
    }
  }
  
  // Simulate the logic from server.js
  console.log('\nSimulating Database Name Logic:');
  let finalUri = mongoUri;
  let finalDbName = null;
  
  if (dbName && !mongoUri.includes(`/${dbName}`) && !mongoUri.includes(`/${dbName}?`)) {
    if (mongoUri.includes('?')) {
      finalUri = mongoUri.replace('?', `/${dbName}?`);
    } else {
      finalUri = `${mongoUri}/${dbName}`;
    }
    finalDbName = dbName;
    console.log(`  ✅ DB_NAME env var found: ${dbName}`);
    console.log(`  → Will add to connection string`);
  } else if (!hasDbName) {
    const defaultDbName = process.env.MONGO_DB_NAME || 'etelios_hr_service';
    
    if (defaultDbName.toLowerCase().includes('test')) {
      console.log(`  ⚠️  ERROR: Default database name contains "test"!`);
      console.log(`  → Will use 'etelios_hr_service' instead`);
      finalDbName = 'etelios_hr_service';
    } else {
      finalDbName = defaultDbName;
      console.log(`  ✅ No database name in URI, using default: ${defaultDbName}`);
    }
    
    if (mongoUri.includes('?')) {
      finalUri = mongoUri.replace('?', `/${finalDbName}?`);
    } else {
      finalUri = `${mongoUri}/${finalDbName}`;
    }
  } else {
    finalDbName = dbNameFromUri;
    console.log(`  ✅ Database name already in URI: ${dbNameFromUri}`);
  }
  
  // Extract final database name
  const finalDbNameMatch = finalUri.match(/\/([^/?]+)/);
  const actualFinalDbName = finalDbNameMatch ? finalDbNameMatch[1] : 'unknown';
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Result');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log(`Final Database Name: ${actualFinalDbName}`);
  
  if (actualFinalDbName.toLowerCase().includes('test')) {
    console.log('\n❌ ERROR: Final database name contains "test"!');
    console.log('   This will connect to TEST database, not MAIN database!');
    console.log('\nFix: Set DB_NAME or MONGO_DB_NAME to main database name:');
    console.log('   export DB_NAME=etelios_hr_service');
  } else if (actualFinalDbName === 'etelios_hr_service' || actualFinalDbName === 'etelios_hrms') {
    console.log('\n✅ GOOD: Database name looks correct for main production database');
  } else {
    console.log(`\n⚠️  WARNING: Database name is "${actualFinalDbName}"`);
    console.log('   Verify this is the correct main production database name');
  }
  
  // Mask password in final URI
  const maskedFinalUri = finalUri.replace(/(:\/\/[^:]+:)([^@]+)(@)/, '$1****$3');
  console.log(`\nFinal Connection String: ${maskedFinalUri}`);
}

verifyDatabaseName();

