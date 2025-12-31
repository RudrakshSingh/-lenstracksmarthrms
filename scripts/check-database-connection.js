#!/usr/bin/env node

/**
 * Script to check which database the HR service is connected to
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './microservices/hr-service/.env' });

async function checkDatabase() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Database Connection Check');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('Environment Variables:');
    console.log(`  MONGO_URI: ${mongoUri ? 'SET' : 'NOT SET'}`);
    console.log(`  MONGODB_URI: ${process.env.MONGODB_URI ? 'SET' : 'NOT SET'}`);
    console.log(`  DB_NAME: ${process.env.DB_NAME || 'NOT SET'}`);
    console.log(`  SERVICE_NAME: ${process.env.SERVICE_NAME || 'NOT SET'}`);
    console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}\n`);
    
    if (!mongoUri) {
      const fallbackUri = `mongodb://localhost:27017/etelios_${process.env.SERVICE_NAME || 'hr_service'}`;
      console.log(`⚠️  No MONGO_URI set. Would use fallback: ${fallbackUri}\n`);
    } else {
      // Extract database name from URI
      const dbNameMatch = mongoUri.match(/\/([^/?]*)/);
      const dbNameFromUri = dbNameMatch ? dbNameMatch[1] : 'unknown';
      
      console.log('Connection String Analysis:');
      console.log(`  Database Name (from URI): ${dbNameFromUri}`);
      
      // Mask sensitive parts of URI
      const maskedUri = mongoUri.replace(/(:\/\/[^:]+:)([^@]+)(@)/, '$1****$3');
      console.log(`  Connection String: ${maskedUri}\n`);
      
      // Try to connect and get actual database name
      try {
        await mongoose.connect(mongoUri, {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000
        });
        
        const actualDbName = mongoose.connection.name;
        const host = mongoose.connection.host;
        const port = mongoose.connection.port;
        
        console.log('✅ Connection Successful!');
        console.log(`  Actual Database Name: ${actualDbName}`);
        console.log(`  Host: ${host}`);
        console.log(`  Port: ${port}`);
        console.log(`  Ready State: ${mongoose.connection.readyState} (1=connected)\n`);
        
        // Check collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`Collections in database (${collections.length}):`);
        collections.forEach(col => {
          console.log(`  - ${col.name}`);
        });
        
        // Check Users collection
        if (collections.some(c => c.name === 'users')) {
          const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
          const userCount = await User.countDocuments();
          console.log(`\n📊 Users in database: ${userCount}`);
          
          if (userCount > 0) {
            const sampleUsers = await User.find().limit(5).select('email employeeId firstName lastName').lean();
            console.log('\nSample users:');
            sampleUsers.forEach((user, idx) => {
              console.log(`  ${idx + 1}. ${user.email || 'N/A'} (${user.employeeId || 'N/A'}) - ${user.firstName || ''} ${user.lastName || ''}`);
            });
          }
        }
        
        await mongoose.disconnect();
      } catch (connectError) {
        console.error('❌ Connection Failed:', connectError.message);
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  Recommendations');
    console.log('═══════════════════════════════════════════════════════\n');
    
    if (!mongoUri) {
      console.log('⚠️  Set MONGO_URI environment variable to connect to production database');
      console.log('   Example: export MONGO_URI="mongodb://host:port/database_name"\n');
    }
    
    if (mongoUri && mongoUri.includes('test')) {
      console.log('⚠️  WARNING: Connection string contains "test" - you may be connected to test database!');
      console.log('   Check your MONGO_URI environment variable\n');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();

