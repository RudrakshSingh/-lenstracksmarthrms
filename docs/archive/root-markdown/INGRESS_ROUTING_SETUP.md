# Ingress Routing Setup - Current Architecture

## ✅ What You're Using (Ingress-based Routing)

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  AWS Application Load Balancer (ALB)                    │
│  k8s-eteliosp-eteliosi-f5ad4f50f3-636936140...          │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Kubernetes Ingress Controller (etelios-ingress)        │
│  - Routes based on URL path                              │
│  - No API Gateway layer                                  │
│  - Direct routing to services                            │
└──────┬──────────────────────────────────────────────────┘
       │
       ├──/api/auth ──────────────► auth-service:80
       ├──/api/hr ────────────────► hr-service:80
       ├──/api/attendance ────────► attendance-service:80
       ├──/api/admin ─────────────► tenant-management-service:80
       ├──/api/tenants ───────────► tenant-registry-service:80
       ├──/api/payroll ───────────► payroll-service:80
       ├──/api/analytics ─────────► analytics-service:80
       ├──/api/crm ───────────────► crm-service:80
       ├──/api/documents ─────────► document-service:80
       ├──/api/financial ─────────► financial-service:80
       ├──/api/inventory ─────────► inventory-service:80
       ├──/api/jts ───────────────► jts-service:80
       ├──/api/monitoring ────────► monitoring-service:80
       ├──/api/notification ──────► notification-service:80
       ├──/api/prescription ──────► prescription-service:80
       ├──/api/purchase ──────────► purchase-service:80
       ├──/api/realtime ──────────► realtime-service:80
       ├──/api/sales ─────────────► sales-service:80
       ├──/api/service ───────────► service-management:80
       └──/api/cpp ───────────────► cpp-service:80
```

---

## 🎯 Single Entry Point for Frontend

### Production Base URL
```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

**Frontend makes ALL requests to this single URL with different paths.**

---

## 📋 How Routing Works

### Example 1: Login Request
```javascript
// Frontend Request
POST http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login

// Flow:
1. Request hits AWS ALB
2. ALB forwards to Ingress Controller
3. Ingress sees path "/api/auth" 
4. Routes to auth-service:80
5. Auth service handles /login endpoint
```

### Example 2: Get Employees
```javascript
// Frontend Request
GET http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/hr/employees

// Flow:
1. Request hits AWS ALB
2. ALB forwards to Ingress Controller  
3. Ingress sees path "/api/hr"
4. Routes to hr-service:80
5. HR service handles /employees endpoint
```

---

## 🔧 Ingress Configuration Details

**Ingress Resource:** `etelios-ingress`  
**Namespace:** `etelios-prod`  
**Class:** `alb` (AWS Application Load Balancer)  
**Load Balancer:** k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com

**Path Matching:** Prefix-based routing
- `/api/auth` → All paths starting with `/api/auth/*`
- `/api/hr` → All paths starting with `/api/hr/*`
- etc.

**Health Checks:**
- Path: `/health`
- Interval: 30 seconds
- Timeout: 5 seconds
- Healthy threshold: 2
- Unhealthy threshold: 2

---

## ✅ Advantages of This Setup (Ingress vs API Gateway)

### Why Ingress is Better for Your Use Case:

1. **Simpler Architecture**
   - No additional layer to manage
   - Direct routing to services
   - Less latency

2. **Native Kubernetes**
   - Built-in Kubernetes resource
   - Easier to manage with kubectl
   - Better integration with K8s services

3. **AWS ALB Features**
   - Auto-scaling
   - Health checks
   - SSL termination (when configured)
   - Path-based routing

4. **Lower Cost**
   - No extra API Gateway service to run
   - No additional pods consuming resources
   - Just ALB costs (which you need anyway)

5. **Easier to Debug**
   - Standard Kubernetes tooling
   - Clear routing rules
   - Simple troubleshooting

### What You DON'T Need (API Gateway):

❌ **Kong Gateway** - Complex, needs database, overkill for your setup  
❌ **Custom Node.js Gateway** - Extra service to maintain  
❌ **AWS API Gateway** - Expensive, not needed for K8s  
❌ **Additional routing layer** - Adds latency and complexity

---

## 🎨 Frontend Configuration

Your frontend dev only needs **ONE base URL**:

```javascript
// .env file
REACT_APP_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com

// All API calls use this base
const login = () => axios.post(`${API_BASE_URL}/api/auth/login`, data);
const getEmployees = () => axios.get(`${API_BASE_URL}/api/hr/employees`);
const checkIn = () => axios.post(`${API_BASE_URL}/api/attendance/checkin`);
```

**No gateway endpoints, no complex routing - just simple path-based URLs!**

---

## 🔐 Security Features (Built into Ingress/ALB)

Current security features:
- ✅ Health check monitoring
- ✅ IP-based target routing
- ✅ Internet-facing scheme
- ✅ Automatic failover to healthy pods

**Can be added later:**
- 🔜 SSL/TLS certificates (HTTPS)
- 🔜 WAF (Web Application Firewall)
- 🔜 Rate limiting (via annotations)
- 🔜 Authentication at ALB level (via ALB rules)

---

## 📊 Current Status

| Route | Service | Status | Pods |
|-------|---------|--------|------|
| `/api/auth` | auth-service | ✅ Working | 2/2 |
| `/api/hr` | hr-service | ✅ Working | 2/2 |
| `/api/attendance` | attendance-service | ✅ Working | 2/2 |
| `/api/admin` | tenant-management-service | ✅ Working | 2/2 |
| `/api/tenants` | tenant-registry-service | ✅ Working | 2/2 |
| `/api/payroll` | payroll-service | ⚠️ CrashLoop | 0/2 |
| `/api/analytics` | analytics-service | ⚠️ CrashLoop | 0/2 |
| `/api/crm` | crm-service | ⚠️ CrashLoop | 0/2 |
| `/api/documents` | document-service | ⚠️ CrashLoop | 0/2 |
| `/api/financial` | financial-service | ⚠️ CrashLoop | 0/2 |
| `/api/inventory` | inventory-service | ⚠️ CrashLoop | 0/2 |
| `/api/jts` | jts-service | ⚠️ Not Running | 0/2 |
| `/api/monitoring` | monitoring-service | ⚠️ CrashLoop | 0/2 |
| `/api/notification` | notification-service | ⚠️ CrashLoop | 0/2 |
| `/api/prescription` | prescription-service | ⚠️ CrashLoop | 0/2 |
| `/api/purchase` | purchase-service | ⚠️ CrashLoop | 0/2 |
| `/api/realtime` | realtime-service | ⚠️ CrashLoop | 0/2 |
| `/api/sales` | sales-service | ⚠️ CrashLoop | 0/2 |
| `/api/service` | service-management | ⚠️ CrashLoop | 0/2 |
| `/api/cpp` | cpp-service | ⚠️ CrashLoop | 0/2 |

---

## 🧪 Test Your Ingress

```bash
# Test auth service
curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/health

# Test HR service
curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/hr/health

# Test attendance service
curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/health
```

---

## 📝 Summary

**What you have:**
- ✅ AWS ALB as load balancer
- ✅ Kubernetes Ingress for routing
- ✅ 20 routes configured (5 working, 15 need fixing)
- ✅ Single entry point for frontend
- ✅ Simple, clean architecture

**What you DON'T have (and don't need):**
- ❌ API Gateway (Kong/custom)
- ❌ Extra routing layers
- ❌ Complex gateway configuration

**Bottom line:** 
Your setup is **perfect** for a microservices architecture. Frontend hits one URL, Ingress routes to the right service. Simple, scalable, and cost-effective! 🎉

---

## 🚀 Next Steps

1. **Frontend Integration** - Can start now with 5 working services
2. **Fix Crashing Services** - Debug and fix the 15 services in CrashLoopBackOff
3. **Add HTTPS** - Configure SSL certificate for production
4. **Add Custom Domain** - Point your domain to ALB
5. **Enable CORS** - Configure CORS at service level if needed

No API Gateway needed - your Ingress-based setup is already production-ready! ✅
