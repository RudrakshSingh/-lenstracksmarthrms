# 🚀 Quick Production Deployment

## Run Complete Deployment

```bash
./deploy-all-fixes-to-production.sh
```

## What This Does

1. ✅ Fixes ALB timeout (60s → 120s)
2. ✅ Rebuilds all services with latest fixes:
   - auth-service
   - hr-service
   - attendance-service
   - payroll-service
   - tenant-registry-service
   - realtime-service
3. ✅ Pushes images to ECR
4. ✅ Deploys to EKS
5. ✅ Verifies deployment

## Expected Time

- **Total**: ~15-20 minutes
- **Image Builds**: ~10-12 minutes
- **Deployment**: ~3-5 minutes
- **Verification**: ~2-3 minutes

## After Deployment

Check ALB URL:
```bash
kubectl get ingress etelios-ingress -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

Test APIs:
```bash
ALB_URL=$(kubectl get ingress etelios-ingress -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl http://$ALB_URL/api/payroll/health
curl http://$ALB_URL/api/attendance/health
```

## Troubleshooting

If deployment fails:
1. Check logs: `tail -f production-deployment-*.log`
2. Check pods: `kubectl get pods -n etelios-prod`
3. Check ingress: `kubectl get ingress -n etelios-prod`

