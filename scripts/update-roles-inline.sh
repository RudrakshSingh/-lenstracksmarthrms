#!/bin/bash

# Update Rudi and Aditya to Manager role using inline MongoDB command
# Runs directly in auth-service pod

echo "🔍 Finding auth-service pod..."
POD=$(kubectl get pods -n etelios-prod -l app=auth-service -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD" ]; then
  echo "❌ No auth-service pod found"
  exit 1
fi

echo "✅ Found pod: $POD"
echo "🚀 Updating user roles..."

# Create inline Node.js script that uses mongoose from the service
kubectl exec -n etelios-prod $POD -- node -e "
const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

(async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      tls: true,
      retryWrites: false,
      serverSelectionTimeoutMS: 10000
    });
    
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    
    // Update Rudi
    const rudi = await User.findOneAndUpdate(
      { email: /rudi/i, tenantId: 'upcapto' },
      { \$set: { role: 'manager' } },
      { new: true }
    );
    
    if (rudi) {
      console.log('✅ Rudi updated to Manager:', rudi.email, rudi.tenantId, rudi.role);
    } else {
      console.log('⚠️  Rudi not found');
    }
    
    // Update Aditya
    const aditya = await User.findOneAndUpdate(
      { email: /aditya/i, tenantId: 'eyekra' },
      { \$set: { role: 'manager' } },
      { new: true }
    );
    
    if (aditya) {
      console.log('✅ Aditya updated to Manager:', aditya.email, aditya.tenantId, aditya.role);
    } else {
      console.log('⚠️  Aditya not found');
    }
    
    await mongoose.disconnect();
    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
"

echo "✅ Script completed!"
