# Microservices Architecture - Separate App Services

## Overview
Each microservice runs on its own Azure App Service with a separate URL, but they are interconnected and can communicate with each other.

## Service URLs

### Production (Separate App Services)
Each service has its own Azure App Service URL:
- Auth Service: `https://etelios-auth-service.centralindia-01.azurewebsites.net`
- HR Service: `https://etelios-hr-service.centralindia-01.azurewebsites.net`
- Attendance Service: `https://etelios-attendance-service.centralindia-01.azurewebsites.net`
- Payroll Service: `https://etelios-payroll-service.centralindia-01.azurewebsites.net`
- ... and so on

### Development (Single Container)
All services run on localhost in the same container:
- Auth Service: `http://localhost:3001`
- HR Service: `http://localhost:3002`
- ... and so on

## Configuration

### Environment Variables
Set these in Azure App Service Configuration:

```bash
# Enable separate App Services
USE_SEPARATE_APP_SERVICES=true

# Individual service URLs (optional, auto-generated if not set)
AUTH_SERVICE_URL=https://etelios-auth-service.centralindia-01.azurewebsites.net
HR_SERVICE_URL=https://etelios-hr-service.centralindia-01.azurewebsites.net
ATTENDANCE_SERVICE_URL=https://etelios-attendance-service.centralindia-01.azurewebsites.net
# ... etc
```

### Single App Service Mode
If `USE_SEPARATE_APP_SERVICES` is not set or false, all services run on localhost in the same container.

## Service Communication

Services can communicate with each other using:
1. **External URLs**: For services in separate App Services
2. **Internal URLs**: For services in the same container (localhost)

The API Gateway automatically routes requests to the correct service URL.

## API Gateway
The API Gateway (`https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net`) routes all requests to the appropriate microservice.

