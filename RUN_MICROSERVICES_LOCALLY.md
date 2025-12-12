# Running Microservices Locally with Logs

## 📋 Service Port Assignments

| Service | Port | Description |
|---------|------|-------------|
| **API Gateway** | 3000 | Main entry point |
| auth-service | 3001 | Authentication & User Management |
| hr-service | 3002 | HR Management & Employee Data |
| attendance-service | 3003 | Attendance & Geofencing |
| payroll-service | 3004 | Payroll & Salary Management |
| crm-service | 3005 | Customer Management |
| inventory-service | 3006 | ERP & Inventory Management |
| sales-service | 3007 | Sales & Order Management |
| purchase-service | 3008 | Purchase & Vendor Management |
| financial-service | 3009 | Financial Management |
| document-service | 3010 | Document & E-signature |
| service-management | 3011 | Service & SLA Management |
| cpp-service | 3012 | Customer Protection Plan |
| prescription-service | 3013 | Prescription Management |
| analytics-service | 3014 | Analytics & Reporting |
| notification-service | 3015 | Notifications |
| monitoring-service | 3016 | Monitoring & Health Checks |
| tenant-registry-service | 3020 | Tenant Registry |
| realtime-service | 3021 | Real-time Services |

---

## 🚀 Method 1: Run Individual Services

### API Gateway (Port 3000)
```bash
# From root directory
cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms
node app.js

# OR
npm start

# Expected logs:
# ============================================================
# 🚀 Etelios API Gateway - Starting...
# 📡 Port: 3000
# 🌍 Environment: development
# 📁 Entry point: app.js -> src/server.js
# ============================================================
# ============================================================
# 🚀 Starting Etelios API Gateway Server
# 📡 Port: 3000
# 🌍 Environment: development
# ============================================================
# ✅ Etelios Main Server started successfully on port 3000
# 📍 Server listening on http://0.0.0.0:3000
# 🏥 Health check: http://localhost:3000/health
# 📋 API endpoint: http://localhost:3000/api
```

### Auth Service (Port 3001)
```bash
cd microservices/auth-service
PORT=3001 SERVICE_NAME=auth-service NODE_ENV=development node src/server.js

# Expected logs:
# [timestamp] info: auth-service running on port 3001
# [timestamp] info: auth-service started on http://0.0.0.0:3001
# [timestamp] info: Environment: development
# [timestamp] info: Database connected
```

### HR Service (Port 3002)
```bash
cd microservices/hr-service
PORT=3002 SERVICE_NAME=hr-service NODE_ENV=development node src/server.js

# Expected logs:
# [timestamp] info: hr-service running on port 3002
# [timestamp] info: hr-service started on http://0.0.0.0:3002
# [timestamp] info: Environment: development
# [timestamp] info: Database: connected
```

### Attendance Service (Port 3003)
```bash
cd microservices/attendance-service
PORT=3003 SERVICE_NAME=attendance-service NODE_ENV=development node src/server.js
```

### Payroll Service (Port 3004)
```bash
cd microservices/payroll-service
PORT=3004 SERVICE_NAME=payroll-service NODE_ENV=development node src/server.js
```

### CRM Service (Port 3005)
```bash
cd microservices/crm-service
PORT=3005 SERVICE_NAME=crm-service NODE_ENV=development node src/server.js
```

### Inventory Service (Port 3006)
```bash
cd microservices/inventory-service
PORT=3006 SERVICE_NAME=inventory-service NODE_ENV=development node src/server.js
```

### Sales Service (Port 3007)
```bash
cd microservices/sales-service
PORT=3007 SERVICE_NAME=sales-service NODE_ENV=development node src/server.js
```

### Purchase Service (Port 3008)
```bash
cd microservices/purchase-service
PORT=3008 SERVICE_NAME=purchase-service NODE_ENV=development node src/server.js
```

### Financial Service (Port 3009)
```bash
cd microservices/financial-service
PORT=3009 SERVICE_NAME=financial-service NODE_ENV=development node src/server.js
```

### Document Service (Port 3010)
```bash
cd microservices/document-service
PORT=3010 SERVICE_NAME=document-service NODE_ENV=development node src/server.js
```

### Service Management (Port 3011)
```bash
cd microservices/service-management
PORT=3011 SERVICE_NAME=service-management NODE_ENV=development node src/server.js
```

### CPP Service (Port 3012)
```bash
cd microservices/cpp-service
PORT=3012 SERVICE_NAME=cpp-service NODE_ENV=development node src/server.js
```

### Prescription Service (Port 3013)
```bash
cd microservices/prescription-service
PORT=3013 SERVICE_NAME=prescription-service NODE_ENV=development node src/server.js
```

### Analytics Service (Port 3014)
```bash
cd microservices/analytics-service
PORT=3014 SERVICE_NAME=analytics-service NODE_ENV=development node src/server.js
```

### Notification Service (Port 3015)
```bash
cd microservices/notification-service
PORT=3015 SERVICE_NAME=notification-service NODE_ENV=development node src/server.js
```

### Monitoring Service (Port 3016)
```bash
cd microservices/monitoring-service
PORT=3016 SERVICE_NAME=monitoring-service NODE_ENV=development node src/server.js
```

### Tenant Registry Service (Port 3020)
```bash
cd microservices/tenant-registry-service
PORT=3020 SERVICE_NAME=tenant-registry-service NODE_ENV=development node src/server.js
```

### Realtime Service (Port 3021)
```bash
cd microservices/realtime-service
PORT=3021 SERVICE_NAME=realtime-service NODE_ENV=development node src/server.js
```

---

## 🚀 Method 2: Run All Services Together

### Using the Start Script
```bash
# From root directory
cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms
node microservices/start-all-services.js

# This will:
# 1. Install dependencies for each service (if needed)
# 2. Start all services in parallel
# 3. Show logs from all services with [service-name] prefix
# 4. Keep all services running until Ctrl+C
```

### Expected Output:
```
🚀 Starting All Microservices...

============================================================
📦 Installing dependencies for auth-service...
✅ Dependencies installed for auth-service
🚀 Starting auth-service on port 3001...
[auth-service] [timestamp] info: auth-service running on port 3001
✅ auth-service started on port 3001

📦 Installing dependencies for hr-service...
✅ Dependencies installed for hr-service
🚀 Starting hr-service on port 3002...
[hr-service] [timestamp] info: hr-service running on port 3002
✅ hr-service started on port 3002

... (continues for all services)

📊 Services Status:
============================================================
Total Services: 18
Running Services: 18
Processes Started: 18

✅ Running Services:
  🌐 auth-service: http://localhost:3001
  🌐 hr-service: http://localhost:3002
  🌐 attendance-service: http://localhost:3003
  ... (all services listed)

🎯 Next Steps:
1. Wait 30 seconds for all services to fully start
2. Run: node quick-api-check.js
3. Run: node test-all-microservices-apis.js

💡 Press Ctrl+C to stop all services
```

---

## 🚀 Method 3: Using PM2 (Recommended for Development)

### Start API Gateway with PM2
```bash
cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms
pm2 start ecosystem.config.js

# View logs
pm2 logs api-gateway

# View all logs
pm2 logs
```

### Start Individual Service with PM2
```bash
# Example: HR Service
cd microservices/hr-service
pm2 start ecosystem.config.js

# View logs
pm2 logs hr-service
```

---

## 📊 Viewing Logs

### Real-time Logs (All Services)
```bash
# If using start-all-services.js, logs appear in the same terminal
# Each log line is prefixed with [service-name]

[auth-service] [timestamp] info: Request: GET /health
[hr-service] [timestamp] info: Request: GET /api/hr/employees
```

### Individual Service Logs
Each service logs to:
- **Console**: Real-time output
- **File**: `microservices/{service-name}/logs/combined.log`
- **Errors**: `microservices/{service-name}/logs/error.log`

### View Log Files
```bash
# View combined logs
tail -f microservices/auth-service/logs/combined.log

# View error logs
tail -f microservices/auth-service/logs/error.log

# View all service logs
tail -f microservices/*/logs/combined.log
```

---

## 🔍 Log Format

### Standard Log Format
```
[timestamp] [level]: [message] [metadata]
```

### Example Logs
```
2025-12-11T12:00:00.000Z info: auth-service running on port 3001
2025-12-11T12:00:01.000Z info: Database connected
2025-12-11T12:00:02.000Z info: Request: GET /health {"ip":"127.0.0.1","method":"GET","path":"/health","statusCode":200}
2025-12-11T12:00:03.000Z error: Database connection failed {"error":"Connection timeout"}
```

---

## 🛠️ Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
lsof -i :3001

# Kill the process
kill -9 <PID>

# OR use a different port
PORT=3101 SERVICE_NAME=auth-service node src/server.js
```

### Service Won't Start
```bash
# Check if dependencies are installed
cd microservices/auth-service
npm install

# Check for errors in logs
cat logs/error.log

# Run with verbose logging
DEBUG=* PORT=3001 SERVICE_NAME=auth-service node src/server.js
```

### Database Connection Issues
```bash
# Check MongoDB connection
# Ensure MongoDB is running
mongosh

# Check connection string in .env or environment variables
echo $MONGO_URI
```

---

## ✅ Health Checks

After starting services, verify they're running:

```bash
# API Gateway
curl http://localhost:3000/health

# Auth Service
curl http://localhost:3001/health

# HR Service
curl http://localhost:3002/health

# All services
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3015 3016 3020 3021; do
  echo "Checking port $port..."
  curl -s http://localhost:$port/health || echo "Port $port not responding"
done
```

---

## 📝 Quick Reference

### Start API Gateway
```bash
node app.js
```

### Start Single Service
```bash
cd microservices/{service-name}
PORT={port} SERVICE_NAME={service-name} node src/server.js
```

### Start All Services
```bash
node microservices/start-all-services.js
```

### View Logs
```bash
# Real-time (if using start-all-services.js)
# Logs appear in terminal

# From files
tail -f microservices/{service-name}/logs/combined.log
```

### Stop Services
```bash
# If using start-all-services.js
Ctrl+C

# If using PM2
pm2 stop all
pm2 delete all

# If using individual node processes
# Find and kill processes
ps aux | grep node
kill -9 <PID>
```

