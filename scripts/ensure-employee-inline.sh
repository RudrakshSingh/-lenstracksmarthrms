#!/bin/bash
# Inline script to ensure employee with store - works for any tenant
# Usage: ./ensure-employee-inline.sh <email> <employeeId> <tenantId> [firstName] [lastName]

EMAIL=${1:-"rudi@gmail.com"}
EMPLOYEE_ID=${2:-"EMP-2026-886706"}
TENANT_ID=${3:-"default"}
FIRST_NAME=${4:-$(echo $EMAIL | cut -d'@' -f1 | cut -d'.' -f1)}
LAST_NAME=${5:-"Singh"}

POD_NAME=$(kubectl get pods -n etelios-prod -l app=hr-service --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD_NAME" ]; then
  echo "❌ No running HR service pod found"
  exit 1
fi

echo "Using pod: $POD_NAME"
echo "Creating employee: $EMAIL ($EMPLOYEE_ID) for tenant: $TENANT_ID"

kubectl exec -n etelios-prod $POD_NAME -- node -e "
const mongoose = require('mongoose');
const User = require('./src/models/User.model');
const Store = require('./src/models/Store.model');

async function ensureEmployee() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const email = '$EMAIL';
    const employeeId = '$EMPLOYEE_ID';
    const tenantId = '$TENANT_ID'.toLowerCase().trim();
    const firstName = '$FIRST_NAME';
    const lastName = '$LAST_NAME';
    const fullName = firstName + ' ' + lastName;
    
    // Get or create store
    let store = await Store.findOne({ tenantId: tenantId });
    if (!store) {
      store = new Store({
        name: 'Default Store',
        code: 'DEF001',
        tenantId: tenantId,
        address: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
        coordinates: { latitude: 19.076, longitude: 72.8777 }
      });
      await store.save();
      console.log('✅ Store created:', store.name);
    } else {
      console.log('✅ Store found:', store.name);
    }
    
    // Check if employee exists
    let employee = await User.findOne({
      tenantId: tenantId,
      \$or: [
        { email: email.toLowerCase() },
        { employeeId: employeeId },
        { employee_id: employeeId }
      ]
    }).populate('store');
    
    if (employee) {
      console.log('Employee exists:', employee.employeeId || employee.employee_id);
      if (!employee.store || (typeof employee.store === 'object' && !employee.store._id)) {
        employee.store = store._id;
        await employee.save();
        console.log('✅ Store assigned');
      } else {
        console.log('✅ Store already assigned:', employee.store.name);
      }
    } else {
      employee = new User({
        email: email.toLowerCase(),
        employeeId: employeeId,
        employee_id: employeeId,
        firstName: firstName,
        lastName: lastName,
        fullName: fullName,
        name: fullName,
        tenantId: tenantId,
        status: 'active',
        role: 'employee',
        is_active: true,
        store: store._id
      });
      await employee.save();
      console.log('✅ Employee created:', employee.employeeId);
    }
    
    employee = await User.findById(employee._id).populate('store');
    console.log('\\n✅ Complete:');
    console.log('   Email:', employee.email);
    console.log('   Employee ID:', employee.employeeId || employee.employee_id);
    console.log('   Tenant:', employee.tenantId);
    console.log('   Store:', employee.store ? employee.store.name : 'N/A');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

ensureEmployee();
"

