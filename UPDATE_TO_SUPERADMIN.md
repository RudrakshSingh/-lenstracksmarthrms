# Update Admin to Superadmin

The user `admin@upcapto.com` currently has role `admin` but needs to be `superadmin` to create tenants and tenant admin users.

## Current Status

✅ **User exists and can login**
- Email: `admin@upcapto.com`
- Password: `Upcapto@2026`
- Current Role: `admin`
- Tenant: `upcapto`
- User ID: `69a2d01d9e398516d1e75fe0`

## Methods to Update to Superadmin

### Method 1: MongoDB Direct Update (Recommended if you have MongoDB access)

If you have access to MongoDB (via MongoDB Compass, Studio 3T, or mongo shell), run:

```javascript
// Connect to MongoDB and switch to etelios database
use etelios

// Update user role to superadmin
db.users.updateOne(
  { tenantId: "upcapto", email: "admin@upcapto.com" },
  { 
    $set: { 
      role: "superadmin",
      designation: "Super Administrator",
      updatedAt: new Date()
    }
  }
)
```

### Method 2: Kubernetes Exec (if MongoDB client is in pod)

```bash
# Find a pod with MongoDB access
POD=$(kubectl get pods -n etelios-prod -l app=auth-service -o jsonpath='{.items[0].metadata.name}')

# Run MongoDB update command
kubectl exec -n etelios-prod $POD -- mongosh --eval "
  db = db.getSiblingDB('etelios');
  db.users.updateOne(
    { tenantId: 'upcapto', email: 'admin@upcapto.com' },
    { \$set: { role: 'superadmin', designation: 'Super Administrator', updatedAt: new Date() } }
  );
"
```

Or use the provided script:
```bash
./scripts/update-admin-to-superadmin-k8s.sh
```

### Method 3: Node.js Script (if you have MongoDB URI with proper SSL)

```bash
MONGODB_URI="mongodb://user:password@host:27017/etelios?ssl=true&..." \
node scripts/update-admin-to-superadmin.js
```

**Note:** Azure Cosmos DB requires proper SSL certificate handling, which may not work from local machine.

### Method 4: Create a Kubernetes Job

Create a one-time Kubernetes job that runs the update script inside the cluster where it has proper network access to MongoDB.

## After Update

Once the user role is updated to `superadmin`, you can:

1. **Login** with:
   - Email: `admin@upcapto.com`
   - Password: `Upcapto@2026`
   - Tenant: `upcapto`

2. **Create Tenants**:
   ```bash
   POST /api/tenants
   Authorization: Bearer <token>
   x-tenant-id: upcapto
   
   {
     "name": "New Company",
     "email": "contact@newcompany.com",
     "domain": "newcompany.com",
     "phone": "+91-9876543210",
     "city": "Mumbai",
     "state": "Maharashtra",
     "country": "India",
     "plan": "Basic"
   }
   ```

3. **Tenant Admin Users** are automatically created when you create a tenant:
   - Admin user with temporary password
   - Super admin user with temporary password
   - Both users must change password on first login

## Verification

After updating, verify the role change:

```bash
# Login and check user role
curl -X POST http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upcapto.com","password":"Upcapto@2026"}' | jq '.data.user.role'
```

Should return: `"superadmin"`
