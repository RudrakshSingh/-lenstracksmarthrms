# Quick Reference Card - AKS Deployment

## 🚀 One-Command Deployment (After Initial Setup)

```bash
# Complete deployment in 4 steps
./k8s/setup-aks.sh          # Step 1: Setup cluster (one-time)
./k8s/setup-secrets.sh      # Step 2: Configure secrets
./k8s/build-and-push.sh all latest  # Step 3: Build images
./k8s/deploy.sh production all      # Step 4: Deploy
```

## 📋 Essential Commands

### Check Status
```bash
kubectl get pods -n etelios
kubectl get services -n etelios
kubectl get ingress -n etelios
kubectl get deployments -n etelios
```

### View Logs
```bash
kubectl logs -f deployment/auth-service -n etelios
kubectl logs -f deployment/api-gateway -n etelios
```

### Get Ingress IP
```bash
kubectl get service ingress-nginx-controller -n ingress-nginx
```

### Test Services
```bash
INGRESS_IP=$(kubectl get service ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl http://$INGRESS_IP/health
curl http://$INGRESS_IP/api/auth/health
```

### Scale Service
```bash
kubectl scale deployment auth-service --replicas=3 -n etelios
```

### Restart Service
```bash
kubectl rollout restart deployment auth-service -n etelios
```

### Update Service
```bash
# 1. Build new image
./k8s/build-and-push.sh auth-service latest

# 2. Restart deployment
kubectl rollout restart deployment auth-service -n etelios

# 3. Watch rollout
kubectl rollout status deployment auth-service -n etelios
```

## 🔧 Troubleshooting

### Pod Not Starting
```bash
kubectl describe pod <pod-name> -n etelios
kubectl logs <pod-name> -n etelios
```

### Service Not Accessible
```bash
kubectl get endpoints -n etelios
kubectl describe ingress etelios-ingress -n etelios
```

### Check Events
```bash
kubectl get events -n etelios --sort-by='.lastTimestamp'
```

## 📞 Quick Help

- **Full Guide**: See `k8s/RAJVEER-AKS-DEPLOYMENT-GUIDE.md`
- **Troubleshooting**: Check guide's troubleshooting section
- **Logs Location**: `kubectl logs -f deployment/<service-name> -n etelios`

