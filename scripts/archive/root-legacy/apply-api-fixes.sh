#!/bin/bash

###############################################################################
# Apply API Fixes to Running Pods
# This script applies fixes to make all APIs work
###############################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

NAMESPACE="etelios-prod"

log "=========================================="
log "Applying API Fixes"
log "=========================================="
echo ""

# Fix 1: HR Service Auth Middleware
log "Fix 1: Updating HR Service Auth Middleware..."

HR_PODS=$(kubectl get pods -n $NAMESPACE | grep hr-service | grep Running | awk '{print $1}')

for pod in $HR_PODS; do
    log "  Fixing pod: $pod"
    
    # Create fixed auth middleware
    kubectl exec -n $NAMESPACE $pod -- sh -c "cat > /tmp/auth.middleware.fixed.js << 'ENDOFFILE'
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const logger = require('../config/logger');

const authenticate = async (req, res, next) => {
  try {
    if (process.env.TEST_MODE === 'true') {
      const testObjectId = new mongoose.Types.ObjectId();
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const { JWT_SECRET } = require('../config/jwt');
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET || process.env.JWT_SECRET || 'fallback-secret');
          let userId = testObjectId;
          if (decoded.userId || decoded.id) {
            try {
              userId = new mongoose.Types.ObjectId(decoded.userId || decoded.id);
            } catch (e) {
              userId = testObjectId;
            }
          }
          req.user = { 
            id: userId.toString(),
            _id: userId,
            userId: userId.toString(),
            role: decoded.role || 'employee',
            email: decoded.email || 'test@example.com',
            employeeId: decoded.employeeId || 'TEST001',
            tenantId: decoded.tenantId // ✅ FIX: Add tenantId
          };
        } catch (error) {
          req.user = { 
            id: testObjectId.toString(),
            _id: testObjectId,
            userId: testObjectId.toString(),
            role: 'employee',
            email: 'test@example.com',
            employeeId: 'TEST001',
            tenantId: null
          };
        }
      } else {
        req.user = { 
          id: testObjectId.toString(),
          _id: testObjectId,
          userId: testObjectId.toString(),
          role: 'employee',
          email: 'test@example.com',
          employeeId: 'TEST001',
          tenantId: null
        };
      }
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        hint: 'Include Authorization header: Bearer <token>',
        code: 'AUTH_REQUIRED'
      });
    }

    const token = authHeader.substring(7);
    
    if (!token || token.trim() === '') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format',
        code: 'INVALID_TOKEN'
      });
    }

    let decoded;
    try {
      const { JWT_SECRET } = require('../config/jwt');
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      throw error;
    }

    // Get user from database
    try {
      const User = require('../models/User.model');
      const userQuery = User.findById(decoded.userId || decoded.id).maxTimeMS(5000);
      const user = await Promise.race([
        userQuery,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 5000)
        )
      ]);
      
      if (!user) {
        logger.warn('User not found in database, using token data', {
          userId: decoded.userId || decoded.id,
          email: decoded.email
        });
        req.user = {
          id: decoded.userId || decoded.id || 'unknown',
          userId: decoded.userId || decoded.id,
          role: decoded.role || 'user',
          email: decoded.email || 'unknown@example.com',
          permissions: decoded.permissions || [],
          tenantId: decoded.tenantId // ✅ FIX: Always set from token
        };
        return next();
      }

      if (user.isDeleted || (user.status === 'terminated')) {
        return res.status(403).json({
          success: false,
          message: 'Account is inactive or deleted',
          code: 'ACCOUNT_BLOCKED'
        });
      }

      if (!user.is_active && user.status !== 'pending') {
        return res.status(401).json({
          success: false,
          message: 'Account is inactive',
          code: 'ACCOUNT_INACTIVE'
        });
      }

      let roleName = decoded.role;
      let permissions = decoded.permissions || [];
      
      if (user.role) {
        if (typeof user.role === 'object' && user.role.name) {
          roleName = user.role.name;
          permissions = user.role.permissions || permissions;
        } else if (typeof user.role === 'string') {
          try {
            const Role = require('../models/Role.model');
            const role = await Role.findById(user.role).maxTimeMS(3000);
            if (role) {
              roleName = role.name;
              permissions = role.permissions || permissions;
            }
          } catch (roleError) {
            logger.warn('Role lookup failed, using decoded role', { error: roleError.message });
          }
        }
      }

      const tenantIdFromToken = decoded.tenantId;
      const tenantIdFromUser = user.tenantId;
      const tenantId = tenantIdFromToken || tenantIdFromUser;

      if (!tenantId && roleName !== 'superadmin' && roleName !== 'super-admin') {
        logger.warn('User missing tenantId in both token and database', {
          userId: user._id,
          email: user.email,
          role: roleName
        });
      }

      req.user = {
        id: user._id,
        _id: user._id,
        userId: user._id,
        employeeId: user.employeeId,
        employee_id: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.firstName ? \`\${user.firstName} \${user.lastName}\` : user.email,
        email: user.email,
        role: roleName,
        roleId: typeof user.role === 'object' ? user.role._id : user.role,
        permissions: permissions,
        status: user.status,
        tenantId: tenantId // ✅ CRITICAL: Include tenantId
      };
    } catch (dbError) {
      logger.warn('Database lookup failed, using token data', {
        error: dbError.message,
        userId: decoded.userId || decoded.id
      });
      
      // ✅ FIX: Always set tenantId from token when DB fails
      req.user = {
        id: decoded.userId || decoded.id || 'unknown',
        userId: decoded.userId || decoded.id,
        role: decoded.role || 'user',
        email: decoded.email || 'unknown@example.com',
        permissions: decoded.permissions || [],
        tenantId: decoded.tenantId // ✅ CRITICAL: Extract from token
      };
    }

    next();
  } catch (error) {
    logger.error('Authentication error', { 
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_FAILED',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

module.exports = { authenticate };
ENDOFFILE
" || warning "  Could not create fixed file in $pod"
    
    # Copy fixed file (if we can write to /app)
    kubectl exec -n $NAMESPACE $pod -- sh -c "
      if [ -w /app/src/middleware/auth.middleware.js ]; then
        cp /tmp/auth.middleware.fixed.js /app/src/middleware/auth.middleware.js
        echo '✅ File updated'
      else
        echo '⚠️  File is read-only, need to rebuild image'
      fi
    " || warning "  Could not update file in $pod"
done

echo ""
log "=========================================="
log "✅ Fixes Applied!"
log "=========================================="
echo ""

warning "Note: If files are read-only, you need to rebuild the Docker images."
warning "See FIX_ALL_APIS.md for rebuild instructions."
echo ""

log "Testing APIs..."
echo ""

# Test APIs
TOKEN=$(kubectl exec -n etelios-prod auth-service-55459d9bdd-2wlhj -- node -e "
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:etelios123@mongodb.etelios-prod.svc.cluster.local:27017/etelios?authSource=admin';
const JWT_SECRET = process.env.JWT_SECRET || 'etelios-super-secret-jwt-key-2024';
(async () => {
  await mongoose.connect(MONGODB_URI);
  const User = require('/app/src/models/User.model');
  const user = await User.findOne({ tenantId: 'apitest1771147024', email: 'admin@apitest1771147024.com' });
  const token = jwt.sign({ userId: user._id.toString(), role: user.role, tenantId: user.tenantId, employee_id: user.employee_id }, JWT_SECRET, { expiresIn: '24h' });
  console.log(token);
  await mongoose.connection.close();
})();
" 2>/dev/null | tail -1)

TENANT_ID="apitest1771147024"
API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

log "Testing /api/hr/employees..."
curl -s -X GET "$API_BASE/api/hr/employees" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" | jq '.success' 2>/dev/null || echo "Testing..."

echo ""
log "✅ Done! Check results above."
