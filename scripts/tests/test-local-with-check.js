/**
 * Local Test Script with Service Availability Check
 */

const BASE_URL = 'http://localhost';
const services = {
  auth: { port: 3001, name: 'Auth Service' },
  hr: { port: 3002, name: 'HR Service' },
  attendance: { port: 3003, name: 'Attendance Service' },
  tenantRegistry: { port: 3020, name: 'Tenant Registry Service' }
};

async function checkService(serviceName, port) {
  try {
    const response = await fetch(`${BASE_URL}:${port}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('\n🔍 Checking Local Services Availability...\n');
  
  const availableServices = {};
  
  for (const [key, service] of Object.entries(services)) {
    const isAvailable = await checkService(service.name, service.port);
    if (isAvailable) {
      console.log(`✅ ${service.name} (port ${service.port}): Running`);
      availableServices[key] = service;
    } else {
      console.log(`❌ ${service.name} (port ${service.port}): Not running`);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Available: ${Object.keys(availableServices).length}/${Object.keys(services).length} services`);
  
  if (Object.keys(availableServices).length === 0) {
    console.log('\n⚠️  No services are running locally.');
    console.log('   To start services, run:');
    console.log('   - cd microservices/auth-service && npm start');
    console.log('   - cd microservices/hr-service && npm start');
    console.log('   - cd microservices/attendance-service && npm start');
    console.log('   - cd microservices/tenant-registry-service && npm start');
    console.log('\n   Or use docker-compose if available.');
    process.exit(1);
  }
  
  // Test available services
  if (availableServices.auth) {
    console.log('\n🧪 Testing Auth Service Fixes...\n');
    
    try {
      // Test mock login
      const loginResponse = await fetch(`${BASE_URL}:3001/api/auth/mock-login-fast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin' })
      });
      
      const loginData = await loginResponse.json();
      
      if (loginData.success && loginData.data?.accessToken) {
        console.log('✅ Mock login: SUCCESS');
        const token = loginData.data.accessToken;
        
        // Test profile endpoint (the fix we made)
        const profileResponse = await fetch(`${BASE_URL}:3001/api/auth/profile`, {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const profileData = await profileResponse.json();
        
        if (profileResponse.ok && profileData.success) {
          console.log('✅ Auth profile endpoint: SUCCESS (Fix working!)');
          console.log(`   User: ${profileData.data?.name || 'N/A'}`);
          console.log(`   Role: ${profileData.data?.role || 'N/A'}`);
        } else {
          console.log('❌ Auth profile endpoint: FAILED');
          console.log(`   Status: ${profileResponse.status}`);
          console.log(`   Error: ${profileData.message || 'Unknown'}`);
        }
      } else {
        console.log('❌ Mock login: FAILED');
      }
    } catch (error) {
      console.log(`❌ Auth service test error: ${error.message}`);
    }
  }
  
  console.log('\n✅ Local test complete!');
}

main().catch(console.error);
