#!/bin/bash

###############################################################################
# Generate Token for Frontend Dev
# This script generates a valid JWT token for API testing
###############################################################################

GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}🔑 Generating Token for Frontend Dev${NC}"
echo "===================================="
echo ""

TENANT_ID="apitest1771147024"
EMAIL="admin@apitest1771147024.com"

TOKEN=$(kubectl exec -n etelios-prod $(kubectl get pods -n etelios-prod | grep auth-service | grep Running | head -1 | awk '{print $1}') -- node -e "
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:etelios123@mongodb.etelios-prod.svc.cluster.local:27017/etelios?authSource=admin';
const JWT_SECRET = process.env.JWT_SECRET || 'etelios-super-secret-jwt-key-2024';
(async () => {
  await mongoose.connect(MONGODB_URI);
  const User = require('/app/src/models/User.model');
  const user = await User.findOne({ tenantId: '$TENANT_ID', email: '$EMAIL' });
  if (user) {
    const token = jwt.sign({ 
      userId: user._id.toString(), 
      role: user.role, 
      tenantId: user.tenantId, 
      employee_id: user.employee_id 
    }, JWT_SECRET, { expiresIn: '24h' });
    console.log(token);
  }
  await mongoose.connection.close();
})();
" 2>/dev/null | tail -1)

if [ ! -z "$TOKEN" ]; then
    echo "✅ Token Generated!"
    echo ""
    echo "===================================="
    echo "🔐 FRONTEND DEV CREDENTIALS"
    echo "===================================="
    echo ""
    echo "API Base URL:"
    echo "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
    echo ""
    echo "Token (Use this in Authorization header):"
    echo "$TOKEN"
    echo ""
    echo "Tenant ID (Use in x-tenant-id header):"
    echo "$TENANT_ID"
    echo ""
    echo "User Email:"
    echo "$EMAIL"
    echo ""
    echo "===================================="
    echo "📋 Quick Test:"
    echo "===================================="
    echo ""
    echo "curl -X GET \\"
    echo "  http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/hr/employees \\"
    echo "  -H \"Authorization: Bearer $TOKEN\" \\"
    echo "  -H \"x-tenant-id: $TENANT_ID\""
    echo ""
else
    echo "❌ Could not generate token"
fi
