#!/bin/bash

###############################################################################
# Create Alternative LoadBalancer Services
# Use this if frontend dev can't access the ALB Ingress
###############################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

NAMESPACE="etelios-prod"

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

log "=========================================="
log "Creating Alternative LoadBalancer Services"
log "=========================================="
log ""

warning "This will create AWS Classic Load Balancers (costs money!)"
warning "Only use this if the ALB Ingress is not accessible"
log ""

read -p "Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    log "Cancelled by user"
    exit 0
fi

log ""
log "Creating LoadBalancer for working services..."
log ""

# Auth Service
log "1. Creating LoadBalancer for auth-service..."
kubectl expose deployment auth-service -n $NAMESPACE \
    --type=LoadBalancer \
    --port=80 \
    --target-port=3000 \
    --name=auth-service-lb \
    --dry-run=client -o yaml | kubectl apply -f -

# HR Service
log "2. Creating LoadBalancer for hr-service..."
kubectl expose deployment hr-service -n $NAMESPACE \
    --type=LoadBalancer \
    --port=80 \
    --target-port=3000 \
    --name=hr-service-lb \
    --dry-run=client -o yaml | kubectl apply -f -

# Attendance Service
log "3. Creating LoadBalancer for attendance-service..."
kubectl expose deployment attendance-service -n $NAMESPACE \
    --type=LoadBalancer \
    --port=80 \
    --target-port=3000 \
    --name=attendance-service-lb \
    --dry-run=client -o yaml | kubectl apply -f -

# Tenant Management Service
log "4. Creating LoadBalancer for tenant-management-service..."
kubectl expose deployment tenant-management-service -n $NAMESPACE \
    --type=LoadBalancer \
    --port=80 \
    --target-port=3000 \
    --name=tenant-management-lb \
    --dry-run=client -o yaml | kubectl apply -f -

# Tenant Registry Service
log "5. Creating LoadBalancer for tenant-registry-service..."
kubectl expose deployment tenant-registry-service -n $NAMESPACE \
    --type=LoadBalancer \
    --port=80 \
    --target-port=3000 \
    --name=tenant-registry-lb \
    --dry-run=client -o yaml | kubectl apply -f -

log ""
log "Waiting for LoadBalancers to be created (this may take 2-3 minutes)..."
sleep 30

log ""
log "=========================================="
log "LoadBalancer URLs:"
log "=========================================="
log ""

# Function to get LB URL
get_lb_url() {
    local service=$1
    local url=$(kubectl get svc $service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)
    if [ -z "$url" ]; then
        echo "⏳ Creating..."
    else
        echo "✅ http://$url"
    fi
}

log "Auth Service:      $(get_lb_url auth-service-lb)"
log "HR Service:        $(get_lb_url hr-service-lb)"
log "Attendance:        $(get_lb_url attendance-service-lb)"
log "Tenant Mgmt:       $(get_lb_url tenant-management-lb)"
log "Tenant Registry:   $(get_lb_url tenant-registry-lb)"

log ""
log "=========================================="
log "Frontend API Endpoints:"
log "=========================================="
log ""

cat > ALTERNATIVE_API_URLS.md <<EOF
# Alternative API URLs (LoadBalancer Services)

## ⚠️ Using Direct LoadBalancer Services

Instead of single ALB Ingress, each service has its own Load Balancer.

---

## 🔗 Service URLs

### Get URLs:
\`\`\`bash
kubectl get svc -n etelios-prod | grep LoadBalancer
\`\`\`

### Auth Service
\`\`\`bash
# Get URL
kubectl get svc auth-service-lb -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'

# Test
curl http://\$(kubectl get svc auth-service-lb -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')/health
\`\`\`

### HR Service
\`\`\`bash
# Get URL
kubectl get svc hr-service-lb -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'

# Test
curl http://\$(kubectl get svc hr-service-lb -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')/health
\`\`\`

### Attendance Service
\`\`\`bash
# Get URL
kubectl get svc attendance-service-lb -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'

# Test
curl http://\$(kubectl get svc attendance-service-lb -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')/health
\`\`\`

### Tenant Management Service
\`\`\`bash
# Get URL
kubectl get svc tenant-management-lb -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
\`\`\`

### Tenant Registry Service
\`\`\`bash
# Get URL
kubectl get svc tenant-registry-lb -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
\`\`\`

---

## 💻 Frontend Configuration

Instead of single base URL, use different URLs for each service:

\`\`\`javascript
// .env
REACT_APP_AUTH_URL=http://[auth-lb-url]
REACT_APP_HR_URL=http://[hr-lb-url]
REACT_APP_ATTENDANCE_URL=http://[attendance-lb-url]
REACT_APP_TENANT_MGMT_URL=http://[tenant-mgmt-lb-url]
REACT_APP_TENANT_REGISTRY_URL=http://[tenant-registry-lb-url]

// api/client.js
const authClient = axios.create({ baseURL: process.env.REACT_APP_AUTH_URL });
const hrClient = axios.create({ baseURL: process.env.REACT_APP_HR_URL });
const attendanceClient = axios.create({ baseURL: process.env.REACT_APP_ATTENDANCE_URL });

// Usage
authClient.post('/login', data);           // Goes to auth LB
hrClient.get('/employees');                 // Goes to HR LB
attendanceClient.post('/checkin');         // Goes to attendance LB
\`\`\`

---

## ⚠️ Important Notes

1. **Cost:** Each LoadBalancer costs ~\$16/month
2. **5 LoadBalancers = ~\$80/month** (vs single ALB)
3. **Not recommended** for production (use Ingress instead)
4. **Temporary solution** until ALB access issue is resolved

---

## 🗑️ To Delete LoadBalancers

\`\`\`bash
kubectl delete svc auth-service-lb -n etelios-prod
kubectl delete svc hr-service-lb -n etelios-prod
kubectl delete svc attendance-service-lb -n etelios-prod
kubectl delete svc tenant-management-lb -n etelios-prod
kubectl delete svc tenant-registry-lb -n etelios-prod
\`\`\`

---

## ✅ Recommended Solution

**Fix the ALB access issue instead:**
1. Check frontend dev's network/firewall
2. Try from different network
3. Use VPN if needed
4. Test with online tools (reqbin.com)

**ALB Ingress is better because:**
- Single entry point
- Lower cost (\$16/month vs \$80/month)
- Better for microservices
- Easier to manage
EOF

log "✅ Created ALTERNATIVE_API_URLS.md"
log ""

log "=========================================="
log "Complete! Check URLs after 2-3 minutes:"
log "=========================================="
log ""
log "kubectl get svc -n etelios-prod | grep LoadBalancer"
log ""

warning "Remember: Each LoadBalancer costs money!"
warning "Delete them when not needed"
log ""
