const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://lenstrack-admin:TR1wVFdBUy1MZW5zdHJhY2stMjAyNA%3D%3D@lenstrack-docdb-cluster.cluster-cl002m0xqjq0x.ap-south-1.docdb.amazonaws.com:27017/etelios?tls=true&tlsInsecure=false&replicaSet=rs0&readPreference=secondaryPreferred&authSource=admin&authMechanism=SCRAM-SHA-1&retryWrites=false';

async function dropRosterUniqueIndex() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('rosters');

    // Get existing indexes
    console.log('📋 Current indexes on rosters collection:');
    const indexes = await collection.indexes();
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(UNIQUE)' : ''}`);
    });
    console.log('');

    // Drop the old unique index
    const indexToDrop = 'unique_employee_date_shift';
    try {
      console.log(`🗑️  Attempting to drop index: ${indexToDrop}`);
      await collection.dropIndex(indexToDrop);
      console.log(`✅ Successfully dropped index: ${indexToDrop}\n`);
    } catch (error) {
      if (error.codeName === 'IndexNotFound') {
        console.log(`⚠️  Index ${indexToDrop} not found (already dropped or never existed)\n`);
      } else {
        throw error;
      }
    }

    // Verify indexes after drop
    console.log('📋 Indexes after drop:');
    const indexesAfter = await collection.indexes();
    indexesAfter.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(UNIQUE)' : ''}`);
    });

    console.log('\n✅ Index drop completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

dropRosterUniqueIndex();
