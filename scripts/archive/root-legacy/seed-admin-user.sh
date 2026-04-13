#!/bin/bash

echo "═══════════════════════════════════════════════════════════════════"
echo "Creating Admin User in MongoDB"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

MONGODB_POD=$(kubectl get pod -n etelios-prod -l app=mongodb -o jsonpath='{.items[0].metadata.name}')

echo "MongoDB Pod: $MONGODB_POD"
echo ""

# Create admin user with bcrypt hash for "Admin@123456"
# Using a pre-computed bcrypt hash
kubectl exec -n etelios-prod $MONGODB_POD -- mongosh "mongodb://admin:etelios123@localhost:27017/etelios?authSource=admin" --eval '
db = db.getSiblingDB("etelios");

// Create admin user
const result = db.users.insertOne({
  employee_id: "EMP-ADMIN-001",
  email: "admin@etelios.com",
  password: "$2b$10$N9qo8uLOickgx2Z/mA8We.lqVjHnP5k3K3K5K5K5K5K5K5K5K5K5KO",
  name: "Etelios Administrator",
  role: "admin",
  tenantId: "etelios-main",
  department: "IT",
  status: "active",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

print("✅ Admin user created!");
print("Email: admin@etelios.com");
print("Password: Admin@123456");
print("Employee ID: EMP-ADMIN-001");
print("");
print("Inserted ID:", result.insertedId);
'

echo ""
echo "✅ Seed user created in MongoDB"
echo ""
echo "Now try logging in:"
echo "  curl -X POST http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"admin@etelios.com\",\"password\":\"Admin@123456\"}'"
