# Load Testing Capacity Analysis - Backend

**Date**: 2026-01-02  
**Environment**: Production (Azure Kubernetes Service)

---

## 🏗️ Infrastructure Overview

### Platform
- **Container Orchestration**: Azure Kubernetes Service (AKS)
- **Database**: Azure Cosmos DB (MongoDB API)
- **Architecture**: Microservices (19+ services)
- **Load Balancer**: Azure Load Balancer / Ingress Controller

### Current Services
- Auth Service
- HR Service
- Attendance Service
- Tenant Registry Service
- And 15+ other microservices

---

## 📊 Current Configuration

### Rate Limiting

**Auth Service**:
- Window: 15 minutes
- Max Requests: 1000 per IP per window
- Health checks: Excluded from rate limit

**Other Services**:
- Similar rate limiting configurations
- Varies by service

### Resource Limits (Per Service)

**Typical Pod Resources**:
- Memory Request: 256Mi
- Memory Limit: 512Mi
- CPU Request: 100m (0.1 core)
- CPU Limit: 500m (0.5 core)

**Replicas**:
- Most services: 2-3 replicas
- Some services: 1 replica

---

## 🧪 Load Testing Capacity Estimates

### Scenario 1: Light Load (Normal Operations)

**Concurrent Users**: 50-100
**Requests per Second (RPS)**: 10-20
**Expected Performance**:
- ✅ Response Time: < 200ms (p95)
- ✅ Error Rate: < 0.1%
- ✅ Throughput: 10-20 RPS per service
- ✅ Database: < 50% utilization

**Capacity**: ✅ **Well within limits**

---

### Scenario 2: Medium Load (Peak Hours)

**Concurrent Users**: 200-500
**Requests per Second (RPS)**: 50-100
**Expected Performance**:
- ✅ Response Time: < 500ms (p95)
- ⚠️ Response Time: < 1000ms (p99)
- ✅ Error Rate: < 1%
- ✅ Throughput: 50-100 RPS per service
- ⚠️ Database: 50-70% utilization

**Capacity**: ✅ **Should handle well**

**Bottlenecks**:
- Database connections may increase
- Some services may need more replicas
- Rate limiting may kick in for some IPs

---

### Scenario 3: Heavy Load (Stress Test)

**Concurrent Users**: 500-1000
**Requests per Second (RPS)**: 100-200
**Expected Performance**:
- ⚠️ Response Time: 500-1000ms (p95)
- ⚠️ Response Time: 1-3s (p99)
- ⚠️ Error Rate: 1-5%
- ⚠️ Throughput: 100-200 RPS per service
- ⚠️ Database: 70-90% utilization

**Capacity**: ⚠️ **May need optimization**

**Potential Issues**:
- Rate limiting will block some requests
- Database connection pool exhaustion
- Pod resource limits may be hit
- Some services may need scaling

---

### Scenario 4: Extreme Load (Breaking Point)

**Concurrent Users**: 1000-5000
**Requests per Second (RPS)**: 200-500+
**Expected Performance**:
- ❌ Response Time: > 1s (p95)
- ❌ Response Time: > 5s (p99)
- ❌ Error Rate: 5-20%
- ❌ Throughput: Limited by bottlenecks
- ❌ Database: > 90% utilization

**Capacity**: ❌ **Will need scaling**

**Required Actions**:
- Scale up replicas (3-5 per service)
- Increase pod resources
- Optimize database queries
- Add caching layer
- Increase rate limits
- Database scaling

---

## 📈 Per-Service Capacity Estimates

### Auth Service
- **Current Capacity**: ~50-100 RPS
- **With Scaling**: 200-300 RPS
- **Bottleneck**: Database queries, JWT generation

### HR Service
- **Current Capacity**: ~30-50 RPS
- **With Scaling**: 100-150 RPS
- **Bottleneck**: Complex queries, document operations

### Attendance Service
- **Current Capacity**: ~100-150 RPS
- **With Scaling**: 300-500 RPS
- **Bottleneck**: Write operations, timestamps

### Tenant Registry Service
- **Current Capacity**: ~20-30 RPS
- **With Scaling**: 50-100 RPS
- **Bottleneck**: Database connections, tenant isolation

---

## 🎯 Realistic Load Testing Targets

### Recommended Test Scenarios

#### Test 1: Baseline (Current Capacity)
- **Users**: 100 concurrent
- **Duration**: 10 minutes
- **Ramp-up**: 10 users/second
- **Expected**: All requests succeed, < 500ms response time

#### Test 2: Peak Load (Expected Peak)
- **Users**: 500 concurrent
- **Duration**: 30 minutes
- **Ramp-up**: 20 users/second
- **Expected**: 95%+ success rate, < 1s response time

#### Test 3: Stress Test (Breaking Point)
- **Users**: 1000 concurrent
- **Duration**: 15 minutes
- **Ramp-up**: 50 users/second
- **Expected**: Identify bottlenecks, measure degradation

#### Test 4: Spike Test (Sudden Traffic)
- **Users**: 0 → 1000 in 30 seconds
- **Duration**: 5 minutes
- **Expected**: System recovers, handles spike

---

## 🔍 Key Metrics to Monitor

### Application Metrics
- **Response Time**: p50, p95, p99
- **Throughput**: Requests per second
- **Error Rate**: 4xx, 5xx errors
- **Success Rate**: 2xx responses

### Infrastructure Metrics
- **CPU Usage**: Per pod, per node
- **Memory Usage**: Per pod, per node
- **Network**: Bandwidth, connections
- **Pod Restarts**: CrashLoopBackOff, OOMKilled

### Database Metrics
- **Connection Pool**: Active connections
- **Query Time**: Average, p95, p99
- **Throughput**: Reads/writes per second
- **Utilization**: CPU, memory, RU/s

---

## ⚠️ Current Limitations

### Rate Limiting
- **1000 requests per 15 minutes per IP**
- Will block legitimate users if exceeded
- May need adjustment for high-traffic scenarios

### Resource Constraints
- **Memory**: 512Mi limit per pod (may be tight)
- **CPU**: 500m limit per pod (0.5 core)
- **Replicas**: 2-3 per service (may need more)

### Database
- **Cosmos DB RU/s**: Need to check current allocation
- **Connection Pool**: Default MongoDB pool size
- **Query Performance**: Depends on indexes

---

## 🚀 Optimization Recommendations

### For 100-500 RPS (Current Capacity)
- ✅ Current setup should handle
- ✅ Monitor database connections
- ✅ Watch for rate limit hits

### For 500-1000 RPS (Scaling Needed)
1. **Increase Replicas**: 3-5 per service
2. **Increase Resources**: 1GB memory, 1 CPU per pod
3. **Optimize Database**: Add indexes, connection pooling
4. **Add Caching**: Redis for frequently accessed data
5. **Adjust Rate Limits**: Increase or remove for internal services

### For 1000+ RPS (Major Scaling)
1. **Horizontal Scaling**: 5-10 replicas per service
2. **Resource Scaling**: 2GB memory, 2 CPU per pod
3. **Database Scaling**: Increase RU/s, read replicas
4. **CDN/Caching**: Implement aggressive caching
5. **Load Balancing**: Optimize ingress configuration
6. **Database Sharding**: For multi-tenant scenarios

---

## 📊 Tentative Load Testing Results

### Conservative Estimate (Current Setup)

| Metric | Light Load | Medium Load | Heavy Load | Extreme Load |
|--------|-----------|--------------|------------|--------------|
| **Concurrent Users** | 50-100 | 200-500 | 500-1000 | 1000-5000 |
| **RPS** | 10-20 | 50-100 | 100-200 | 200-500+ |
| **Response Time (p95)** | < 200ms | < 500ms | 500-1000ms | > 1s |
| **Success Rate** | 99.9% | 99% | 95-99% | 80-95% |
| **Capacity Status** | ✅ Excellent | ✅ Good | ⚠️ Acceptable | ❌ Needs Scaling |

### Optimistic Estimate (With Scaling)

| Metric | Light Load | Medium Load | Heavy Load | Extreme Load |
|--------|-----------|--------------|------------|--------------|
| **Concurrent Users** | 100-200 | 500-1000 | 1000-2000 | 2000-10000 |
| **RPS** | 20-50 | 100-200 | 200-400 | 400-1000+ |
| **Response Time (p95)** | < 200ms | < 300ms | < 500ms | 500-1000ms |
| **Success Rate** | 99.9% | 99.5% | 99% | 95-99% |
| **Capacity Status** | ✅ Excellent | ✅ Excellent | ✅ Good | ⚠️ Acceptable |

---

## 🎯 Recommended Load Testing Plan

### Phase 1: Baseline Test
- **Target**: 100 concurrent users
- **Duration**: 10 minutes
- **Goal**: Establish baseline metrics

### Phase 2: Peak Load Test
- **Target**: 500 concurrent users
- **Duration**: 30 minutes
- **Goal**: Test peak hour capacity

### Phase 3: Stress Test
- **Target**: 1000 concurrent users
- **Duration**: 15 minutes
- **Goal**: Find breaking point

### Phase 4: Endurance Test
- **Target**: 300 concurrent users
- **Duration**: 2 hours
- **Goal**: Test stability over time

---

## 📝 Load Testing Tools

### Recommended Tools
1. **Apache JMeter**: Comprehensive load testing
2. **k6**: Modern load testing tool
3. **Artillery**: Node.js based load testing
4. **Locust**: Python-based load testing
5. **Azure Load Testing**: Cloud-based solution

### Sample k6 Test Script
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 500 },   // Ramp up to 500 users
    { duration: '5m', target: 500 },  // Stay at 500 users
    { duration: '2m', target: 0 },     // Ramp down
  ],
};

export default function () {
  const res = http.post('https://98.70.245.87/api/auth/login', 
    JSON.stringify({
      emailOrEmployeeId: 'test@test.com',
      password: 'test123'
    }),
    { headers: { 'Content-Type': 'application/json', 'Host': 'api.etelios.com' } }
  );
  
  check(res, {
    'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

---

## 🔍 Monitoring During Load Tests

### Key Metrics to Watch
1. **Response Times**: p50, p95, p99 percentiles
2. **Error Rates**: 4xx, 5xx breakdown
3. **Throughput**: Requests per second
4. **Resource Usage**: CPU, memory per pod
5. **Database**: Connection pool, query times
6. **Rate Limiting**: 429 errors (Too Many Requests)

### Tools
- **Azure Monitor**: Infrastructure metrics
- **Application Insights**: Application metrics
- **kubectl top**: Real-time pod metrics
- **Grafana**: Visualization (if configured)

---

## 💡 Recommendations

### Immediate (For Current Setup)
1. ✅ Monitor rate limiting hits
2. ✅ Watch database connection pool
3. ✅ Set up alerting for high error rates
4. ✅ Track response time percentiles

### Short-term (For Scaling)
1. Increase replicas to 3-5 per service
2. Increase pod resources (1GB RAM, 1 CPU)
3. Optimize database queries and indexes
4. Implement Redis caching

### Long-term (For High Scale)
1. Auto-scaling based on CPU/memory
2. Database read replicas
3. CDN for static content
4. Microservices optimization
5. Database sharding for multi-tenant

---

## 📊 Expected Results Summary

### Current Setup (No Scaling)
- **Max Concurrent Users**: ~500-1000
- **Max RPS**: ~100-200 per service
- **Response Time (p95)**: < 1s (under load)
- **Success Rate**: 95-99% (under heavy load)

### With Scaling (3-5 replicas, increased resources)
- **Max Concurrent Users**: ~2000-5000
- **Max RPS**: ~300-500 per service
- **Response Time (p95)**: < 500ms (under load)
- **Success Rate**: 99%+ (under heavy load)

### With Full Optimization (Caching, read replicas, etc.)
- **Max Concurrent Users**: ~5000-10000+
- **Max RPS**: ~500-1000+ per service
- **Response Time (p95)**: < 300ms (under load)
- **Success Rate**: 99.5%+ (under heavy load)

---

**Note**: These are tentative estimates based on typical Node.js/Express microservices on AKS. Actual results will vary based on:
- Database performance (Cosmos DB RU/s)
- Network latency
- Query complexity
- Data volume
- Specific service implementations

**Recommendation**: Start with baseline test (100 users) and gradually increase to find actual breaking points.

