# Production Database Configuration

## Overview
This document outlines the production-grade MongoDB configuration implemented for the Etelios HRMS microservices architecture.

## Database Architecture

### Database-per-Service Pattern
Each microservice uses its own dedicated database within the Azure Cosmos DB MongoDB instance for:
- **Data Isolation**: Services cannot accidentally access each other's data
- **Independent Scaling**: Each service can scale its database independently
- **Schema Evolution**: Services can evolve their schemas without affecting others
- **Security**: Fine-grained access control per service

### Azure Cosmos DB Configuration
- **Connection String**: `mongodb://etelios-mongo-db:[REDACTED]@etelios-mongo-db.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@etelios-mongo-db@`
- **SSL**: Enabled for secure connections
- **Replica Set**: `globaldb` for high availability
- **Retry Writes**: Disabled (handled by application)
- **Connection Timeout**: 120 seconds max idle time

## Service Database Mapping

| Service | Database Name | Secret Key | Purpose |
|---------|---------------|------------|---------|
| auth-service | `auth_db` | `AUTH_SERVICE_DB_URI` | User authentication & sessions |
| hr-service | `hr-database` | `HR_SERVICE_DB_URI` | HR management & employee data |
| attendance-service | `attendance_db` | `ATTENDANCE_SERVICE_DB_URI` | Time tracking & attendance |
| payroll-service | `payroll_db` | `PAYROLL_SERVICE_DB_URI` | Salary & payroll processing |
| inventory-service | `inventory_db` | `INVENTORY_SERVICE_DB_URI` | Product & inventory management |
| sales-service | `sales_db` | `SALES_SERVICE_DB_URI` | Sales orders & transactions |
| purchase-service | `purchase_db` | `PURCHASE_SERVICE_DB_URI` | Purchase orders & procurement |
| financial-service | `financial_db` | `FINANCIAL_SERVICE_DB_URI` | Accounting & financial records |
| analytics-service | `analytics_db` | `ANALYTICS_SERVICE_DB_URI` | Business intelligence & reporting |
| notification-service | `notification_db` | `NOTIFICATION_SERVICE_DB_URI` | Email & notification logs |
| document-service | `document_db` | `DOCUMENT_SERVICE_DB_URI` | Document storage & management |
| service-management | `service_management_db` | `SERVICE_MANAGEMENT_DB_URI` | Service scheduling & management |
| tenant-registry-service | `tenant_registry_db` | `TENANT_REGISTRY_SERVICE_DB_URI` | Multi-tenant configuration |
| crm-service | `crm_db` | `CRM_SERVICE_DB_URI` | Customer relationship management |
| monitoring-service | `monitoring_db` | `MONITORING_SERVICE_DB_URI` | System monitoring & metrics |
| realtime-service | `realtime_db` | `REALTIME_SERVICE_DB_URI` | Real-time communications |
| prescription-service | `prescription_db` | `PRESCRIPTION_SERVICE_DB_URI` | Medical prescription management |
| cpp-service | `cpp_db` | `CPP_SERVICE_DB_URI` | C++ service data |

## Kubernetes Configuration

### Secrets Configuration
```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: etelios-secrets
  namespace: etelios-backend-prod
type: Opaque
stringData:
  # Service-specific MongoDB URIs
  AUTH_SERVICE_DB_URI: "mongodb://etelios-mongo-db:.../auth_db?..."
  HR_SERVICE_DB_URI: "mongodb://etelios-mongo-db:.../hr-database?..."
  # ... all service URIs
```

### Deployment Configuration
Each service deployment includes:
```yaml
env:
  - name: MONGODB_URI
    valueFrom:
      secretKeyRef:
        name: etelios-secrets
        key: {SERVICE}_SERVICE_DB_URI
  - name: DB_NAME
    value: "{database_name}"
```

## Database Connection Configuration

### Connection Pool Settings
- **Max Pool Size**: 10 connections
- **Min Pool Size**: 2 connections
- **Max Idle Time**: 30 seconds
- **Server Selection Timeout**: 30 seconds
- **Socket Timeout**: 60 seconds
- **Connect Timeout**: 30 seconds

### Retry & Reliability
- **Retry Reads**: Enabled
- **Retry Writes**: Enabled (at application level)
- **Buffer Commands**: Disabled
- **Buffer Max Entries**: 0

### Health Monitoring
- Connection status logging
- Database name validation
- Replica set connectivity checks
- Automatic reconnection on failures

## Security Features

### Authentication
- Username/password authentication via connection string
- Azure Cosmos DB managed identities (future enhancement)
- Encrypted credentials in Kubernetes secrets

### Network Security
- SSL/TLS encryption for all connections
- Private endpoints (recommended for production)
- IP firewall rules (recommended)

### Access Control
- Database-level isolation per service
- Service-specific connection strings
- Principle of least privilege

## Monitoring & Observability

### Connection Metrics
- Connection pool utilization
- Connection acquisition time
- Failed connection attempts
- Database operation latency

### Health Checks
- Database connectivity probes
- Connection pool health
- Replica set status
- Database size monitoring

### Logging
- Connection establishment events
- Database operation failures
- Connection pool warnings
- Replica set changes

## Deployment Instructions

### 1. Apply Secrets
```bash
kubectl apply -f k8s/secrets.yaml
```

### 2. Deploy Services
```bash
kubectl apply -f k8s/deployments/
```

### 3. Verify Connections
```bash
# Check pod logs for successful database connections
kubectl logs -f deployment/hr-service -n etelios-backend-prod

# Verify database connectivity
kubectl exec -it deployment/hr-service -n etelios-backend-prod -- mongo hr-database --eval "db.stats()"
```

## Troubleshooting

### Common Issues

#### Connection Timeout
```yaml
# Increase timeouts in database.js
serverSelectionTimeoutMS: 60000
socketTimeoutMS: 120000
```

#### Authentication Failure
- Verify connection string credentials
- Check Azure Cosmos DB firewall rules
- Ensure SSL is enabled

#### Database Not Found
- Verify database name in connection string
- Check if database exists in Cosmos DB
- Confirm service-specific database naming

#### Connection Pool Exhaustion
- Increase maxPoolSize in database configuration
- Implement connection pooling monitoring
- Check for connection leaks in application code

## Future Enhancements

### Azure Key Vault Integration
- Store connection strings in Azure Key Vault
- Use managed identities for authentication
- Implement automatic secret rotation

### Database Sharding
- Implement horizontal scaling for high-traffic services
- Configure shard keys for optimal distribution
- Monitor shard performance metrics

### Backup & Disaster Recovery
- Configure automated backups
- Implement cross-region replication
- Set up disaster recovery procedures

---

**Last Updated**: December 25, 2025
**Configuration Version**: v1.0.0
**Environment**: Production (AKS)
