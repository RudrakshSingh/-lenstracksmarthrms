#!/usr/bin/env node
/**
 * Count Stores in Database
 * 
 * This script counts the total number of stores in the database
 * using direct MongoDB connection or API endpoint.
 * 
 * Usage:
 *   node scripts/count-stores.js [--api] [--tenant=<tenantId>]
 * 
 * Options:
 *   --api: Use API endpoint instead of direct DB connection
 *   --tenant=<tenantId>: Filter by tenant ID
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || process.env.MONGO_DB_NAME || 'hr-db';
const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api';

// Parse command line arguments
const args = process.argv.slice(2);
const useAPI = args.includes('--api');
const tenantArg = args.find(arg => arg.startsWith('--tenant='));
const tenantId = tenantArg ? tenantArg.split('=')[1] : null;

// Load Store model
const Store = require(path.join(__dirname, '..', 'microservices', 'hr-service', 'src', 'models', 'Store.model.js'));

async function connectDB() {
  try {
    if (!MONGO_URI || !MONGO_URI.startsWith('mongodb://')) {
      throw new Error('MONGODB_URI not set or invalid. Must start with mongodb://');
    }

    console.log('🔌 Connecting to database...');
    console.log(`   Database: ${DB_NAME}`);
    
    const maskedUri = MONGO_URI.replace(/:[^:@]+@/, ':****@');
    const host = maskedUri.split('@')[1]?.split('/')[0] || maskedUri.split('@')[1]?.split('?')[0] || 'N/A';
    console.log(`   Host: ${host}`);

    await mongoose.connect(MONGO_URI, {
      dbName: DB_NAME,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      retryWrites: false,
      tls: MONGO_URI.includes('cosmos') || MONGO_URI.includes('docdb'),
      tlsAllowInvalidCertificates: false
    });

    console.log('✅ Connected to database:', mongoose.connection.db.databaseName);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function countStoresFromDB() {
  try {
    console.log('\n📊 Counting stores from database...');
    
    // Build query
    const query = { isDeleted: { $ne: true } };
    if (tenantId) {
      query.tenantId = tenantId;
      console.log(`   Filtering by tenant: ${tenantId}`);
    }

    // Count total stores
    const totalCount = await Store.countDocuments(query);
    
    // Count by status
    const activeCount = await Store.countDocuments({ ...query, status: 'active', is_active: true });
    const inactiveCount = await Store.countDocuments({ ...query, status: 'inactive' });
    const maintenanceCount = await Store.countDocuments({ ...query, status: 'maintenance' });
    const closedCount = await Store.countDocuments({ ...query, status: 'closed' });
    
    // Count by tenant
    const tenantCounts = await Store.aggregate([
      { $match: query },
      { $group: { _id: '$tenantId', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Count by store type
    const typeCounts = await Store.aggregate([
      { $match: query },
      { $group: { _id: '$store_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\n' + '='.repeat(80));
    console.log('📈 STORE STATISTICS');
    console.log('='.repeat(80));
    console.log(`\n✅ Total Stores: ${totalCount}`);
    console.log(`\n📊 By Status:`);
    console.log(`   Active: ${activeCount}`);
    console.log(`   Inactive: ${inactiveCount}`);
    console.log(`   Maintenance: ${maintenanceCount}`);
    console.log(`   Closed: ${closedCount}`);

    if (tenantCounts.length > 0) {
      console.log(`\n🏢 By Tenant:`);
      tenantCounts.forEach(t => {
        console.log(`   ${t._id || 'default'}: ${t.count}`);
      });
    }

    if (typeCounts.length > 0) {
      console.log(`\n🏪 By Store Type:`);
      typeCounts.forEach(t => {
        console.log(`   ${t._id || 'N/A'}: ${t.count}`);
      });
    }

    // Get sample stores
    const sampleStores = await Store.find(query).limit(5).select('name code tenantId status store_type').lean();
    if (sampleStores.length > 0) {
      console.log(`\n📋 Sample Stores (first 5):`);
      sampleStores.forEach((store, idx) => {
        console.log(`   ${idx + 1}. ${store.name} (${store.code}) - ${store.tenantId} - ${store.status}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    
    return {
      total: totalCount,
      active: activeCount,
      inactive: inactiveCount,
      maintenance: maintenanceCount,
      closed: closedCount,
      byTenant: tenantCounts,
      byType: typeCounts
    };
  } catch (error) {
    console.error('❌ Error counting stores:', error.message);
    throw error;
  }
}

async function countStoresFromAPI() {
  try {
    console.log('\n📊 Counting stores from API...');
    console.log(`   API Base: ${API_BASE}`);

    // Try to login first (optional, some endpoints might be public)
    let token = null;
    let tenantIdForAPI = tenantId;

    // Use appropriate credentials based on tenant
    let loginEmail = process.env.EMAIL || 'admin@lenstrack.com';
    let loginPassword = process.env.PASSWORD || 'AdminPass123!';
    
    if (tenantId === 'upcapto') {
      loginEmail = 'admin@upcapto.com';
      loginPassword = 'Upcapto@2026';
    }

    try {
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
          tenantId: tenantIdForAPI || tenantId
        })
      });

      if (loginRes.ok) {
        const loginData = await loginRes.json();
        token = loginData.accessToken || loginData.data?.accessToken;
        const user = loginData.user || loginData.data?.user || loginData.data;
        tenantIdForAPI = tenantIdForAPI || user?.tenantId || user?.tenant_id;
        console.log('✅ Logged in successfully');
      }
    } catch (error) {
      console.log('⚠️  Could not login, trying without auth...');
    }

    // Fetch stores
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (tenantIdForAPI) {
      headers['X-Tenant-Id'] = tenantIdForAPI;
    }

    const url = `${API_BASE}/hr/stores?limit=1000${tenantIdForAPI ? `&tenantId=${tenantIdForAPI}` : ''}`;
    console.log(`   Fetching: ${url}`);

    const response = await fetch(url, { headers });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${data.message || JSON.stringify(data)}`);
    }

    const stores = data.data?.stores || data.data || (Array.isArray(data.data) ? data.data : []);
    const total = data.pagination?.total || stores.length;

    console.log('\n' + '='.repeat(80));
    console.log('📈 STORE STATISTICS (from API)');
    console.log('='.repeat(80));
    console.log(`\n✅ Total Stores: ${total}`);
    
    if (stores.length > 0) {
      const activeCount = stores.filter(s => s.status === 'active' && s.is_active !== false).length;
      const inactiveCount = stores.filter(s => s.status === 'inactive').length;
      
      console.log(`\n📊 By Status:`);
      console.log(`   Active: ${activeCount}`);
      console.log(`   Inactive: ${inactiveCount}`);
      
      const tenantGroups = {};
      stores.forEach(store => {
        const tid = store.tenantId || 'default';
        tenantGroups[tid] = (tenantGroups[tid] || 0) + 1;
      });
      
      if (Object.keys(tenantGroups).length > 0) {
        console.log(`\n🏢 By Tenant:`);
        Object.entries(tenantGroups).forEach(([tid, count]) => {
          console.log(`   ${tid}: ${count}`);
        });
      }

      console.log(`\n📋 Sample Stores (first 5):`);
      stores.slice(0, 5).forEach((store, idx) => {
        console.log(`   ${idx + 1}. ${store.name} (${store.code}) - ${store.tenantId || 'N/A'} - ${store.status || 'N/A'}`);
      });
    }

    console.log('\n' + '='.repeat(80));

    return { total, stores };
  } catch (error) {
    console.error('❌ Error fetching stores from API:', error.message);
    throw error;
  }
}

async function main() {
  try {
    if (useAPI) {
      await countStoresFromAPI();
    } else {
      const connected = await connectDB();
      if (!connected) {
        console.log('\n⚠️  Falling back to API method...');
        await countStoresFromAPI();
        return;
      }

      const stats = await countStoresFromDB();
      
      // Close connection
      await mongoose.connection.close();
      console.log('\n✅ Database connection closed');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { countStoresFromDB, countStoresFromAPI };
