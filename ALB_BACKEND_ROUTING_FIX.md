# 🔧 ALB Backend API Routing Fix

**Date:** 2026-02-28

---

## ✅ Current Status

### ALB URL (Working)
```
http://etelios-frontend-alb-557163772.ap-south-1.elb.amazonaws.com
```

### What's Working
- ✅ **Frontend Shell App:** Root (/) returns HTML
- ✅ **Shell Service:** `/api/health` returns JSON
- ✅ **DNS Resolution:** Working
- ✅ **Connection:** Working

### What's Not Working
- ❌ **Backend APIs:** `/api/auth/login` returns 503
- ❌ **Backend APIs:** Not routed through ALB

---

## 🔍 Problem

The ALB is currently pointing to the **frontend shell app** (port 3000), but backend APIs need to be routed to the **backend services** (auth-service, hr-service, attendance-service).

---

## 🔧 Solution Options

### Option 1: Add ALB Listener Rules (Recommended)

Add path-based routing rules to route `/api/*` to backend services:

```bash
# Get listener ARN
LISTENER_ARN=$(aws elbv2 describe-listeners \
  --load-balancer-arn <alb-arn> \
  --region ap-south-1 \
  --query 'Listeners[?Port==`80`].ListenerArn' \
  --output text)

# Create target groups for backend services (if not exist)
# Then add listener rules to route /api/auth/*, /api/hr/*, /api/attendance/* to respective services
```

### Option 2: Use Kubernetes Ingress Controller

The ingress is already configured. We need to ensure:
1. Ingress controller is running
2. Ingress controller service is registered to ALB target group
3. Or create AWS Load Balancer Controller for automatic integration

### Option 3: Frontend Proxy

Configure frontend to proxy API calls:
```javascript
// In frontend config
const API_URL = process.env.REACT_APP_API_URL || 'http://backend-alb-url';
```

---

## 🚀 Quick Fix: Update ALB Listener Rules

### Step 1: Create Target Groups for Backend Services

```bash
# Auth Service Target Group
aws elbv2 create-target-group \
  --name etelios-auth-tg \
  --protocol HTTP \
  --port 3001 \
  --vpc-id <vpc-id> \
  --health-check-path /health \
  --region ap-south-1

# HR Service Target Group  
aws elbv2 create-target-group \
  --name etelios-hr-tg \
  --protocol HTTP \
  --port 3002 \
  --vpc-id <vpc-id> \
  --health-check-path /health \
  --region ap-south-1

# Attendance Service Target Group
aws elbv2 create-target-group \
  --name etelios-attendance-tg \
  --protocol HTTP \
  --port 3003 \
  --vpc-id <vpc-id> \
  --health-check-path /health \
  --region ap-south-1
```

### Step 2: Register Targets

```bash
# Register Kubernetes service endpoints to target groups
# Get service endpoints
kubectl get endpoints -n etelios-prod auth-service hr-service attendance-service
```

### Step 3: Add Listener Rules

```bash
# Add rule for /api/auth/*
aws elbv2 create-rule \
  --listener-arn <listener-arn> \
  --priority 100 \
  --conditions Field=path-pattern,Values='/api/auth/*' \
  --actions Type=forward,TargetGroupArn=<auth-tg-arn> \
  --region ap-south-1

# Add rule for /api/hr/*
aws elbv2 create-rule \
  --listener-arn <listener-arn> \
  --priority 200 \
  --conditions Field=path-pattern,Values='/api/hr/*' \
  --actions Type=forward,TargetGroupArn=<hr-tg-arn> \
  --region ap-south-1

# Add rule for /api/attendance/*
aws elbv2 create-rule \
  --listener-arn <listener-arn> \
  --priority 300 \
  --conditions Field=path-pattern,Values='/api/attendance/*' \
  --actions Type=forward,TargetGroupArn=<attendance-tg-arn> \
  --region ap-south-1
```

---

## ✅ Alternative: Use Kubernetes Ingress

If using Kubernetes Ingress Controller:

1. **Install AWS Load Balancer Controller:**
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/v2_7_0_full.yaml
   ```

2. **Ingress will automatically create ALB and route traffic**

3. **Current ingress is configured** - just need to ensure controller is running

---

## 📋 Current ALB Configuration

- **ALB Name:** etelios-frontend-alb
- **DNS:** etelios-frontend-alb-557163772.ap-south-1.elb.amazonaws.com
- **Target Group:** etelios-shell-tg (port 3000) - Frontend Shell App
- **Listener:** Port 80, default action -> shell-tg

---

## 🎯 Recommended Solution

**Use Kubernetes Ingress with AWS Load Balancer Controller** for automatic ALB management and routing.

---

**Last Updated:** 2026-02-28  
**Status:** ALB working, but backend APIs need routing configuration
