#!/bin/bash

# Update admin user to superadmin role via kubectl exec into MongoDB pod
# This script execs into a pod and runs MongoDB update command

NAMESPACE="${NAMESPACE:-etelios-prod}"
ADMIN_EMAIL="admin@upcapto.com"
TENANT_ID="upcapto"

echo "🚀 Updating Admin to Superadmin via Kubernetes..."
echo "====================================="
echo ""

# Find a pod with MongoDB access (auth-service or hr-service)
echo "🔍 Finding pod with MongoDB access..."
POD=$(kubectl get pods -n "$NAMESPACE" -l app=auth-service -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

if [ -z "$POD" ]; then
  POD=$(kubectl get pods -n "$NAMESPACE" -l app=hr-service -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
fi

if [ -z "$POD" ]; then
  echo "❌ No suitable pod found"
  echo "   Looking for auth-service or hr-service pods"
  exit 1
fi

echo "✅ Found pod: $POD"
echo ""

# MongoDB update command
# Users are stored in the "users" collection in the "etelios" database
MONGO_UPDATE_SCRIPT="
db = db.getSiblingDB('etelios');
var user = db.users.findOne({ tenantId: '$TENANT_ID', email: '$ADMIN_EMAIL' });
if (!user) {
  print('❌ User not found: $ADMIN_EMAIL');
  quit(1);
}
print('✅ Found user: ' + (user.name || user.email));
print('   Current role: ' + user.role);
if (user.role === 'superadmin') {
  print('✅ User is already a superadmin!');
  quit(0);
}
var result = db.users.updateOne(
  { tenantId: '$TENANT_ID', email: '$ADMIN_EMAIL' },
  { 
    \$set: { 
      role: 'superadmin',
      designation: 'Super Administrator',
      updatedAt: new Date()
    }
  }
);
if (result.modifiedCount > 0) {
  print('✅ User updated to superadmin successfully!');
  print('');
  print('🔐 Login Credentials:');
  print('   Email: $ADMIN_EMAIL');
  print('   Password: (existing password)');
  print('   Tenant: $TENANT_ID');
  print('   Role: superadmin');
} else {
  print('❌ Failed to update user');
  quit(1);
}
"

echo "🔄 Updating user role in MongoDB..."
echo ""

# Execute MongoDB command via kubectl exec
# Try to find mongosh or mongo command in the pod
kubectl exec -n "$NAMESPACE" "$POD" -- sh -c "
  if command -v mongosh >/dev/null 2>&1; then
    echo 'Using mongosh...'
    mongosh --quiet --eval \"$MONGO_UPDATE_SCRIPT\"
  elif command -v mongo >/dev/null 2>&1; then
    echo 'Using mongo...'
    mongo --quiet --eval \"$MONGO_UPDATE_SCRIPT\"
  else
    echo '❌ MongoDB client not found in pod'
    echo '💡 Alternative: Use node script with MONGODB_URI'
    exit 1
  fi
" 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "✅ Done!"
  echo ""
  echo "📝 Next Steps:"
  echo "   1. Login with: $ADMIN_EMAIL / (your password)"
  echo "   2. Create tenants: POST /api/tenants"
  echo "   3. Create tenant admin users (automatically created when creating tenants)"
else
  echo ""
  echo "❌ Update failed"
  echo ""
  echo "💡 Alternative methods:"
  echo "   1. Use MongoDB Compass or Studio 3T to connect and update manually"
  echo "   2. Use node script: MONGODB_URI='...' node scripts/update-admin-to-superadmin.js"
  echo "   3. Connect to MongoDB directly and run the update command"
fi

exit $EXIT_CODE
